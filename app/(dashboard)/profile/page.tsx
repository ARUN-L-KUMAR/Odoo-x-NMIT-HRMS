"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Loader2, Save, KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useEmployeeDashboard, useUpdateEmployee } from "@/hooks";
import { selfUpdateEmployeeSchema, changePasswordSchema, type SelfUpdateEmployeeInput, type ChangePasswordInput } from "@/lib/validations";
import { ImageUpload } from "@/components/shared/image-upload";
import { getInitials, formatDate } from "@/lib/utils";



export default function ProfilePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { data, isLoading } = useEmployeeDashboard();
  const updateEmployee = useUpdateEmployee();

  // Change password state
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SelfUpdateEmployeeInput>({
    resolver: zodResolver(selfUpdateEmployeeSchema),
  });

  useEffect(() => {
    if (data?.employee) {
      const e = data.employee;
      reset({
        phone: e.phone || "",
        address: e.address || "",
        city: e.city || "",
        state: e.state || "",
        postalCode: e.postalCode || "",
      });
    }
  }, [data?.employee, reset]);

  const onSave = (formData: SelfUpdateEmployeeInput) => {
    if (!data?.employee?.id) return;
    updateEmployee.mutate({ id: data.employee.id, data: formData });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-40" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const employee = data?.employee;
  const name = `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage your personal information
        </p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 ring-2 ring-background shadow">
              <AvatarImage src={employee?.profileImage ?? undefined} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {getInitials(name || session?.user?.employeeId || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">
                {name || session?.user?.employeeId}
              </h2>
              <p className="text-muted-foreground text-sm">
                {employee?.designation || "—"}
                {employee?.department && ` · ${employee.department}`}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                  {session?.user?.employeeId}
                </span>
                <Badge variant="outline" className="capitalize text-xs">
                  {session?.user?.role?.toLowerCase() || "employee"}
                </Badge>
                {employee?.joiningDate && (
                  <span className="text-xs text-muted-foreground">
                    Joined {formatDate(employee.joiningDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Profile Photo (Cloudinary)</Label>
            <ImageUpload
              value={employee?.profileImage || null}
              onChange={(url) => {
                if (employee?.id) {
                  updateEmployee.mutate({
                    id: employee.id,
                    data: { profileImage: url },
                  });
                }
              }}
              folder="HRMS"
              label="Change Photo"
              shape="circle"
              size="sm"
            />
          </div>
        </CardContent>
      </Card>


      {/* Job Information (read-only) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Job Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Employee ID</p>
              <p className="font-mono font-medium">{session?.user?.employeeId || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Department</p>
              <p className="font-medium">{employee?.department || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Designation</p>
              <p className="font-medium">{employee?.designation || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Joining Date</p>
              <p className="font-medium">
                {employee?.joiningDate ? formatDate(employee.joiningDate) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Personal Information */}
      {employee ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
              <span className="text-xs text-muted-foreground">
                {isAdmin ? "All fields editable" : "Phone & address editable"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              {/* Read-only: email */}
              <div className="space-y-1.5">
                <Label className="text-xs">Email (read-only)</Label>
                <Input
                  value={session?.user?.email || ""}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>

              {/* Editable: Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  {...register("phone")}
                  placeholder="+91-9800000000"
                />
              </div>

              {/* Editable: Address */}
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input {...register("address")} placeholder="Street address" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input {...register("city")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">State</Label>
                  <Input {...register("state")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Postal Code</Label>
                  <Input {...register("postalCode")} />
                </div>
              </div>

              <Button
                type="submit"
                disabled={!isDirty || updateEmployee.isPending}
                className="gap-2"
              >
                {updateEmployee.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No employee profile linked to your account.</p>
            <p className="text-xs mt-1">Contact your administrator to set up your profile.</p>
          </CardContent>
        </Card>
      )}

      {/* Change Password Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {pwSuccess ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <p className="text-sm font-medium">Password changed successfully!</p>
            </div>
          ) : (
            <ChangePasswordForm
              showCurrent={showCurrent}
              setShowCurrent={setShowCurrent}
              showNew={showNew}
              setShowNew={setShowNew}
              showConfirm={showConfirm}
              setShowConfirm={setShowConfirm}
              pwError={pwError}
              pwLoading={pwLoading}
              onSubmit={async (data) => {
                setPwError(null);
                setPwLoading(true);
                try {
                  const res = await fetch("/api/auth/change-password", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
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
