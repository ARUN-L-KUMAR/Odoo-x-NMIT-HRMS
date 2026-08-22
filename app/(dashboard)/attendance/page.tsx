"use client";

import { useState } from "react";
import { format, subDays } from "date-fns";
import {
  LogIn,
  LogOut,
  Loader2,
  Clock,
  CalendarDays,
  Filter,
} from "lucide-react";
import { useSession } from "next-auth/react";
import type { DateRange } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState } from "@/components/shared/empty-state";
import { ExportButton } from "@/components/shared/export-button";
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: todayAtt } = useTodayAttendance();

  // Build date params — use date range picker if set, otherwise default to last 30 days (employee)
  const from = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : format(subDays(new Date(), 30), "yyyy-MM-dd");
  const to = dateRange?.to
    ? format(dateRange.to, "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  const { data: myAttendance, isLoading: myLoading } = useMyAttendance({ from, to });
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
    // Date range filter for admin (employee is already filtered server-side)
    const dateOk =
      !dateRange?.from ||
      !dateRange?.to ||
      !isAdmin ||
      (() => {
        const d = new Date(r.attendanceDate);
        return d >= dateRange.from! && d <= dateRange.to!;
      })();
    return statusOk && searchOk && dateOk;
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export CSV */}
          <ExportButton
            data={filtered ?? []}
            filename="attendance"
            columns={[
              ...(isAdmin
                ? [
                    {
                      header: "Employee",
                      accessor: (r: NonNullable<typeof filtered>[number]) =>
                        `${r.employee?.firstName} ${r.employee?.lastName}`,
                    },
                  ]
                : []),
              { header: "Date", accessor: (r: NonNullable<typeof filtered>[number]) => formatDate(r.attendanceDate) },
              { header: "Check In", accessor: (r: NonNullable<typeof filtered>[number]) => r.checkIn ? formatTime(r.checkIn) : "" },
              { header: "Check Out", accessor: (r: NonNullable<typeof filtered>[number]) => r.checkOut ? formatTime(r.checkOut) : "" },
              { header: "Worked (min)", accessor: "workedMinutes" as const },
              { header: "Status", accessor: "status" as const },
            ]}
          />

          {/* Employee check-in/out */}
          {!isAdmin && (
            <>
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
            </>
          )}
        </div>
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

        {/* Date range picker */}
        <DatePickerWithRange
          date={dateRange}
          setDate={setDateRange}
          placeholder="Filter by date range"
          triggerClassName="w-[240px]"
        />

        {isAdmin && (
          <SearchInput
            id="attendance-search"
            value={employeeSearch}
            onChange={setEmployeeSearch}
            placeholder="Search employee..."
            className="flex-1 min-w-48"
          />
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
            <EmptyState
              icon={CalendarDays}
              title="No attendance records found"
              description={
                statusFilter !== "ALL" || dateRange
                  ? "Try adjusting your filters"
                  : "Attendance records will appear here once employees check in"
              }
            />
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
