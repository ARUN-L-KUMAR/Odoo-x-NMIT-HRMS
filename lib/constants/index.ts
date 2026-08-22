// App-wide constants

export const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Product",
  "Marketing",
  "Sales",
  "Human Resources",
  "Finance",
  "Operations",
  "Customer Support",
  "Legal",
] as const;

export const EMPLOYMENT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ON_NOTICE", label: "On Notice" },
  { value: "TERMINATED", label: "Terminated" },
] as const;

export const ATTENDANCE_STATUS_CONFIG = {
  PRESENT: { label: "Present", color: "success" },
  ABSENT: { label: "Absent", color: "destructive" },
  HALF_DAY: { label: "Half Day", color: "warning" },
  LEAVE: { label: "On Leave", color: "info" },
} as const;

export const LEAVE_STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "warning" },
  APPROVED: { label: "Approved", color: "success" },
  REJECTED: { label: "Rejected", color: "destructive" },
} as const;

export const EMPLOYMENT_STATUS_CONFIG = [
  { value: "ACTIVE", label: "Active", color: "success" },
  { value: "INACTIVE", label: "Inactive", color: "secondary" },
  { value: "ON_NOTICE", label: "On Notice", color: "warning" },
  { value: "TERMINATED", label: "Terminated", color: "destructive" },
] as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  EMPLOYEE_CHECKED_IN: "Checked in",
  EMPLOYEE_CHECKED_OUT: "Checked out",
  LEAVE_APPLIED: "Applied for leave",
  LEAVE_APPROVED: "Leave approved",
  LEAVE_REJECTED: "Leave rejected",
  EMPLOYEE_CREATED: "Employee created",
  SALARY_UPDATED: "Salary updated",
  PROFILE_UPDATED: "Profile updated",
};

export const DEMO_ACCOUNTS = {
  superAdmin: {
    email: "superadmin@dayflow.demo",
    password: "SuperAdmin@123",
    role: "Super Admin",
    employeeId: "SUPER001",
  },
  admin: {
    email: "admin@dayflow.demo",
    password: "Admin@123",
    role: "Admin",
    employeeId: "ADM001",
  },
  employee: {
    email: "arun@dayflow.demo",
    password: "Employee@123",
    role: "Employee",
    employeeId: "EMP001",
  },
};

export const PAGINATION_LIMIT = 10;
