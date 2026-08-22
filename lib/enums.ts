/**
 * Re-exports from the Prisma generated client directly.
 * Bypasses @prisma/client's re-export chain which can confuse
 * some IDE language servers with Prisma 7's new module structure.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – generated path is always present after `prisma generate`
export {
  Role,
  AttendanceStatus,
  LeaveStatus,
  EmploymentStatus,
} from ".prisma/client";

// Convenient string literal types (safe for client-side code without Prisma)
export type RoleType = "ADMIN" | "EMPLOYEE";
export type AttendanceStatusType = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
export type LeaveStatusType = "PENDING" | "APPROVED" | "REJECTED";
export type EmploymentStatusType = "ACTIVE" | "INACTIVE" | "ON_NOTICE" | "TERMINATED";
