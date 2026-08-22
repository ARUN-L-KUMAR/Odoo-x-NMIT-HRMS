import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";

// GET /api/leave/balances — returns leave balance per type for current employee
export async function GET() {
  try {
    const session = await requireAuth();
    const employeeId = session.user.employeeDbId;

    if (!employeeId) {
      return Response.json({ success: true, data: [], message: "No employee profile" });
    }

    const leaveTypes = await prisma.leaveType.findMany({ where: { isActive: true } });
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: { employeeId, status: "APPROVED" },
      select: { leaveTypeId: true, totalDays: true },
    });

    const balances = leaveTypes.map((lt: { id: string; name: string; isPaid: boolean; annualLimit: number | null }) => {
      const used = approvedLeaves
        .filter((lr: { leaveTypeId: string; totalDays: number | { toNumber: () => number } }) => lr.leaveTypeId === lt.id)
        .reduce((sum: number, lr: { totalDays: number | { toNumber: () => number } }) => sum + Number(lr.totalDays), 0);
      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        isPaid: lt.isPaid,
        annualLimit: lt.annualLimit,
        used,
        remaining: lt.annualLimit ? lt.annualLimit - used : null,
      };
    });

    return Response.json({ success: true, data: balances, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
