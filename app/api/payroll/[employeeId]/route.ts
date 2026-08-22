import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";
import { salarySchema } from "@/lib/validations";
import { errorResponse } from "@/lib/utils";

// GET /api/payroll/:employeeId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    await requireAdmin();
    const { employeeId } = await params;

    const salary = await prisma.salaryStructure.findUnique({
      where: { employeeId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: true,
          },
        },
      },
    });

    if (!salary) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Salary structure not found" } },
        { status: 404 }
      );
    }

    return Response.json({ success: true, data: salary, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    if (error.message === "FORBIDDEN") return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

// PATCH /api/payroll/:employeeId — upsert salary structure with Excalidraw wage calculations
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await requireAdmin();
    const { employeeId } = await params;

    const body = await req.json();
    const parsed = salarySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid salary data",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
        422
      );
    }

    const {
      monthlyWage,
      workingDaysPerWeek = 5,
      workingHoursPerDay = 8,
      breakTimeHours = 1,
      effectiveFrom,
    } = parsed.data;

    // Automatic calculation per Excalidraw specification:
    const yearlyWage = parsed.data.yearlyWage ?? monthlyWage * 12;
    const basicSalary = parsed.data.basicSalary ?? Math.round(monthlyWage * 0.5 * 100) / 100;
    const hra = parsed.data.hra ?? Math.round(basicSalary * 0.5 * 100) / 100;
    const standardAllowance = parsed.data.standardAllowance ?? Math.round(basicSalary * 0.1667 * 100) / 100;
    const performanceBonus = parsed.data.performanceBonus ?? Math.round(basicSalary * 0.0833 * 100) / 100;
    const leaveTravelAllowance = parsed.data.leaveTravelAllowance ?? Math.round(basicSalary * 0.0833 * 100) / 100;
    const computedSoFar = basicSalary + hra + standardAllowance + performanceBonus + leaveTravelAllowance;
    const fixedAllowance = parsed.data.fixedAllowance ?? Math.max(0, Math.round((monthlyWage - computedSoFar) * 100) / 100);

    const employeePf = parsed.data.employeePf ?? Math.round(basicSalary * 0.12 * 100) / 100;
    const employerPf = parsed.data.employerPf ?? Math.round(basicSalary * 0.12 * 100) / 100;
    const professionalTax = parsed.data.professionalTax ?? 200;

    const grossSalary = monthlyWage;
    const netSalary = grossSalary - employeePf - professionalTax;

    const salary = await prisma.salaryStructure.upsert({
      where: { employeeId },
      update: {
        monthlyWage,
        yearlyWage,
        workingDaysPerWeek,
        workingHoursPerDay,
        breakTimeHours,
        basicSalary,
        hra,
        standardAllowance,
        performanceBonus,
        leaveTravelAllowance,
        fixedAllowance,
        employeePf,
        employerPf,
        professionalTax,
        allowances: standardAllowance + performanceBonus + leaveTravelAllowance + fixedAllowance,
        deductions: employeePf + professionalTax,
        pf: employeePf,
        tax: professionalTax,
        grossSalary,
        netSalary,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      },
      create: {
        employeeId,
        monthlyWage,
        yearlyWage,
        workingDaysPerWeek,
        workingHoursPerDay,
        breakTimeHours,
        basicSalary,
        hra,
        standardAllowance,
        performanceBonus,
        leaveTravelAllowance,
        fixedAllowance,
        employeePf,
        employerPf,
        professionalTax,
        allowances: standardAllowance + performanceBonus + leaveTravelAllowance + fixedAllowance,
        deductions: employeePf + professionalTax,
        pf: employeePf,
        tax: professionalTax,
        grossSalary,
        netSalary,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "SALARY_UPDATED",
        entityType: "salary",
        entityId: salary.id,
        description: `Admin updated salary structure for ${salary.employee.firstName} ${salary.employee.lastName}`,
      },
    });

    return Response.json({ success: true, data: salary, message: "Salary updated" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    if (error.message === "FORBIDDEN") return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
    console.error("[PAYROLL_PATCH]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
