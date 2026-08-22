import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { companySetupSchema } from "@/lib/validations";
import { errorResponse } from "@/lib/utils";
import { Role } from "@/lib/enums";

/**
 * Generate company initials from company name.
 * "Acme Corp" → "AC", "Dayflow" → "DF", "Odoo India" → "OI"
 */
function getCompanyInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    // Single word: take first 2 letters
    return words[0].substring(0, 2).toUpperCase();
  }
  // Multi-word: take first letter of each word (max 3)
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/**
 * Generate employee Login ID in format:
 * [CompanyInitials][FirstName2chars][LastName2chars][JoinYear][4-digit serial]
 * Example: DFJODO20240001
 */
async function generateLoginId(
  companyInitials: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const fn2 = firstName.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "X");
  const ln2 = lastName.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "X");
  const year = new Date().getFullYear().toString();
  const prefix = `${companyInitials}${fn2}${ln2}${year}`;

  // Find the highest serial for this prefix
  const existing = await prisma.user.findMany({
    where: { employeeId: { startsWith: prefix } },
    select: { employeeId: true },
    orderBy: { employeeId: "desc" },
  });

  let serial = 1;
  if (existing.length > 0) {
    const last = existing[0].employeeId;
    const lastSerial = parseInt(last.slice(prefix.length), 10);
    if (!isNaN(lastSerial)) serial = lastSerial + 1;
  }

  return `${prefix}${serial.toString().padStart(4, "0")}`;
}

// POST /api/auth/setup — First-time company + admin account creation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = companySetupSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid request data",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
        422
      );
    }

    const { companyName, logoUrl, name, email, phone, password } = parsed.data;


    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse(
        "CONFLICT",
        "An account with this email already exists",
        { email: ["Email already in use"] },
        409
      );
    }

    // Derive company initials
    const initials = getCompanyInitials(companyName);

    // Generate admin Login ID from name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "AD";
    const lastName = nameParts[1] || "MIN";
    const loginId = await generateLoginId(initials, firstName, lastName);

    const passwordHash = await hashPassword(password);

    // Create company + default leave types + admin user + employee profile in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create company
      const company = await tx.company.create({
        data: { name: companyName, initials, logoUrl: logoUrl || null },
      });

      // 2. Create default leave types for this company
      const defaultLeaveTypes = [
        { name: "Paid Time Off (PTO)", description: "Standard paid vacation days", isPaid: true, annualLimit: 18 },
        { name: "Sick Leave", description: "Medical and health-related leave", isPaid: true, annualLimit: 12 },
        { name: "Casual Leave", description: "Short planned personal time off", isPaid: true, annualLimit: 10 },
        { name: "Unpaid Leave", description: "Leave without pay", isPaid: false, annualLimit: null },
      ];

      for (const lt of defaultLeaveTypes) {
        await tx.leaveType.create({
          data: {
            ...lt,
            companyId: company.id,
          },
        });
      }

      // 3. Create admin user
      const user = await tx.user.create({
        data: {
          employeeId: loginId,
          email,
          passwordHash,
          role: Role.ADMIN,
          mustChangePassword: false,
          companyId: company.id,
          employee: {
            create: {
              firstName,
              lastName,
              phone: phone || null,
              designation: "HR Administrator",
              department: "Human Resources",
              joiningDate: new Date(),
              employmentStatus: "ACTIVE",
              companyId: company.id,
            },
          },
        },
        include: { employee: true },
      });

      // 4. Log the setup activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          companyId: company.id,
          action: "COMPANY_SETUP",
          entityType: "company",
          entityId: company.id,
          description: `Organization "${companyName}" created by ${name} (${loginId})`,
        },
      });

      return { user, company, loginId };
    });

    return Response.json(
      {
        success: true,
        data: {
          loginId: result.loginId,
          email,
          companyName,
          companyId: result.company.id,
        },
        message: "Organization created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[COMPANY_SETUP]", error);
    return errorResponse("INTERNAL_ERROR", "Something went wrong", {}, 500);
  }
}
