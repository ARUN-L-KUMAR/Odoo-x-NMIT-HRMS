import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";
import { startOfDay, subDays, format } from "date-fns";
import { AttendanceStatus } from "@/lib/enums";

// GET /api/dashboard/admin
export async function GET() {
  try {
    await requireAdmin();

    const today = startOfDay(new Date());

    const [
      totalEmployees,
      todayAttendance,
      pendingLeaves,
      recentEmployees,
      recentActivity,
      departmentGroups,
    ] = await Promise.all([
      prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }),
      prisma.attendance.findMany({
        where: { attendanceDate: today },
        select: { status: true },
      }),
      prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, profileImage: true, department: true },
          },
          leaveType: true,
        },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
      prisma.employee.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { employeeId: true, email: true, role: true } } },
      }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { employeeId: true } },
        },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        _count: { id: true },
        where: { employmentStatus: "ACTIVE", department: { not: null } },
      }),
    ]);

    const presentToday = todayAttendance.filter((a: { status: string }) => a.status === AttendanceStatus.PRESENT).length;
    const onLeaveToday = todayAttendance.filter((a: { status: string }) => a.status === AttendanceStatus.LEAVE).length;
    const absentToday = totalEmployees - presentToday - onLeaveToday;

    // Build attendance trend for last 7 days
    const trendDays = 7;
    const attendanceTrend = [];

    for (let i = trendDays - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dayRecords = await prisma.attendance.findMany({
        where: { attendanceDate: date },
        select: { status: true },
      });
      attendanceTrend.push({
        date: format(date, "EEE"),
        present: dayRecords.filter((r: { status: string }) => r.status === "PRESENT").length,
        absent: dayRecords.filter((r: { status: string }) => r.status === "ABSENT").length,
        leave: dayRecords.filter((r: { status: string }) => r.status === "LEAVE").length,
      });
    }

    const departmentDistribution = departmentGroups.map((g: { department: string | null; _count: { id: number } }) => ({
      department: g.department || "Unassigned",
      count: g._count.id,
    }));

    return Response.json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        absentToday,
        onLeaveToday,
        pendingLeaveRequests: pendingLeaves.length,
        recentEmployees,
        pendingLeaves,
        recentActivity,
        attendanceTrend,
        departmentDistribution,
      },
      message: "OK",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
    }
    console.error("[DASHBOARD_ADMIN]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
