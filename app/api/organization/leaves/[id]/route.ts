import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";

// PATCH /api/organization/leaves/:id — Update leave policy
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { name, isPaid, annualLimit, description } = body;

    const existing = await prisma.leaveType.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Leave policy not found" } },
        { status: 404 }
      );
    }

    const updated = await prisma.leaveType.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(isPaid !== undefined ? { isPaid } : {}),
        ...(annualLimit !== undefined
          ? { annualLimit: annualLimit !== null ? parseInt(annualLimit, 10) : null }
          : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
      },
    });

    return Response.json({
      success: true,
      data: updated,
      message: "Leave policy updated successfully",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return Response.json(
        { success: false, error: { code: error.message, message: "Forbidden" } },
        { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
      );
    }
    console.error("[ORG_LEAVES_PATCH]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}

// DELETE /api/organization/leaves/:id — Delete leave policy
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.leaveType.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Leave policy not found" } },
        { status: 404 }
      );
    }

    await prisma.leaveType.delete({
      where: { id },
    });

    return Response.json({
      success: true,
      data: null,
      message: "Leave policy deleted successfully",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return Response.json(
        { success: false, error: { code: error.message, message: "Forbidden" } },
        { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
      );
    }
    console.error("[ORG_LEAVES_DELETE]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
