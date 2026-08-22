import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { Role } from "@/lib/enums";

// GET /api/payroll/me — Admin only (salary info is admin-only per Excalidraw spec)
export async function GET() {
  try {
    const session = await requireAuth();

    // Salary information is admin-only
    if (session.user.role !== Role.ADMIN) {
      return Response.json(
        { success: false, error: { code: "FORBIDDEN", message: "Salary information is restricted to administrators" } },
        { status: 403 }
      );
    }

    if (!session.user.employeeDbId) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: "Employee profile not found" } },
        { status: 404 }
      );
    }

    const salary = await prisma.salaryStructure.findUnique({
      where: { employeeId: session.user.employeeDbId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: true,
          },
        },
      },
    });

    return Response.json({ success: true, data: salary, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[PAYROLL_ME]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
