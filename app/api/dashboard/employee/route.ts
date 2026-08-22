import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { startOfDay, subDays } from "date-fns";
import { AttendanceStatus } from "@/lib/enums";

// GET /api/dashboard/employee
export async function GET() {
  try {
    const session = await requireAuth();
    const employeeId = session.user.employeeDbId;

    if (!employeeId) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Employee profile not found" } },
        { status: 404 }
      );
    }

    const today = startOfDay(new Date());
    const thirtyDaysAgo = subDays(today, 30);

    const [employee, todayAttendance, allAttendance, leaveRequests, salary, recentActivity] =
      await Promise.all([
        prisma.employee.findUnique({
          where: { id: employeeId },
          include: { user: { select: { id: true, employeeId: true, email: true, role: true } } },
        }),
        prisma.attendance.findUnique({
          where: { employeeId_attendanceDate: { employeeId, attendanceDate: today } },
        }),
        prisma.attendance.findMany({
          where: {
            employeeId,
            attendanceDate: { gte: thirtyDaysAgo, lte: today },
          },
        }),
        prisma.leaveRequest.findMany({
          where: { employeeId },
          include: { leaveType: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.salaryStructure.findUnique({ where: { employeeId } }),
        prisma.activityLog.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ]);

    // Leave types for balance calculation
    const leaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });

    const attendanceSummary = {
      present: allAttendance.filter((a: { status: string }) => a.status === AttendanceStatus.PRESENT).length,
      absent: allAttendance.filter((a: { status: string }) => a.status === AttendanceStatus.ABSENT).length,
      halfDay: allAttendance.filter((a: { status: string }) => a.status === AttendanceStatus.HALF_DAY).length,
      onLeave: allAttendance.filter((a: { status: string }) => a.status === AttendanceStatus.LEAVE).length,
      totalDays: allAttendance.length,
    };

    const leaveBalances = (leaveTypes as Array<{ id: string; name: string; isPaid: boolean; annualLimit: number | null }>).map((lt) => {
      const used = leaveRequests
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((lr: any) => lr.leaveTypeId === lt.id && lr.status === "APPROVED")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .reduce((sum: number, lr: any) => sum + Number(lr.totalDays), 0);
      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        isPaid: lt.isPaid,
        annualLimit: lt.annualLimit,
        used,
        remaining: lt.annualLimit ? lt.annualLimit - used : null,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingLeaveCount = leaveRequests.filter((lr: any) => lr.status === "PENDING").length;

    return Response.json({
      success: true,
      data: {
        employee,
        todayAttendance,
        attendanceSummary,
        leaveBalances,
        pendingLeaveCount,
        recentActivity,
        salary,
      },
      message: "OK",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[DASHBOARD_EMPLOYEE]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
