import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/permissions";

// POST /api/organization/switch — Switch current active tenant organization (SUPER_ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const body = await req.json();
    const { companyId } = body;

    if (!companyId) {
      return Response.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Company ID is required" } },
        { status: 400 }
      );
    }

    const targetCompany = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!targetCompany) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Target organization not found" } },
        { status: 404 }
      );
    }

    // Update user's active company
    await prisma.user.update({
      where: { id: session.user.id },
      data: { companyId: targetCompany.id },
    });

    // Also update employee profile if associated
    if (session.user.employeeDbId) {
      await prisma.employee.update({
        where: { id: session.user.employeeDbId },
        data: { companyId: targetCompany.id },
      });
    }

    return Response.json({
      success: true,
      data: {
        companyId: targetCompany.id,
        companyName: targetCompany.name,
        companyInitials: targetCompany.initials,
        companyLogo: targetCompany.logoUrl,
      },
      message: `Switched to ${targetCompany.name}`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    console.error("[ORGANIZATION_SWITCH]", error);
    return Response.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
