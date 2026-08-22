export {
  Role,
  AttendanceStatus,
  LeaveStatus,
  EmploymentStatus,
} from "@prisma/client";


// Convenient string literal types (safe for client-side code without Prisma)
export type RoleType = "ADMIN" | "EMPLOYEE";
export type AttendanceStatusType = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
export type LeaveStatusType = "PENDING" | "APPROVED" | "REJECTED";
export type EmploymentStatusType = "ACTIVE" | "INACTIVE" | "ON_NOTICE" | "TERMINATED";
