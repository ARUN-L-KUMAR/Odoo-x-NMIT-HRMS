"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, User, Building2, Briefcase, Mail, Phone,
  FileText, Lock, DollarSign, Sparkles, Landmark, CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { useEmployee } from "@/hooks";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "status-success",
  INACTIVE: "status-secondary",
  ON_NOTICE: "status-warning",
  TERMINATED: "status-destructive",
};

export default function EmployeeViewOnlyProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const router = useRouter();

  const { data: employee, isLoading } = useEmployee(id);

  if (isLoading) {
    return (
      <div className="space-y-6 w-full">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6 w-full">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Employee not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const salary = employee.salaryStructure;

  // Salary calculations
  const monthlyWage = Number(salary?.monthlyWage || 50000);
  const yearlyWage = Number(salary?.yearlyWage || monthlyWage * 12);
  const basicSalary = Number(salary?.basicSalary || monthlyWage * 0.5);
  const hra = Number(salary?.hra || basicSalary * 0.5);
  const standardAllowance = Number(salary?.standardAllowance || Math.round(basicSalary * 0.1667));
  const performanceBonus = Number(salary?.performanceBonus || Math.round(basicSalary * 0.0833));
  const lta = Number(salary?.leaveTravelAllowance || Math.round(basicSalary * 0.0833));
  const fixedAllowance = Number(
    salary?.fixedAllowance || Math.max(0, monthlyWage - (basicSalary + hra + standardAllowance + performanceBonus + lta))
  );
  const employeePf = Number(salary?.employeePf || basicSalary * 0.12);
  const employerPf = Number(salary?.employerPf || basicSalary * 0.12);
  const profTax = Number(salary?.professionalTax || 200);

  return (
    <div className="space-y-6 w-full pb-12">

      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/employees")}>
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Button>

      {/* Profile Header Card */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Side: Avatar + Identity (spanning 6 cols) */}
            <div className="lg:col-span-6 flex flex-col sm:flex-row gap-5 items-start">
              <Avatar className="h-24 w-24 ring-4 ring-background shadow-md shrink-0">
                <AvatarImage src={employee.profileImage ?? undefined} alt={fullName} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>

              {/* Main Info */}
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {employee.user?.employeeId}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary border-primary/20 capitalize text-xs">
                      {employee.designation || "Team Member"}
                    </Badge>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[employee.employmentStatus] ?? "status-secondary"}`}
                    >
                      {employee.employmentStatus}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary/70 shrink-0" />
                    <span className="truncate text-xs">{employee.user?.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary/70 shrink-0" />
                    <span className="text-xs">{employee.phone || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Company Details (spanning 6 cols, equal 2x2 grid) */}
            <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Company</p>
                <p className="font-medium text-xs flex items-center gap-1.5 py-1">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  Datamoo
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Department</p>
                <p className="font-medium text-xs flex items-center gap-1.5 py-1">
                  <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                  {employee.department || "General"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Manager</p>
                <p className="text-xs text-foreground font-medium py-1">{employee.manager || "—"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                <p className="text-xs text-foreground font-medium py-1">{employee.location || "Office"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Tabs */}
      <Tabs defaultValue="resume" className="space-y-4">
        <TabsList variant="line" className="border-b w-full justify-start h-10 p-0 gap-6">
          <TabsTrigger value="resume" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
            <FileText className="h-4 w-4" /> Resume
          </TabsTrigger>
          <TabsTrigger value="private" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
            <Lock className="h-4 w-4" /> Private Info
          </TabsTrigger>
          {isAdmin && salary && (
            <TabsTrigger value="salary" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
              <DollarSign className="h-4 w-4" /> Salary Info <Badge variant="secondary" className="text-[10px] ml-1">Admin</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── TAB 1: RESUME ─── */}
        <TabsContent value="resume" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>About</span>
                    <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {employee.about || "No introduction added."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">What I love about my job</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {employee.whatILoveAboutMyJob || "No details provided."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">My interests and hobbies</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {employee.interestsAndHobbies || "No interests added."}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Skills */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 min-h-12 p-3 rounded-lg bg-muted/30">
                    {(!employee.skills || employee.skills.length === 0) ? (
                      <p className="text-xs text-muted-foreground">No skills listed</p>
                    ) : (
                      employee.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs py-1 px-2.5 bg-primary/10 text-primary">
                          {skill}
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 min-h-12 p-3 rounded-lg bg-muted/30">
                    {(!employee.certifications || employee.certifications.length === 0) ? (
                      <p className="text-xs text-muted-foreground">No certifications listed</p>
                    ) : (
                      employee.certifications.map((cert) => (
                        <Badge key={cert} variant="outline" className="text-xs py-1 px-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                          {cert}
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: PRIVATE INFO ─── */}
        <TabsContent value="private" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-medium">{employee.dateOfBirth ? formatDate(employee.dateOfBirth) : "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Residing Address</span>
                  <span className="font-medium text-right max-w-[60%]">
                    {[employee.address, employee.city, employee.state, employee.postalCode].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Nationality</span>
                  <span className="font-medium">{employee.nationality || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Personal Email</span>
                  <span className="font-medium">{employee.personalEmail || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Gender</span>
                  <span className="font-medium">{employee.gender || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b">
                  <span className="text-muted-foreground">Marital Status</span>
                  <span className="font-medium">{employee.maritalStatus || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Date of Joining</span>
                  <span className="font-medium font-mono">{employee.joiningDate ? formatDate(employee.joiningDate) : "—"}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-primary" /> Bank Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">Account Number</span>
                    <span className="font-mono font-medium">{employee.bankAccountNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">Bank Name</span>
                    <span className="font-medium">{employee.bankName || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">IFSC Code</span>
                    <span className="font-mono font-medium">{employee.bankIfsc || "—"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Government Identifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">PAN No</span>
                    <span className="font-mono font-medium">{employee.panNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-muted-foreground">UAN No</span>
                    <span className="font-mono font-medium">{employee.uanNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Emp Code</span>
                    <span className="font-mono font-medium">{employee.user?.employeeId || "—"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 3: SALARY INFO (ADMIN ONLY) ─── */}
        {isAdmin && salary && (
          <TabsContent value="salary" className="space-y-6 pt-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Salary Structure & Schedule
                  </CardTitle>
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                    Admin Visible
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Monthly Wage</p>
                    <p className="text-xl font-bold text-foreground font-mono mt-0.5">{formatCurrency(monthlyWage)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Yearly Wage</p>
                    <p className="text-xl font-bold text-foreground font-mono mt-0.5">{formatCurrency(yearlyWage)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Working Days</p>
                    <p className="text-sm font-semibold mt-0.5">{salary.workingDaysPerWeek || 5} days/week</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Working Hours</p>
                    <p className="text-sm font-semibold mt-0.5">{Number(salary.workingHoursPerDay || 8)} hrs/day</p>
                  </div>
                </div>

                <div className="divide-y rounded-xl border bg-card overflow-hidden">
                  <div className="flex justify-between p-3 text-xs">
                    <span>Basic Salary (50% of wage)</span>
                    <span className="font-mono font-bold">{formatCurrency(basicSalary)}</span>
                  </div>
                  <div className="flex justify-between p-3 text-xs">
                    <span>HRA (50% of Basic)</span>
                    <span className="font-mono font-bold">{formatCurrency(hra)}</span>
                  </div>
                  <div className="flex justify-between p-3 text-xs">
                    <span>Standard Allowance</span>
                    <span className="font-mono font-bold">{formatCurrency(standardAllowance)}</span>
                  </div>
                  <div className="flex justify-between p-3 text-xs">
                    <span>Performance Bonus</span>
                    <span className="font-mono font-bold">{formatCurrency(performanceBonus)}</span>
                  </div>
                  <div className="flex justify-between p-3 text-xs">
                    <span>Leave Travel Allowance</span>
                    <span className="font-mono font-bold">{formatCurrency(lta)}</span>
                  </div>
                  <div className="flex justify-between p-3 text-xs bg-muted/20 font-semibold">
                    <span>Fixed Allowance</span>
                    <span className="font-mono">{formatCurrency(fixedAllowance)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
