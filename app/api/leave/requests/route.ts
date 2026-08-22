import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth/permissions";
import { LeaveStatus } from "@/lib/enums";

// GET /api/leave/requests — admin: all, filters supported
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const isAdmin = session.user.role === "ADMIN" || isSuperAdmin;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as LeaveStatus | null;
    const employeeId = searchParams.get("employeeId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const filterCompanyId = searchParams.get("companyId");

    const where: any = {};

    if (!isAdmin) {
      // Employees can only view their own
      if (session.user.employeeDbId) {
        where.employeeId = session.user.employeeDbId;
      }
    } else {
      if (employeeId) where.employeeId = employeeId;
      if (isSuperAdmin) {
        if (filterCompanyId && filterCompanyId !== "ALL") {
          where.employee = { ...(where.employee || {}), companyId: filterCompanyId };
        }
      } else if (session.user.companyId) {
        where.employee = { ...(where.employee || {}), companyId: session.user.companyId };
      }
    }

    if (status) where.status = status;
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from);
      if (to) where.startDate.lte = new Date(to);
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        leaveType: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            department: true,
            designation: true,
            companyId: true,
            company: {
              select: {
                id: true,
                name: true,
                initials: true,
                logoUrl: true,
              },
            },
          },
        },
        reviewer: { select: { id: true, employeeId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json({ success: true, data: requests, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[LEAVE_REQUESTS_GET]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
