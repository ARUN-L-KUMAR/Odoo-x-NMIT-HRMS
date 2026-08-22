"use client";

import { BarChart3, TrendingUp, Users, CalendarCheck, Wallet, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";

const REPORT_CARDS = [
  {
    title: "Attendance Report",
    description: "Monthly attendance rates, punctuality trends, and absenteeism analysis.",
    icon: CalendarCheck,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    href: "#",
  },
  {
    title: "Leave Summary",
    description: "Leave utilization by type, department, and approval rates.",
    icon: TrendingUp,
    color: "text-green-500",
    bg: "bg-green-500/10",
    href: "#",
  },
  {
    title: "Headcount Report",
    description: "Active employees, new hires, attrition, and department breakdown.",
    icon: Users,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    href: "#",
  },
  {
    title: "Payroll Summary",
    description: "Salary disbursement, deductions, and cost-per-department breakdown.",
    icon: Wallet,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    href: "#",
  },
];

export default function ReportsPage() {
  const { data, isLoading } = useAdminDashboard();

  const stats = data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Analytics and insights for your organization
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : [
              { label: "Total Employees", value: stats?.totalEmployees ?? "—" },
              { label: "Present Today", value: stats?.presentToday ?? "—" },
              { label: "On Leave", value: stats?.onLeaveToday ?? "—" },
              { label: "Pending Leaves", value: stats?.pendingLeaveRequests ?? "—" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Department Distribution */}
      {stats?.departmentDistribution && stats.departmentDistribution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Department Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.departmentDistribution.map(
                (d: { department: string; count: number }) => {
                  const pct = Math.round(
                    (d.count / (stats.totalEmployees || 1)) * 100
                  );
                  return (
                    <div key={d.department} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{d.department}</span>
                        <span className="text-muted-foreground">
                          {d.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Available Reports
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {REPORT_CARDS.map((r) => (
            <Card
              key={r.title}
              className="group hover:shadow-md transition-shadow cursor-pointer border-border/60"
            >
              <CardContent className="p-5 flex gap-4">
                <div className={`${r.bg} rounded-lg p-2.5 h-fit`}>
                  <r.icon className={`h-5 w-5 ${r.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-sm">{r.title}</h3>
                    <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {r.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Detailed report exports coming soon
        </p>
      </div>
    </div>
  );
}
