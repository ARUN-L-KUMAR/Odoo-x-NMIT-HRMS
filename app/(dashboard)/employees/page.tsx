"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Users, Loader2, Copy, CheckCircle2, KeyRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
import { EmployeeGrid } from "@/components/employees/EmployeeGrid";
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

/** Credentials reveal dialog shown to admin after employee creation */
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
            Share these login credentials with <strong>{credentials.name}</strong>. They will be prompted to change their password on first login.
          </p>

          <div className="rounded-xl border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Login ID</p>
                <code className="text-sm font-bold font-mono text-primary">{credentials.loginId}</code>
              </div>
              <button
                onClick={() => copy(credentials.loginId, "loginId")}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Copy Login ID"
              >
                {copied === "loginId" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Email</p>
                <code className="text-sm font-mono">{credentials.email}</code>
              </div>
              <button
                onClick={() => copy(credentials.email, "email")}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                {copied === "email" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Temporary Password</p>
                <code className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">{credentials.tempPassword}</code>
              </div>
              <button
                onClick={() => copy(credentials.tempPassword, "pass")}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                {copied === "pass" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
            <KeyRound className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              This is the only time you&apos;ll see the temporary password. Copy it before closing.
            </p>
          </div>

          <Button className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EmployeesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);

  // Form state (simple controlled — no react-hook-form needed since no password/ID fields)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designation: "",
    department: "",
    joiningDate: "",
    employmentStatus: "ACTIVE",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: employees, isLoading } = useEmployees({
    search: search || undefined,
    department: department !== "ALL" ? department : undefined,
  });

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
        setForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          designation: "",
          department: "",
          joiningDate: "",
          employmentStatus: "ACTIVE",
        });
        // Show credentials dialog
        if (data?.credentials) {
          setCredentials({
            loginId: data.credentials.loginId,
            tempPassword: data.credentials.tempPassword,
            email: data.credentials.email,
            name: `${form.firstName} ${form.lastName}`,
          });
          setCredentialsOpen(true);
        }
      },
      onError: (err: any) => {
        setFormError(err.message || "Failed to create employee.");
      },
    });
  };

  // ─── EMPLOYEE VIEW (directory card grid) ─────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Browse your organization&apos;s team members
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <SearchInput
            id="employee-search"
            value={search}
            onChange={setSearch}
            placeholder="Search employees..."
            className="flex-1 min-w-48 max-w-xs"
          />
          <Select value={department} onValueChange={(v) => setDepartment(v ?? "ALL")}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : !employees || employees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description={search ? "Try a different search term or clear filters" : "No team members yet"}
          />
        ) : (
          <EmployeeGrid
            employees={employees}
            onCardClick={(id) => router.push(`/employees/${id}`)}
          />
        )}
      </div>
    );
  }

  // ─── ADMIN VIEW (management table) ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage your organization&apos;s team members
          </p>
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

          {/* Add Employee Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger
              render={
                <button className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors" />
              }
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Login ID and temporary password will be <strong>auto-generated</strong> by the system.
                </p>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4 mt-2">
                {formError && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                    {formError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">First Name *</Label>
                    <Input
                      placeholder="John"
                      className="h-8"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Name *</Label>
                    <Input
                      placeholder="Doe"
                      className="h-8"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      placeholder="john.doe@company.com"
                      className="h-8"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      placeholder="+91-9800000000"
                      className="h-8"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Designation *</Label>
                    <Input
                      placeholder="Software Engineer"
                      className="h-8"
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Department *</Label>
                    <Select
                      value={form.department}
                      onValueChange={(v) => setForm({ ...form, department: v })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Joining Date</Label>
                    <Input
                      type="date"
                      className="h-8"
                      value={form.joiningDate}
                      onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Auto-generation notice */}
                <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                  <KeyRound className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    The system will auto-generate a <strong>Login ID</strong> (e.g. <span className="font-mono">DFJODO20240001</span>) and a <strong>temporary password</strong> shown to you after creation.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createEmployee.isPending}
                  >
                    {createEmployee.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create Employee"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Credentials Dialog */}
      <CredentialsDialog
        open={credentialsOpen}
        onClose={() => setCredentialsOpen(false)}
        credentials={credentials}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          id="employee-search-admin"
          value={search}
          onChange={setSearch}
          placeholder="Search employees..."
          className="flex-1 min-w-48 max-w-xs"
        />
        <Select value={department} onValueChange={(v) => setDepartment(v ?? "ALL")}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !employees || employees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description={search ? "Try a different search term or clear filters" : "Add your first employee to get started"}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead>Login ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer"
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
                            <p className="text-sm font-medium">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{emp.user?.email ?? ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                          {emp.user?.employeeId}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{emp.department || "—"}</TableCell>
                      <TableCell className="text-sm">{emp.designation || "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[emp.employmentStatus] || "status-secondary"}`}>
                          {EMPLOYMENT_STATUS_CONFIG.find((s) => s.value === emp.employmentStatus)?.label || emp.employmentStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.joiningDate ? formatDate(emp.joiningDate) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
