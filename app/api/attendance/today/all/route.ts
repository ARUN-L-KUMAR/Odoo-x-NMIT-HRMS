import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";

/**
 * GET /api/attendance/today/all
 * Returns today's attendance status for all employees (for directory status dots).
 * Visible to all authenticated employees and admins so everyone can see who is Present / On Leave / Absent.
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const companyFilter = session.user.companyId ? { companyId: session.user.companyId } : {};

    const [allEmployees, todayRecords] = await Promise.all([
      prisma.employee.findMany({
        where: companyFilter,
        select: { id: true },
      }),
      prisma.attendance.findMany({
        where: {
          attendanceDate: today,
          employee: companyFilter,
        },
        select: {
          employeeId: true,
          status: true,
          checkIn: true,
          checkOut: true,
        },
      }),
    ]);

    const recordMap = new Map<string, { employeeId: string; status: string; checkIn: Date | null; checkOut: Date | null }>(
      todayRecords.map((r: any) => [r.employeeId, r])
    );

    const data = allEmployees.map((emp: { id: string }) => {
      const record = recordMap.get(emp.id);
      let status = "ABSENT";
      if (record) {
        if (record.status === "LEAVE") status = "LEAVE";
        else if (record.status === "HALF_DAY") status = "HALF_DAY";
        else if (record.checkIn) status = "PRESENT";
        else status = record.status;
      }
      return {
        employeeId: emp.id,
        status,
        checkedIn: !!record?.checkIn,
        checkedOut: !!record?.checkOut,
      };
    });

    return Response.json({ success: true, data, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    console.error("[ATTENDANCE_TODAY_ALL]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
