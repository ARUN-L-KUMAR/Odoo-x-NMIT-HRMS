"use client";

import { EmployeeCard, type AttendanceStatus } from "./EmployeeCard";
import { Skeleton } from "@/components/ui/skeleton";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  department?: string | null;
  profileImage?: string | null;
  employmentStatus?: string;
  company?: { name: string; initials: string; logoUrl?: string | null } | null;
}

interface EmployeeGridProps {
  employees: Employee[];
  isLoading?: boolean;
  onCardClick?: (id: string) => void;
  onEditCard?: (emp: Employee) => void;
  emptyMessage?: string;
  /** Map of employee DB id → today's attendance status */
  attendanceStatusMap?: Record<string, AttendanceStatus>;
  showCompany?: boolean;
}

export function EmployeeGrid({
  employees,
  isLoading,
  onCardClick,
  onEditCard,
  emptyMessage = "No employees found.",
  attendanceStatusMap = {},
  showCompany = false,
}: EmployeeGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-5">
            <div className="relative">
               <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
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
          attendanceStatus={attendanceStatusMap[emp.id] ?? "UNKNOWN"}
          company={emp.company}
          showCompany={showCompany}
          onClick={onCardClick ? () => onCardClick(emp.id) : undefined}
          onEdit={onEditCard ? () => onEditCard(emp) : undefined}
        />
      ))}
    </div>
  );

}
