"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import {
  LogIn,
  LogOut,
  Loader2,
  Clock,
  CalendarDays,
  Search,
  Filter,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useMyAttendance,
  useAllAttendance,
  useCheckIn,
  useCheckOut,
  useTodayAttendance,
} from "@/hooks";
import { formatDate, formatTime, formatWorkedTime, getInitials } from "@/lib/utils";
import { ATTENDANCE_STATUS_CONFIG } from "@/lib/constants";
import type { AttendanceStatus } from "@/types";

const STATUS_BADGE_CLASS: Record<AttendanceStatus, string> = {
  PRESENT: "status-success",
  ABSENT: "status-destructive",
  HALF_DAY: "status-warning",
  LEAVE: "status-info",
};

export default function AttendancePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const { data: todayAtt } = useTodayAttendance();
  const { data: myAttendance, isLoading: myLoading } = useMyAttendance({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const { data: allAttendance, isLoading: allLoading } = useAllAttendance(
    isAdmin ? {} : undefined
  );

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const canCheckIn = !todayAtt?.checkIn;
  const canCheckOut = !!todayAtt?.checkIn && !todayAtt?.checkOut;

  const displayData = isAdmin ? allAttendance : myAttendance;
  const isLoading = isAdmin ? allLoading : myLoading;

  const filtered = displayData?.filter((r) => {
    const statusOk = statusFilter === "ALL" || r.status === statusFilter;
    const searchOk =
      !employeeSearch ||
      `${r.employee?.firstName} ${r.employee?.lastName}`
        .toLowerCase()
        .includes(employeeSearch.toLowerCase());
    return statusOk && searchOk;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? "Attendance Management" : "My Attendance"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isAdmin
              ? "Monitor employee attendance records"
              : "Track your daily attendance"}
          </p>
        </div>

        {/* Employee check-in/out */}
        {!isAdmin && (
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
        )}
      </div>

      {/* Today's status (employee only) */}
      {!isAdmin && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Today&apos;s Status — {format(new Date(), "MMMM d, yyyy")}
                </p>
                {todayAtt ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE_CLASS[todayAtt.status as AttendanceStatus]}`}
                    >
                      {ATTENDANCE_STATUS_CONFIG[todayAtt.status as AttendanceStatus]?.label}
                    </span>
                    {todayAtt.checkIn && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <LogIn className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Check-in: <strong>{formatTime(todayAtt.checkIn)}</strong></span>
                      </div>
                    )}
                    {todayAtt.checkOut && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Check-out: <strong>{formatTime(todayAtt.checkOut)}</strong></span>
                      </div>
                    )}
                    {todayAtt.workedMinutes > 0 && (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Worked: <strong>{formatWorkedTime(todayAtt.workedMinutes)}</strong></span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You haven&apos;t checked in yet today.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="w-36 h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PRESENT">Present</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
            <SelectItem value="HALF_DAY">Half Day</SelectItem>
            <SelectItem value="LEAVE">On Leave</SelectItem>
          </SelectContent>
        </Select>

        {isAdmin && (
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search employee..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !filtered || filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {isAdmin && <TableHead className="w-48">Employee</TableHead>}
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Worked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <TableRow key={record.id}>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={record.employee?.profileImage ?? undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {getInitials(
                                  `${record.employee?.firstName} ${record.employee?.lastName}`
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {record.employee?.firstName} {record.employee?.lastName}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-sm">
                        {formatDate(record.attendanceDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.checkIn ? formatTime(record.checkIn) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.checkOut ? formatTime(record.checkOut) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.workedMinutes > 0
                          ? formatWorkedTime(record.workedMinutes)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASS[record.status as AttendanceStatus]}`}
                        >
                          {ATTENDANCE_STATUS_CONFIG[record.status as AttendanceStatus]?.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
