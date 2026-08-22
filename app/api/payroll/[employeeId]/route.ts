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
            bankAccountNumber: true,
            bankName: true,
            bankIfsc: true,
            panNumber: true,
            uanNumber: true,
            company: {
              select: {
                id: true,
                name: true,
                initials: true,
                logoUrl: true,
              },
            },
            user: { select: { employeeId: true, email: true } },
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

// PATCH /api/payroll/:employeeId — upsert comprehensive salary structure
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

    // Component calculations
    const basicSalary = parsed.data.basicSalary ?? Math.round(monthlyWage * 0.5 * 100) / 100;
    const hra = parsed.data.hra ?? Math.round(basicSalary * 0.5 * 100) / 100;
    const standardAllowance = parsed.data.standardAllowance ?? Math.round(basicSalary * 0.1667 * 100) / 100;
    const performanceBonus = parsed.data.performanceBonus ?? Math.round(basicSalary * 0.0833 * 100) / 100;
    const leaveTravelAllowance = parsed.data.leaveTravelAllowance ?? Math.round(basicSalary * 0.0833 * 100) / 100;
    
    // Balance remainder into fixed allowance if monthlyWage specified and fixedAllowance not passed
    const computedSoFar = basicSalary + hra + standardAllowance + performanceBonus + leaveTravelAllowance;
    const fixedAllowance = parsed.data.fixedAllowance ?? Math.max(0, Math.round((monthlyWage - computedSoFar) * 100) / 100);
    const totalAllowances = standardAllowance + performanceBonus + leaveTravelAllowance + fixedAllowance;

    const grossSalary = parsed.data.grossSalary ?? (basicSalary + hra + totalAllowances);
    const finalMonthlyWage = monthlyWage > 0 ? monthlyWage : grossSalary;
    const yearlyWage = parsed.data.yearlyWage ?? finalMonthlyWage * 12;

    const employeePf = parsed.data.employeePf ?? Math.round(basicSalary * 0.12 * 100) / 100;
    const employerPf = parsed.data.employerPf ?? Math.round(basicSalary * 0.12 * 100) / 100;
    const professionalTax = parsed.data.professionalTax ?? 200;
    const tax = parsed.data.tax ?? 0;
    const totalDeductions = employeePf + professionalTax + tax;

    const netSalary = Math.max(0, grossSalary - totalDeductions);

    const salary = await prisma.salaryStructure.upsert({
      where: { employeeId },
      update: {
        monthlyWage: finalMonthlyWage,
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
        allowances: totalAllowances,
        deductions: totalDeductions,
        pf: employeePf,
        tax: tax + professionalTax,
        grossSalary,
        netSalary,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      },
      create: {
        employeeId,
        monthlyWage: finalMonthlyWage,
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
        allowances: totalAllowances,
        deductions: totalDeductions,
        pf: employeePf,
        tax: tax + professionalTax,
        grossSalary,
        netSalary,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: true,
            company: {
              select: {
                id: true,
                name: true,
                initials: true,
                logoUrl: true,
              },
            },
          },
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
        description: `Salary structure configured for ${salary.employee.firstName} ${salary.employee.lastName} (Gross: ₹${grossSalary.toLocaleString()}, Net: ₹${netSalary.toLocaleString()})`,
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
