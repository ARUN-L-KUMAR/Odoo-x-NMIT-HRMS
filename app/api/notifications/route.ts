import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { Role } from "@/lib/enums";

// GET /api/notifications — fetch user notifications with auto-generated system alerts
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;
    const isAdmin = session.user.role === Role.ADMIN || isSuperAdmin;

    // 1. Fetch persistent database notifications
    const where: any = {
      OR: [
        { userId },
        ...(session.user.companyId ? [{ companyId: session.user.companyId, userId }] : []),
      ],
    };

    let notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 2. If user has few or no notifications, seed realistic system notifications based on real DB events
    if (notifications.length === 0) {
      const generated: any[] = [];

      // Check for pending leave requests if admin
      if (isAdmin) {
        const pendingLeaves = await prisma.leaveRequest.findMany({
          where: isSuperAdmin
            ? { status: "PENDING" }
            : session.user.companyId
            ? { status: "PENDING", employee: { companyId: session.user.companyId } }
            : { status: "PENDING" },
          include: { employee: true, leaveType: true },
          take: 3,
        });

        for (const leave of pendingLeaves) {
          generated.push({
            userId,
            companyId: session.user.companyId,
            title: "Leave Request Pending",
            message: `${leave.employee?.firstName} ${leave.employee?.lastName} requested ${leave.totalDays} day(s) ${leave.leaveType?.name || "Leave"}.`,
            type: "LEAVE",
            link: "/time-off",
            isRead: false,
          });
        }
      }

      // Check today's attendance for current user
      if (session.user.employeeDbId) {
        const todayAtt = await prisma.attendance.findFirst({
          where: { employeeId: session.user.employeeDbId },
          orderBy: { attendanceDate: "desc" },
        });

        if (todayAtt?.checkIn) {
          generated.push({
            userId,
            companyId: session.user.companyId,
            title: "Attendance Check-In",
            message: `You successfully checked in at ${new Date(todayAtt.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            type: "ATTENDANCE",
            link: "/attendance",
            isRead: true,
          });
        }
      }

      // Add general welcome/system notification
      generated.push({
        userId,
        companyId: session.user.companyId,
        title: "Welcome to Dayflow HRMS",
        message: "Your organization workspace is fully synced and active.",
        type: "SYSTEM",
        link: "/dashboard",
        isRead: false,
      });

      if (generated.length > 0) {
        await prisma.notification.createMany({
          data: generated,
        });

        notifications = await prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 50,
        });
      }
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return Response.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
      message: "OK",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[NOTIFICATIONS_GET]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

// PATCH /api/notifications — mark one or all as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { id, all } = body;

    if (all) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      });
      return Response.json({ success: true, message: "All notifications marked as read" });
    }

    if (id) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
      return Response.json({ success: true, message: "Notification marked as read" });
    }

    return Response.json({ success: false, error: { code: "BAD_REQUEST", message: "Missing id or all flag" } }, { status: 400 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[NOTIFICATIONS_PATCH]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

// DELETE /api/notifications — delete notification or clear all
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      await prisma.notification.delete({
        where: { id },
      });
      return Response.json({ success: true, message: "Notification deleted" });
    }

    await prisma.notification.deleteMany({
      where: { userId: session.user.id },
    });

    return Response.json({ success: true, message: "All notifications cleared" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[NOTIFICATIONS_DELETE]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
