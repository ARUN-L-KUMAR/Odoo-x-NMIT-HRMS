"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface EmployeeCardProps {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  department?: string | null;
  profileImage?: string | null;
  employmentStatus?: string;
  onClick?: () => void;
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

export function EmployeeCard({
  id,
  firstName,
  lastName,
  designation,
  department,
  profileImage,
  employmentStatus = "ACTIVE",
  onClick,
}: EmployeeCardProps) {
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={cn(
        "group flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-16 w-16 ring-2 ring-background shadow-sm group-hover:ring-primary/20 transition-all">
        <AvatarImage src={profileImage ?? undefined} alt={fullName} />
        <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="space-y-0.5 min-w-0">
        <p className="font-semibold text-sm truncate max-w-[140px]">{fullName}</p>
        {designation && (
          <p className="text-xs text-muted-foreground truncate max-w-[140px]">{designation}</p>
        )}
      </div>

      {/* Department */}
      {department && (
        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted/50 truncate max-w-[140px]">
          {department}
        </span>
      )}

      {/* Status */}
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
          STATUS_CLASS[employmentStatus] ?? "status-secondary"
        )}
      >
        {STATUS_LABEL[employmentStatus] ?? employmentStatus}
      </span>
    </div>
  );
}
