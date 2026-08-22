"use client";

import { EmployeeCard } from "./EmployeeCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  department?: string | null;
  profileImage?: string | null;
  employmentStatus?: string;
}

interface EmployeeGridProps {
  employees: Employee[];
  isLoading?: boolean;
  onCardClick?: (id: string) => void;
  emptyMessage?: string;
}

export function EmployeeGrid({
  employees,
  isLoading,
  onCardClick,
  emptyMessage = "No employees found.",
}: EmployeeGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {employees.map((emp) => (
        <EmployeeCard
          key={emp.id}
          id={emp.id}
          firstName={emp.firstName}
          lastName={emp.lastName}
          designation={emp.designation}
          department={emp.department}
          profileImage={emp.profileImage}
          employmentStatus={emp.employmentStatus}
          onClick={onCardClick ? () => onCardClick(emp.id) : undefined}
        />
      ))}
    </div>
  );
}
