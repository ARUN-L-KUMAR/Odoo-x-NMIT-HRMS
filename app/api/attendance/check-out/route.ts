import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { startOfDay, differenceInMinutes } from "date-fns";

// POST /api/attendance/check-out
export async function POST() {
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

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_attendanceDate: { employeeId, attendanceDate: today } },
    });

    if (!existing || !existing.checkIn) {
      return Response.json(
        { success: false, error: { code: "BAD_REQUEST", message: "You haven't checked in today" } },
        { status: 400 }
      );
    }

    if (existing.checkOut) {
      return Response.json(
        { success: false, error: { code: "CONFLICT", message: "You have already checked out today" } },
        { status: 409 }
      );
    }

    const now = new Date();

    // Check-out cannot be before check-in
    if (now < existing.checkIn) {
      return Response.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Check-out time cannot be before check-in" } },
        { status: 400 }
      );
    }

    const workedMinutes = differenceInMinutes(now, existing.checkIn);

    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: now,
        workedMinutes,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "EMPLOYEE_CHECKED_OUT",
        entityType: "attendance",
        entityId: attendance.id,
        description: `${session.user.name || session.user.employeeId} checked out`,
        createdAt: now,
      },
    });

    return Response.json({ success: true, data: attendance, message: "Checked out successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[CHECK_OUT]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
