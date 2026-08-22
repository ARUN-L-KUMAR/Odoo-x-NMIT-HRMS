import type { DefaultSession } from "next-auth";

// ─── NextAuth Type Augmentation ───────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      employeeId: string;
      role: string;
      employeeDbId: string | null;
      department: string | null;
      designation: string | null;
      mustChangePassword: boolean;
      companyId: string | null;
      companyName: string | null;
      companyInitials: string | null;
      companyLogo: string | null;
    } & DefaultSession["user"];
  }
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  initials: string;
  logoUrl: string | null;
  createdAt: string;
}

// ─── Enums (mirrored from Prisma for client use) ───────────────────────────────

export type Role = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "LEAVE";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "ON_NOTICE" | "TERMINATED";

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  employeeId: string;
  email: string;
  role: Role;
  companyId: string | null;
  company?: Company | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  designation: string | null;
  department: string | null;
  joiningDate: string | null;
  employmentStatus: EmploymentStatus;
  profileImage: string | null;
  manager?: string | null;
  location?: string | null;
  // Resume Tab
  about?: string | null;
  whatILoveAboutMyJob?: string | null;
  interestsAndHobbies?: string | null;
  skills?: string[];
  certifications?: string[];
  // Private Info Tab
  dateOfBirth?: string | null;
  nationality?: string | null;
  personalEmail?: string | null;
  gender?: string | null;
  maritalStatus?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankIfsc?: string | null;
  panNumber?: string | null;
  uanNumber?: string | null;
  createdAt: string;
  companyId?: string | null;
  company?: {
    id: string;
    name: string;
    initials: string;
    logoUrl?: string | null;
  } | null;
  user: {
    id: string;
    employeeId: string;
    email: string;
    role: Role;
  };
  // Admin-only, returned when fetched as admin
  salaryStructure?: SalaryStructure | null;
}


// ─── Attendance ───────────────────────────────────────────────────────────────

export interface Attendance {
  id: string;
  employeeId: string;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number;
  status: AttendanceStatus;
  employee?: Pick<Employee, "id" | "firstName" | "lastName" | "profileImage">;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  totalDays: number;
}

// ─── Leave ────────────────────────────────────────────────────────────────────

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  isPaid: boolean;
  annualLimit: number | null;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminComment: string | null;
  createdAt: string;
  employee?: Pick<Employee, "id" | "firstName" | "lastName" | "profileImage" | "department">;
  leaveType?: LeaveType;
  reviewer?: Pick<User, "id" | "employeeId">;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  annualLimit: number | null;
  used: number;
  remaining: number | null;
}

// ─── Salary ───────────────────────────────────────────────────────────────────

export interface SalaryStructure {
  id: string;
  employeeId: string;
  monthlyWage: number;
  yearlyWage: number;
  workingDaysPerWeek: number;
  workingHoursPerDay: number;
  breakTimeHours: number;
  basicSalary: number;
  hra: number;
  standardAllowance: number;
  performanceBonus: number;
  leaveTravelAllowance: number;
  fixedAllowance: number;
  employeePf: number;
  employerPf: number;
  professionalTax: number;
  allowances: number;
  deductions: number;
  pf: number;
  tax: number;
  grossSalary: number;
  netSalary: number;
  effectiveFrom: string;
  isConfigured?: boolean;
  employee?: Employee;
}


// ─── Activity ─────────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  description: string;
  createdAt: string;
  user?: Pick<User, "id" | "employeeId">;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface EmployeeDashboardData {
  employee: Employee;
  todayAttendance: Attendance | null;
  attendanceSummary: AttendanceSummary;
  leaveBalances: LeaveBalance[];
  pendingLeaveCount: number;
  recentActivity: ActivityLog[];
  salary: SalaryStructure | null;
}

export interface AdminDashboardData {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  recentEmployees: Employee[];
  pendingLeaves: LeaveRequest[];
  recentActivity: ActivityLog[];
  attendanceTrend: { date: string; present: number; absent: number; leave: number }[];
  departmentDistribution: { department: string; count: number }[];
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Filter Types ─────────────────────────────────────────────────────────────

export interface AttendanceFilters {
  employeeId?: string;
  from?: string;
  to?: string;
  status?: AttendanceStatus;
}

export interface LeaveFilters {
  status?: LeaveStatus;
  employeeId?: string;
  from?: string;
  to?: string;
}
