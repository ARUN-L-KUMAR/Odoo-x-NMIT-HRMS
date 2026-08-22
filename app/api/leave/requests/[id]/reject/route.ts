import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";
import { LeaveStatus } from "@/lib/enums";

// PATCH /api/leave/requests/:id/reject
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

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: LeaveStatus.REJECTED,
        reviewedBy: session.user.id,
        reviewedAt: now,
        adminComment: comment || null,
      },
      include: {
        leaveType: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "LEAVE_REJECTED",
        entityType: "leave",
        entityId: id,
        description: `Admin rejected ${updated.employee.firstName} ${updated.employee.lastName}'s ${updated.leaveType.name} request`,
      },
    });

    return Response.json({ success: true, data: updated, message: "Leave rejected" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
    }
    console.error("[LEAVE_REJECT]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
