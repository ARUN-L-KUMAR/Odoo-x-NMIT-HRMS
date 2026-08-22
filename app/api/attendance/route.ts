import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { Role, AttendanceStatus } from "@/lib/enums";


// GET /api/attendance — admin: all (filterable), employee: redirect to /me
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const isAdmin = session.user.role === Role.ADMIN;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: any = {};

    if (!isAdmin) {
      // Employee can only access their own attendance
      if (!session.user.employeeDbId) {
        return Response.json({ success: true, data: [], message: "No employee profile" });
      }
      where.employeeId = session.user.employeeDbId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (from || to) {
      where.attendanceDate = {};
      if (from) where.attendanceDate.gte = new Date(from);
      if (to) where.attendanceDate.lte = new Date(to);
    }

    if (status) {
      where.status = status as AttendanceStatus;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            department: true,
            designation: true,
          },
        },
      },
      orderBy: { attendanceDate: "desc" },
      take: 100,
    });

    return Response.json({ success: true, data: records, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[ATTENDANCE_GET]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
