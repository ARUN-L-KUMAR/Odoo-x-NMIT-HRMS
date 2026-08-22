import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";

// GET /api/leave/me — employee's own leave requests
export async function GET() {
  try {
    const session = await requireAuth();
    const employeeId = session.user.employeeDbId;

    if (!employeeId) {
      return Response.json({ success: true, data: [], message: "No employee profile" });
    }

    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId },
      include: {
        leaveType: true,
        reviewer: { select: { id: true, employeeId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ success: true, data: requests, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[LEAVE_ME]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
