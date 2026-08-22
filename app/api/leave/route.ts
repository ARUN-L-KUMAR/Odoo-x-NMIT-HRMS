import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { createLeaveSchema } from "@/lib/validations";
import { errorResponse } from "@/lib/utils";
import { differenceInCalendarDays } from "date-fns";

// POST /api/leave — employee applies for leave
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const employeeId = session.user.employeeDbId;

    if (!employeeId) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Employee profile not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = createLeaveSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid request data",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
        422
      );
    }

    const { leaveTypeId, startDate, endDate, reason } = parsed.data;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = differenceInCalendarDays(end, start) + 1;

    // Check for overlapping leave
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });

    if (overlap) {
      return errorResponse(
        "CONFLICT",
        "You already have a leave request overlapping these dates",
        {},
        409
      );
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
      },
      include: {
        leaveType: true,
        employee: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "LEAVE_APPLIED",
        entityType: "leave",
        entityId: leaveRequest.id,
        description: `${session.user.name || session.user.employeeId} applied for ${leaveRequest.leaveType.name}`,
      },
    });

    return Response.json(
      { success: true, data: leaveRequest, message: "Leave request submitted" },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[LEAVE_POST]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
