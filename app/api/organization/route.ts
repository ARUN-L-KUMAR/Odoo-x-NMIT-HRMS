import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth/permissions";
import { Role } from "@/lib/enums";

function getCompanyInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// GET /api/organization — Return current tenant details, all organizations list, and stats
export async function GET() {
  try {
    const session = await requireAdmin();
    const companyId = session.user.companyId;


    let company = null;
    if (companyId) {
      company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          leaveTypes: {
            where: { isActive: true },
            select: { id: true, name: true, description: true, isPaid: true, annualLimit: true },
            orderBy: { name: "asc" },
          },
        },
      });
    }

    if (!company) {
      company = await prisma.company.findFirst({
        include: {
          leaveTypes: {
            where: { isActive: true },
            select: { id: true, name: true, description: true, isPaid: true, annualLimit: true },
            orderBy: { name: "asc" },
          },
        },
      });
    }

    if (!company) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "No organization found" } },
        { status: 404 }
      );
    }

    const currentCompanyId = company.id;
    const isSuperAdmin = session.user.role === Role.SUPER_ADMIN;

    // Fetch all companies ONLY for SUPER_ADMIN (Tenant admins only see their own organization)
    const allOrganizations = isSuperAdmin
      ? await prisma.company.findMany({
          select: {
            id: true,
            name: true,
            initials: true,
            logoUrl: true,
            createdAt: true,
            _count: {
              select: { employees: true },
            },
          },
          orderBy: { name: "asc" },
        })
      : [];

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
        notificationEmail: company.notificationEmail,
        createdAt: company.createdAt,
        isSuperAdmin,
        stats: {
          totalEmployees,
          activeEmployees,
          departmentsCount: departments.length,
          departments,
        },
        leaveTypes: company.leaveTypes,
        recentActivity: recentLogs,
        allOrganizations: allOrganizations.map((org) => ({
          id: org.id,
          name: org.name,
          initials: org.initials,
          logoUrl: org.logoUrl,
          employeeCount: org._count.employees,
          createdAt: org.createdAt,
        })),
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

// POST /api/organization — Create a new organization
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { name, initials, logoUrl } = body;

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Organization name is required" } },
        { status: 422 }
      );
    }

    const orgInitials = initials?.trim()
      ? initials.trim().toUpperCase().slice(0, 4)
      : getCompanyInitials(name);

    // Create company + default leave policies
    const company = await prisma.$transaction(async (tx: any) => {
      const created = await tx.company.create({
        data: {
          name: name.trim(),
          initials: orgInitials,
          logoUrl: logoUrl || null,
        },
      });

      const defaultLeaveTypes = [
        { name: "Paid Time Off (PTO)", description: "Standard paid vacation days", isPaid: true, annualLimit: 18 },
        { name: "Sick Leave", description: "Medical and health-related leave", isPaid: true, annualLimit: 12 },
        { name: "Casual Leave", description: "Short planned personal time off", isPaid: true, annualLimit: 10 },
        { name: "Unpaid Leave", description: "Leave without pay", isPaid: false, annualLimit: null },
      ];

      for (const lt of defaultLeaveTypes) {
        await tx.leaveType.create({
          data: {
            ...lt,
            companyId: created.id,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          companyId: created.id,
          action: "ORGANIZATION_CREATED",
          entityType: "company",
          entityId: created.id,
          description: `Organization "${name.trim()}" was created`,
        },
      });

      return created;
    });

    return Response.json(
      {
        success: true,
        data: company,
        message: "Organization created successfully",
      },
      { status: 201 }
    );
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
    console.error("[ORGANIZATION_POST]", error);
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
    const { name, initials, logoUrl, notificationEmail } = body;

    let companyId = session.user.companyId;
    if (!companyId) {
      const first = await prisma.company.findFirst();
      companyId = first?.id ?? null;
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
        ...(notificationEmail !== undefined ? { notificationEmail: notificationEmail?.trim() || null } : {}),
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

// DELETE /api/organization — Delete an organization
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const targetOrgId = searchParams.get("id") || session.user.companyId;

    if (!targetOrgId) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Organization ID is required" } },
        { status: 400 }
      );
    }

    // Ensure we don't delete if it's the only company
    const count = await prisma.company.count();
    if (count <= 1) {
      return Response.json(
        { success: false, error: { code: "CONFLICT", message: "Cannot delete the sole organization in the system" } },
        { status: 409 }
      );
    }

    const company = await prisma.company.findUnique({ where: { id: targetOrgId } });
    if (!company) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
        { status: 404 }
      );
    }

    // Cascade delete company records
    await prisma.company.delete({
      where: { id: targetOrgId },
    });

    // If current active organization was deleted, switch user to another company
    if (session.user.companyId === targetOrgId) {
      const anotherCompany = await prisma.company.findFirst();
      if (anotherCompany) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { companyId: anotherCompany.id },
        });
        if (session.user.employeeDbId) {
          await prisma.employee.update({
            where: { id: session.user.employeeDbId },
            data: { companyId: anotherCompany.id || null },
          });
        }
      }
    }

    return Response.json({
      success: true,
      data: null,
      message: `Organization "${company.name}" was successfully deleted`,
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
    console.error("[ORGANIZATION_DELETE]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
