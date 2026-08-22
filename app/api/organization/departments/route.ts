import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";

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
