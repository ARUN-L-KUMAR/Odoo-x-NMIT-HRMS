import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { Role, AttendanceStatus, LeaveStatus } from "@/lib/enums";
import { startOfMonth, endOfMonth, getDaysInMonth, parseISO } from "date-fns";

// GET /api/payroll/payslip/:employeeId?month=2026-08
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await requireAuth();
    const { employeeId } = await params;
    const { searchParams } = new URL(req.url);

    // Permission check: Admin, Super Admin, or own employee profile
    const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;
    const isAdmin = session.user.role === Role.ADMIN || isSuperAdmin;
    if (!isAdmin && session.user.employeeDbId !== employeeId) {
      return Response.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not authorized to view this payslip" } },
        { status: 403 }
      );
    }

    const monthQuery = searchParams.get("month") || new Date().toISOString().slice(0, 7); // e.g. "2026-08"
    const targetDate = parseISO(`${monthQuery}-01`);
    const monthStartDate = startOfMonth(targetDate);
    const monthEndDate = endOfMonth(targetDate);
    const totalDaysInMonth = getDaysInMonth(targetDate);

    // Fetch employee + salary structure + company
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
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
    });

    if (!employee) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Employee not found" } },
        { status: 404 }
      );
    }

    // Tenant check for regular admin
    if (!isSuperAdmin && session.user.companyId && employee.companyId !== session.user.companyId) {
      return Response.json(
        { success: false, error: { code: "FORBIDDEN", message: "Employee belongs to different organization" } },
        { status: 403 }
      );
    }

    // 1. Fetch real attendance records for this month
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId,
        attendanceDate: {
          gte: monthStartDate,
          lte: monthEndDate,
        },
      },
    });

    const presentCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const halfDayCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.HALF_DAY).length;
    const absentCount = attendanceRecords.filter((a) => a.status === AttendanceStatus.ABSENT).length;

    // 2. Fetch approved leave requests during this month
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
        OR: [
          { startDate: { gte: monthStartDate, lte: monthEndDate } },
          { endDate: { gte: monthStartDate, lte: monthEndDate } },
        ],
      },
      include: { leaveType: true },
    });

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    approvedLeaves.forEach((leave) => {
      const days = Number(leave.totalDays) || 1;
      if (leave.leaveType?.isPaid) {
        paidLeaveDays += days;
      } else {
        unpaidLeaveDays += days;
      }
    });

    const workedDays = presentCount + halfDayCount * 0.5;
    const lossOfPayDays = Math.max(0, absentCount + unpaidLeaveDays);

    const s = employee.salaryStructure;
    const basic = Number(s?.basicSalary || 0);
    const hra = Number(s?.hra || 0);
    const standard = Number(s?.standardAllowance || 0);
    const bonus = Number(s?.performanceBonus || 0);
    const lta = Number(s?.leaveTravelAllowance || 0);
    const fixed = Number(s?.fixedAllowance || 0);
    const gross = Number(s?.grossSalary || basic + hra + standard + bonus + lta + fixed);

    const pf = Number(s?.employeePf || 0);
    const pt = Number(s?.professionalTax || 200);
    const tax = Number(s?.tax || 0);
    const totalDeductions = Number(s?.deductions || pf + pt + tax);
    const netSalary = Number(s?.netSalary || Math.max(0, gross - totalDeductions));

    return Response.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          designation: employee.designation,
          department: employee.department,
          profileImage: employee.profileImage,
          joiningDate: employee.joiningDate,
          bankAccountNumber: employee.bankAccountNumber,
          bankName: employee.bankName,
          bankIfsc: employee.bankIfsc,
          panNumber: employee.panNumber,
          uanNumber: employee.uanNumber,
          company: employee.company,
          user: employee.user,
        },
        salaryStructure: s,
        period: {
          month: monthQuery,
          monthName: targetDate.toLocaleString("en-US", { month: "long", year: "numeric" }),
          totalDays: totalDaysInMonth,
          workedDays,
          paidLeaveDays,
          absentDays: absentCount,
          lossOfPayDays,
        },
        financials: {
          basic,
          hra,
          standard,
          bonus,
          lta,
          fixed,
          gross,
          pf,
          pt,
          tax,
          totalDeductions,
          netSalary,
          employerPf: Number(s?.employerPf || 0),
          gratuity: Math.round(basic * 0.0481),
        },
      },
      message: "OK",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[PAYSLIP_GET]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
