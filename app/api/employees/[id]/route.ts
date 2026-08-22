import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/permissions";
import { updateEmployeeSchema, selfUpdateEmployeeSchema } from "@/lib/validations";
import { errorResponse } from "@/lib/utils";
import { Role } from "@/lib/enums";

// Public fields visible to all authenticated users
const publicEmployeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  designation: true,
  department: true,
  joiningDate: true,
  employmentStatus: true,
  profileImage: true,
  user: {
    select: {
      id: true,
      employeeId: true,
    },
  },
};

// Full fields for admin only
const adminEmployeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  postalCode: true,
  designation: true,
  department: true,
  joiningDate: true,
  employmentStatus: true,
  profileImage: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      employeeId: true,
      email: true,
      role: true,
    },
  },
  salaryStructure: true,
};

// For PATCH operations
const employeeSelect = adminEmployeeSelect;

// GET /api/employees/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const isAdmin = session.user.role === Role.ADMIN;

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: isAdmin ? adminEmployeeSelect : publicEmployeeSelect,
    });

    if (!employee) {
      return Response.json({ success: false, error: { code: "NOT_FOUND", message: "Employee not found" } }, { status: 404 });
    }

    return Response.json({ success: true, data: employee, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    console.error("[EMPLOYEE_GET]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

// PATCH /api/employees/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isAdmin && session.user.employeeDbId !== id) {
      return Response.json({ success: false, error: { code: "FORBIDDEN", message: "You can only update your own profile" } }, { status: 403 });
    }

    const body = await req.json();

    // Employees can only update limited fields
    const schema = isAdmin ? updateEmployeeSchema : selfUpdateEmployeeSchema;
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid data", parsed.error.flatten().fieldErrors as Record<string, string[]>, 422);
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...parsed.data,
        joiningDate: (parsed.data as any).joiningDate
          ? new Date((parsed.data as any).joiningDate)
          : undefined,
      },
      select: employeeSelect,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "PROFILE_UPDATED",
        entityType: "employee",
        entityId: id,
        description: `${employee.firstName} ${employee.lastName}'s profile was updated`,
      },
    });

    return Response.json({ success: true, data: employee, message: "Employee updated" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    console.error("[EMPLOYEE_PATCH]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

// DELETE /api/employees/:id — admin only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    if (session.user.role !== Role.ADMIN) {
      return Response.json({ success: false, error: { code: "FORBIDDEN", message: "Admin only" } }, { status: 403 });
    }

    await prisma.employee.delete({ where: { id } });

    return Response.json({ success: true, data: null, message: "Employee deleted" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    console.error("[EMPLOYEE_DELETE]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
