"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";

export type AttendanceStatus = "PRESENT" | "LEAVE" | "HALF_DAY" | "ABSENT" | "UNKNOWN";

interface EmployeeCardProps {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  department?: string | null;
  profileImage?: string | null;
  employmentStatus?: string;
  attendanceStatus?: AttendanceStatus;
  onClick?: () => void;
}

/** Status dot config — matches Excalidraw spec */
const ATTENDANCE_DOT: Record<
  AttendanceStatus,
  { bg: string; label: string; pulse?: boolean }
> = {
  PRESENT: {
    bg: "bg-emerald-500",
    label: "Present",
    pulse: true,
  },
  LEAVE: {
    bg: "bg-amber-400",
    label: "On Leave",
  },
  HALF_DAY: {
    bg: "bg-blue-400",
    label: "Half Day",
  },
  ABSENT: {
    bg: "bg-red-500",
    label: "Absent",
  },
  UNKNOWN: {
    bg: "bg-zinc-400",
    label: "—",
  },
};

export function EmployeeCard({
  firstName,
  lastName,
  designation,
  department,
  profileImage,
  employmentStatus = "ACTIVE",
  attendanceStatus = "UNKNOWN",
  onClick,
}: EmployeeCardProps) {
  const fullName = `${firstName} ${lastName}`.trim();
  const dot = ATTENDANCE_DOT[attendanceStatus];
  const isTerminated = employmentStatus === "TERMINATED" || employmentStatus === "INACTIVE";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 text-center transition-all duration-200 select-none",
        onClick &&
          "cursor-pointer hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 hover:bg-card/80",
        isTerminated && "opacity-60"
      )}
    >
      {/* Avatar with status dot */}
      <div className="relative">
        <Avatar className="h-20 w-20 ring-2 ring-background shadow-md group-hover:ring-primary/20 transition-all">
          <AvatarImage src={profileImage ?? undefined} alt={fullName} />
          <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        {/* Status dot — top-right corner of avatar */}
        <span
          title={dot.label}
          className={cn(
            "absolute top-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-card",
            dot.bg,
            dot.pulse && "after:absolute after:inset-0 after:rounded-full after:animate-ping after:bg-emerald-400/50"
          )}
        />
      </div>

      {/* Name + role */}
      <div className="space-y-0.5 min-w-0 w-full">
        <p className="font-semibold text-sm truncate">{fullName}</p>
        {designation && (
          <p className="text-xs text-muted-foreground truncate">{designation}</p>
        )}
        {department && (
          <p className="text-[11px] text-muted-foreground/70 truncate">{department}</p>
        )}
      </div>

      {/* Status legend tooltip label (shown on hover via title) */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{dot.label}</span>
        </div>
      </div>
    </div>
  );
}
