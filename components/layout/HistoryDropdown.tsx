"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  History,
  Clock,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Shield,
  Activity,
  ArrowRight,
  UserCheck,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime, formatDate, formatRelative } from "@/lib/utils";

export function HistoryDropdown() {
  const { data: session } = useSession();
  const userRole = session?.user?.role?.toUpperCase();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<"ATTENDANCE" | "AUDIT">("ATTENDANCE");

  // Fetch live history data
  const { data, isLoading } = useQuery({
    queryKey: ["history", "header"],
    queryFn: async () => {
      const res = await fetch("/api/history");
      const json = await res.json();
      return json?.data || { myAttendanceHistory: [], myLeaveHistory: [], systemAuditLogs: [] };
    },
    refetchInterval: 60000,
  });

  const attendanceHistory: any[] = data?.myAttendanceHistory || [];
  const auditLogs: any[] = data?.systemAuditLogs || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors outline-hidden select-none cursor-pointer"
        title="Activity & Attendance History"
      >
        <History className="h-4 w-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 overflow-hidden shadow-2xl rounded-2xl border">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-primary/5 via-background to-accent/5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Timeline & History</h3>
              <Badge variant="secondary" className="text-[10px] font-semibold h-5 px-1.5 bg-primary/10 text-primary">
                Live
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Recent check-ins & workforce audit logs</p>
          </div>

          <Link href="/history">
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-primary">
              <span className="text-[11px]">View all</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* Tab Switcher for Admins */}
        {isAdmin && (
          <div className="p-2 border-b bg-muted/20">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid grid-cols-2 h-7 p-0.5 w-full bg-muted/60">
                <TabsTrigger value="ATTENDANCE" className="text-[11px] font-medium py-1 gap-1.5">
                  <Clock className="h-3 w-3 text-emerald-600" />
                  My Check-Ins
                </TabsTrigger>
                <TabsTrigger value="AUDIT" className="text-[11px] font-medium py-1 gap-1.5">
                  <Shield className="h-3 w-3 text-primary" />
                  System Audit Log
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Content List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "ATTENDANCE" ? (
            /* Attendance History */
            attendanceHistory.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-30 text-muted-foreground" />
                <p className="text-xs font-medium">No check-in history found</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">Use the Check-In button above to start your shift</p>
              </div>
            ) : (
              attendanceHistory.map((att) => {
                const isPresent = att.status === "PRESENT";
                const isHalfDay = att.status === "HALF_DAY";
                return (
                  <div key={att.id} className="p-3.5 flex items-start gap-3 hover:bg-muted/40 transition-colors">
                    <div className="p-2 rounded-xl bg-background border shadow-2xs shrink-0 mt-0.5">
                      {isPresent ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : isHalfDay ? (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-foreground">
                          {formatDate(att.attendanceDate)}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${
                            isPresent
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {att.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                        <span>In: <strong className="font-mono text-foreground">{att.checkIn ? formatTime(att.checkIn) : "—"}</strong></span>
                        <span>Out: <strong className="font-mono text-foreground">{att.checkOut ? formatTime(att.checkOut) : "—"}</strong></span>
                        {att.workHours && (
                          <span className="ml-auto font-mono text-primary font-medium">{Number(att.workHours).toFixed(1)} hrs</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* System Audit Trail */
            auditLogs.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-30 text-primary" />
                <p className="text-xs font-medium">No recent audit logs</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex items-start gap-3 hover:bg-muted/40 transition-colors">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {log.user?.employee?.firstName ? `${log.user.employee.firstName} ${log.user.employee.lastName}` : log.user?.employeeId || "System"}
                      </p>
                      {log.company?.name && (
                        <span className="text-[9px] font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded-full truncate max-w-[90px]">
                          {log.company.name}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                      {log.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      {formatRelative(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Footer Link */}
        <div className="p-2.5 border-t bg-muted/20 text-center">
          <Link href="/history" className="block w-full">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs font-semibold text-primary hover:text-primary gap-1"
            >
              <span>View Full History Center</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
