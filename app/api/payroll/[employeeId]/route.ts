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

// PATCH /api/payroll/:employeeId — upsert salary structure
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

    const { basicSalary, hra, allowances, deductions, pf, tax, effectiveFrom } = parsed.data;
    const grossSalary = basicSalary + hra + allowances;
    const netSalary = grossSalary - deductions - pf - tax;

    const salary = await prisma.salaryStructure.upsert({
      where: { employeeId },
      update: {
        basicSalary,
        hra,
        allowances,
        deductions,
        pf,
        tax,
        grossSalary,
        netSalary,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      },
      create: {
        employeeId,
        basicSalary,
        hra,
        allowances,
        deductions,
        pf,
        tax,
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
        description: `Admin updated salary for ${salary.employee.firstName} ${salary.employee.lastName}`,
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
