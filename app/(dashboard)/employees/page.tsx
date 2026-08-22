"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Users, Loader2, Copy, CheckCircle2, KeyRound,
  Search, SlidersHorizontal, LayoutGrid, List, Pencil,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
import { EmployeeGrid } from "@/components/employees/EmployeeGrid";
import { EditEmployeeModal } from "@/components/employees/EditEmployeeModal";
import { CreateEmployeeModal } from "@/components/employees/CreateEmployeeModal";
import { ImageUpload } from "@/components/shared/image-upload";


import type { AttendanceStatus } from "@/components/employees/EmployeeCard";

import { useEmployees, useCreateEmployee, useDepartments } from "@/hooks";
import { formatDate, getInitials } from "@/lib/utils";
import { EMPLOYMENT_STATUS_CONFIG } from "@/lib/constants";


const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "status-success",
  INACTIVE: "status-secondary",
  ON_NOTICE: "status-warning",
  TERMINATED: "status-destructive",
};

interface GeneratedCredentials {
  loginId: string;
  tempPassword: string;
  email: string;
  name: string;
}

// ─── Hook: today's attendance status for all employees ────────────────────────

function useTodayAllAttendance() {
  return useQuery({
    queryKey: ["attendance", "today", "all"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/today/all");
      const data = await res.json();
      if (!data.success) throw new Error("Failed to load attendance");
      // Build a map: employeeId → AttendanceStatus
      const map: Record<string, AttendanceStatus> = {};
      for (const item of data.data as { employeeId: string; status: string; checkedIn: boolean }[]) {
        const s = item.status as AttendanceStatus;
        map[item.employeeId] = s;
      }
      return map;
    },
    refetchInterval: 60000, // refresh every minute
    staleTime: 30000,
  });
}

// ─── Credentials Dialog ───────────────────────────────────────────────────────

function CredentialsDialog({
  open,
  onClose,
  credentials,
}: {
  open: boolean;
  onClose: () => void;
  credentials: GeneratedCredentials | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  if (!credentials) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Employee Created!
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share these credentials with <strong>{credentials.name}</strong>. They must change their password on first login.
          </p>
          <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
            {[
              { label: "Login ID", value: credentials.loginId, key: "loginId" },
              { label: "Email", value: credentials.email, key: "email" },
              { label: "Temp Password", value: credentials.tempPassword, key: "pass" },
            ].map(({ label, value, key }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                  <code className={`text-sm font-mono font-bold ${key === "pass" ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}>{value}</code>
                </div>
                <button onClick={() => copy(value, key)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  {copied === key ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <KeyRound className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              This is the only time you&apos;ll see the temporary password. Copy it before closing.
            </p>
          </div>
          <Button className="w-full" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role?.toUpperCase();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    designation: "", department: "", joiningDate: "", employmentStatus: "ACTIVE",
    profileImage: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: orgsList = [] } = useQuery({
    queryKey: ["organizations", "all"],
    queryFn: async () => {
      const res = await fetch("/api/organization");
      const json = await res.json();
      return json?.data?.allOrganizations || [];
    },
    enabled: isSuperAdmin,
  });

  const { data: employees, isLoading } = useEmployees({
    search: search || undefined,
    department: department !== "ALL" ? department : undefined,
    companyId: companyFilter !== "ALL" ? companyFilter : undefined,
  });

  const { data: departments = [] } = useDepartments(companyFilter !== "ALL" ? companyFilter : undefined);

  const { data: attendanceMap = {}, isLoading: attLoading } = useTodayAllAttendance();
  const createEmployee = useCreateEmployee();


  const onCreate = async (formData: any) => {
    setFormError(null);
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setFormError("First name, last name, and email are required.");
      return;
    }
    createEmployee.mutate(formData, {
      onSuccess: (data: any) => {
        setCreateOpen(false);
        if (data?.credentials) {
          setCredentials({
            loginId: data.credentials.loginId,
            tempPassword: data.credentials.tempPassword,
            email: data.credentials.email,
            name: `${formData.firstName} ${formData.lastName}`,
          });
          setCredentialsOpen(true);
        }
      },
      onError: (err: any) => setFormError(err.message || "Failed to create employee."),
    });
  };


  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

  // Reusable Employee Table View
  const renderTableView = () => (
    <Card className="border shadow-xs overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/40">
                <TableHead>Employee</TableHead>
                {isSuperAdmin && <TableHead>Organization</TableHead>}
                <TableHead>Login ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? [1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, ...(isSuperAdmin ? [8] : []), ...(isAdmin ? [9] : [])].map((j) => (
                        <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : (!employees || employees.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? (isAdmin ? 9 : 8) : (isAdmin ? 8 : 7)} className="h-32 text-center text-muted-foreground text-sm">
                        {search ? "No employees match your search" : "No employees found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp) => {
                      const attStatus = attendanceMap[emp.id] ?? "UNKNOWN";
                      const attDot: Record<string, string> = {
                        PRESENT: "bg-emerald-500",
                        LEAVE: "bg-amber-400",
                        HALF_DAY: "bg-blue-400",
                        ABSENT: "bg-red-500",
                        UNKNOWN: "bg-zinc-400",
                      };
                      const attLabel: Record<string, string> = {
                        PRESENT: "Present",
                        LEAVE: "On Leave",
                        HALF_DAY: "Half Day",
                        ABSENT: "Absent",
                        UNKNOWN: "—",
                      };
                      return (
                        <TableRow
                          key={emp.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors group"
                          onClick={() => router.push(`/employees/${emp.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={emp.profileImage ?? undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(`${emp.firstName} ${emp.lastName}`)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium group-hover:text-primary transition-colors">{emp.firstName} {emp.lastName}</p>
                                <p className="text-xs text-muted-foreground">{emp.user?.email ?? ""}</p>
                              </div>
                            </div>
                          </TableCell>
                          {isSuperAdmin && (
                            <TableCell>
                              <span className="font-semibold text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                {emp.company?.name || "System"}
                              </span>
                            </TableCell>
                          )}
                          <TableCell>
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded font-medium">
                              {emp.user?.employeeId}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{emp.department || "—"}</TableCell>
                          <TableCell className="text-sm">{emp.designation || "—"}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5 text-xs font-medium">
                              <span className={`h-2 w-2 rounded-full ${attDot[attStatus]}`} />
                              {attLabel[attStatus]}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[emp.employmentStatus] || "status-secondary"}`}>
                              {EMPLOYMENT_STATUS_CONFIG.find((s) => s.value === emp.employmentStatus)?.label || emp.employmentStatus}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {emp.joiningDate ? formatDate(emp.joiningDate) : "—"}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEmployee(emp);
                                }}
                                className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );


  // ─── EMPLOYEE VIEW ────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Your organization&apos;s team members</p>
          </div>
          {/* Status Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />Present</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />On Leave</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Absent</span>
          </div>
        </div>

        {/* Search, Filter & View Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="employee-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={department} onValueChange={(v) => setDepartment(v ?? "ALL")}>
            <SelectTrigger className="w-44 h-9">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>

          </Select>

          {/* Grid / List View Toggle */}
          <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 ml-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>

        {/* Conditional Grid or Table */}
        {viewMode === "grid" ? (
          <EmployeeGrid
            employees={employees ?? []}
            isLoading={isLoading || attLoading}
            attendanceStatusMap={attendanceMap}
            showCompany={isSuperAdmin}
            onCardClick={(id) => router.push(`/employees/${id}`)}
            emptyMessage={search ? "No employees match your search" : "No team members yet"}
          />
        ) : (
          renderTableView()
        )}
      </div>
    );
  }

  // ─── ADMIN VIEW ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage your organization&apos;s team members</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            data={employees ?? []}
            filename="employees"
            columns={[
              { header: "Login ID", accessor: (r) => r.user?.employeeId ?? "" },
              { header: "First Name", accessor: "firstName" },
              { header: "Last Name", accessor: "lastName" },
              { header: "Email", accessor: (r) => r.user?.email ?? "" },
              { header: "Department", accessor: "department" },
              { header: "Designation", accessor: "designation" },
              { header: "Status", accessor: "employmentStatus" },
              { header: "Joined", accessor: (r) => (r.joiningDate ? formatDate(r.joiningDate) : "") },
            ]}
          />
          {/* Add Employee */}
          <Button
            onClick={() => setCreateOpen(true)}
            className="gap-2 font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        </div>
      </div>

      <CreateEmployeeModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={onCreate}
        isPending={createEmployee.isPending}
        formError={formError}
        orgsList={orgsList}
        isSuperAdmin={isSuperAdmin}
      />

      <CredentialsDialog open={credentialsOpen} onClose={() => setCredentialsOpen(false)} credentials={credentials} />


      {/* Filters & View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="employee-search-admin" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees..." className="pl-9 h-9" />
        </div>

        {/* Organization Filter for Super Admin */}
        {isSuperAdmin && orgsList && orgsList.length > 0 && (
          <Select value={companyFilter} onValueChange={(v) => setCompanyFilter(v ?? "ALL")}>
            <SelectTrigger className="w-48 h-9 border-primary/30 bg-primary/5">
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Organizations ({orgsList.length})</SelectItem>
              {orgsList.map((org: any) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name} ({org.employeeCount || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={department} onValueChange={(v) => setDepartment(v ?? "ALL")}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>


        {/* Status Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground hidden md:flex">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />Present</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />On Leave</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />Absent</span>
        </div>

        {/* Grid / List View Toggle */}
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 ml-auto">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title="Grid View"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "grid"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            title="List View"
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "list"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Conditional Rendering based on Toggle */}
      {viewMode === "grid" ? (
        <EmployeeGrid
          employees={employees ?? []}
          isLoading={isLoading || attLoading}
          attendanceStatusMap={attendanceMap}
          showCompany={isSuperAdmin}
          onCardClick={(id) => router.push(`/employees/${id}`)}
          onEditCard={isAdmin ? (emp) => setEditingEmployee(emp) : undefined}
          emptyMessage={search ? "No employees match your search" : "Add your first employee to get started"}
        />
      ) : (
        renderTableView()
      )}

      {/* Edit Employee Modal for Admin */}
      <EditEmployeeModal
        open={!!editingEmployee}
        onOpenChange={(open) => !open && setEditingEmployee(null)}
        employee={editingEmployee}
      />
    </div>
  );
}


