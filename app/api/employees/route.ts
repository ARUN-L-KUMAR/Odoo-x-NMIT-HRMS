import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth/permissions";
import { createEmployeeSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth/password";
import { errorResponse } from "@/lib/utils";
import { Role } from "@/lib/enums";

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  designation: true,
  department: true,
  joiningDate: true,
  employmentStatus: true,
  profileImage: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      employeeId: true,
      email: true,
      role: true,
      mustChangePassword: true,
    },
  },
};

/**
 * Generate employee Login ID:
 * [CompanyInitials][FirstName2][LastName2][JoinYear][4-digit serial]
 * Example: DFJODO20240001
 */
async function generateEmployeeLoginId(
  companyInitials: string,
  firstName: string,
  lastName: string,
  joiningDate?: string
): Promise<string> {
  const initials = companyInitials || "DF";
  const fn2 = firstName.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "X");
  const ln2 = lastName.substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "X");
  const year = joiningDate
    ? new Date(joiningDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  const prefix = `${initials}${fn2}${ln2}${year}`;

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

/**
 * Generate a secure temporary password.
 * Format: [Uppercase][6 random chars][Number][Symbol]
 */
function generateTempPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "@#$!";
  const rand = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const base = Array.from({ length: 5 }, () => rand(lower)).join("");
  return `${rand(upper)}${base}${rand(digits)}${rand(symbols)}`;
}

// GET /api/employees — admin: all employees in company, employee: all in company (for directory)
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const isAdmin = session.user.role === Role.ADMIN;
    const companyId = session.user.companyId;

    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }
    if (department) where.department = department;
    if (status && isAdmin) where.employmentStatus = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { user: { employeeId: { contains: search, mode: "insensitive" } } },
        ...(isAdmin
          ? [{ user: { email: { contains: search, mode: "insensitive" } } }]
          : []),
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      select: employeeSelect,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    return Response.json({ success: true, data: employees, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    console.error("[EMPLOYEES_GET]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}

// POST /api/employees — admin only
// Auto-generates Login ID and temporary password; returns credentials to admin
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();

    // Remove employeeId and password from body — system generates them
    const { firstName, lastName, email, phone, designation, department, joiningDate, employmentStatus, profileImage } = body;

    // Basic validation
    if (!firstName || !lastName || !email) {
      return errorResponse("VALIDATION_ERROR", "firstName, lastName, and email are required", {}, 422);
    }

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      return errorResponse("CONFLICT", "Email already exists", { email: ["Email in use"] }, 409);
    }

    // Auto-generate Login ID using company initials and temp password
    const companyInitials = session.user.companyInitials || "DF";
    const companyId = session.user.companyId || null;

    const loginId = await generateEmployeeLoginId(companyInitials, firstName, lastName, joiningDate);
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        employeeId: loginId,
        email,
        passwordHash,
        role: Role.EMPLOYEE,
        mustChangePassword: true, // force password change on first login
        companyId,
        employee: {
          create: {
            companyId,
            firstName,
            lastName,
            phone: phone || null,
            designation: designation || null,
            department: department || null,
            joiningDate: joiningDate ? new Date(joiningDate) : undefined,
            employmentStatus: employmentStatus || "ACTIVE",
            profileImage: profileImage || null,
          },
        },
      },
      include: { employee: { select: employeeSelect } },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        companyId,
        action: "EMPLOYEE_CREATED",
        entityType: "employee",
        entityId: user.employee?.id,
        description: `Employee ${firstName} ${lastName} (${loginId}) created by admin`,
      },
    });

    return Response.json(
      {
        success: true,
        data: {
          employee: user.employee,
          // Return generated credentials so admin can share with employee
          credentials: {
            loginId,
            tempPassword,
            email,
          },
        },
        message: "Employee created",
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return Response.json(
        {
          success: false,
          error: {
            code: error.message,
            message: error.message === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden",
          },
        },
        { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
      );
    }
    console.error("[EMPLOYEES_POST]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
