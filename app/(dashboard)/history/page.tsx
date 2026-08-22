"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  History,
  Clock,
  Shield,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { ExportButton } from "@/components/shared/export-button";
import { formatTime, formatDate, formatRelative, getInitials } from "@/lib/utils";

export default function HistoryPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role?.toUpperCase();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;

  const [activeTab, setActiveTab] = useState<"MY_TIMELINE" | "SYSTEM_AUDIT">("MY_TIMELINE");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Fetch history & audit data
  const { data, isLoading } = useQuery({
    queryKey: ["history", "full-page"],
    queryFn: async () => {
      const res = await fetch("/api/history");
      const json = await res.json();
      return json?.data || { myAttendanceHistory: [], myLeaveHistory: [], systemAuditLogs: [] };
    },
  });

  const attendanceHistory: any[] = data?.myAttendanceHistory || [];
  const auditLogs: any[] = data?.systemAuditLogs || [];

  // Filtered Attendance
  const filteredAttendance = useMemo(() => {
    return attendanceHistory.filter((att) => {
      const dateStr = formatDate(att.attendanceDate).toLowerCase();
      const matchSearch = !search || dateStr.includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || att.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [attendanceHistory, search, statusFilter]);

  // Filtered Audit Logs
  const filteredAudit = useMemo(() => {
    return auditLogs.filter((log) => {
      const query = search.toLowerCase();
      const actorName = `${log.user?.employee?.firstName || ""} ${log.user?.employee?.lastName || ""}`.toLowerCase();
      const loginId = (log.user?.employeeId || "").toLowerCase();
      const desc = (log.description || "").toLowerCase();
      const action = (log.action || "").toLowerCase();
      const company = (log.company?.name || "").toLowerCase();
      return (
        !search ||
        actorName.includes(query) ||
        loginId.includes(query) ||
        desc.includes(query) ||
        action.includes(query) ||
        company.includes(query)
      );
    });
  }, [auditLogs, search]);

  // Attendance metrics
  const totalShifts = attendanceHistory.length;
  const presentShifts = attendanceHistory.filter((a) => a.status === "PRESENT").length;
  const totalHoursWorked = attendanceHistory.reduce((acc, curr) => acc + (Number(curr.workHours) || 0), 0);
  const avgHours = totalShifts > 0 ? (totalHoursWorked / totalShifts).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Activity & Audit History</h1>
            {isSuperAdmin && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-semibold">
                Platform Audit Log
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time shift timelines, attendance check-in records, and system-wide audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "MY_TIMELINE" ? (
            <ExportButton
              data={filteredAttendance}
              filename="my_attendance_history"
              columns={[
                { header: "Date", accessor: (r) => formatDate(r.attendanceDate) },
                { header: "Check In", accessor: (r) => r.checkIn ? formatTime(r.checkIn) : "" },
                { header: "Check Out", accessor: (r) => r.checkOut ? formatTime(r.checkOut) : "" },
                { header: "Work Hours", accessor: (r) => Number(r.workHours || 0) },
                { header: "Status", accessor: (r) => r.status },
              ]}
            />
          ) : (
            <ExportButton
              data={filteredAudit}
              filename="system_audit_logs"
              columns={[
                { header: "Timestamp", accessor: (r) => new Date(r.createdAt).toLocaleString() },
                { header: "Actor", accessor: (r) => r.user?.employee?.firstName ? `${r.user.employee.firstName} ${r.user.employee.lastName}` : r.user?.employeeId || "System" },
                { header: "Organization", accessor: (r) => r.company?.name || "" },
                { header: "Action", accessor: (r) => r.action },
                { header: "Description", accessor: (r) => r.description },
              ]}
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Shifts Logged"
          value={totalShifts}
          icon={Clock}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          label="Full-Day Present"
          value={presentShifts}
          icon={CheckCircle2}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          label="Avg Hours / Day"
          value={`${avgHours} hrs`}
          icon={Activity}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <StatCard
          label={isAdmin ? "System Audit Logs" : "Total Logged Hours"}
          value={isAdmin ? auditLogs.length : `${totalHoursWorked.toFixed(0)} hrs`}
          icon={Shield}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Tabs & Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {isAdmin ? (
              <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("MY_TIMELINE")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === "MY_TIMELINE"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>My Attendance Timeline</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("SYSTEM_AUDIT")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeTab === "SYSTEM_AUDIT"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>System Audit Log ({auditLogs.length})</span>
                </button>
              </div>
            ) : (
              <h2 className="text-base font-bold">My Attendance Timeline</h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === "MY_TIMELINE" ? "Search date..." : "Search action, actor, company..."}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {activeTab === "MY_TIMELINE" && (
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PRESENT">Present</SelectItem>
                  <SelectItem value="HALF_DAY">Half Day</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Content Views */}
        {activeTab === "MY_TIMELINE" ? (
          <Card className="border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-transparent">
                      <TableHead className="py-3">Date</TableHead>
                      <TableHead className="py-3">Check In Time</TableHead>
                      <TableHead className="py-3">Check Out Time</TableHead>
                      <TableHead className="py-3 text-right">Work Duration</TableHead>
                      <TableHead className="py-3 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <TableRow key={i}>
                          {[1, 2, 3, 4, 5].map((j) => (
                            <TableCell key={j} className="py-3">
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-36 text-center text-muted-foreground text-sm">
                          {search ? "No attendance logs match your search." : "No shifts recorded yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAttendance.map((att) => {
                        const isPresent = att.status === "PRESENT";
                        const isHalfDay = att.status === "HALF_DAY";

                        return (
                          <TableRow key={att.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-muted/60 border shrink-0">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <span className="font-semibold text-xs text-foreground">
                                  {formatDate(att.attendanceDate)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 font-mono text-xs text-foreground font-medium">
                              {att.checkIn ? formatTime(att.checkIn) : "—"}
                            </TableCell>
                            <TableCell className="py-3 font-mono text-xs text-muted-foreground">
                              {att.checkOut ? formatTime(att.checkOut) : "—"}
                            </TableCell>
                            <TableCell className="py-3 text-right font-mono text-xs font-semibold text-primary">
                              {att.workHours ? `${Number(att.workHours).toFixed(1)} hrs` : "—"}
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-medium ${
                                  isPresent
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                    : isHalfDay
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {att.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* System Audit Trail Table */
          <Card className="border shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-transparent">
                      <TableHead className="py-3">Timestamp</TableHead>
                      <TableHead className="py-3">Actor / Admin</TableHead>
                      {isSuperAdmin && <TableHead className="py-3">Organization</TableHead>}
                      <TableHead className="py-3">Action Type</TableHead>
                      <TableHead className="py-3">Audit Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <TableRow key={i}>
                          {[1, 2, 3, 4, ...(isSuperAdmin ? [5] : [])].map((j) => (
                            <TableCell key={j} className="py-3">
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredAudit.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isSuperAdmin ? 5 : 4} className="h-36 text-center text-muted-foreground text-sm">
                          {search ? "No audit logs match your search filter." : "No system events recorded yet."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAudit.map((log) => {
                        const actorEmp = log.user?.employee;
                        const actorName = actorEmp ? `${actorEmp.firstName} ${actorEmp.lastName}` : log.user?.employeeId || "System";

                        return (
                          <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                            {/* Timestamp */}
                            <TableCell className="py-3">
                              <p className="text-xs font-semibold text-foreground font-mono">
                                {formatDate(log.createdAt)}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {formatTime(log.createdAt)}
                              </p>
                            </TableCell>

                            {/* Actor */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2.5">
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={actorEmp?.profileImage ?? undefined} />
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                    {getInitials(actorName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-xs font-semibold text-foreground">{actorName}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{log.user?.employeeId}</p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Organization (Super Admin only) */}
                            {isSuperAdmin && (
                              <TableCell className="py-3">
                                <span className="font-semibold text-[11px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full inline-block">
                                  {log.company?.name || "System"}
                                </span>
                              </TableCell>
                            )}

                            {/* Action Type */}
                            <TableCell className="py-3">
                              <Badge variant="secondary" className="font-mono text-[10px]">
                                {log.action}
                              </Badge>
                            </TableCell>

                            {/* Description */}
                            <TableCell className="py-3 text-xs text-foreground">
                              <p className="leading-relaxed">{log.description}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                {formatRelative(log.createdAt)}
                              </p>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
