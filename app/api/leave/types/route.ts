import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";

// GET /api/leave/types
export async function GET() {
  try {
    await requireAuth();

    const types = await prisma.leaveType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return Response.json({ success: true, data: types, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
