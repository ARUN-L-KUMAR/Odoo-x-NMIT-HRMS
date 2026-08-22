"use client";

import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Clock,
  CalendarDays,
  Wallet,
  Timer,
  LogIn,
  LogOut,
  Loader2,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/stat-card";
import {
  useEmployeeDashboard,
  useCheckIn,
  useCheckOut,
  useTodayAttendance,
} from "@/hooks";
import {
  formatTime,
  formatWorkedTime,
  formatCurrency,
  formatRelative,
} from "@/lib/utils";
import { ATTENDANCE_STATUS_CONFIG } from "@/lib/constants";
import type { ActivityLog } from "@/types";

export default function EmployeeDashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useEmployeeDashboard();
  const { data: todayAtt } = useTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const name =
    session?.user?.name?.split(" ")[0] || session?.user?.employeeId || "there";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const salary = data?.salary;
  const todayAttendance = todayAtt ?? data?.todayAttendance;
  const summary = data?.attendanceSummary;

  const canCheckIn = !todayAttendance?.checkIn;
  const canCheckOut = !!todayAttendance?.checkIn && !todayAttendance?.checkOut;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, {name} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(new Date(), "EEEE, MMMM d, yyyy")} · Here&apos;s your
            workday overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => checkIn.mutate()}
            disabled={!canCheckIn || checkIn.isPending}
            size="sm"
            className="gap-2"
          >
            {checkIn.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Check In
          </Button>
          <Button
            onClick={() => checkOut.mutate()}
            disabled={!canCheckOut || checkOut.isPending}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            {checkOut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Check Out
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today"
          value={todayAttendance?.status ? ATTENDANCE_STATUS_CONFIG[todayAttendance.status].label : "Not yet"}
          icon={CheckCircle2}
          iconColor="text-green-600"
          iconBg="bg-green-100 dark:bg-green-900/30"
          description={todayAttendance?.checkIn ? `In: ${formatTime(todayAttendance.checkIn)}` : "Not checked in"}
        />
        <StatCard
          label="Work Hours"
          value={todayAttendance?.workedMinutes ? formatWorkedTime(todayAttendance.workedMinutes) : "—"}
          icon={Timer}
          iconColor="text-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          description={todayAttendance?.checkOut ? `Out: ${formatTime(todayAttendance.checkOut)}` : "In progress"}
        />
        <StatCard
          label="Leave Balance"
          value={`${data?.leaveBalances?.[0]?.remaining ?? "—"} days`}
          icon={CalendarDays}
          iconColor="text-purple-600"
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          description={data?.leaveBalances?.[0]?.leaveTypeName || "Paid Leave"}
        />
        <StatCard
          label="Net Salary"
          value={salary ? formatCurrency(Number(salary.netSalary)) : "—"}
          icon={Wallet}
          iconColor="text-amber-600"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          description="Per month"
        />
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Attendance Overview (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Present", value: summary?.present ?? 0, color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" },
                { label: "Absent", value: summary?.absent ?? 0, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" },
                { label: "Half Day", value: summary?.halfDay ?? 0, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20" },
                { label: "On Leave", value: summary?.onLeave ?? 0, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Leave Balances</p>
              {data?.leaveBalances?.map((lb) => (
                <div key={lb.leaveTypeId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">{lb.leaveTypeName}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {lb.remaining !== null ? `${lb.remaining} left` : "Unlimited"}
                    {lb.annualLimit ? ` / ${lb.annualLimit}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {data.recentActivity.slice(0, 8).map((activity: ActivityLog) => (
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
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
