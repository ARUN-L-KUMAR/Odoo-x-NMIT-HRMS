"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useEmployeeDashboard, useUpdateEmployee } from "@/hooks";
import { selfUpdateEmployeeSchema, type SelfUpdateEmployeeInput } from "@/lib/validations";
import { getInitials, formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session } = useSession();
  const { data, isLoading } = useEmployeeDashboard();
  const updateEmployee = useUpdateEmployee();

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
        firstName: e.firstName || "",
        lastName: e.lastName || "",
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
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
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee?.profileImage ?? undefined} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(name || session?.user?.employeeId || "U")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">
                {name || session?.user?.employeeId}
              </h2>
              <p className="text-muted-foreground text-sm">
                {employee?.designation || "—"}
                {employee?.department && ` · ${employee.department}`}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                  {session?.user?.employeeId}
                </span>
                {employee?.joiningDate && (
                  <span className="text-xs text-muted-foreground">
                    Joined {formatDate(employee.joiningDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile */}
      {employee ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">First Name</Label>
                  <Input {...register("firstName")} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Last Name</Label>
                  <Input {...register("lastName")} />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input {...register("phone")} placeholder="+91-9800000000" />
              </div>
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

              <Separator />

              {/* Read-only info */}
              <div className="space-y-1.5">
                <Label className="text-xs">Email (read-only)</Label>
                <Input value={session?.user?.email || ""} readOnly className="bg-muted text-muted-foreground" />
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
    </div>
  );
}
