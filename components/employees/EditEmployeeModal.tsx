"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { ImageUpload } from "@/components/shared/image-upload";
import { useUpdateEmployee, useDepartments } from "@/hooks";
import { updateEmployeeSchema, type UpdateEmployeeInput } from "@/lib/validations";
import type { Employee } from "@/types";
import {
  User,
  Briefcase,
  Lock,
  FileText,
  Loader2,
  Building2,
  CreditCard,
  Sparkles,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

interface EditEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EditEmployeeModal({
  open,
  onOpenChange,
  employee,
}: EditEmployeeModalProps) {
  const { data: session } = useSession();
  const updateEmployee = useUpdateEmployee();
  const { data: departments = [] } = useDepartments((employee as any)?.companyId || undefined);

  const [activeTab, setActiveTab] = useState<string>("basic");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [skillsInput, setSkillsInput] = useState("");
  const [certificationsInput, setCertificationsInput] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<UpdateEmployeeInput>({
    resolver: zodResolver(updateEmployeeSchema),
  });

  const employmentStatus = watch("employmentStatus");
  const department = watch("department");
  const gender = watch("gender");
  const maritalStatus = watch("maritalStatus");

  // Populate form when employee changes
  useEffect(() => {
    if (employee && open) {
      setProfileImage(employee.profileImage || null);
      setSkillsInput((employee.skills || []).join(", "));
      setCertificationsInput((employee.certifications || []).join(", "));

      reset({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
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
  }, [employee, open, reset]);

  const onSubmit = async (data: UpdateEmployeeInput) => {
    if (!employee) return;

    // Parse comma-separated skills and certifications into arrays
    const parsedSkills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedCertifications = certificationsInput
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const payload: UpdateEmployeeInput = {
      ...data,
      profileImage: profileImage || null,
      skills: parsedSkills,
      certifications: parsedCertifications,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString() : null,
      joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString() : null,
    };

    updateEmployee.mutate(
      { id: employee.id, data: payload },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Edit Employee: {employee.firstName} {employee.lastName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Admin mode: Update any field across employment, personal, resume, and banking records
              </DialogDescription>
            </div>
            <span className="font-mono text-xs bg-muted px-2.5 py-1 rounded-md text-foreground font-semibold">
              {(employee.user as any)?.employeeId || "EMP"}
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="px-6 pt-3 border-b bg-muted/20">
              <TabsList className="grid grid-cols-3 w-full h-9">
                <TabsTrigger value="basic" className="text-xs font-semibold gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Basic & Employment
                </TabsTrigger>
                <TabsTrigger value="resume" className="text-xs font-semibold gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Resume & Bio
                </TabsTrigger>
                <TabsTrigger value="private" className="text-xs font-semibold gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> Private & Banking
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ─── TAB 1: BASIC & EMPLOYMENT ───────────────────────────────── */}
              <TabsContent value="basic" className="space-y-4 m-0">
                {/* Profile Image & Names */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-4 space-y-1.5">
                    <Label className="text-xs font-semibold">Profile Photo</Label>
                    <ImageUpload
                      value={profileImage || ""}
                      onChange={(url) => setProfileImage(url || null)}
                      label="Employee Picture"
                    />
                  </div>

                  <div className="md:col-span-8 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">First Name *</Label>
                        <Input
                          {...register("firstName")}
                          placeholder="First Name"
                          className="h-9 text-xs"
                        />
                        {errors.firstName && (
                          <p className="text-[10px] text-destructive">{errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Last Name *</Label>
                        <Input
                          {...register("lastName")}
                          placeholder="Last Name"
                          className="h-9 text-xs"
                        />
                        {errors.lastName && (
                          <p className="text-[10px] text-destructive">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Phone Number</Label>
                        <Input
                          {...register("phone")}
                          placeholder="+91-9876543210"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Work Email (Read Only)</Label>
                        <Input
                          value={employee.user?.email || ""}
                          disabled
                          className="h-9 text-xs bg-muted/60"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Department</Label>
                    <Select
                      value={department || employee.department || "Engineering"}
                      onValueChange={(val) => setValue("department", val, { shouldDirty: true })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>

                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Designation / Role</Label>
                    <Input
                      {...register("designation")}
                      placeholder="e.g. Senior Software Engineer"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Employment Status</Label>
                    <Select
                      value={employmentStatus || (employee.employmentStatus as any) || "ACTIVE"}
                      onValueChange={(val: any) =>
                        setValue("employmentStatus", val, { shouldDirty: true })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        <SelectItem value="ON_NOTICE">ON NOTICE</SelectItem>
                        <SelectItem value="TERMINATED">TERMINATED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Joining Date</Label>
                    <Input
                      type="date"
                      {...register("joiningDate")}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Work Location</Label>
                    <Input
                      {...register("location")}
                      placeholder="e.g. Office / Remote / Hybrid"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Reporting Manager</Label>
                    <Input
                      {...register("manager")}
                      placeholder="e.g. Arun Kumar"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB 2: RESUME & BIO ──────────────────────────────────────── */}
              <TabsContent value="resume" className="space-y-4 m-0">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">About / Professional Bio</Label>
                  <Textarea
                    {...register("about")}
                    placeholder="Brief summary of professional experience, background, and strengths..."
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">What I Love About My Job</Label>
                    <Textarea
                      {...register("whatILoveAboutMyJob")}
                      placeholder="What excites you most in your daily role..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Interests & Hobbies</Label>
                    <Textarea
                      {...register("interestsAndHobbies")}
                      placeholder="e.g. Reading, Hiking, Photography, Chess..."
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Skills</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        (comma separated)
                      </span>
                    </Label>
                    <Input
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      placeholder="React, TypeScript, Next.js, Node.js, UI/UX"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Certifications</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        (comma separated)
                      </span>
                    </Label>
                    <Input
                      value={certificationsInput}
                      onChange={(e) => setCertificationsInput(e.target.value)}
                      placeholder="AWS Certified Solutions Architect, PMP, Scrum Master"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB 3: PRIVATE & BANKING ────────────────────────────────── */}
              <TabsContent value="private" className="space-y-4 m-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Date of Birth</Label>
                    <Input
                      type="date"
                      {...register("dateOfBirth")}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Gender</Label>
                    <Select
                      value={gender || employee.gender || ""}
                      onValueChange={(val) => setValue("gender", val, { shouldDirty: true })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Marital Status</Label>
                    <Select
                      value={maritalStatus || employee.maritalStatus || ""}
                      onValueChange={(val) => setValue("maritalStatus", val, { shouldDirty: true })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Marital Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nationality</Label>
                    <Input
                      {...register("nationality")}
                      placeholder="e.g. Indian"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Personal Email</Label>
                    <Input
                      {...register("personalEmail")}
                      placeholder="personal@gmail.com"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* Address Section */}
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Address Details
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Street Address</Label>
                    <Input
                      {...register("address")}
                      placeholder="Apartment, Street, Area..."
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">City</Label>
                      <Input {...register("city")} placeholder="City" className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">State</Label>
                      <Input {...register("state")} placeholder="State" className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Postal Code / PIN</Label>
                      <Input
                        {...register("postalCode")}
                        placeholder="560001"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Banking & Statutory Section */}
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Bank & Statutory Details
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Bank Name</Label>
                      <Input
                        {...register("bankName")}
                        placeholder="e.g. HDFC Bank"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Account Number</Label>
                      <Input
                        {...register("bankAccountNumber")}
                        placeholder="e.g. 50100012345678"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">IFSC Code</Label>
                      <Input
                        {...register("bankIfsc")}
                        placeholder="e.g. HDFC0001234"
                        className="h-9 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">PAN Number</Label>
                      <Input
                        {...register("panNumber")}
                        placeholder="e.g. ABCDE1234F"
                        className="h-9 text-xs font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">UAN Number (PF)</Label>
                      <Input
                        {...register("uanNumber")}
                        placeholder="e.g. 100123456789"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="px-6 py-3 border-t bg-muted/20 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateEmployee.isPending}
              className="text-xs font-bold gap-1.5 shadow-xs"
            >
              {updateEmployee.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
