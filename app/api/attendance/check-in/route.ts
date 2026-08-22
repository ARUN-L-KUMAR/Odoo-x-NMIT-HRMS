import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { startOfDay } from "date-fns";


// POST /api/attendance/check-in
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

    // Check if already checked in today
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_attendanceDate: { employeeId, attendanceDate: today } },
    });

    if (existing) {
      if (existing.checkIn) {
        return Response.json(
          { success: false, error: { code: "CONFLICT", message: "You have already checked in today" } },
          { status: 409 }
        );
      }
    }

    const now = new Date();

    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkIn: now, status: "PRESENT" as const },
        })
      : await prisma.attendance.create({
          data: {
            employeeId,
            attendanceDate: today,
            checkIn: now,
            status: "PRESENT" as const,
          },
        });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "EMPLOYEE_CHECKED_IN",
        entityType: "attendance",
        entityId: attendance.id,
        description: `${session.user.name || session.user.employeeId} checked in`,
        createdAt: now,
      },
    });

    return Response.json({ success: true, data: attendance, message: "Checked in successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[CHECK_IN]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
