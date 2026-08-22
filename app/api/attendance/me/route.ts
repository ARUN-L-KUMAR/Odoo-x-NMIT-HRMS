import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";

// GET /api/attendance/me?from=&to=
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!session.user.employeeDbId) {
      return Response.json({ success: true, data: [], message: "No employee profile" });
    }

    const where: any = { employeeId: session.user.employeeDbId };

    if (from || to) {
      where.attendanceDate = {};
      if (from) where.attendanceDate.gte = new Date(from);
      if (to) where.attendanceDate.lte = new Date(to);
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { attendanceDate: "desc" },
      take: 90,
    });

    return Response.json({ success: true, data: records, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[ATTENDANCE_ME]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
