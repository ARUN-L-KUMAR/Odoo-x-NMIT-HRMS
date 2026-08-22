"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DollarSign, Edit2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useMyPayroll, useAllPayroll, useUpdateSalary } from "@/hooks";
import { salarySchema, type SalaryInput } from "@/lib/validations";
import { formatCurrency, formatCurrencyCompact, getInitials } from "@/lib/utils";
import type { SalaryStructure } from "@/types";

export default function PayrollPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [search, setSearch] = useState("");
  const [editEmployee, setEditEmployee] = useState<SalaryStructure | null>(null);

  const { data: mySalary, isLoading: myLoading } = useMyPayroll();
  const { data: allSalaries, isLoading: allLoading } = useAllPayroll();
  const updateSalary = useUpdateSalary();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SalaryInput>({ resolver: zodResolver(salarySchema) });

  const filtered = allSalaries?.filter((s) => {
    const name = `${s.employee?.firstName} ${s.employee?.lastName}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  const onEdit = (salary: SalaryStructure) => {
    setEditEmployee(salary);
    reset({
      basicSalary: Number(salary.basicSalary),
      hra: Number(salary.hra),
      allowances: Number(salary.allowances),
      deductions: Number(salary.deductions),
      pf: Number(salary.pf),
      tax: Number(salary.tax),
    });
  };

  const onSave = (data: SalaryInput) => {
    if (!editEmployee) return;
    updateSalary.mutate(
      { employeeId: editEmployee.employeeId, data },
      { onSuccess: () => setEditEmployee(null) }
    );
  };

  if (!isAdmin) {
    // Employee view
    if (myLoading) {
      return (
        <div className="space-y-6">
          <div><Skeleton className="h-8 w-48" /></div>
          <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      );
    }

    const salary = mySalary;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Salary</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your current salary breakdown
          </p>
        </div>

        {salary ? (
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Basic Salary", value: Number(salary.basicSalary) },
                  { label: "HRA", value: Number(salary.hra) },
                  { label: "Allowances", value: Number(salary.allowances) },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Gross Salary</span>
                  <span className="text-base font-bold text-green-600">
                    {formatCurrency(Number(salary.grossSalary))}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Deductions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Deductions", value: Number(salary.deductions) },
                  { label: "PF", value: Number(salary.pf) },
                  { label: "Tax (TDS)", value: Number(salary.tax) },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium text-red-600">
                      -{formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Net Salary</span>
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(Number(salary.netSalary))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No salary information available</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Manage employee salary structures
          </p>
        </div>
        <ExportButton
          data={filtered ?? []}
          filename="payroll"
          columns={[
            { header: "Employee", accessor: (r) => `${r.employee?.firstName} ${r.employee?.lastName}` },
            { header: "Department", accessor: (r) => r.employee?.department ?? "" },
            { header: "Designation", accessor: (r) => r.employee?.designation ?? "" },
            { header: "Basic Salary", accessor: (r) => Number(r.basicSalary) },
            { header: "HRA", accessor: (r) => Number(r.hra) },
            { header: "Allowances", accessor: (r) => Number(r.allowances) },
            { header: "Gross Salary", accessor: (r) => Number(r.grossSalary) },
            { header: "Deductions", accessor: (r) => Number(r.deductions) },
            { header: "PF", accessor: (r) => Number(r.pf) },
            { header: "Tax", accessor: (r) => Number(r.tax) },
            { header: "Net Salary", accessor: (r) => Number(r.netSalary) },
          ]}
        />
      </div>

      <SearchInput
        id="payroll-search"
        value={search}
        onChange={setSearch}
        placeholder="Search employee..."
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          {allLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No payroll records found"
              description={search ? "Try a different search term" : "Salary structures will appear here once assigned"}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Basic</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getInitials(`${s.employee?.firstName} ${s.employee?.lastName}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {s.employee?.firstName} {s.employee?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.employee?.department}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.employee?.designation || "—"}</TableCell>
                      <TableCell className="text-sm">{formatCurrencyCompact(Number(s.basicSalary))}</TableCell>
                      <TableCell className="text-sm">{formatCurrencyCompact(Number(s.grossSalary))}</TableCell>
                      <TableCell className="text-sm font-medium text-primary">
                        {formatCurrencyCompact(Number(s.netSalary))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onEdit(s)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editEmployee} onOpenChange={(o) => { if (!o) setEditEmployee(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Salary — {editEmployee?.employee?.firstName} {editEmployee?.employee?.lastName}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { name: "basicSalary", label: "Basic Salary" },
                  { name: "hra", label: "HRA" },
                  { name: "allowances", label: "Allowances" },
                  { name: "deductions", label: "Deductions" },
                  { name: "pf", label: "PF" },
                  { name: "tax", label: "Tax (TDS)" },
                ] as const
              ).map((field) => (
                <div key={field.name} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type="number"
                    min="0"
                    {...register(field.name, { valueAsNumber: true })}
                    className="h-8"
                  />
                  {errors[field.name] && (
                    <p className="text-xs text-destructive">{errors[field.name]?.message}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditEmployee(null)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updateSalary.isPending}>
                {updateSalary.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : "Save Salary"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
