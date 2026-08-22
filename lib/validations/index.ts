import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Login — accepts email OR Login ID (employeeId)
export const loginSchema = z.object({
  identifier: z.string().min(1, "Login ID or Email is required"),
  password: z.string().min(1, "Password is required"),
});

// Company Setup — first-time onboarding, creates the Admin account
export const companySetupSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required"),
    name: z.string().min(2, "Your full name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Employee ─────────────────────────────────────────────────────────────────

export const createEmployeeSchema = z.object({
  // Auth fields
  employeeId: z
    .string()
    .min(3, "Employee ID must be at least 3 characters")
    .regex(/^[A-Z0-9]+$/, "Must be uppercase letters and numbers"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  // Profile fields
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  designation: z.string().min(1, "Designation is required"),
  department: z.string().min(1, "Department is required"),
  joiningDate: z.string().optional(),
  employmentStatus: z
    .enum(["ACTIVE", "INACTIVE", "ON_NOTICE", "TERMINATED"])
    .default("ACTIVE"),
});

export type CreateEmployeeInput = z.input<typeof createEmployeeSchema>;
export type CreateEmployeeOutput = z.output<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  designation: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z.string().optional().nullable(),
  employmentStatus: z
    .enum(["ACTIVE", "INACTIVE", "ON_NOTICE", "TERMINATED"])
    .optional(),
  profileImage: z.string().optional().nullable(),
});

// Employee can only update these fields
export const selfUpdateEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  profileImage: z.string().optional().nullable(),
});

// ─── Leave ────────────────────────────────────────────────────────────────────

export const createLeaveSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    reason: z.string().min(10, "Please provide a reason (min 10 characters)"),
  })
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export const leaveReviewSchema = z.object({
  comment: z.string().optional(),
});

// ─── Salary ───────────────────────────────────────────────────────────────────

export const salarySchema = z.object({
  basicSalary: z.number().min(0, "Basic salary must be ≥ 0"),
  hra: z.number().min(0, "HRA must be ≥ 0"),
  allowances: z.number().min(0, "Allowances must be ≥ 0"),
  deductions: z.number().min(0, "Deductions must be ≥ 0"),
  pf: z.number().min(0, "PF must be ≥ 0"),
  tax: z.number().min(0, "Tax must be ≥ 0"),
  effectiveFrom: z.string().optional(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type SelfUpdateEmployeeInput = z.infer<typeof selfUpdateEmployeeSchema>;
export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type LeaveReviewInput = z.infer<typeof leaveReviewSchema>;
export type SalaryInput = z.infer<typeof salarySchema>;
