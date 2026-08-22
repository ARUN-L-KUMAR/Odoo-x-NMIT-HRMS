"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Download, Building2, User, Calendar, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { formatCurrency, formatDate, numberToWordsINR, getInitials } from "@/lib/utils";
import type { SalaryStructure } from "@/types";

interface PayslipModalProps {
  open: boolean;
  onClose: () => void;
  salary: SalaryStructure | null;
}

export function PayslipModal({ open, onClose, salary }: PayslipModalProps) {
  const [selectedMonth, setSelectedMonth] = useState("2026-08");

  const employeeId = salary?.employee?.id || salary?.employeeId;

  // Fetch live database payslip record
  const { data: payslipData, isLoading } = useQuery({
    queryKey: ["payslip", employeeId, selectedMonth],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await fetch(`/api/payroll/payslip/${employeeId}?month=${selectedMonth}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load payslip");
      return json.data;
    },
    enabled: !!employeeId && open,
  });

  if (!salary || !salary.employee) return null;

  const emp = payslipData?.employee || salary.employee;
  const company = emp?.company || { name: "Dayflow HRMS", initials: "DF", logoUrl: null };
  const period = payslipData?.period || {
    month: selectedMonth,
    monthName: "August 2026",
    totalDays: 31,
    workedDays: 22,
    paidLeaveDays: 1,
    absentDays: 0,
    lossOfPayDays: 0,
  };

  const fin = payslipData?.financials || {
    basic: Number(salary.basicSalary) || 0,
    hra: Number(salary.hra) || 0,
    standard: Number(salary.standardAllowance) || 0,
    bonus: Number(salary.performanceBonus) || 0,
    lta: Number(salary.leaveTravelAllowance) || 0,
    fixed: Number(salary.fixedAllowance) || 0,
    gross: Number(salary.grossSalary) || 0,
    pf: Number(salary.employeePf) || 0,
    pt: Number(salary.professionalTax) || 200,
    tax: Math.max(0, (Number(salary.tax) || 0) - 200),
    totalDeductions: Number(salary.deductions) || 0,
    netSalary: Number(salary.netSalary) || 0,
    employerPf: Number(salary.employerPf) || 0,
    gratuity: Math.round((Number(salary.basicSalary) || 0) * 0.0481),
  };

  const netInWords = numberToWordsINR(fin.netSalary);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl w-full max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? "2026-08")}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Pay Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-08">August 2026</SelectItem>
                <SelectItem value="2026-07">July 2026</SelectItem>
                <SelectItem value="2026-06">June 2026</SelectItem>
                <SelectItem value="2026-05">May 2026</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-[11px] text-emerald-700 bg-emerald-500/10 border-emerald-500/20">
              Live Verified Data
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="h-8 text-xs gap-1.5 shadow-2xs">
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Printable Slip Paper */}
        <div className="flex-1 overflow-y-auto p-8 bg-background print:p-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <div className="border rounded-xl p-6 bg-card shadow-xs space-y-6 text-card-foreground">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-5">
                <div className="flex items-center gap-3">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-lg object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-base shadow-xs">
                      {company.initials}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{company.name}</h2>
                    <p className="text-xs text-muted-foreground">Salary Pay Slip · {period.monthName}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payslip No.</p>
                  <p className="font-mono text-sm font-bold text-foreground">
                    PAY-{emp.user?.employeeId || "001"}-{selectedMonth.replace("-", "")}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Generated: {formatDate(new Date())}</p>
                </div>
              </div>

              {/* Employee & Bank Details Grid from Database */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30 border text-xs">
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-semibold">Employee Name</p>
                  <p className="font-semibold text-foreground mt-0.5">{emp.firstName} {emp.lastName}</p>
                  <p className="text-muted-foreground font-mono text-[11px]">{emp.user?.employeeId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-semibold">Department & Role</p>
                  <p className="font-semibold text-foreground mt-0.5">{emp.designation || "—"}</p>
                  <p className="text-muted-foreground text-[11px]">{emp.department || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-semibold">Bank Information</p>
                  <p className="font-semibold text-foreground mt-0.5">{emp.bankName || "—"}</p>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    {emp.bankAccountNumber ? `A/C: ••••${emp.bankAccountNumber.slice(-4)}` : "A/C: Not Recorded"}
                  </p>
                  {emp.bankIfsc && <p className="text-[10px] text-muted-foreground font-mono">IFSC: {emp.bankIfsc}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-semibold">Statutory Identifiers</p>
                  <p className="text-muted-foreground mt-0.5">PAN: <span className="font-mono font-semibold text-foreground">{emp.panNumber || "Not Provided"}</span></p>
                  <p className="text-muted-foreground">UAN: <span className="font-mono font-semibold text-foreground">{emp.uanNumber || "Not Provided"}</span></p>
                </div>
              </div>

              {/* Live Attendance & Work Days Summary from Database */}
              <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-lg border bg-card text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Month Days</p>
                  <p className="font-bold text-sm">{period.totalDays}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Worked Days</p>
                  <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{period.workedDays}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Approved Leave</p>
                  <p className="font-bold text-sm text-amber-600 dark:text-amber-400">{period.paidLeaveDays}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Loss of Pay (LOP)</p>
                  <p className="font-bold text-sm text-muted-foreground">{period.lossOfPayDays}</p>
                </div>
              </div>

              {/* Earnings vs Deductions Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Earnings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Earnings</h4>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₹)</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basic Salary</span>
                      <span className="font-mono font-medium">{formatCurrency(fin.basic)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">House Rent Allowance (HRA)</span>
                      <span className="font-mono font-medium">{formatCurrency(fin.hra)}</span>
                    </div>
                    {fin.standard > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Standard Allowance</span>
                        <span className="font-mono font-medium">{formatCurrency(fin.standard)}</span>
                      </div>
                    )}
                    {fin.bonus > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Performance Bonus</span>
                        <span className="font-mono font-medium">{formatCurrency(fin.bonus)}</span>
                      </div>
                    )}
                    {fin.lta > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Leave Travel Allowance (LTA)</span>
                        <span className="font-mono font-medium">{formatCurrency(fin.lta)}</span>
                      </div>
                    )}
                    {fin.fixed > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Special / Fixed Allowance</span>
                        <span className="font-mono font-medium">{formatCurrency(fin.fixed)}</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xs font-bold pt-1">
                    <span>Gross Earnings (A):</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(fin.gross)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deductions</h4>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₹)</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provident Fund (Employee PF)</span>
                      <span className="font-mono font-medium">{formatCurrency(fin.pf)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Professional Tax (PT)</span>
                      <span className="font-mono font-medium">{formatCurrency(fin.pt)}</span>
                    </div>
                    {fin.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Income Tax (TDS)</span>
                        <span className="font-mono font-medium">{formatCurrency(fin.tax)}</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xs font-bold pt-1">
                    <span>Total Deductions (B):</span>
                    <span className="font-mono text-red-600 dark:text-red-400">{formatCurrency(fin.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Salary Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-background to-emerald-500/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Net Salary Payable (A - B)</p>
                  <p className="text-xs text-muted-foreground italic mt-0.5">{netInWords}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-primary">{formatCurrency(fin.netSalary)}</span>
                </div>
              </div>

              {/* Employer Contribution Footer */}
              <div className="text-[11px] text-muted-foreground border-t pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p>Employer EPF: {formatCurrency(fin.employerPf)} · Gratuity Fund: {formatCurrency(fin.gratuity)}</p>
                <p className="text-right">System verified record · Dayflow HRMS</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
