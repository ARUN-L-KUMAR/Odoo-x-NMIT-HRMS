import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";

// GET /api/payroll/me — Fetch current authenticated user's salary structure & payslip profile
export async function GET() {
  try {
    const session = await requireAuth();

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
            profileImage: true,
            employmentStatus: true,
            joiningDate: true,
            bankAccountNumber: true,
            bankName: true,
            bankIfsc: true,
            panNumber: true,
            uanNumber: true,
            company: {
              select: {
                id: true,
                name: true,
                initials: true,
                logoUrl: true,
              },
            },
            user: { select: { employeeId: true, email: true } },
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
