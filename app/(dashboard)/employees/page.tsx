"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Users, Loader2, Copy, CheckCircle2, KeyRound,
  Search, SlidersHorizontal, LayoutGrid, List,
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
import { ImageUpload } from "@/components/shared/image-upload";
import type { AttendanceStatus } from "@/components/employees/EmployeeCard";

import { useEmployees, useCreateEmployee } from "@/hooks";
import { formatDate, getInitials } from "@/lib/utils";
import { DEPARTMENTS, EMPLOYMENT_STATUS_CONFIG } from "@/lib/constants";

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

  const { data: attendanceMap = {}, isLoading: attLoading } = useTodayAllAttendance();
  const createEmployee = useCreateEmployee();

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.firstName || !form.lastName || !form.email) {
      setFormError("First name, last name, and email are required.");
      return;
    }
    createEmployee.mutate(form as any, {
      onSuccess: (data: any) => {
        setCreateOpen(false);
        setForm({ firstName: "", lastName: "", email: "", phone: "", designation: "", department: "", joiningDate: "", employmentStatus: "ACTIVE", profileImage: "" });
        if (data?.credentials) {
          setCredentials({ loginId: data.credentials.loginId, tempPassword: data.credentials.tempPassword, email: data.credentials.email, name: `${form.firstName} ${form.lastName}` });
          setCredentialsOpen(true);
        }
      },
      onError: (err: any) => setFormError(err.message || "Failed to create employee."),
    });
  };

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? [1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, ...(isSuperAdmin ? [8] : [])].map((j) => (
                        <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : (!employees || employees.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={isSuperAdmin ? 8 : 7} className="h-32 text-center text-muted-foreground text-sm">
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
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
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
                                <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
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
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<button className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors" />}>
              <Plus className="h-4 w-4" /> Add Employee
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">Login ID and password are <strong>auto-generated</strong> by the system.</p>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4 mt-2">
                {formError && <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">{formError}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">First Name *</Label>
                    <Input placeholder="John" className="h-8" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Name *</Label>
                    <Input placeholder="Doe" className="h-8" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" placeholder="john.doe@company.com" className="h-8" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input placeholder="+91-9800000000" className="h-8" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Designation *</Label>
                    <Input placeholder="Software Engineer" className="h-8" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Department *</Label>
                    <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v ?? "" })}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>

                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Profile Photo</Label>
                    <ImageUpload
                      value={form.profileImage || null}
                      onChange={(url) => setForm({ ...form, profileImage: url || "" })}
                      folder="HRMS"
                      label="Upload Photo"
                      shape="circle"
                      size="sm"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">

                  <KeyRound className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    System will generate <strong>Login ID</strong> (e.g. <span className="font-mono">DFJODO20240001</span>) and a <strong>temporary password</strong>.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={createEmployee.isPending}>
                    {createEmployee.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Employee"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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
          emptyMessage={search ? "No employees match your search" : "Add your first employee to get started"}
        />
      ) : (
        renderTableView()
      )}
    </div>
  );
}

