"use client";

import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Users,
  UserCheck,
  UserX,
  CalendarOff,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminDashboard,
  useApproveLeave,
  useRejectLeave,
} from "@/hooks";
import {
  formatDate,
  formatCurrencyCompact,
  formatRelative,
  getInitials,
} from "@/lib/utils";
import { LEAVE_STATUS_CONFIG } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { AdminDashboardData } from "@/types";

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useAdminDashboard();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return <AdminSkeleton />;
  }

  const d = data as AdminDashboardData | undefined;

  const kpiCards = [
    {
      label: "Total Employees",
      value: d?.totalEmployees ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Present Today",
      value: d?.presentToday ?? 0,
      icon: UserCheck,
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
    },
    {
      label: "Absent Today",
      value: d?.absentToday ?? 0,
      icon: UserX,
      color: "text-red-600",
      bg: "bg-red-100 dark:bg-red-900/20",
    },
    {
      label: "On Leave",
      value: d?.onLeaveToday ?? 0,
      icon: CalendarOff,
      color: "text-amber-600",
      bg: "bg-amber-100 dark:bg-amber-900/20",
    },
    {
      label: "Pending Requests",
      value: d?.pendingLeaveRequests ?? 0,
      icon: ClipboardList,
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, Admin 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(new Date(), "EEEE, MMMM d, yyyy")} · Here&apos;s today&apos;s
          workforce overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Attendance Trend */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Weekly Attendance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d?.attendanceTrend || []} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="present" name="Present" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="leave" name="Leave" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Department Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d?.departmentDistribution && d.departmentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={d.departmentDistribution}
                    dataKey="count"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                  >
                    {d.departmentDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: 11 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                No department data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Leave Requests */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Pending Leave Requests
            </CardTitle>
            <Badge variant="secondary">{d?.pendingLeaveRequests ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            {d?.pendingLeaves && d.pendingLeaves.length > 0 ? (
              <div className="space-y-3">
                {d.pendingLeaves.map((leave) => (
                  <div
                    key={leave.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20"
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={leave.employee?.profileImage ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {getInitials(
                          `${leave.employee?.firstName} ${leave.employee?.lastName}`
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {leave.employee?.firstName} {leave.employee?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leave.leaveType?.name} ·{" "}
                        {formatDate(leave.startDate)}
                        {leave.startDate !== leave.endDate &&
                          ` – ${formatDate(leave.endDate)}`}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => approveLeave.mutate({ id: leave.id })}
                        disabled={approveLeave.isPending}
                      >
                        {approveLeave.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                        onClick={() => rejectLeave.mutate({ id: leave.id })}
                        disabled={rejectLeave.isPending}
                      >
                        {rejectLeave.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending leave requests 🎉
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {d?.recentActivity && d.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {d.recentActivity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelative(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No activity yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
