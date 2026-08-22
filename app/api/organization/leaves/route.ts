import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";

// POST /api/organization/leaves — Create a new leave policy for current organization
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await req.json();
    const { name, isPaid, annualLimit, description } = body;

    if (!name || !name.trim()) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Leave policy name is required" } },
        { status: 422 }
      );
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "No active organization" } },
        { status: 404 }
      );
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        name: name.trim(),
        isPaid: isPaid ?? true,
        annualLimit: annualLimit !== undefined && annualLimit !== null ? parseInt(annualLimit, 10) : null,
        description: description?.trim() || null,
        companyId,
        isActive: true,
      },
    });

    return Response.json({
      success: true,
      data: leaveType,
      message: "Leave policy created successfully",
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return Response.json(
        { success: false, error: { code: error.message, message: "Forbidden" } },
        { status: error.message === "UNAUTHORIZED" ? 401 : 403 }
      );
    }
    console.error("[ORG_LEAVES_POST]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
