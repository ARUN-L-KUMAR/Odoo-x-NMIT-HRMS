import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth/permissions";

// GET /api/organization/departments — Get distinct departments for the tenant from DB
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const targetCompanyId = searchParams.get("companyId");
    const companyId = targetCompanyId || session.user.companyId;

    // Group employees by department for this organization
    const grouped = await prisma.employee.groupBy({
      by: ["department"],
      where: {
        ...(companyId ? { companyId } : {}),
        department: { not: null },
      },
      _count: { id: true },
      orderBy: { department: "asc" },
    });

    const activeDepts = grouped
      .map((g) => g.department?.trim())
      .filter((d): d is string => !!d && d.length > 0);

    const fallback = [
      "Engineering",
      "Design",
      "Human Resources",
      "Marketing",
      "Sales",
      "Finance",
    ];

    const allDepts = Array.from(
      new Set([...activeDepts, ...(activeDepts.length === 0 ? fallback : [])])
    ).sort();

    return Response.json({
      success: true,
      data: allDepts,
      message: "OK",
    });
  } catch (error: any) {
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

// POST /api/organization/departments — Create/Rename a department

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { name, oldName } = body;

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Department name is required" } },
        { status: 422 }
      );
    }

    const companyId = session.user.companyId;

    // If renaming an existing department across all employees of this company
    if (oldName) {
      await prisma.employee.updateMany({
        where: {
          department: oldName,
          ...(companyId ? { companyId } : {}),
        },
        data: { department: name.trim() },
      });
    }

    return Response.json({
      success: true,
      data: { name: name.trim() },
      message: oldName ? `Department renamed to "${name.trim()}"` : `Department "${name.trim()}" created`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return Response.json(
        { success: false, error: { code: error.message, message: "Forbidden" } },
        { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
      );
    }
    console.error("[ORG_DEPARTMENTS_POST]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}

// DELETE /api/organization/departments — Remove a department (clear from employees)
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const department = searchParams.get("name");

    if (!department) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Department name is required" } },
        { status: 400 }
      );
    }

    const companyId = session.user.companyId;

    await prisma.employee.updateMany({
      where: {
        department,
        ...(companyId ? { companyId } : {}),
      },
      data: { department: null },
    });

    return Response.json({
      success: true,
      data: null,
      message: `Department "${department}" removed`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return Response.json(
        { success: false, error: { code: error.message, message: "Forbidden" } },
        { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
      );
    }
    console.error("[ORG_DEPARTMENTS_DELETE]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
