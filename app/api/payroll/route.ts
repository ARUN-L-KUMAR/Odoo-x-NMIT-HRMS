import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/permissions";

// GET /api/payroll — admin: all salary structures
export async function GET() {
  try {
    const session = await requireAdmin();

    const salaries = await prisma.salaryStructure.findMany({
      where: session.user.companyId ? { employee: { companyId: session.user.companyId } } : {},
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            department: true,
            profileImage: true,
            employmentStatus: true,
            user: { select: { employeeId: true, email: true } },
          },
        },
      },
      orderBy: { employee: { firstName: "asc" } },
    });

    return Response.json({ success: true, data: salaries, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
    }
    console.error("[PAYROLL_ALL]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
