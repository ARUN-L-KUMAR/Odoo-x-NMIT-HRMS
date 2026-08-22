import { auth } from "@/auth";
import { Role } from "@/lib/enums";

// ─── Permission Definitions ───────────────────────────────────────────────────

export const PERMISSIONS = {
  employee: {
    profile: ["read:own", "update:own"],
    attendance: ["read:own", "checkin", "checkout"],
    leave: ["create", "read:own"],
    payroll: ["read:own"],
  },
  admin: {
    employees: ["create", "read", "update", "delete"],
    attendance: ["read:all", "read:own"],
    leave: ["read:all", "approve", "reject"],
    payroll: ["read:all", "create", "update"],
    reports: ["read"],
  },
} as const;

// ─── Server-side Helpers ──────────────────────────────────────────────────────

/**
 * Require authentication on a server action or route handler.
 * Returns the session or throws.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Require a specific role or array of roles.
 */
export async function requireRole(roles: Role | Role[]) {
  const session = await requireAuth();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.user.role as Role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * Require admin or super admin role.
 */
export async function requireAdmin() {
  return requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
}

/**
 * Require super admin role only.
 */
export async function requireSuperAdmin() {
  return requireRole(Role.SUPER_ADMIN);
}

/**
 * Check if user is admin or super admin.
 */
export function isAdmin(role: string | undefined | null): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

/**
 * Check if user is super admin.
 */
export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === Role.SUPER_ADMIN;
}

/**
 * Check if the current user can access a specific employee's resource.
 * Admin/SuperAdmin can access all, employee can only access their own.
 */
export function canAccessEmployee(
  requesterRole: string,
  requesterEmployeeDbId: string | null | undefined,
  targetEmployeeId: string
): boolean {
  if (requesterRole === Role.ADMIN || requesterRole === Role.SUPER_ADMIN) return true;
  return requesterEmployeeDbId === targetEmployeeId;
}

/**
 * Build a standard unauthorized API response.
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json(
    { success: false, error: { code: "UNAUTHORIZED", message } },
    { status: 401 }
  );
}

/**
 * Build a standard forbidden API response.
 */
export function forbiddenResponse(message = "Forbidden") {
  return Response.json(
    { success: false, error: { code: "FORBIDDEN", message } },
    { status: 403 }
  );
}
