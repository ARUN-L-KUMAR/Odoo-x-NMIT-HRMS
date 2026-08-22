import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { Role } from "@/lib/enums";

// GET /api/history — fetch user activity history and system audit trail
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;
    const isAdmin = session.user.role === Role.ADMIN || isSuperAdmin;

    // 1. Fetch user's own recent attendance timeline
    let myAttendanceHistory: any[] = [];
    if (session.user.employeeDbId) {
      myAttendanceHistory = await prisma.attendance.findMany({
        where: { employeeId: session.user.employeeDbId },
        orderBy: { attendanceDate: "desc" },
        take: 10,
      });
    }

    // 2. Fetch user's own leave activity
    let myLeaveHistory: any[] = [];
    if (session.user.employeeDbId) {
      myLeaveHistory = await prisma.leaveRequest.findMany({
        where: { employeeId: session.user.employeeDbId },
        include: { leaveType: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    }

    // 3. For Admins/Super Admins, fetch system-wide or tenant-wide activity logs
    let systemAuditLogs: any[] = [];
    if (isAdmin) {
      const logWhere: any = {};
      if (!isSuperAdmin && session.user.companyId) {
        logWhere.OR = [
          { companyId: session.user.companyId },
          { user: { companyId: session.user.companyId } },
        ];
      }

      systemAuditLogs = await prisma.activityLog.findMany({
        where: logWhere,
        include: {
          user: {
            select: {
              id: true,
              employeeId: true,
              email: true,
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  profileImage: true,
                },
              },
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              initials: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
    }

    return Response.json({
      success: true,
      data: {
        myAttendanceHistory,
        myLeaveHistory,
        systemAuditLogs,
      },
      message: "OK",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[HISTORY_GET]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
