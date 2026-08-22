import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireAdmin, canAccessEmployee } from "@/lib/auth/permissions";
import { createEmployeeSchema } from "@/lib/validations";
import { hashPassword } from "@/lib/auth/password";
import { errorResponse } from "@/lib/utils";
import { Role } from "@/lib/enums";

const employeeSelect = {
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
  user: {
    select: {
      id: true,
      employeeId: true,
      email: true,
      role: true,
    },
  },
};

// GET /api/employees — admin: all, employee: own
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isAdmin) {
      // Employee can only see their own record
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: employeeSelect,
      });
      return Response.json({ success: true, data: employee ? [employee] : [], message: "OK" });
    }

    const where: any = {};
    if (department) where.department = department;
    if (status) where.employmentStatus = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { user: { employeeId: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      select: employeeSelect,
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ success: true, data: employees, message: "OK" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
    }
    console.error("[EMPLOYEES_GET]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}

// POST /api/employees — admin only
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid data", parsed.error.flatten().fieldErrors as Record<string, string[]>, 422);
    }

    const { employeeId, email, password, firstName, lastName, phone, designation, department, joiningDate, employmentStatus } = parsed.data;

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { employeeId }] } });
    if (existing) {
      return errorResponse("CONFLICT", "Email or Employee ID already exists", {}, 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        employeeId,
        email,
        passwordHash,
        role: Role.EMPLOYEE,
        employee: {
          create: {
            firstName,
            lastName,
            phone,
            designation,
            department,
            joiningDate: joiningDate ? new Date(joiningDate) : undefined,
            employmentStatus: employmentStatus as any,
          },
        },
      },
      include: { employee: { select: employeeSelect } },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "EMPLOYEE_CREATED",
        entityType: "employee",
        entityId: user.employee?.id,
        description: `Employee ${firstName} ${lastName} (${employeeId}) created`,
      },
    });

    return Response.json({ success: true, data: user.employee, message: "Employee created" }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return Response.json({ success: false, error: { code: error.message, message: error.message === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden" } }, { status: error.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    console.error("[EMPLOYEES_POST]", error);
    return Response.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, { status: 500 });
  }
}
