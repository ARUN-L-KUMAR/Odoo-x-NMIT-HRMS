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
  Building2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import {
  useAdminDashboard,
  useApproveLeave,
  useRejectLeave,
} from "@/hooks";
import {
  formatDate,
  formatRelative,
  getInitials,
} from "@/lib/utils";
import Link from "next/link";
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
} from "recharts";

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

interface ExtendedAdminDashboardData {
  isSuperAdmin?: boolean;
  totalOrganizations?: number;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  recentEmployees: any[];
  pendingLeaves: any[];
  recentActivity: any[];
  attendanceTrend: any[];
  departmentDistribution: any[];
  organizationsList?: {
    id: string;
    name: string;
    initials: string;
    logoUrl: string | null;
    employeeCount: number;
  }[];
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useAdminDashboard();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const userRole = session?.user?.role?.toUpperCase();
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return <AdminSkeleton />;
  }

  const d = data as ExtendedAdminDashboardData | undefined;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">
              {greeting()}, {isSuperAdmin ? "Super Admin" : "Admin"}
            </h1>
            {isSuperAdmin && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 gap-1 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Global Platform View
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(new Date(), "EEEE, MMMM d, yyyy")} · {isSuperAdmin ? "Consolidated metrics across all tenant organizations" : "Here's today's workforce overview"}
          </p>
        </div>

        {isSuperAdmin && (
          <Link href="/organization">
            <Button size="sm" variant="outline" className="gap-2 shadow-xs">
              <Building2 className="h-4 w-4 text-primary" />
              Manage All Organizations
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 ${isSuperAdmin ? "lg:grid-cols-6" : "lg:grid-cols-5"} gap-4`}>
        {isSuperAdmin && (
          <StatCard
            label="Total Organizations"
            value={d?.totalOrganizations ?? 0}
            icon={Building2}
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBg="bg-indigo-500/10"
          />
        )}
        <StatCard
          label={isSuperAdmin ? "Total Staff (All Orgs)" : "Total Employees"}
          value={d?.totalEmployees ?? 0}
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard label="Present Today" value={d?.presentToday ?? 0} icon={UserCheck} iconColor="text-green-600" iconBg="bg-green-100 dark:bg-green-900/20" />
        <StatCard label="Absent Today" value={d?.absentToday ?? 0} icon={UserX} iconColor="text-red-600" iconBg="bg-red-100 dark:bg-red-900/20" />
        <StatCard label="On Leave" value={d?.onLeaveToday ?? 0} icon={CalendarOff} iconColor="text-amber-600" iconBg="bg-amber-100 dark:bg-amber-900/20" />
        <StatCard label="Pending Requests" value={d?.pendingLeaveRequests ?? 0} icon={ClipboardList} iconColor="text-purple-600" iconBg="bg-purple-100 dark:bg-purple-900/20" />
      </div>

      {/* Super Admin: Organizations Quick Directory */}
      {isSuperAdmin && d?.organizationsList && d.organizationsList.length > 0 && (
        <Card className="shadow-xs border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/10">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Active Organizations ({d.organizationsList.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Platform organizations and active staff members.
              </CardDescription>
            </div>
            <Link href="/organization">
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {d.organizationsList.map((org) => (
                <div key={org.id} className="p-3.5 rounded-xl border bg-card flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {org.logoUrl ? (
                      <img src={org.logoUrl} alt={org.name} className="w-9 h-9 rounded-lg object-cover border" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                        {org.initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate">{org.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{org.employeeCount} staff</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                    {org.initials}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Attendance Trend */}
        <Card className="lg:col-span-3 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Weekly Attendance Trend {isSuperAdmin && "(All Organizations)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d?.attendanceTrend || []} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
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
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Department Distribution</CardTitle>
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
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No department data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Leaves */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-purple-600" />
                Pending Leave Requests
              </CardTitle>
              {(d?.pendingLeaves?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {d?.pendingLeaves?.length} pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {d?.pendingLeaves && d.pendingLeaves.length > 0 ? (
              <div className="space-y-3">
                {d.pendingLeaves.map((leave: any) => (
                  <div
                    key={leave.id}
                    className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors"
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={leave.employee?.profileImage ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {getInitials(`${leave.employee?.firstName} ${leave.employee?.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </p>
                        {isSuperAdmin && leave.employee?.company?.name && (
                          <Badge variant="outline" className="text-[10px] font-normal py-0 h-4">
                            {leave.employee.company.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {leave.leaveType?.name} · {formatDate(leave.startDate)}
                        {leave.startDate !== leave.endDate && ` – ${formatDate(leave.endDate)}`}
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
                No pending leave requests
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Platform Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {d?.recentActivity && d.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {d.recentActivity.slice(0, 8).map((activity: any) => (
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
