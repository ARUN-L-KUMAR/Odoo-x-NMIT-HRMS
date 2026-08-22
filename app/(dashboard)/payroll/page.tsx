"use client";

import { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Building2,
  Users,
  Search,
  SlidersHorizontal,
  FileText,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Sparkles,
  LayoutGrid,
  List,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { ExportButton } from "@/components/shared/export-button";
import { StatCard } from "@/components/shared/stat-card";
import { SalaryConfigModal } from "@/components/payroll/SalaryConfigModal";
import { PayslipModal } from "@/components/payroll/PayslipModal";
import { useMyPayroll, useAllPayroll, useUpdateSalary } from "@/hooks";
import { formatCurrency, formatCurrencyCompact, getInitials, formatDate } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import type { SalaryStructure } from "@/types";

export default function PayrollPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const configParam = searchParams.get("config");
  const employeeIdParam = searchParams.get("employeeId");

  const userRole = session?.user?.role?.toUpperCase();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;

  // View Mode: Grid vs List
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  // Search & Filters
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");

  // Modals state
  const [configSalary, setConfigSalary] = useState<SalaryStructure | null>(null);
  const [viewPayslip, setViewPayslip] = useState<SalaryStructure | null>(null);

  const { data: mySalary, isLoading: myLoading } = useMyPayroll();
  const { data: allSalaries, isLoading: allLoading } = useAllPayroll();
  const updateSalary = useUpdateSalary();

  // Auto-open config modal for target employee if redirected from Salary Info tab
  useEffect(() => {
    if ((configParam || employeeIdParam) && allSalaries && allSalaries.length > 0) {
      const target = allSalaries.find(
        (s) =>
          s.employeeId === employeeIdParam ||
          s.employee?.id === employeeIdParam ||
          (s.employee as any)?.user?.employeeId === employeeIdParam ||
          s.id === employeeIdParam
      );
      if (target) {
        setConfigSalary(target);
      }
    }
  }, [configParam, employeeIdParam, allSalaries]);


  // Organizations list for Super Admin
  const { data: orgsList = [] } = useQuery({
    queryKey: ["organizations", "all"],
    queryFn: async () => {
      const res = await fetch("/api/organization");
      const json = await res.json();
      return json?.data?.allOrganizations || [];
    },
    enabled: isSuperAdmin,
  });

  // Filtered salary structures
  const filteredSalaries = useMemo(() => {
    if (!allSalaries) return [];
    return allSalaries.filter((s) => {
      const emp = s.employee;
      const name = `${emp?.firstName || ""} ${emp?.lastName || ""}`.toLowerCase();
      const loginId = (emp?.user?.employeeId || "").toLowerCase();
      const query = search.toLowerCase();
      const matchSearch = !search || name.includes(query) || loginId.includes(query);
      const matchDept = department === "ALL" || emp?.department === department;
      const matchCompany =
        companyFilter === "ALL" ||
        (emp as any)?.companyId === companyFilter ||
        (emp as any)?.company?.id === companyFilter;
      return matchSearch && matchDept && matchCompany;
    });
  }, [allSalaries, search, department, companyFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    if (!allSalaries) return { totalGross: 0, totalNet: 0, totalPf: 0, configuredCount: 0, totalStaff: 0 };
    let totalGross = 0;
    let totalNet = 0;
    let totalPf = 0;
    let configuredCount = 0;

    allSalaries.forEach((s) => {
      const gross = Number(s.grossSalary) || Number(s.monthlyWage) || 0;
      const net = Number(s.netSalary) || 0;
      const pf = (Number(s.employeePf) || 0) + (Number(s.employerPf) || 0);
      if (gross > 0) {
        configuredCount++;
        totalGross += gross;
        totalNet += net;
        totalPf += pf;
      }
    });

    return {
      totalGross,
      totalNet,
      totalPf,
      configuredCount,
      totalStaff: allSalaries.length,
    };
  }, [allSalaries]);

  const handleSaveSalary = (data: any) => {
    if (!configSalary) return;
    updateSalary.mutate(
      { employeeId: configSalary.employeeId, data },
      {
        onSuccess: () => setConfigSalary(null),
      }
    );
  };

  // ─── EMPLOYEE VIEW ─────────────────────────────────────────────────────────────
  if (!isAdmin) {
    if (myLoading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid sm:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      );
    }

    const salary = mySalary;
    const basic = Number(salary?.basicSalary || 0);
    const hra = Number(salary?.hra || 0);
    const allowances = Number(salary?.allowances || 0);
    const gross = Number(salary?.grossSalary || basic + hra + allowances);
    const deductions = Number(salary?.deductions || 0);
    const net = Number(salary?.netSalary || Math.max(0, gross - deductions));
    const annualCtc = (Number(salary?.yearlyWage) || gross * 12) + (Number(salary?.employerPf || 0) * 12);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Compensation & Salary</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Detailed salary architecture, earnings, deductions, and downloadable payslips.
            </p>
          </div>
          {salary && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setViewPayslip(salary)}
              className="gap-2 shadow-xs"
            >
              <FileText className="h-4 w-4 text-primary" />
              View Latest Payslip
            </Button>
          )}
        </div>

        {salary && gross > 0 ? (
          <div className="space-y-6">
            {/* KPI Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Monthly Net Take-Home"
                value={formatCurrency(net)}
                icon={DollarSign}
                iconColor="text-emerald-600 dark:text-emerald-400"
                iconBg="bg-emerald-500/10"
              />
              <StatCard
                label="Monthly Gross Salary"
                value={formatCurrency(gross)}
                icon={TrendingUp}
                iconColor="text-primary"
                iconBg="bg-primary/10"
              />
              <StatCard
                label="Monthly Deductions"
                value={formatCurrency(deductions)}
                icon={ShieldCheck}
                iconColor="text-red-500"
                iconBg="bg-red-500/10"
              />
              <StatCard
                label="Annual CTC"
                value={formatCurrency(annualCtc)}
                icon={Building2}
                iconColor="text-indigo-600 dark:text-indigo-400"
                iconBg="bg-indigo-500/10"
              />
            </div>

            {/* Breakdown Cards */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Earnings */}
              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Monthly Earnings</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {formatCurrency(gross)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span className="font-mono font-medium">{formatCurrency(basic)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">House Rent Allowance (HRA)</span>
                    <span className="font-mono font-medium">{formatCurrency(hra)}</span>
                  </div>
                  {Number(salary.standardAllowance || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Standard Allowance</span>
                      <span className="font-mono font-medium">{formatCurrency(Number(salary.standardAllowance))}</span>
                    </div>
                  )}
                  {Number(salary.performanceBonus || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Performance Bonus</span>
                      <span className="font-mono font-medium">{formatCurrency(Number(salary.performanceBonus))}</span>
                    </div>
                  )}
                  {Number(salary.fixedAllowance || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Special / Fixed Allowance</span>
                      <span className="font-mono font-medium">{formatCurrency(Number(salary.fixedAllowance))}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deductions & Employer */}
              <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Deductions & Statutory</span>
                    <span className="text-red-500 font-mono font-bold">
                      - {formatCurrency(deductions)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee PF (12%)</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(salary.employeePf || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Professional Tax (PT)</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(salary.professionalTax || 200))}</span>
                  </div>
                  {Number(salary.tax || 0) > 200 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Income Tax (TDS)</span>
                      <span className="font-mono font-medium">{formatCurrency(Number(salary.tax) - 200)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Employer PF Match:</span>
                    <span className="font-mono">{formatCurrency(Number(salary.employerPf || 0))}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground text-sm">
              Your salary structure is currently being finalized by HR administration.
            </p>
          </Card>
        )}

        {/* Payslip Modal */}
        <PayslipModal
          open={!!viewPayslip}
          onClose={() => setViewPayslip(null)}
          salary={viewPayslip}
        />
      </div>
    );
  }

  // ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Payroll & Salary Architecture</h1>
            {isSuperAdmin && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-medium">
                Global Platform Payroll
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure employee compensation, salary breakdown components, statutory PF & tax liabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredSalaries}
            filename="payroll_structures"
            columns={[
              { header: "Employee", accessor: (r) => `${r.employee?.firstName} ${r.employee?.lastName}` },
              { header: "Login ID", accessor: (r) => r.employee?.user?.employeeId || "" },
              { header: "Department", accessor: (r) => r.employee?.department || "" },
              { header: "Designation", accessor: (r) => r.employee?.designation || "" },
              { header: "Monthly Gross (INR)", accessor: (r) => Number(r.grossSalary) || 0 },
              { header: "Basic (INR)", accessor: (r) => Number(r.basicSalary) || 0 },
              { header: "HRA (INR)", accessor: (r) => Number(r.hra) || 0 },
              { header: "Allowances (INR)", accessor: (r) => Number(r.allowances) || 0 },
              { header: "Employee PF (INR)", accessor: (r) => Number(r.employeePf) || 0 },
              { header: "Total Deductions (INR)", accessor: (r) => Number(r.deductions) || 0 },
              { header: "Net Take-Home (INR)", accessor: (r) => Number(r.netSalary) || 0 },
              { header: "Annual CTC (INR)", accessor: (r) => Number(r.yearlyWage) || (Number(r.grossSalary) || 0) * 12 },
            ]}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Monthly Payroll Spend"
          value={formatCurrency(metrics.totalGross)}
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          label="Net In-Hand Bank Payout"
          value={formatCurrency(metrics.totalNet)}
          icon={TrendingUp}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          label="Total Statutory PF & Taxes"
          value={formatCurrency(metrics.totalPf)}
          icon={ShieldCheck}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <StatCard
          label="Configured Salaries"
          value={`${metrics.configuredCount} / ${metrics.totalStaff}`}
          icon={Users}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="payroll-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee by name or ID..."
            className="pl-9 h-9"
          />
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
          <SelectTrigger className="w-44 h-9">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
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

      {/* ─── CONDITIONAL GRID OR TABLE VIEW ─── */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allLoading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-8 w-full" />
              </Card>
            ))
          ) : filteredSalaries.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
              {search ? "No salary structures match your search." : "No employees found."}
            </div>
          ) : (
            filteredSalaries.map((s) => {
              const emp = s.employee;
              const basic = Number(s.basicSalary) || 0;
              const gross = Number(s.grossSalary) || Number(s.monthlyWage) || 0;
              const deductions = Number(s.deductions) || 0;
              const net = Number(s.netSalary) || Math.max(0, gross - deductions);
              const employerPf = Number(s.employerPf) || 0;
              const annualCtc = (Number(s.yearlyWage) || gross * 12) + (employerPf * 12);
              const isConfigured = gross > 0;

              return (
                <Card
                  key={s.employeeId}
                  className="rounded-2xl border bg-card p-4 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md transition-all duration-200"
                >
                  {/* Top: Avatar & Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 ring-2 ring-background shadow-xs shrink-0">
                        <AvatarImage src={emp?.profileImage ?? undefined} />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {getInitials(`${emp?.firstName || ""} ${emp?.lastName || ""}`)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {emp?.firstName} {emp?.lastName}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">
                          {emp?.user?.employeeId}
                        </p>
                      </div>
                    </div>

                    {isConfigured ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 shrink-0 font-medium">
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] text-muted-foreground shrink-0">
                        Not Set
                      </Badge>
                    )}
                  </div>

                  {/* Organization (Super Admin only) & Role */}
                  <div className="space-y-0.5 text-xs">
                    {isSuperAdmin && (
                      <span className="font-semibold text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full inline-block mb-1">
                        {emp?.company?.name || "System"}
                      </span>
                    )}
                    <p className="font-medium text-foreground truncate">{emp?.designation || "—"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{emp?.department || "—"}</p>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div className="p-3 rounded-xl bg-muted/30 border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Net Take-Home</p>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {isConfigured ? formatCurrency(net) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Annual CTC</p>
                      <p className="font-mono font-bold text-primary text-sm">
                        {isConfigured ? formatCurrencyCompact(annualCtc) : "—"}
                      </p>
                    </div>
                    <div className="col-span-2 pt-1 border-t flex justify-between text-[11px] text-muted-foreground">
                      <span>Monthly Gross:</span>
                      <span className="font-mono font-medium text-foreground">{isConfigured ? formatCurrency(gross) : "—"}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isConfigured && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs gap-1.5 h-8"
                        onClick={() => setViewPayslip(s)}
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        Payslip
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isConfigured ? "secondary" : "default"}
                      className="flex-1 text-xs gap-1.5 h-8"
                      onClick={() => setConfigSalary(s)}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      {isConfigured ? "Edit" : "Configure"}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* Salary Structure Table (List View) */
        <Card className="border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-transparent">
                    <TableHead className="py-3">Employee</TableHead>
                    {isSuperAdmin && <TableHead className="py-3">Organization</TableHead>}
                    <TableHead className="py-3">Department</TableHead>
                    <TableHead className="py-3 text-right">Basic</TableHead>
                    <TableHead className="py-3 text-right">Monthly Gross</TableHead>
                    <TableHead className="py-3 text-right">Deductions</TableHead>
                    <TableHead className="py-3 text-right font-semibold text-foreground">Net In-Hand</TableHead>
                    <TableHead className="py-3 text-right">Annual CTC</TableHead>
                    <TableHead className="py-3 text-center">Status</TableHead>
                    <TableHead className="py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, ...(isSuperAdmin ? [9] : [])].map((j) => (
                          <TableCell key={j} className="py-3">
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredSalaries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isSuperAdmin ? 10 : 9}
                        className="h-36 text-center text-muted-foreground text-sm"
                      >
                        {search ? "No salary structures match your search." : "No employees found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSalaries.map((s) => {
                      const emp = s.employee;
                      const basic = Number(s.basicSalary) || 0;
                      const gross = Number(s.grossSalary) || Number(s.monthlyWage) || 0;
                      const deductions = Number(s.deductions) || 0;
                      const net = Number(s.netSalary) || Math.max(0, gross - deductions);
                      const employerPf = Number(s.employerPf) || 0;
                      const annualCtc = (Number(s.yearlyWage) || gross * 12) + (employerPf * 12);
                      const isConfigured = gross > 0;

                      const isTarget = !!employeeIdParam && (
                        s.employeeId === employeeIdParam ||
                        s.employee?.id === employeeIdParam ||
                        (s.employee as any)?.user?.employeeId === employeeIdParam
                      );

                      return (
                        <TableRow
                          key={s.employeeId}
                          className={`hover:bg-muted/30 transition-colors ${
                            isTarget ? "bg-emerald-500/10 ring-2 ring-emerald-500/50 rounded-lg" : ""
                          }`}
                        >
                          {/* Employee */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={emp?.profileImage ?? undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                                  {getInitials(`${emp?.firstName || ""} ${emp?.lastName || ""}`)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-xs font-semibold text-foreground">
                                  {emp?.firstName} {emp?.lastName}
                                </p>
                                <p className="font-mono text-[10px] text-muted-foreground">
                                  {emp?.user?.employeeId}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          {/* Organization (Super Admin only) */}
                          {isSuperAdmin && (
                            <TableCell className="py-3">
                              <span className="font-semibold text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full inline-block">
                                {emp?.company?.name || "System"}
                              </span>
                            </TableCell>
                          )}

                          {/* Department & Role */}
                          <TableCell className="py-3 text-xs">
                            <p className="font-medium text-foreground">{emp?.designation || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{emp?.department || "—"}</p>
                          </TableCell>

                          {/* Basic */}
                          <TableCell className="py-3 text-right font-mono text-xs text-muted-foreground">
                            {isConfigured ? formatCurrency(basic) : "—"}
                          </TableCell>

                          {/* Gross */}
                          <TableCell className="py-3 text-right font-mono text-xs font-semibold text-foreground">
                            {isConfigured ? formatCurrency(gross) : "—"}
                          </TableCell>

                          {/* Deductions */}
                          <TableCell className="py-3 text-right font-mono text-xs text-red-500">
                            {isConfigured ? `-${formatCurrency(deductions)}` : "—"}
                          </TableCell>

                          {/* Net */}
                          <TableCell className="py-3 text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {isConfigured ? formatCurrency(net) : "—"}
                          </TableCell>

                          {/* Annual CTC */}
                          <TableCell className="py-3 text-right font-mono text-xs font-medium text-primary">
                            {isConfigured ? formatCurrencyCompact(annualCtc) : "—"}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3 text-center">
                            {isConfigured ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium">
                                Configured
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                                Not Set
                              </Badge>
                            )}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isConfigured && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  title="View Payslip"
                                  onClick={() => setViewPayslip(s)}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size={isTarget ? "sm" : "icon"}
                                variant={isTarget ? "default" : "ghost"}
                                className={
                                  isTarget
                                    ? "h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                    : "h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                }
                                title="Configure Salary Structure"
                                onClick={() => setConfigSalary(s)}
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                                {isTarget && <span>Configure</span>}
                              </Button>
                            </div>
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
      )}

      {/* Salary Configuration Modal */}
      <SalaryConfigModal
        open={!!configSalary}
        onClose={() => setConfigSalary(null)}
        salary={configSalary}
        onSave={handleSaveSalary}
        isSaving={updateSalary.isPending}
      />

      {/* Payslip Generator Modal */}
      <PayslipModal
        open={!!viewPayslip}
        onClose={() => setViewPayslip(null)}
        salary={viewPayslip}
      />
    </div>
  );
}
