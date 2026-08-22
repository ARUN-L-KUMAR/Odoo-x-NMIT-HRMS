"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft, User, Building2, Briefcase, Mail, Phone,
  FileText, Lock, DollarSign, Sparkles, Landmark, CreditCard,
  Pencil, Save, X, Plus, Loader2, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useEmployee, useUpdateEmployee, useDepartments } from "@/hooks";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";
import { ImageUpload } from "@/components/shared/image-upload";
import { updateEmployeeSchema, type UpdateEmployeeInput } from "@/lib/validations";
import { format } from "date-fns";


interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "status-success",
  INACTIVE: "status-secondary",
  ON_NOTICE: "status-warning",
  TERMINATED: "status-destructive",
};

export default function EmployeeProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN";
  const isSelf = session?.user?.employeeDbId === id;
  const router = useRouter();

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certInput, setCertInput] = useState("");

  const { data: employee, isLoading } = useEmployee(id);
  const updateEmployee = useUpdateEmployee();
  const { data: departments = [] } = useDepartments((employee as any)?.companyId || undefined);


  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateEmployeeInput>({
    resolver: zodResolver(updateEmployeeSchema),
  });

  const department = watch("department");
  const employmentStatus = watch("employmentStatus");
  const gender = watch("gender");
  const maritalStatus = watch("maritalStatus");

  // Populate form with current employee data
  useEffect(() => {
    if (employee) {
      setProfileImage(employee.profileImage || null);
      setSkills(employee.skills || []);
      setCertifications(employee.certifications || []);

      reset({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.user?.email || "",
        phone: employee.phone || "",
        designation: employee.designation || "",
        department: employee.department || "Engineering",
        employmentStatus: (employee.employmentStatus as any) || "ACTIVE",
        joiningDate: employee.joiningDate
          ? format(new Date(employee.joiningDate), "yyyy-MM-dd")
          : "",
        location: employee.location || "Office",
        manager: employee.manager || "",
        about: employee.about || "",
        whatILoveAboutMyJob: employee.whatILoveAboutMyJob || "",
        interestsAndHobbies: employee.interestsAndHobbies || "",
        dateOfBirth: employee.dateOfBirth
          ? format(new Date(employee.dateOfBirth), "yyyy-MM-dd")
          : "",
        gender: employee.gender || "",
        maritalStatus: employee.maritalStatus || "",
        nationality: employee.nationality || "Indian",
        personalEmail: employee.personalEmail || "",
        address: employee.address || "",
        city: employee.city || "",
        state: employee.state || "",
        postalCode: employee.postalCode || "",
        bankAccountNumber: employee.bankAccountNumber || "",
        bankName: employee.bankName || "",
        bankIfsc: employee.bankIfsc || "",
        panNumber: employee.panNumber || "",
        uanNumber: employee.uanNumber || "",
      });
    }
  }, [employee, reset]);

  const handleCancel = () => {
    if (employee) {
      setProfileImage(employee.profileImage || null);
      setSkills(employee.skills || []);
      setCertifications(employee.certifications || []);
      reset({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.user?.email || "",
        phone: employee.phone || "",
        designation: employee.designation || "",
        department: employee.department || "Engineering",
        employmentStatus: (employee.employmentStatus as any) || "ACTIVE",
        joiningDate: employee.joiningDate
          ? format(new Date(employee.joiningDate), "yyyy-MM-dd")
          : "",
        location: employee.location || "Office",
        manager: employee.manager || "",
        about: employee.about || "",
        whatILoveAboutMyJob: employee.whatILoveAboutMyJob || "",
        interestsAndHobbies: employee.interestsAndHobbies || "",
        dateOfBirth: employee.dateOfBirth
          ? format(new Date(employee.dateOfBirth), "yyyy-MM-dd")
          : "",
        gender: employee.gender || "",
        maritalStatus: employee.maritalStatus || "",
        nationality: employee.nationality || "Indian",
        personalEmail: employee.personalEmail || "",
        address: employee.address || "",
        city: employee.city || "",
        state: employee.state || "",
        postalCode: employee.postalCode || "",
        bankAccountNumber: employee.bankAccountNumber || "",
        bankName: employee.bankName || "",
        bankIfsc: employee.bankIfsc || "",
        panNumber: employee.panNumber || "",
        uanNumber: employee.uanNumber || "",
      });
    }
    setIsEditing(false);
  };


  const onSave = async (formData: UpdateEmployeeInput) => {
    if (!employee) return;

    const payload: UpdateEmployeeInput = {
      ...formData,
      profileImage: profileImage || null,
      skills,
      certifications,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : null,
    };

    updateEmployee.mutate(
      { id: employee.id, data: payload },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (s: string) => {
    setSkills(skills.filter((item) => item !== s));
  };

  const addCertification = () => {
    if (certInput.trim() && !certifications.includes(certInput.trim())) {
      setCertifications([...certifications, certInput.trim()]);
      setCertInput("");
    }
  };

  const removeCertification = (c: string) => {
    setCertifications(certifications.filter((item) => item !== c));
  };

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

  // Salary calculations based on Excalidraw formulas
  const monthlyWage = Number(salary?.monthlyWage || 50000);
  const yearlyWage = Number(salary?.yearlyWage || monthlyWage * 12);
  const rawBasic = Number(salary?.basicSalary);
  const rawHra = Number(salary?.hra);
  // Auto-compute 50% split if basic is not set or equals 100% of wage without allowances
  const basicSalary = (rawBasic > 0 && rawBasic < monthlyWage && rawHra > 0)
    ? rawBasic
    : Math.round(monthlyWage * 0.5);
  const hra = rawHra > 0 ? rawHra : Math.round(basicSalary * 0.5);
  const standardAllowance = Number(salary?.standardAllowance) || Math.round(basicSalary * 0.1667);
  const performanceBonus = Number(salary?.performanceBonus) || Math.round(basicSalary * 0.0833);
  const lta = Number(salary?.leaveTravelAllowance) || Math.round(basicSalary * 0.0833);
  const fixedAllowance = Number(salary?.fixedAllowance) || Math.max(0, monthlyWage - (basicSalary + hra + standardAllowance + performanceBonus + lta));
  const employeePf = Number(salary?.employeePf) || Math.round(basicSalary * 0.12);
  const employerPf = Number(salary?.employerPf) || Math.round(basicSalary * 0.12);
  const profTax = Number(salary?.professionalTax) || 200;


  return (
    <div className="space-y-6 w-full pb-12">
      {/* ─── Top Action Bar: Back button & Edit/Save Actions ────────────────── */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push("/employees")}>
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </Button>

        {(isAdmin || isSelf) && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={updateEmployee.isPending}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit(onSave)}
                  disabled={updateEmployee.isPending}
                  className="gap-1.5 text-xs font-bold shadow-xs bg-primary text-primary-foreground"
                >
                  {updateEmployee.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-1.5 text-xs font-bold shadow-xs"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Profile Header Card ────────────────────────────────────────────── */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Side: Avatar + Identity (spanning 6 cols) */}
            <div className="lg:col-span-6 flex flex-col sm:flex-row gap-5 items-start">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <Avatar className="h-24 w-24 ring-4 ring-background shadow-md shrink-0">
                  <AvatarImage src={profileImage || employee.profileImage || undefined} alt={fullName} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                    {getInitials(fullName)}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <ImageUpload
                    value={profileImage || employee.profileImage || null}
                    onChange={(url) => setProfileImage(url || null)}
                    folder="HRMS"
                    label="Change Photo"
                    shape="circle"
                    size="sm"
                    hidePreview={true}
                  />
                )}
              </div>

              {/* Main Info */}
              <div className="flex-1 space-y-3 min-w-0">
                <div>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">First Name</Label>
                        <Input
                          {...register("firstName")}
                          placeholder="First Name"
                          className="h-8 text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Last Name</Label>
                        <Input
                          {...register("lastName")}
                          placeholder="Last Name"
                          className="h-8 text-sm font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
                  )}

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {employee.user?.employeeId}
                    </Badge>

                    {isEditing && isAdmin ? (
                      <Input
                        {...register("designation")}
                        placeholder="Designation"
                        className="h-7 text-xs w-44 inline-block font-semibold"
                      />
                    ) : (
                      <Badge className="bg-primary/10 text-primary border-primary/20 capitalize text-xs">
                        {employee.designation || "Team Member"}
                      </Badge>
                    )}

                    {isEditing && isAdmin ? (
                      <Select
                        value={employmentStatus || (employee.employmentStatus as any) || "ACTIVE"}
                        onValueChange={(val: any) => setValue("employmentStatus", val)}
                      >
                        <SelectTrigger className="h-7 text-xs w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                          <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                          <SelectItem value="ON_NOTICE">ON NOTICE</SelectItem>
                          <SelectItem value="TERMINATED">TERMINATED</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[employee.employmentStatus] ?? "status-secondary"}`}
                      >
                        {employee.employmentStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary/70 shrink-0" />
                    {isEditing && isAdmin ? (
                      <Input
                        {...register("email")}
                        type="email"
                        placeholder="employee@datamoo.com"
                        className="h-7 text-xs max-w-56"
                      />
                    ) : (
                      <span className="truncate text-xs">{employee.user?.email || "—"}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary/70 shrink-0" />
                    {isEditing ? (
                      <Input
                        {...register("phone")}
                        placeholder="+91-9876543210"
                        className="h-7 text-xs max-w-56"
                      />
                    ) : (
                      <span className="text-xs">{employee.phone || "—"}</span>
                    )}
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
                {isEditing && isAdmin ? (
                  <Select
                    value={department || employee.department || "Engineering"}
                    onValueChange={(val) => setValue("department", val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept: string) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>


                  </Select>
                ) : (
                  <p className="font-medium text-xs flex items-center gap-1.5 py-1">
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    {employee.department || "General"}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Manager</p>
                {isEditing && isAdmin ? (
                  <Input
                    {...register("manager")}
                    placeholder="e.g. Arun Kumar"
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs text-foreground font-medium py-1">{employee.manager || "—"}</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                {isEditing && isAdmin ? (
                  <Input
                    {...register("location")}
                    placeholder="e.g. Office / Remote"
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs text-foreground font-medium py-1">{employee.location || "Office"}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="resume" className="space-y-4">
        <TabsList variant="line" className="border-b w-full justify-start h-10 p-0 gap-6">
          <TabsTrigger value="resume" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
            <FileText className="h-4 w-4" /> Resume
          </TabsTrigger>
          <TabsTrigger value="private" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
            <Lock className="h-4 w-4" /> Private Info
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="salary" className="h-10 data-active:border-b-2 data-active:border-primary gap-1.5 px-1 font-medium">
              <DollarSign className="h-4 w-4" /> Salary Info <Badge variant="secondary" className="text-[10px] ml-1">Admin</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── TAB 1: RESUME ─────────────────────────────────────────────────── */}
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
                  {isEditing ? (
                    <Textarea
                      {...register("about")}
                      placeholder="Brief introduction / bio..."
                      rows={3}
                      className="text-xs resize-none"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {employee.about || "No introduction added."}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">What I love about my job</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      {...register("whatILoveAboutMyJob")}
                      placeholder="What you enjoy most..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {employee.whatILoveAboutMyJob || "No details provided."}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">My interests and hobbies</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      {...register("interestsAndHobbies")}
                      placeholder="Interests and hobbies..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {employee.interestsAndHobbies || "No interests added."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Skills */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5 min-h-12 p-3 rounded-lg bg-muted/30">
                    {skills.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No skills listed</p>
                    ) : (
                      skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs py-1 px-2.5 bg-primary/10 text-primary gap-1">
                          {skill}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="hover:text-destructive transition-colors ml-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                        placeholder="Add a skill (e.g. Next.js)..."
                        className="h-8 text-xs"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addSkill} className="h-8 text-xs">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Certifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5 min-h-12 p-3 rounded-lg bg-muted/30">
                    {certifications.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No certifications listed</p>
                    ) : (
                      certifications.map((cert) => (
                        <Badge key={cert} variant="outline" className="text-xs py-1 px-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                          {cert}
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => removeCertification(cert)}
                              className="hover:text-destructive transition-colors ml-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        value={certInput}
                        onChange={(e) => setCertInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCertification();
                          }
                        }}
                        placeholder="Add a certification (e.g. AWS)..."
                        className="h-8 text-xs"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addCertification} className="h-8 text-xs">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: PRIVATE INFO ───────────────────────────────────────────── */}
        <TabsContent value="private" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs">
                {/* Date of Birth */}
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-muted-foreground">Date of Birth</span>
                  {isEditing && isAdmin ? (
                    <Input type="date" {...register("dateOfBirth")} className="h-7 text-xs w-44 font-mono" />
                  ) : (
                    <span className="font-medium">{employee.dateOfBirth ? formatDate(employee.dateOfBirth) : "—"}</span>
                  )}
                </div>

                {/* Residing Address */}
                <div className="py-1.5 border-b space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Residing Address</span>
                    {!isEditing && (
                      <span className="font-medium text-right max-w-[60%]">
                        {[employee.address, employee.city, employee.state, employee.postalCode].filter(Boolean).join(", ") || "—"}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <div className="space-y-1.5 pt-1">
                      <Input {...register("address")} placeholder="Street Address" className="h-7 text-xs" />
                      <div className="grid grid-cols-3 gap-2">
                        <Input {...register("city")} placeholder="City" className="h-7 text-xs" />
                        <Input {...register("state")} placeholder="State" className="h-7 text-xs" />
                        <Input {...register("postalCode")} placeholder="PIN Code" className="h-7 text-xs font-mono" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Nationality */}
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-muted-foreground">Nationality</span>
                  {isEditing && isAdmin ? (
                    <Input {...register("nationality")} placeholder="e.g. Indian" className="h-7 text-xs w-44" />
                  ) : (
                    <span className="font-medium">{employee.nationality || "—"}</span>
                  )}
                </div>

                {/* Personal Email */}
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-muted-foreground">Personal Email</span>
                  {isEditing ? (
                    <Input {...register("personalEmail")} placeholder="personal@gmail.com" className="h-7 text-xs w-52" />
                  ) : (
                    <span className="font-medium">{employee.personalEmail || "—"}</span>
                  )}
                </div>

                {/* Gender */}
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-muted-foreground">Gender</span>
                  {isEditing && isAdmin ? (
                    <Select value={gender || employee.gender || ""} onValueChange={(val) => setValue("gender", val)}>
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="font-medium">{employee.gender || "—"}</span>
                  )}
                </div>

                {/* Marital Status */}
                <div className="flex justify-between items-center py-1.5 border-b">
                  <span className="text-muted-foreground">Marital Status</span>
                  {isEditing && isAdmin ? (
                    <Select value={maritalStatus || employee.maritalStatus || ""} onValueChange={(val) => setValue("maritalStatus", val)}>
                      <SelectTrigger className="h-7 text-xs w-44">
                        <SelectValue placeholder="Marital Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="font-medium">{employee.maritalStatus || "—"}</span>
                  )}
                </div>

                {/* Date of Joining */}
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground">Date of Joining</span>
                  {isEditing && isAdmin ? (
                    <Input type="date" {...register("joiningDate")} className="h-7 text-xs w-44 font-mono" />
                  ) : (
                    <span className="font-medium font-mono">{employee.joiningDate ? formatDate(employee.joiningDate) : "—"}</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Bank Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-primary" /> Bank Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="text-muted-foreground">Account Number</span>
                    {isEditing && isAdmin ? (
                      <Input {...register("bankAccountNumber")} placeholder="Account No" className="h-7 text-xs w-48 font-mono" />
                    ) : (
                      <span className="font-mono font-medium">{employee.bankAccountNumber || "—"}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="text-muted-foreground">Bank Name</span>
                    {isEditing && isAdmin ? (
                      <Input {...register("bankName")} placeholder="Bank Name" className="h-7 text-xs w-48" />
                    ) : (
                      <span className="font-medium">{employee.bankName || "—"}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-muted-foreground">IFSC Code</span>
                    {isEditing && isAdmin ? (
                      <Input {...register("bankIfsc")} placeholder="IFSC" className="h-7 text-xs w-48 font-mono uppercase" />
                    ) : (
                      <span className="font-mono font-medium">{employee.bankIfsc || "—"}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Government Identifications */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Government Identifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="text-muted-foreground">PAN No</span>
                    {isEditing && isAdmin ? (
                      <Input {...register("panNumber")} placeholder="PAN No" className="h-7 text-xs w-48 font-mono uppercase" />
                    ) : (
                      <span className="font-mono font-medium">{employee.panNumber || "—"}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b">
                    <span className="text-muted-foreground">UAN No</span>
                    {isEditing && isAdmin ? (
                      <Input {...register("uanNumber")} placeholder="UAN No" className="h-7 text-xs w-48 font-mono" />
                    ) : (
                      <span className="font-mono font-medium">{employee.uanNumber || "—"}</span>
                    )}
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

        {/* ─── TAB 3: SALARY INFO (ADMIN ONLY — Matches Image A) ────────────── */}
        {isAdmin && (
          <TabsContent value="salary" className="space-y-6 pt-2">
            {/* Wage Overview Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Salary Structure &amp; Working Schedule
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                      Admin Configured
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/payroll?config=true&employeeId=${employee.id}`)}
                      className="h-7 gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 shadow-xs"
                      title="Edit / Configure Salary in Payroll Architecture"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Configure Salary
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Top Wage Summary (4 columns) */}
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
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Hours &amp; Break</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {Number(salary?.workingHoursPerDay || 8)} hrs/day &middot; {Number(salary?.breakTimeHours || 1)} hr break
                    </p>
                  </div>
                </div>

                {/* Salary Components Breakdown (Exact Image A Match) */}
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

                {/* PF & Tax Deductions (Exact Image A Match) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PF Contribution */}
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

                  {/* Tax Deductions */}
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

      </Tabs>
    </div>
  );
}
