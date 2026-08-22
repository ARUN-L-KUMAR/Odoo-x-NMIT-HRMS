import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { Role, AttendanceStatus } from "@/lib/enums";

// GET /api/attendance — admin: all (filterable), employee: their own records
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;
    const isAdmin = session.user.role === Role.ADMIN || isSuperAdmin;
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const filterCompanyId = searchParams.get("companyId");

    const where: any = {};

    if (!isAdmin) {
      // Employee can only access their own attendance
      if (!session.user.employeeDbId) {
        return Response.json({ success: true, data: [], message: "No employee profile" });
      }
      where.employeeId = session.user.employeeDbId;
    } else {
      if (employeeId) {
        where.employeeId = employeeId;
      }
      if (isSuperAdmin) {
        if (filterCompanyId && filterCompanyId !== "ALL") {
          where.employee = { ...(where.employee || {}), companyId: filterCompanyId };
        }
      } else if (session.user.companyId) {
        where.employee = { ...(where.employee || {}), companyId: session.user.companyId };
      }
    }

    if (date) {
      const d = new Date(date);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.attendanceDate = { gte: start, lte: end };
    } else if (from || to) {
      where.attendanceDate = {};
      if (from) {
        const start = new Date(from);
        start.setHours(0, 0, 0, 0);
        where.attendanceDate.gte = start;
      }
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.attendanceDate.lte = end;
      }
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
            company: {
              select: {
                id: true,
                name: true,
                initials: true,
                logoUrl: true,
              },
            },
            user: {
              select: {
                employeeId: true,
                email: true,
              },
            },
          },
        },
      },

      orderBy: { attendanceDate: "desc" },
      take: 200,
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
