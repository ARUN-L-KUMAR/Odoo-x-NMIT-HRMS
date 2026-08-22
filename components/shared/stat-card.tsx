import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Tailwind text color class e.g. "text-green-600" */
  iconColor?: string;
  /** Tailwind bg class e.g. "bg-green-100 dark:bg-green-900/20" */
  iconBg?: string;
  /** Optional sub-text shown below the value */
  description?: string;
  /** Optional trend percentage (positive = up, negative = down) */
  trend?: number;
  className?: string;
}

/**
 * StatCard — a reusable KPI card ported from Faceviz.
 *
 * Replaces the repeated inline KPI card JSX on the admin and employee
 * dashboards. Keeps the same visual design but adds a trend indicator.
 *
 * Usage:
 *   <StatCard label="Total Employees" value={42} icon={Users} iconColor="text-primary" iconBg="bg-primary/10" />
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  description,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend !== undefined && (
              <p
                className={cn(
                  "text-xs font-medium mt-1.5",
                  trend > 0 ? "text-green-600" : trend < 0 ? "text-red-500" : "text-muted-foreground"
                )}
              >
                {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"}{" "}
                {Math.abs(trend)}% vs last week
              </p>
            )}
          </div>
          <div className={cn("p-2 rounded-lg flex-shrink-0 ml-3", iconBg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
