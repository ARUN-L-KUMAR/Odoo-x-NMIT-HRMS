"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User, Loader2, Save, KeyRound, Eye, EyeOff, ShieldCheck,
  FileText, Lock, DollarSign, Plus, X, Building2, MapPin,
  Briefcase, Mail, Phone, Calendar, Landmark, CreditCard, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/shared/image-upload";
import { useEmployeeDashboard, useUpdateEmployee } from "@/hooks";
import {
  selfUpdateEmployeeSchema,
  changePasswordSchema,
  type SelfUpdateEmployeeInput,
  type ChangePasswordInput,
} from "@/lib/validations";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { data, isLoading } = useEmployeeDashboard();
  const updateEmployee = useUpdateEmployee();

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>("resume");

  // Skills & Certifications state
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);

  // Password change state
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<SelfUpdateEmployeeInput>({
    resolver: zodResolver(selfUpdateEmployeeSchema),
  });

  useEffect(() => {
    if (data?.employee) {
      const e = data.employee;
      reset({
        firstName: e.firstName || "",
        lastName: e.lastName || "",
        phone: e.phone || "",
        address: e.address || "",
        city: e.city || "",
        state: e.state || "",
        postalCode: e.postalCode || "",
        profileImage: e.profileImage || "",
        manager: e.manager || "",
        location: e.location || "",
        about: e.about || "",
        whatILoveAboutMyJob: e.whatILoveAboutMyJob || "",
        interestsAndHobbies: e.interestsAndHobbies || "",
        dateOfBirth: e.dateOfBirth ? (e.dateOfBirth as string).split("T")[0] : "",
        nationality: e.nationality || "",
        personalEmail: e.personalEmail || "",
        gender: e.gender || "",
        maritalStatus: e.maritalStatus || "",
        bankAccountNumber: e.bankAccountNumber || "",
        bankName: e.bankName || "",
        bankIfsc: e.bankIfsc || "",
        panNumber: e.panNumber || "",
        uanNumber: e.uanNumber || "",
      });
      setSkills(e.skills || []);
      setCertifications(e.certifications || []);
    }
  }, [data?.employee, reset]);

  const onSave = (formData: SelfUpdateEmployeeInput) => {
    if (!data?.employee?.id) return;
    updateEmployee.mutate({
      id: data.employee.id,
      data: {
        ...formData,
        skills,
        certifications,
      },
    });
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      const updated = [...skills, skillInput.trim()];
      setSkills(updated);
      setSkillInput("");
      if (data?.employee?.id) {
        updateEmployee.mutate({ id: data.employee.id, data: { skills: updated } });
      }
    }
  };

  const removeSkill = (s: string) => {
    const updated = skills.filter((item) => item !== s);
    setSkills(updated);
    if (data?.employee?.id) {
      updateEmployee.mutate({ id: data.employee.id, data: { skills: updated } });
    }
  };

  const addCertification = () => {
    if (certInput.trim() && !certifications.includes(certInput.trim())) {
      const updated = [...certifications, certInput.trim()];
      setCertifications(updated);
      setCertInput("");
      if (data?.employee?.id) {
        updateEmployee.mutate({ id: data.employee.id, data: { certifications: updated } });
      }
    }
  };

  const removeCertification = (c: string) => {
    const updated = certifications.filter((item) => item !== c);
    setCertifications(updated);
    if (data?.employee?.id) {
      updateEmployee.mutate({ id: data.employee.id, data: { certifications: updated } });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  const employee = data?.employee;
  const name = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();
  const salary = employee?.salaryStructure;

  // Salary calculations based on monthlyWage
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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          View and manage your employee profile, skills, and private records
        </p>
      </div>

      <form onSubmit={handleSubmit(onSave)} className="space-y-6">
        {/* ─── Profile Header Card (Matches Excalidraw) ────────────────────────── */}
        <Card className="border shadow-xs overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar + Cloudinary Upload */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  <Avatar className="h-28 w-28 ring-4 ring-background shadow-md">
                    <AvatarImage src={watch("profileImage") || employee?.profileImage || undefined} />
                    <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                      {getInitials(name || session?.user?.employeeId || "U")}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <ImageUpload
                  value={watch("profileImage") || employee?.profileImage || null}
                  onChange={(url) => {
                    setValue("profileImage", url || "");
                    if (employee?.id) {
                      updateEmployee.mutate({ id: employee.id, data: { profileImage: url || null } });
                    }
                  }}
                  folder="HRMS"
                  label="Upload Photo"
                  shape="circle"
                  size="sm"
                />
              </div>

              {/* Left Column Info */}
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {name || session?.user?.employeeId}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {session?.user?.employeeId}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">
                      {employee?.designation || "Team Member"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span className="truncate">{session?.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <Input
                      {...register("phone")}
                      placeholder="Mobile number"
                      className="h-7 text-xs max-w-40 border-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column Info (Company, Dept, Manager, Location) */}
              <div className="w-full md:w-64 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 space-y-2.5 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Company</p>
                  <p className="font-medium text-xs flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Dayflow
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Department</p>
                  <p className="font-medium text-xs flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    {employee?.department || "General"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Manager</p>
                  <Input
                    {...register("manager")}
                    placeholder="Reports to..."
                    className="h-7 text-xs border-muted mt-0.5"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Location</p>
                  <Input
                    {...register("location")}
                    placeholder="Office / Remote"
                    className="h-7 text-xs border-muted mt-0.5"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Profile Tabs (Resume | Private Info | Salary Info | Security) ──── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList variant="line" className="border-b w-full justify-start h-10 p-0 gap-6">
            <TabsTrigger value="resume" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
              <FileText className="h-4 w-4" />
              Resume
            </TabsTrigger>
            <TabsTrigger value="private" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
              <Lock className="h-4 w-4" />
              Private Info
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="salary" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
                <DollarSign className="h-4 w-4" />
                Salary Info <Badge variant="secondary" className="text-[10px] ml-1">Admin</Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
              <KeyRound className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: RESUME (About, What I love, Interests, Skills, Certs) ─── */}
          <TabsContent value="resume" className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Notes */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>About</span>
                      <Sparkles className="h-3.5 w-3.5 text-primary/70" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      {...register("about")}
                      rows={4}
                      placeholder="Write a brief intro about yourself..."
                      className="w-full text-xs p-2.5 rounded-lg border bg-background resize-none focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">What I love about my job</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      {...register("whatILoveAboutMyJob")}
                      rows={3}
                      placeholder="What drives your passion in this role..."
                      className="w-full text-xs p-2.5 rounded-lg border bg-background resize-none focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">My interests and hobbies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      {...register("interestsAndHobbies")}
                      rows={3}
                      placeholder="Your personal interests outside work..."
                      className="w-full text-xs p-2.5 rounded-lg border bg-background resize-none focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Skills & Certifications */}
              <div className="space-y-4">
                {/* Skills */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5 min-h-12 p-2 rounded-lg bg-muted/30 border border-dashed">
                      {skills.length === 0 && (
                        <p className="text-xs text-muted-foreground m-auto">No skills added yet</p>
                      )}
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1 text-xs py-1 px-2.5 bg-primary/10 text-primary hover:bg-primary/20">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                        placeholder="Add a skill (e.g. React, SQL)"
                        className="h-8 text-xs"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addSkill} className="h-8 text-xs gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Certification */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Certification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5 min-h-12 p-2 rounded-lg bg-muted/30 border border-dashed">
                      {certifications.length === 0 && (
                        <p className="text-xs text-muted-foreground m-auto">No certifications added yet</p>
                      )}
                      {certifications.map((cert) => (
                        <Badge key={cert} variant="outline" className="gap-1 text-xs py-1 px-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                          {cert}
                          <button type="button" onClick={() => removeCertification(cert)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={certInput}
                        onChange={(e) => setCertInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCertification(); } }}
                        placeholder="Add certification (e.g. AWS Solutions Architect)"
                        className="h-8 text-xs"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addCertification} className="h-8 text-xs gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 2: PRIVATE INFO (Personal details & Bank / ID) ─────────────── */}
          <TabsContent value="private" className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Personal Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date of Birth</Label>
                    <Input type="date" {...register("dateOfBirth")} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Residing Address</Label>
                    <Input {...register("address")} placeholder="Street Address" className="h-8 text-xs" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">City</Label>
                      <Input {...register("city")} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State</Label>
                      <Input {...register("state")} className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Postal Code</Label>
                      <Input {...register("postalCode")} className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nationality</Label>
                    <Input {...register("nationality")} placeholder="e.g. Indian" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Personal Email</Label>
                    <Input type="email" {...register("personalEmail")} placeholder="personal@gmail.com" className="h-8 text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Gender</Label>
                      <Input {...register("gender")} placeholder="Male / Female / Other" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Marital Status</Label>
                      <Input {...register("maritalStatus")} placeholder="Single / Married" className="h-8 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date of Joining</Label>
                    <p className="text-xs font-mono py-1.5 px-2.5 rounded bg-muted/60 text-muted-foreground border">
                      {employee?.joiningDate ? formatDate(employee.joiningDate) : "—"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Bank Details & Identifications */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-primary" />
                      Bank Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Account Number</Label>
                      <Input {...register("bankAccountNumber")} placeholder="Account Number" className="h-8 text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bank Name</Label>
                      <Input {...register("bankName")} placeholder="e.g. HDFC Bank" className="h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">IFSC Code</Label>
                      <Input {...register("bankIfsc")} placeholder="e.g. HDFC0001234" className="h-8 text-xs font-mono uppercase" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      Government & Identity Numbers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">PAN No</Label>
                      <Input {...register("panNumber")} placeholder="ABCDE1234F" className="h-8 text-xs font-mono uppercase" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">UAN No</Label>
                      <Input {...register("uanNumber")} placeholder="100000000000" className="h-8 text-xs font-mono" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Emp Code</Label>
                      <p className="text-xs font-mono py-1.5 px-2.5 rounded bg-muted/60 text-muted-foreground border">
                        {session?.user?.employeeId}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── TAB 3: SALARY INFO (ADMIN ONLY — Matches Excalidraw) ────────────── */}
          {isAdmin && (
            <TabsContent value="salary" className="space-y-6 pt-2">
              {/* Wage Overview Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      Salary Structure & Working Schedule
                    </CardTitle>
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                      Admin Configured
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Top Wage Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Monthly Wage</p>
                      <p className="text-xl font-bold text-foreground font-mono mt-0.5">
                        {formatCurrency(monthlyWage)} <span className="text-xs font-normal text-muted-foreground">/ Month</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Yearly Wage</p>
                      <p className="text-xl font-bold text-foreground font-mono mt-0.5">
                        {formatCurrency(yearlyWage)} <span className="text-xs font-normal text-muted-foreground">/ Yearly</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Working Schedule</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {salary?.workingDaysPerWeek || 5} days / week
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Hours & Break</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {Number(salary?.workingHoursPerDay || 8)} hrs/day &middot; {Number(salary?.breakTimeHours || 1)} hr break
                      </p>
                    </div>
                  </div>

                  {/* Salary Components Breakdown (Matches Excalidraw) */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Salary Components</h3>
                    <div className="divide-y rounded-xl border bg-card overflow-hidden">
                      <div className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-semibold text-sm">Basic Salary</p>
                          <p className="text-[11px] text-muted-foreground">Define Basic salary from company cost (50% of monthly wage)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm">{formatCurrency(basicSalary)} <span className="text-xs font-normal text-muted-foreground">/ month</span></p>
                          <span className="text-[10px] text-muted-foreground">50.00 %</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-semibold text-sm">House Rent Allowance (HRA)</p>
                          <p className="text-[11px] text-muted-foreground">HRA provided to employees (50% of Basic Salary)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm">{formatCurrency(hra)} <span className="text-xs font-normal text-muted-foreground">/ month</span></p>
                          <span className="text-[10px] text-muted-foreground">50.00 % of Basic</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-semibold text-sm">Standard Allowance</p>
                          <p className="text-[11px] text-muted-foreground">Predetermined fixed allowance provided as part of salary</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm">{formatCurrency(standardAllowance)} <span className="text-xs font-normal text-muted-foreground">/ month</span></p>
                          <span className="text-[10px] text-muted-foreground">16.67 %</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-semibold text-sm">Performance Bonus</p>
                          <p className="text-[11px] text-muted-foreground">Variable amount paid during payroll cycle (8.33% of Basic)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm">{formatCurrency(performanceBonus)} <span className="text-xs font-normal text-muted-foreground">/ month</span></p>
                          <span className="text-[10px] text-muted-foreground">8.33 %</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 text-xs">
                        <div>
                          <p className="font-semibold text-sm">Leave Travel Allowance (LTA)</p>
                          <p className="text-[11px] text-muted-foreground">Covers travel expenses (8.33% of Basic)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm">{formatCurrency(lta)} <span className="text-xs font-normal text-muted-foreground">/ month</span></p>
                          <span className="text-[10px] text-muted-foreground">8.33 %</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 text-xs bg-muted/20">
                        <div>
                          <p className="font-semibold text-sm">Fixed Allowance</p>
                          <p className="text-[11px] text-muted-foreground">Remaining balance portion of wages (Wage - sum of all components)</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm">{formatCurrency(fixedAllowance)} <span className="text-xs font-normal text-muted-foreground">/ month</span></p>
                          <span className="text-[10px] text-muted-foreground">Balance</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PF & Tax Deductions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PF */}
                    <div className="rounded-xl border p-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Provident Fund (PF) Contribution</h4>
                      <div className="flex justify-between items-center text-xs py-1">
                        <div>
                          <p className="font-medium">Employee PF</p>
                          <p className="text-[10px] text-muted-foreground">12% calculated on basic salary</p>
                        </div>
                        <p className="font-mono font-bold">{formatCurrency(employeePf)}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs py-1 border-t">
                        <div>
                          <p className="font-medium">Employer PF</p>
                          <p className="text-[10px] text-muted-foreground">12% calculated on basic salary</p>
                        </div>
                        <p className="font-mono font-bold">{formatCurrency(employerPf)}</p>
                      </div>
                    </div>

                    {/* Tax */}
                    <div className="rounded-xl border p-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Tax Deductions</h4>
                      <div className="flex justify-between items-center text-xs py-1">
                        <div>
                          <p className="font-medium">Professional Tax</p>
                          <p className="text-[10px] text-muted-foreground">Deducted monthly from gross salary</p>
                        </div>
                        <p className="font-mono font-bold">{formatCurrency(profTax)}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs py-1 border-t">
                        <div>
                          <p className="font-medium text-emerald-600 font-semibold">Net Take-Home Pay</p>
                          <p className="text-[10px] text-muted-foreground">Gross minus employee deductions</p>
                        </div>
                        <p className="font-mono font-bold text-sm text-emerald-600">
                          {formatCurrency(monthlyWage - employeePf - profTax)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ─── TAB 4: SECURITY (Change Password) ────────────────────────────── */}
          <TabsContent value="security" className="space-y-6 pt-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Change Account Password
                </CardTitle>
              </CardHeader>
              <CardContent className="max-w-md">
                {pwSuccess ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 py-3">
                    <ShieldCheck className="h-5 w-5" />
                    <p className="text-sm font-medium">Password changed successfully!</p>
                  </div>
                ) : (
                  <ChangePasswordForm
                    showCurrent={showCurrent} setShowCurrent={setShowCurrent}
                    showNew={showNew} setShowNew={setShowNew}
                    showConfirm={showConfirm} setShowConfirm={setShowConfirm}
                    pwError={pwError} pwLoading={pwLoading}
                    onSubmit={async (pwData) => {
                      setPwError(null);
                      setPwLoading(true);
                      try {
                        const res = await fetch("/api/auth/change-password", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(pwData),
                        });
                        const result = await res.json();
                        if (!res.ok || !result.success) {
                          setPwError(result.error?.message || "Failed to change password.");
                        } else {
                          setPwSuccess(true);
                          setTimeout(() => setPwSuccess(false), 4000);
                        }
                      } catch {
                        setPwError("Something went wrong.");
                      } finally {
                        setPwLoading(false);
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── Save Changes Sticky Bar ────────────────────────────────────────── */}
        <div className="sticky bottom-4 z-20 flex justify-end">
          <Button
            type="submit"
            disabled={updateEmployee.isPending}
            className="gap-2 shadow-lg px-6 font-semibold"
          >
            {updateEmployee.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Inline Change Password Form Component ────────────────────────────────────

function ChangePasswordForm({
  showCurrent, setShowCurrent,
  showNew, setShowNew,
  showConfirm, setShowConfirm,
  pwError, pwLoading, onSubmit,
}: {
  showCurrent: boolean; setShowCurrent: (v: boolean) => void;
  showNew: boolean; setShowNew: (v: boolean) => void;
  showConfirm: boolean; setShowConfirm: (v: boolean) => void;
  pwError: string | null;
  pwLoading: boolean;
  onSubmit: (data: ChangePasswordInput) => Promise<void>;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  return (
    <form onSubmit={handleSubmit(async (d) => { await onSubmit(d); reset(); })} className="space-y-4">
      {pwError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
          {pwError}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Current Password</Label>
        <div className="relative">
          <Input
            type={showCurrent ? "text" : "password"}
            placeholder="Enter current password"
            {...register("currentPassword")}
            className={`pr-10 ${errors.currentPassword ? "border-destructive" : ""}`}
          />
          <button type="button" tabIndex={-1} onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">New Password</Label>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              placeholder="Min 8 chars"
              {...register("newPassword")}
              className={`pr-10 ${errors.newPassword ? "border-destructive" : ""}`}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Confirm New Password</Label>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Repeat new password"
              {...register("confirmPassword")}
              className={`pr-10 ${errors.confirmPassword ? "border-destructive" : ""}`}
            />
            <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      <Button type="submit" size="sm" disabled={pwLoading} className="gap-2">
        {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        Update Password
      </Button>
    </form>
  );
}
