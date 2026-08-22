import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { changePasswordSchema } from "@/lib/validations";
import { hashPassword, comparePassword } from "@/lib/auth/password";
import { errorResponse } from "@/lib/utils";

// PATCH /api/auth/change-password — authenticated users can change their own password
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid request",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
        422
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // Fetch user with password hash
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return errorResponse("NOT_FOUND", "User not found", {}, 404);
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return errorResponse(
        "INVALID_PASSWORD",
        "Current password is incorrect",
        { currentPassword: ["Incorrect password"] },
        400
      );
    }

    // Update password and clear mustChangePassword flag
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "PASSWORD_CHANGED",
        entityType: "user",
        entityId: session.user.id,
        description: "User changed their password",
      },
    });

    return Response.json({ success: true, data: null, message: "Password changed successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }
    console.error("[CHANGE_PASSWORD]", error);
    return errorResponse("INTERNAL_ERROR", "Something went wrong", {}, 500);
  }
}
