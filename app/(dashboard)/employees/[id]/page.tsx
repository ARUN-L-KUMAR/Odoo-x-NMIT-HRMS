"use client";

import { use } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_NOTICE: "On Notice",
  TERMINATED: "Terminated",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[55%] truncate">
        {value || "—"}
      </span>
    </div>
  );
}

export default function EmployeeProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const router = useRouter();

  const { data: employee, isLoading } = useEmployee(id);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="p-6">
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
          <CardContent className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
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

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Button>

      {/* Profile header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <Avatar className="h-20 w-20 ring-2 ring-background shadow">
              <AvatarImage src={employee.profileImage ?? undefined} alt={fullName} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {getInitials(fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight">{fullName}</h1>
              <p className="text-muted-foreground text-sm">
                {employee.designation || "—"}
                {employee.department && ` · ${employee.department}`}
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {employee.user?.employeeId && (
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    {employee.user.employeeId}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[employee.employmentStatus] ?? "status-secondary"}`}
                >
                  {STATUS_LABEL[employee.employmentStatus] ?? employee.employmentStatus}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Information — visible to all */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Job Information</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Employee ID" value={employee.user?.employeeId} />
          <InfoRow label="Department" value={employee.department} />
          <InfoRow label="Designation" value={employee.designation} />
          <InfoRow
            label="Joining Date"
            value={employee.joiningDate ? formatDate(employee.joiningDate) : null}
          />
        </CardContent>
      </Card>

      {/* Personal Information — Admin can see contact details */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow label="Email" value={employee.user?.email} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow
              label="Address"
              value={[employee.address, employee.city, employee.state, employee.postalCode]
                .filter(Boolean)
                .join(", ")}
            />
          </CardContent>
        </Card>
      )}

      {/* Salary Information — Admin only */}
      {isAdmin && employee.salaryStructure && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Salary Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow label="Basic Salary" value={formatCurrency(Number(employee.salaryStructure.basicSalary))} />
            <InfoRow label="HRA" value={formatCurrency(Number(employee.salaryStructure.hra))} />
            <InfoRow label="Allowances" value={formatCurrency(Number(employee.salaryStructure.allowances))} />
            <InfoRow label="Gross Salary" value={formatCurrency(Number(employee.salaryStructure.grossSalary))} />
            <Separator className="my-2" />
            <InfoRow label="PF" value={formatCurrency(Number(employee.salaryStructure.pf))} />
            <InfoRow label="Tax (TDS)" value={formatCurrency(Number(employee.salaryStructure.tax))} />
            <InfoRow label="Other Deductions" value={formatCurrency(Number(employee.salaryStructure.deductions))} />
            <Separator className="my-2" />
            <InfoRow label="Net Salary" value={formatCurrency(Number(employee.salaryStructure.netSalary))} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
