// Centralized API client for all Dayflow endpoints

import type {
  Employee,
  Attendance,
  AttendanceFilters,
  LeaveRequest,
  LeaveType,
  LeaveBalance,
  LeaveFilters,
  SalaryStructure,
  EmployeeDashboardData,
  AdminDashboardData,
  ActivityLog,
  ApiResponse,
} from "@/types";

// ─── Base Fetcher ─────────────────────────────────────────────────────────────

async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    const error = data.error || { message: "Something went wrong" };
    throw new Error(error.message || "Request failed");
  }

  return data.data;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  register: (payload: {
    employeeId: string;
    email: string;
    password: string;
    role: string;
  }) =>
    fetchApi("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  me: () => fetchApi("/api/auth/me"),
};

// ─── Employee API ─────────────────────────────────────────────────────────────

export const employeeApi = {
  getAll: (params?: { search?: string; department?: string; status?: string; companyId?: string }) => {
    const query = new URLSearchParams(
      Object.entries(params || {}).filter(([_, v]) => v !== undefined && v !== "") as [string, string][]
    ).toString();
    return fetchApi<Employee[]>(`/api/employees${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => fetchApi<Employee>(`/api/employees/${id}`),

  create: (data: any) =>
    fetchApi<{ employee: Employee; credentials: { loginId: string; tempPassword: string; email: string } }>("/api/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),


  update: (id: string, data: any) =>
    fetchApi<Employee>(`/api/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi(`/api/employees/${id}`, { method: "DELETE" }),
};

// ─── Attendance API ───────────────────────────────────────────────────────────

export const attendanceApi = {
  checkIn: () =>
    fetchApi<Attendance>("/api/attendance/check-in", { method: "POST" }),

  checkOut: () =>
    fetchApi<Attendance>("/api/attendance/check-out", { method: "POST" }),

  getMine: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v != null) as [string, string][]
      )
    ).toString();
    return fetchApi<Attendance[]>(`/api/attendance/me${query ? `?${query}` : ""}`);
  },

  getAll: (filters?: AttendanceFilters) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null) as [string, string][]
      )
    ).toString();
    return fetchApi<Attendance[]>(`/api/attendance${query ? `?${query}` : ""}`);
  },

  getToday: () => fetchApi<Attendance | null>("/api/attendance/today"),

  getSummary: () => fetchApi("/api/attendance/summary"),
};

// ─── Leave API ────────────────────────────────────────────────────────────────

export const leaveApi = {
  getTypes: () => fetchApi<LeaveType[]>("/api/leave/types"),

  create: (data: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) =>
    fetchApi<LeaveRequest>("/api/leave", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMine: () => fetchApi<LeaveRequest[]>("/api/leave/me"),

  getBalances: () => fetchApi<LeaveBalance[]>("/api/leave/balances"),

  getAll: (filters?: LeaveFilters) => {
    const query = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters || {}).filter(([, v]) => v != null) as [string, string][]
      )
    ).toString();
    return fetchApi<LeaveRequest[]>(`/api/leave/requests${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => fetchApi<LeaveRequest>(`/api/leave/requests/${id}`),

  approve: (id: string, comment?: string) =>
    fetchApi<LeaveRequest>(`/api/leave/requests/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ comment }),
    }),

  reject: (id: string, comment?: string) =>
    fetchApi<LeaveRequest>(`/api/leave/requests/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ comment }),
    }),
};

// ─── Payroll API ──────────────────────────────────────────────────────────────

export const payrollApi = {
  getMine: () => fetchApi<SalaryStructure>("/api/payroll/me"),

  getAll: () => fetchApi<SalaryStructure[]>("/api/payroll"),

  getByEmployee: (employeeId: string) =>
    fetchApi<SalaryStructure>(`/api/payroll/${employeeId}`),

  upsert: (employeeId: string, data: any) =>
    fetchApi<SalaryStructure>(`/api/payroll/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

// ─── Dashboard API ────────────────────────────────────────────────────────────

export const dashboardApi = {
  getEmployee: () => fetchApi<EmployeeDashboardData>("/api/dashboard/employee"),
  getAdmin: () => fetchApi<AdminDashboardData>("/api/dashboard/admin"),
  getActivity: () => fetchApi<ActivityLog[]>("/api/dashboard/activity"),
};

// ─── Reports API ──────────────────────────────────────────────────────────────

export const reportApi = {
  getAttendance: (filters: AttendanceFilters) => {
    const query = new URLSearchParams(filters as any).toString();
    return fetchApi<Attendance[]>(`/api/reports/attendance?${query}`);
  },
  getLeave: (filters: LeaveFilters) => {
    const query = new URLSearchParams(filters as any).toString();
    return fetchApi<LeaveRequest[]>(`/api/reports/leave?${query}`);
  },
};
