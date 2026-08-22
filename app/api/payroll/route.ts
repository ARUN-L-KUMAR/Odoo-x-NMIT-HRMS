import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";
import { Role } from "@/lib/enums";

// GET /api/payroll — admin: all salary structures / employee payroll directory
export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);

    const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;
    const filterCompanyId = searchParams.get("companyId");

    const empWhere: any = {};
    if (isSuperAdmin) {
      if (filterCompanyId && filterCompanyId !== "ALL") {
        empWhere.companyId = filterCompanyId;
      }
    } else if (session.user.companyId) {
      empWhere.companyId = session.user.companyId;
    }

    // Get all employees in scope
    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        department: true,
        profileImage: true,
        employmentStatus: true,
        joiningDate: true,
        bankAccountNumber: true,
        bankName: true,
        bankIfsc: true,
        panNumber: true,
        uanNumber: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            initials: true,
            logoUrl: true,
          },
        },
        user: { select: { employeeId: true, email: true } },
        salaryStructure: true,
      },
      orderBy: { firstName: "asc" },
    });

    // Format list ensuring every employee has a structure object
    const formatted = employees.map((emp) => {
      const s = emp.salaryStructure;
      if (s) {
        return {
          ...s,
          employee: {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            designation: emp.designation,
            department: emp.department,
            profileImage: emp.profileImage,
            employmentStatus: emp.employmentStatus,
            joiningDate: emp.joiningDate,
            bankAccountNumber: emp.bankAccountNumber,
            bankName: emp.bankName,
            bankIfsc: emp.bankIfsc,
            panNumber: emp.panNumber,
            uanNumber: emp.uanNumber,
            company: emp.company,
            user: emp.user,
          },
        };
      }

      // Default unconfigured placeholder
      return {
        id: `temp_${emp.id}`,
        employeeId: emp.id,
        monthlyWage: 0,
        yearlyWage: 0,
        workingDaysPerWeek: 5,
        workingHoursPerDay: 8,
        breakTimeHours: 1,
        basicSalary: 0,
        hra: 0,
        standardAllowance: 0,
        performanceBonus: 0,
        leaveTravelAllowance: 0,
        fixedAllowance: 0,
        employeePf: 0,
        employerPf: 0,
        professionalTax: 0,
        allowances: 0,
        deductions: 0,
        pf: 0,
        tax: 0,
        grossSalary: 0,
        netSalary: 0,
        isConfigured: false,
        employee: {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          designation: emp.designation,
          department: emp.department,
          profileImage: emp.profileImage,
          employmentStatus: emp.employmentStatus,
          joiningDate: emp.joiningDate,
          bankAccountNumber: emp.bankAccountNumber,
          bankName: emp.bankName,
          bankIfsc: emp.bankIfsc,
          panNumber: emp.panNumber,
          uanNumber: emp.uanNumber,
          company: emp.company,
          user: emp.user,
        },
      };
    });

    return Response.json({ success: true, data: formatted, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
    }
    console.error("[PAYROLL_ALL]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
