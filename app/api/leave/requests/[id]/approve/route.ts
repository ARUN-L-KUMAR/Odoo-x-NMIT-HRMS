import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";
import { AttendanceStatus, LeaveStatus } from "@/lib/enums";
import { eachDayOfInterval, startOfDay } from "date-fns";

// PATCH /api/leave/requests/:id/approve
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const comment = body?.comment;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true, leaveType: true },
    });

    if (!leaveRequest) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Leave request not found" } },
        { status: 404 }
      );
    }

    if (leaveRequest.status !== LeaveStatus.PENDING) {
      return Response.json(
        { success: false, error: { code: "CONFLICT", message: "Leave request is not pending" } },
        { status: 409 }
      );
    }

    const now = new Date();

    // Update leave request status
    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.APPROVED,
        reviewedBy: session.user.id,
        reviewedAt: now,
        adminComment: comment || null,
      },
      include: {
        leaveType: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Mark attendance as LEAVE for each day in the range
    const days = eachDayOfInterval({
      start: new Date(leaveRequest.startDate),
      end: new Date(leaveRequest.endDate),
    });

    for (const day of days) {
      const dayStart = startOfDay(day);
      // Skip weekends
      const dow = dayStart.getDay();
      if (dow === 0 || dow === 6) continue;

      await prisma.attendance.upsert({
        where: {
          employeeId_attendanceDate: {
            employeeId: leaveRequest.employeeId,
            attendanceDate: dayStart,
          },
        },
        update: { status: AttendanceStatus.LEAVE },
        create: {
          employeeId: leaveRequest.employeeId,
          attendanceDate: dayStart,
          status: AttendanceStatus.LEAVE,
          workedMinutes: 0,
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "LEAVE_APPROVED",
        entityType: "leave",
        entityId: id,
        description: `Admin approved ${updated.employee.firstName} ${updated.employee.lastName}'s ${updated.leaveType.name} request`,
      },
    });

    return Response.json({ success: true, data: updated, message: "Leave approved" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
    }
    console.error("[LEAVE_APPROVE]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
