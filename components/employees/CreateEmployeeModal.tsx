"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Briefcase,
  DollarSign,
  Building2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Loader2,
  KeyRound,
  ShieldCheck,
  Calculator,
} from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";
import { useDepartments } from "@/hooks";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface CreateEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: any) => void;
  isPending: boolean;
  formError?: string | null;
  orgsList?: Array<{ id: string; name: string }>;
  isSuperAdmin?: boolean;
}

export function CreateEmployeeModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  formError,
  orgsList = [],
  isSuperAdmin = false,
}: CreateEmployeeModalProps) {
  const { data: session } = useSession();
  const companyInitials = (session?.user as any)?.companyInitials || "DF";

  const [activeTab, setActiveTab] = useState("basic");

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [joiningDate, setJoiningDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [employmentStatus, setEmploymentStatus] = useState("ACTIVE");
  const [location, setLocation] = useState("Office");
  const [manager, setManager] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [companyId, setCompanyId] = useState("");

  // Dynamic Departments from Database for this organization
  const { data: departments = [] } = useDepartments(companyId || undefined);


  // Compensation State
  const [monthlyWage, setMonthlyWage] = useState<number>(50000);
  const [workingDays, setWorkingDays] = useState<number>(5);
  const [workingHours, setWorkingHours] = useState<number>(8);

  // Live Auto-Generated Login ID preview
  const previewLoginId = useMemo(() => {
    const fn = firstName.trim().substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "X") || "XX";
    const ln = lastName.trim().substring(0, 2).toUpperCase().replace(/[^A-Z]/g, "X") || "XX";
    const year = joiningDate ? new Date(joiningDate).getFullYear().toString() : new Date().getFullYear().toString();
    return `${companyInitials}${fn}${ln}${year}0001`;
  }, [firstName, lastName, joiningDate, companyInitials]);

  // Live Salary Breakdown
  const salaryBreakdown = useMemo(() => {
    const wage = Number(monthlyWage) || 0;
    const basic = Math.round(wage * 0.5);
    const hra = Math.round(basic * 0.5);
    const standard = Math.round(basic * 0.1667);
    const bonus = Math.round(basic * 0.0833);
    const lta = Math.round(basic * 0.0833);
    const fixed = Math.max(0, wage - (basic + hra + standard + bonus + lta));
    const pf = Math.round(basic * 0.12);
    const pt = 200;
    const net = Math.max(0, wage - pf - pt);
    return { basic, hra, standard, bonus, lta, fixed, pf, pt, net, yearly: wage * 12 };
  }, [monthlyWage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      firstName,
      lastName,
      email,
      phone: phone || null,
      designation,
      department,
      joiningDate,
      employmentStatus,
      location: location || null,
      manager: manager || null,
      profileImage: profileImage || null,
      companyId: companyId || undefined,
      monthlyWage: Number(monthlyWage) || 50000,
      workingDaysPerWeek: Number(workingDays) || 5,
      workingHoursPerDay: Number(workingHours) || 8,
    });
  };

  const handleReset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setDepartment("");
    setJoiningDate(format(new Date(), "yyyy-MM-dd"));
    setEmploymentStatus("ACTIVE");
    setLocation("Office");
    setManager("");
    setProfileImage("");
    setCompanyId("");
    setMonthlyWage(50000);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-0 gap-0 border shadow-2xl">

        {/* Modal Header */}
        <div className="p-6 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Add New Employee</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Set up employee profile, role assignments, and compensation structure
                </DialogDescription>
              </div>
            </div>

            {/* Live Login ID Preview */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Auto Generated ID
              </span>
              <Badge variant="outline" className="font-mono text-xs mt-0.5 bg-primary/5 text-primary border-primary/20">
                {previewLoginId}
              </Badge>
            </div>
          </div>

          {/* Form Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5">
            <TabsList className="grid grid-cols-2 w-full max-w-sm h-9">
              <TabsTrigger value="basic" className="text-xs font-semibold gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Basic &amp; Work
              </TabsTrigger>
              <TabsTrigger value="salary" className="text-xs font-semibold gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Compensation (CTC)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {formError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs text-destructive flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* ─── TAB 1: BASIC & EMPLOYMENT ───────────────────────────────────── */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              {/* Organization Selector (Super Admin) */}
              {isSuperAdmin && orgsList.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Target Organization *
                  </Label>
                  <Select value={companyId} onValueChange={(v) => setCompanyId(v ?? "")}>
                    <SelectTrigger className="h-9 bg-background">
                      <SelectValue placeholder="Select Organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgsList.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}


              {/* Name & Photo */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                <div className="sm:col-span-8 grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">First Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Rahul"
                      className="h-9 text-sm"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Last Name *</Label>
                    <Input
                      required
                      placeholder="e.g. Sharma"
                      className="h-9 text-sm"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Work Email *
                    </Label>
                    <Input
                      required
                      type="email"
                      placeholder="rahul.sharma@company.com"
                      className="h-9 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
                    </Label>
                    <Input
                      type="tel"
                      placeholder="+91-9876543210"
                      className="h-9 text-sm"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Profile Photo Upload */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl border bg-muted/20 text-center space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Profile Photo</Label>
                  <ImageUpload
                    value={profileImage || null}
                    onChange={(url) => setProfileImage(url || "")}
                    folder="HRMS"
                    label="Upload"
                    shape="circle"
                    size="md"
                  />
                  <span className="text-[10px] text-muted-foreground">PNG, JPG up to 5MB</span>
                </div>
              </div>

              {/* Work Details Grid (3 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Department *
                  </Label>
                  <Select value={department} onValueChange={(v) => setDepartment(v || "")}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>

                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" /> Designation / Job Title *
                  </Label>
                  <Input
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    className="h-9 text-sm"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Joining Date
                  </Label>
                  <Input
                    type="date"
                    className="h-9 text-sm font-mono"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Employment Status</Label>
                  <Select value={employmentStatus} onValueChange={(v) => setEmploymentStatus(v ?? "ACTIVE")}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE (Regular)</SelectItem>
                      <SelectItem value="ON_NOTICE">ON NOTICE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Work Location
                  </Label>
                  <Select value={location} onValueChange={(v) => setLocation(v ?? "Office")}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Office">Office (On-site)</SelectItem>
                      <SelectItem value="Remote">Remote (WFH)</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Reporting Manager</Label>
                  <Input
                    placeholder="e.g. Arun Kumar"
                    className="h-9 text-sm"
                    value={manager}
                    onChange={(e) => setManager(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}


          {/* ─── TAB 2: COMPENSATION & WORKING SCHEDULE ─────────────────────── */}
          {activeTab === "salary" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1 space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Monthly Wage (INR) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      className="pl-7 h-9 font-mono font-bold text-sm"
                      value={monthlyWage}
                      onChange={(e) => setMonthlyWage(Number(e.target.value) || 0)}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Annual CTC: {formatCurrency(salaryBreakdown.yearly)}</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Working Days</Label>
                  <Select value={workingDays.toString()} onValueChange={(v) => setWorkingDays(Number(v))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 days / week (Mon - Fri)</SelectItem>
                      <SelectItem value="6">6 days / week (Mon - Sat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Working Hours</Label>
                  <Select value={workingHours.toString()} onValueChange={(v) => setWorkingHours(Number(v))}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8 hrs/day (1 hr break)</SelectItem>
                      <SelectItem value="9">9 hrs/day (1 hr break)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Live Salary Architecture Preview */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                      Auto-Calculated Salary Breakdown
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                    Excalidraw Aligned
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-background border">
                    <p className="text-[10px] text-muted-foreground">Basic Salary (50%)</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">{formatCurrency(salaryBreakdown.basic)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border">
                    <p className="text-[10px] text-muted-foreground">HRA (50% of Basic)</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">{formatCurrency(salaryBreakdown.hra)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border">
                    <p className="text-[10px] text-muted-foreground">Standard Allowance</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">{formatCurrency(salaryBreakdown.standard)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border">
                    <p className="text-[10px] text-muted-foreground">Bonus &amp; LTA</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">{formatCurrency(salaryBreakdown.bonus + salaryBreakdown.lta)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border">
                    <p className="text-[10px] text-muted-foreground">Fixed Allowance</p>
                    <p className="font-mono font-bold text-foreground mt-0.5">{formatCurrency(salaryBreakdown.fixed)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Net In-Hand Pay</p>
                    <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatCurrency(salaryBreakdown.net)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Credentials Info Notice */}
          <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 border border-primary/20 p-3">
            <KeyRound className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>
                The system will automatically generate Login ID:{" "}
                <span className="font-mono font-bold text-primary">{previewLoginId}</span> and a secure temporary password.
              </p>
              <p className="text-[11px]">
                A welcome email with login credentials will automatically be sent to{" "}
                <span className="font-semibold text-foreground">{email || "the employee's email"}</span>.
              </p>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleReset} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2 min-w-36 font-semibold shadow-xs">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Create Employee
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
