import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { startOfDay } from "date-fns";

// GET /api/attendance/today
export async function GET() {
  try {
    const session = await requireAuth();

    if (!session.user.employeeDbId) {
      return Response.json({ success: true, data: null, message: "No employee profile" });
    }

    const today = startOfDay(new Date());

    const attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_attendanceDate: {
          employeeId: session.user.employeeDbId,
          attendanceDate: today,
        },
      },
    });

    return Response.json({ success: true, data: attendance, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[ATTENDANCE_TODAY]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
