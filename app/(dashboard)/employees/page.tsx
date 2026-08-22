"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, Loader2, Users, Edit2, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { useEmployees, useCreateEmployee } from "@/hooks";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations";
import { formatDate, getInitials } from "@/lib/utils";
import { DEPARTMENTS, EMPLOYMENT_STATUS_CONFIG } from "@/lib/constants";

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "status-success",
  INACTIVE: "status-secondary",
  ON_NOTICE: "status-warning",
  TERMINATED: "status-destructive",
};

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: employees, isLoading } = useEmployees({
    search: search || undefined,
    department: department !== "ALL" ? department : undefined,
  });

  const createEmployee = useCreateEmployee();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: { employmentStatus: "ACTIVE" },
  });

  const onCreate = (data: CreateEmployeeInput) => {
    createEmployee.mutate(data, {
      onSuccess: () => {
        setCreateOpen(false);
        reset();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage your organization&apos;s team members
          </p>
        </div>

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
            </DialogHeader>
            <form onSubmit={handleSubmit(onCreate)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Employee ID *</Label>
                  <Input placeholder="EMP006" {...register("employeeId")} className="h-8" />
                  {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" placeholder="emp@company.com" {...register("email")} className="h-8" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name *</Label>
                  <Input placeholder="John" {...register("firstName")} className="h-8" />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Name *</Label>
                  <Input placeholder="Doe" {...register("lastName")} className="h-8" />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Password *</Label>
                  <Input type="password" placeholder="Min 8 chars" {...register("password")} className="h-8" />
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input placeholder="+91-9800000000" {...register("phone")} className="h-8" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Designation *</Label>
                  <Input placeholder="Software Engineer" {...register("designation")} className="h-8" />
                  {errors.designation && <p className="text-xs text-destructive">{errors.designation.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Department *</Label>
                  <Select onValueChange={(v) => setValue("department", v as string)}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && <p className="text-xs text-destructive">{errors.department.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Joining Date</Label>
                  <Input type="date" {...register("joiningDate")} className="h-8" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : "Create Employee"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
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
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No employees found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
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
