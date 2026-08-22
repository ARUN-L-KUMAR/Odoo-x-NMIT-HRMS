"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  TrendingUp,
  ShieldAlert,
  Building2,
  Clock,
  Check,
  Sparkles,
  Loader2,
  PieChart as PieIcon,
  Calculator,
} from "lucide-react";
import { formatCurrency, getInitials } from "@/lib/utils";
import type { SalaryStructure, Employee } from "@/types";

interface SalaryConfigModalProps {
  open: boolean;
  onClose: () => void;
  salary: SalaryStructure | null;
  onSave: (data: any) => void;
  isSaving: boolean;
}

export function SalaryConfigModal({
  open,
  onClose,
  salary,
  onSave,
  isSaving,
}: SalaryConfigModalProps) {
  const [activeTab, setActiveTab] = useState("earnings");

  // Form State
  const [monthlyWage, setMonthlyWage] = useState<number>(0);
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [hra, setHra] = useState<number>(0);
  const [standardAllowance, setStandardAllowance] = useState<number>(0);
  const [performanceBonus, setPerformanceBonus] = useState<number>(0);
  const [leaveTravelAllowance, setLeaveTravelAllowance] = useState<number>(0);
  const [fixedAllowance, setFixedAllowance] = useState<number>(0);

  // Deductions State
  const [employeePf, setEmployeePf] = useState<number>(0);
  const [professionalTax, setProfessionalTax] = useState<number>(200);
  const [tax, setTax] = useState<number>(0);

  // Employer Cost State
  const [employerPf, setEmployerPf] = useState<number>(0);
  const [gratuity, setGratuity] = useState<number>(0);

  // Schedule State
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<number>(5);
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState<number>(8);
  const [breakTimeHours, setBreakTimeHours] = useState<number>(1);

  // Populate data on open
  useEffect(() => {
    if (!salary) return;
    const base = Number(salary.monthlyWage) || Number(salary.grossSalary) || 50000;
    setMonthlyWage(base);
    setBasicSalary(Number(salary.basicSalary) || Math.round(base * 0.5));
    setHra(Number(salary.hra) || Math.round(base * 0.25));
    setStandardAllowance(Number(salary.standardAllowance) || Math.round(base * 0.5 * 0.1667));
    setPerformanceBonus(Number(salary.performanceBonus) || Math.round(base * 0.5 * 0.0833));
    setLeaveTravelAllowance(Number(salary.leaveTravelAllowance) || Math.round(base * 0.5 * 0.0833));
    setFixedAllowance(Number(salary.fixedAllowance) || 0);

    setEmployeePf(Number(salary.employeePf) || Math.round(base * 0.5 * 0.12));
    setProfessionalTax(Number(salary.professionalTax) || 200);
    setTax(Number(salary.tax) > 200 ? Number(salary.tax) - 200 : 0);

    setEmployerPf(Number(salary.employerPf) || Math.round(base * 0.5 * 0.12));
    setGratuity(Math.round(base * 0.5 * 0.0481));

    setWorkingDaysPerWeek(salary.workingDaysPerWeek || 5);
    setWorkingHoursPerDay(Number(salary.workingHoursPerDay) || 8);
    setBreakTimeHours(Number(salary.breakTimeHours) || 1);
  }, [salary, open]);

  // Derived calculations
  const totalAllowances =
    Number(standardAllowance || 0) +
    Number(performanceBonus || 0) +
    Number(leaveTravelAllowance || 0) +
    Number(fixedAllowance || 0);

  const grossSalary = Number(basicSalary || 0) + Number(hra || 0) + totalAllowances;
  const totalDeductions = Number(employeePf || 0) + Number(professionalTax || 0) + Number(tax || 0);
  const netInHand = Math.max(0, grossSalary - totalDeductions);

  const totalEmployerContribution = Number(employerPf || 0) + Number(gratuity || 0);
  const monthlyCtc = grossSalary + totalEmployerContribution;
  const annualCtc = monthlyCtc * 12;

  // Hourly Rate estimate
  const monthlyWorkingHours = (workingDaysPerWeek * 4.33) * workingHoursPerDay;
  const hourlyRate = monthlyWorkingHours > 0 ? Math.round(grossSalary / monthlyWorkingHours) : 0;
  const overtimeRate = Math.round(hourlyRate * 1.5);

  // Quick Preset Handlers
  const applyPreset = (type: "standard" | "executive" | "flat") => {
    const base = monthlyWage || 50000;
    if (type === "standard") {
      const basic = Math.round(base * 0.5);
      const h = Math.round(basic * 0.5);
      const std = Math.round(basic * 0.1667);
      const perf = Math.round(basic * 0.0833);
      const lta = Math.round(basic * 0.0833);
      const fixed = Math.max(0, base - (basic + h + std + perf + lta));
      setBasicSalary(basic);
      setHra(h);
      setStandardAllowance(std);
      setPerformanceBonus(perf);
      setLeaveTravelAllowance(lta);
      setFixedAllowance(fixed);
      setEmployeePf(Math.round(basic * 0.12));
      setEmployerPf(Math.round(basic * 0.12));
      setGratuity(Math.round(basic * 0.0481));
    } else if (type === "executive") {
      const basic = Math.round(base * 0.4);
      const h = Math.round(base * 0.2);
      const perf = Math.round(base * 0.2);
      const fixed = Math.round(base * 0.2);
      setBasicSalary(basic);
      setHra(h);
      setStandardAllowance(0);
      setPerformanceBonus(perf);
      setLeaveTravelAllowance(0);
      setFixedAllowance(fixed);
      setEmployeePf(Math.round(basic * 0.12));
      setEmployerPf(Math.round(basic * 0.12));
      setGratuity(Math.round(basic * 0.0481));
    } else if (type === "flat") {
      setBasicSalary(base);
      setHra(0);
      setStandardAllowance(0);
      setPerformanceBonus(0);
      setLeaveTravelAllowance(0);
      setFixedAllowance(0);
      setEmployeePf(Math.round(base * 0.12));
      setEmployerPf(Math.round(base * 0.12));
      setGratuity(Math.round(base * 0.0481));
    }
  };

  const handleBaseWageChange = (val: number) => {
    setMonthlyWage(val);
    // Auto scale standard structure
    const basic = Math.round(val * 0.5);
    const h = Math.round(basic * 0.5);
    const std = Math.round(basic * 0.1667);
    const perf = Math.round(basic * 0.0833);
    const lta = Math.round(basic * 0.0833);
    const fixed = Math.max(0, val - (basic + h + std + perf + lta));
    setBasicSalary(basic);
    setHra(h);
    setStandardAllowance(std);
    setPerformanceBonus(perf);
    setLeaveTravelAllowance(lta);
    setFixedAllowance(fixed);
    setEmployeePf(Math.round(basic * 0.12));
    setEmployerPf(Math.round(basic * 0.12));
    setGratuity(Math.round(basic * 0.0481));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      monthlyWage: grossSalary,
      yearlyWage: grossSalary * 12,
      workingDaysPerWeek,
      workingHoursPerDay,
      breakTimeHours,
      basicSalary,
      hra,
      standardAllowance,
      performanceBonus,
      leaveTravelAllowance,
      fixedAllowance,
      employeePf,
      employerPf,
      professionalTax,
      allowances: totalAllowances,
      deductions: totalDeductions,
      pf: employeePf,
      tax: tax + professionalTax,
      grossSalary,
      netSalary: netInHand,
    });
  };

  const emp = salary?.employee;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl w-full max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-background p-6 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-xs">
                <AvatarImage src={emp?.profileImage ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {getInitials(`${emp?.firstName || ""} ${emp?.lastName || ""}`)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold tracking-tight">
                    {emp?.firstName} {emp?.lastName}
                  </DialogTitle>
                  {emp?.company?.name && (
                    <Badge variant="outline" className="text-[11px] font-medium bg-primary/5 text-primary border-primary/20">
                      {emp.company.name}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {emp?.designation || "Employee"} · {emp?.department || "Department"} · {emp?.user?.employeeId}
                </DialogDescription>
              </div>
            </div>

            {/* Live KPI summary pills */}
            <div className="flex items-center gap-2">
              <div className="bg-background/80 backdrop-blur-xs border rounded-xl px-3 py-1.5 text-right shadow-2xs">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Net In-Hand</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(netInHand)}/mo
                </p>
              </div>
              <div className="bg-background/80 backdrop-blur-xs border rounded-xl px-3 py-1.5 text-right shadow-2xs">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Annual CTC</p>
                <p className="text-sm font-bold text-primary font-mono">
                  {formatCurrency(annualCtc)}
                </p>
              </div>
            </div>
          </div>

          {/* Visual Percentage Breakdown Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>Salary Composition</span>
              <span>Gross: {formatCurrency(grossSalary)} · Deductions: {formatCurrency(totalDeductions)}</span>
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                style={{ width: `${grossSalary > 0 ? (netInHand / (grossSalary + totalEmployerContribution)) * 100 : 0}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`Net In-Hand: ${formatCurrency(netInHand)}`}
              />
              <div
                style={{ width: `${grossSalary > 0 ? (totalDeductions / (grossSalary + totalEmployerContribution)) * 100 : 0}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`Employee Deductions: ${formatCurrency(totalDeductions)}`}
              />
              <div
                style={{ width: `${grossSalary > 0 ? (totalEmployerContribution / (grossSalary + totalEmployerContribution)) * 100 : 0}%` }}
                className="bg-primary h-full transition-all"
                title={`Employer Contributions: ${formatCurrency(totalEmployerContribution)}`}
              />
            </div>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-0.5">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Net In-Hand ({grossSalary > 0 ? Math.round((netInHand / grossSalary) * 100) : 0}%)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Deductions ({grossSalary > 0 ? Math.round((totalDeductions / grossSalary) * 100) : 0}%)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Employer Cost</span>
            </div>
          </div>
        </div>

        {/* Modal Body with Tabs */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* Base Target Monthly Wage & Presets */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 shadow-2xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Target Monthly Gross Wage (₹)</Label>
                <div className="relative w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    value={monthlyWage || ""}
                    onChange={(e) => handleBaseWageChange(Number(e.target.value))}
                    className="pl-7 font-mono font-bold text-base h-9"
                    placeholder="50,000"
                  />
                </div>
              </div>

              {/* Template Presets */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Quick Templates:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("standard")}
                    className="h-7 text-xs gap-1 shadow-2xs"
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    Standard 50/25/12
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("executive")}
                    className="h-7 text-xs gap-1 shadow-2xs"
                  >
                    Executive 40/20/20
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("flat")}
                    className="h-7 text-xs gap-1 shadow-2xs"
                  >
                    100% Basic
                  </Button>
                </div>
              </div>
            </div>

            {/* Sub Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full h-10 p-1 bg-muted/60">
                <TabsTrigger value="earnings" className="text-xs font-semibold gap-1.5 px-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Earnings</span>
                  <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">({formatCurrency(grossSalary)})</span>
                </TabsTrigger>
                <TabsTrigger value="deductions" className="text-xs font-semibold gap-1.5 px-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span>Deductions</span>
                  <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">({formatCurrency(totalDeductions)})</span>
                </TabsTrigger>
                <TabsTrigger value="employer" className="text-xs font-semibold gap-1.5 px-2">
                  <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Employer CTC</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" className="text-xs font-semibold gap-1.5 px-2">
                  <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <span>Schedule</span>
                </TabsTrigger>
              </TabsList>

              {/* ─── TAB 1: EARNINGS ─── */}
              <TabsContent value="earnings" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Basic Salary */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Basic Salary (50%)</Label>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {grossSalary > 0 ? Math.round((basicSalary / grossSalary) * 100) : 50}% of Gross
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={basicSalary || ""}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBasicSalary(val);
                        setEmployeePf(Math.round(val * 0.12));
                        setEmployerPf(Math.round(val * 0.12));
                        setGratuity(Math.round(val * 0.0481));
                      }}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Foundation for PF, Gratuity & HRA.</p>
                  </div>

                  {/* House Rent Allowance (HRA) */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">House Rent Allowance (HRA)</Label>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {basicSalary > 0 ? Math.round((hra / basicSalary) * 100) : 50}% of Basic
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={hra || ""}
                      onChange={(e) => setHra(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Tax-exempt under Sec 10(13A).</p>
                  </div>

                  {/* Standard Allowance */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Standard Allowance</Label>
                    <Input
                      type="number"
                      min="0"
                      value={standardAllowance || ""}
                      onChange={(e) => setStandardAllowance(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Fixed statutory allowance.</p>
                  </div>

                  {/* Performance Bonus */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Performance / Variable Pay</Label>
                    <Input
                      type="number"
                      min="0"
                      value={performanceBonus || ""}
                      onChange={(e) => setPerformanceBonus(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Monthly performance component.</p>
                  </div>

                  {/* Leave Travel Allowance (LTA) */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Leave Travel Allowance (LTA)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={leaveTravelAllowance || ""}
                      onChange={(e) => setLeaveTravelAllowance(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Travel assistance allowance.</p>
                  </div>

                  {/* Fixed / Special Allowance */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Special / Fixed Allowance</Label>
                    <Input
                      type="number"
                      min="0"
                      value={fixedAllowance || ""}
                      onChange={(e) => setFixedAllowance(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Flexible balancing component.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Total Monthly Gross Salary:
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(grossSalary)}
                  </span>
                </div>
              </TabsContent>

              {/* ─── TAB 2: DEDUCTIONS ─── */}
              <TabsContent value="deductions" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Employee PF */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Employee PF (12% of Basic)</Label>
                      <Badge variant="outline" className="text-[10px]">Statutory</Badge>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={employeePf || ""}
                      onChange={(e) => setEmployeePf(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Employee contribution to Provident Fund.</p>
                  </div>

                  {/* Professional Tax (PT) */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Professional Tax (PT)</Label>
                      <Badge variant="outline" className="text-[10px]">State Slab</Badge>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={professionalTax || ""}
                      onChange={(e) => setProfessionalTax(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Standard state tax (₹200/mo).</p>
                  </div>

                  {/* Tax Deducted at Source (TDS / Income Tax) */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card sm:col-span-2">
                    <Label className="text-xs font-semibold">Income Tax / TDS (₹ / month)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={tax || ""}
                      onChange={(e) => setTax(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Monthly withholding income tax deduction based on tax regime.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                  <span className="text-xs font-semibold text-red-800 dark:text-red-300">
                    Total Monthly Deductions:
                  </span>
                  <span className="text-base font-bold font-mono text-red-700 dark:text-red-400">
                    - {formatCurrency(totalDeductions)}
                  </span>
                </div>
              </TabsContent>

              {/* ─── TAB 3: EMPLOYER CTC ─── */}
              <TabsContent value="employer" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Employer PF */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Employer PF (12% of Basic)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={employerPf || ""}
                      onChange={(e) => setEmployerPf(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Employer match to EPF & EPS.</p>
                  </div>

                  {/* Gratuity */}
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Gratuity Provision (4.81%)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={gratuity || ""}
                      onChange={(e) => setGratuity(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Statutory gratuity fund provision.</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-muted/30 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Monthly Gross Salary:</span>
                    <span className="font-mono font-medium">{formatCurrency(grossSalary)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Total Employer Contributions:</span>
                    <span className="font-mono font-medium">+{formatCurrency(totalEmployerContribution)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Total Monthly CTC:</span>
                    <span className="font-mono text-primary">{formatCurrency(monthlyCtc)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-foreground">
                    <span>Total Annual CTC:</span>
                    <span className="font-mono text-primary text-base">{formatCurrency(annualCtc)}</span>
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB 4: SCHEDULE & OVERTIME ─── */}
              <TabsContent value="schedule" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Working Days / Week</Label>
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      value={workingDaysPerWeek}
                      onChange={(e) => setWorkingDaysPerWeek(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Working Hours / Day</Label>
                    <Input
                      type="number"
                      min="1"
                      max="24"
                      value={workingHoursPerDay}
                      onChange={(e) => setWorkingHoursPerDay(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                    <Label className="text-xs font-semibold">Break Time (Hours)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="12"
                      value={breakTimeHours}
                      onChange={(e) => setBreakTimeHours(Number(e.target.value))}
                      className="h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl border bg-primary/5 space-y-2">
                  <h4 className="text-xs font-semibold text-primary">Overtime & Hourly Rate Calculator</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <p className="text-muted-foreground">Standard Hourly Rate:</p>
                      <p className="text-sm font-bold font-mono">{formatCurrency(hourlyRate)} / hr</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Overtime Hourly Rate (1.5x):</p>
                      <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(overtimeRate)} / hr
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-muted-foreground hidden sm:block font-mono">
              Net In-Hand Payout: <strong className="text-foreground">{formatCurrency(netInHand)}</strong>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-1.5 shadow-xs" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Salary Structure
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
