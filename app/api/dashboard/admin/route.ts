import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";
import { startOfDay, subDays, format } from "date-fns";
import { AttendanceStatus } from "@/lib/enums";

// GET /api/dashboard/admin — Super Admin (Global Platform Stats) or Tenant Admin (Company Stats)
export async function GET() {
  try {
    const session = await requireAdmin();

    const today = startOfDay(new Date());
    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const companyId = session.user.companyId;
    const empFilter = (!isSuperAdmin && companyId) ? { companyId } : {};

    const [
      totalEmployees,
      totalOrganizations,
      todayAttendance,
      pendingLeaves,
      recentEmployees,
      recentActivity,
      departmentGroups,
      organizationsList,
    ] = await Promise.all([
      prisma.employee.count({ where: { employmentStatus: "ACTIVE", ...empFilter } }),
      prisma.company.count(),
      prisma.attendance.findMany({
        where: {
          attendanceDate: today,
          employee: empFilter,
        },
        select: { status: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "PENDING",
          employee: empFilter,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              department: true,
              company: { select: { name: true, initials: true } },
            },
          },
          leaveType: true,
        },
        orderBy: { createdAt: "asc" },
        take: 6,
      }),
      prisma.employee.findMany({
        where: empFilter,
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          company: { select: { id: true, name: true, initials: true } },
          user: { select: { employeeId: true, email: true, role: true } },
        },
      }),
      prisma.activityLog.findMany({
        where: (!isSuperAdmin && companyId) ? { companyId } : {},
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { employeeId: true } },
        },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        _count: { id: true },
        where: { employmentStatus: "ACTIVE", department: { not: null }, ...empFilter },
      }),
      isSuperAdmin
        ? prisma.company.findMany({
            select: {
              id: true,
              name: true,
              initials: true,
              logoUrl: true,
              _count: { select: { employees: true } },
            },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const presentToday = todayAttendance.filter((a: { status: string }) => a.status === AttendanceStatus.PRESENT).length;
    const onLeaveToday = todayAttendance.filter((a: { status: string }) => a.status === AttendanceStatus.LEAVE).length;
    const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveToday);

    // Build attendance trend for last 7 days
    const trendDays = 7;
    const attendanceTrend = [];

    for (let i = trendDays - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dayRecords = await prisma.attendance.findMany({
        where: {
          attendanceDate: date,
          employee: empFilter,
        },
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
        isSuperAdmin,
        totalOrganizations,
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
        organizationsList: organizationsList.map((org: any) => ({
          id: org.id,
          name: org.name,
          initials: org.initials,
          logoUrl: org.logoUrl,
          employeeCount: org._count.employees,
        })),
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
