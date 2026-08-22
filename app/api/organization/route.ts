import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth/permissions";
import { Role } from "@/lib/enums";

// GET /api/organization — Return current tenant organization details and stats
export async function GET() {
  try {
    const session = await requireAuth();
    const companyId = session.user.companyId;

    let company = null;
    if (companyId) {
      company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          leaveTypes: {
            where: { isActive: true },
            select: { id: true, name: true, isPaid: true, annualLimit: true },
          },
        },
      });
    }

    // Fallback if user doesn't have companyId attached yet
    if (!company) {
      company = await prisma.company.findFirst({
        include: {
          leaveTypes: {
            where: { isActive: true },
            select: { id: true, name: true, isPaid: true, annualLimit: true },
          },
        },
      });
    }

    if (!company) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
        { status: 404 }
      );
    }

    const currentCompanyId = company.id;

    // Fetch tenant-scoped stats
    const [totalEmployees, activeEmployees, departmentGroups, recentLogs] = await Promise.all([
      prisma.employee.count({
        where: { companyId: currentCompanyId },
      }),
      prisma.employee.count({
        where: { companyId: currentCompanyId, employmentStatus: "ACTIVE" },
      }),
      prisma.employee.groupBy({
        by: ["department"],
        _count: { id: true },
        where: { companyId: currentCompanyId, department: { not: null } },
      }),
      prisma.activityLog.findMany({
        where: { companyId: currentCompanyId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          user: { select: { employeeId: true } },
        },
      }),
    ]);

    const departments = departmentGroups.map((d: any) => ({
      name: d.department || "General",
      count: d._count.id,
    }));

    return Response.json({
      success: true,
      data: {
        id: company.id,
        name: company.name,
        initials: company.initials,
        logoUrl: company.logoUrl,
        createdAt: company.createdAt,
        stats: {
          totalEmployees,
          activeEmployees,
          departmentsCount: departments.length,
          departments,
        },
        leaveTypes: company.leaveTypes,
        recentActivity: recentLogs,
      },
      message: "OK",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    console.error("[ORGANIZATION_GET]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}

// PATCH /api/organization — Admin updates organization profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { name, initials, logoUrl } = body;

    let companyId = session.user.companyId;
    if (!companyId) {
      const first = await prisma.company.findFirst();
      companyId = first?.id;
    }

    if (!companyId) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
        { status: 404 }
      );
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(initials ? { initials: initials.trim().toUpperCase() } : {}),
        ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}),
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        companyId: updated.id,
        action: "ORGANIZATION_UPDATED",
        entityType: "company",
        entityId: updated.id,
        description: `Organization profile "${updated.name}" was updated by admin`,
      },
    });

    return Response.json({
      success: true,
      data: updated,
      message: "Organization updated successfully",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return Response.json(
        {
          success: false,
          error: {
            code: error.message,
            message: error.message === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden",
          },
        },
        { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
      );
    }
    console.error("[ORGANIZATION_PATCH]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
