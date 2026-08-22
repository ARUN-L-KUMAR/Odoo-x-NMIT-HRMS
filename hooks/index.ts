"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  attendanceApi,
  leaveApi,
  payrollApi,
  dashboardApi,
  employeeApi,
} from "@/lib/api/client";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/utils";

// ─── Keys ─────────────────────────────────────────────────────────────────────
export const queryKeys = {
  employeeDashboard: ["dashboard", "employee"] as const,
  adminDashboard: ["dashboard", "admin"] as const,
  employees: (params?: object) => ["employees", params] as const,
  employee: (id: string) => ["employee", id] as const,
  myAttendance: (params?: object) => ["attendance", "me", params] as const,
  allAttendance: (filters?: object) => ["attendance", "all", filters] as const,
  todayAttendance: ["attendance", "today"] as const,
  myLeave: ["leave", "me"] as const,
  leaveRequests: (filters?: object) => ["leave", "requests", filters] as const,
  leaveTypes: ["leave", "types"] as const,
  leaveBalances: ["leave", "balances"] as const,
  myPayroll: ["payroll", "me"] as const,
  allPayroll: ["payroll", "all"] as const,
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function useEmployeeDashboard() {
  return useQuery({
    queryKey: queryKeys.employeeDashboard,
    queryFn: dashboardApi.getEmployee,
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: dashboardApi.getAdmin,
  });
}

// ─── Employees ────────────────────────────────────────────────────────────────
export function useEmployees(params?: { search?: string; department?: string; status?: string; companyId?: string }) {
  return useQuery({
    queryKey: queryKeys.employees(params),
    queryFn: () => employeeApi.getAll(params),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employee(id),
    queryFn: () => employeeApi.getById(id),
    enabled: !!id,
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      employeeApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.employees() });
      qc.invalidateQueries({ queryKey: queryKeys.employee(id) });
      qc.invalidateQueries({ queryKey: queryKeys.employeeDashboard });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => employeeApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees() });
      qc.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      toast.success("Employee created successfully");
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export function useTodayAttendance() {
  return useQuery({
    queryKey: queryKeys.todayAttendance,
    queryFn: attendanceApi.getToday,
    refetchInterval: 60000, // refresh every minute
  });
}

export function useMyAttendance(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: queryKeys.myAttendance(params),
    queryFn: () => attendanceApi.getMine(params),
  });
}

export function useAllAttendance(filters?: object) {
  return useQuery({
    queryKey: queryKeys.allAttendance(filters),
    queryFn: () => attendanceApi.getAll(filters as any),
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.checkIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.todayAttendance });
      qc.invalidateQueries({ queryKey: queryKeys.employeeDashboard });
      qc.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      toast.success("Checked in successfully! 👋");
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: attendanceApi.checkOut,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.todayAttendance });
      qc.invalidateQueries({ queryKey: queryKeys.employeeDashboard });
      qc.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      toast.success("Checked out successfully! 👋");
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

// ─── Leave ────────────────────────────────────────────────────────────────────
export function useLeaveTypes() {
  return useQuery({
    queryKey: queryKeys.leaveTypes,
    queryFn: leaveApi.getTypes,
  });
}

export function useLeaveBalances() {
  return useQuery({
    queryKey: queryKeys.leaveBalances,
    queryFn: leaveApi.getBalances,
  });
}

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: queryKeys.myLeave,
    queryFn: leaveApi.getMine,
  });
}

export function useLeaveRequests(filters?: object) {
  return useQuery({
    queryKey: queryKeys.leaveRequests(filters),
    queryFn: () => leaveApi.getAll(filters as any),
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leaveApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myLeave });
      qc.invalidateQueries({ queryKey: queryKeys.leaveBalances });
      qc.invalidateQueries({ queryKey: queryKeys.employeeDashboard });
      toast.success("Leave request submitted!");
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      leaveApi.approve(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests() });
      qc.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      qc.invalidateQueries({ queryKey: queryKeys.allAttendance() });
      toast.success("Leave approved ✅");
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      leaveApi.reject(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.leaveRequests() });
      qc.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      toast.success("Leave rejected");
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

// ─── Payroll ──────────────────────────────────────────────────────────────────
export function useMyPayroll() {
  return useQuery({
    queryKey: queryKeys.myPayroll,
    queryFn: payrollApi.getMine,
  });
}

export function useAllPayroll() {
  return useQuery({
    queryKey: queryKeys.allPayroll,
    queryFn: payrollApi.getAll,
  });
}

export function useUpdateSalary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: any }) =>
      payrollApi.upsert(employeeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.allPayroll });
      toast.success("Salary updated successfully ✅");
    },
    onError: (error: any) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

// ─── Departments (Dynamic from Database) ─────────────────────────────────────
export function useDepartments(companyId?: string) {
  return useQuery<string[]>({
    queryKey: ["organization", "departments", companyId || "current"],
    queryFn: async () => {
      const url = companyId
        ? `/api/organization/departments?companyId=${encodeURIComponent(companyId)}`
        : "/api/organization/departments";
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        return ["Engineering", "Design", "Human Resources", "Marketing", "Sales", "Finance"];
      }
      return json.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

