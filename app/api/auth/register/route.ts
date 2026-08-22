import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations";
import { errorResponse } from "@/lib/utils";
import { Role } from "@/lib/enums";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid request data",
        parsed.error.flatten().fieldErrors as Record<string, string[]>,
        422
      );
    }

    const { employeeId, email, password, role } = parsed.data;

    // Check uniqueness
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { employeeId }] },
    });

    if (existing) {
      const field = existing.email === email ? "email" : "employeeId";
      const msg =
        field === "email"
          ? "An account with this email already exists"
          : "An account with this Employee ID already exists";
      return errorResponse("CONFLICT", msg, { [field]: [msg] }, 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        employeeId,
        email,
        passwordHash,
        role: role as Role,
      },
      select: {
        id: true,
        employeeId: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return Response.json(
      {
        success: true,
        data: user,
        message: "Account created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER]", error);
    return errorResponse("INTERNAL_ERROR", "Something went wrong", {}, 500);
  }
}
