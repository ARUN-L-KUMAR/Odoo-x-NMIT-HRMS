"use client";

import { useState } from "react";
import { format, subDays, startOfWeek, endOfWeek, subWeeks, addWeeks, isSameWeek } from "date-fns";
import {
  LogIn,
  LogOut,
  Loader2,
  Clock,
  CalendarDays,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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

  // Week navigation for employee history
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = startOfWeek(subWeeks(new Date(), -weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = weekOffset === 0;

  const { data: todayAtt } = useTodayAttendance();

  // Date range for employee history: use custom range if set, otherwise use week navigation
  const from = dateRange?.from
    ? format(dateRange.from, "yyyy-MM-dd")
    : format(currentWeekStart, "yyyy-MM-dd");
  const to = dateRange?.to
    ? format(dateRange.to, "yyyy-MM-dd")
    : format(currentWeekEnd, "yyyy-MM-dd");

  const { data: myAttendance, isLoading: myLoading } = useMyAttendance({ from, to });
  const { data: allAttendance, isLoading: allLoading } = useAllAttendance(
    isAdmin ? {} : undefined
  );

  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const canCheckIn = !todayAtt?.checkIn;
  const canCheckOut = !!todayAtt?.checkIn && !todayAtt?.checkOut;
  const attendanceComplete = !!todayAtt?.checkIn && !!todayAtt?.checkOut;

  const displayData = isAdmin ? allAttendance : myAttendance;
  const isLoading = isAdmin ? allLoading : myLoading;

  const filtered = displayData?.filter((r) => {
    const statusOk = statusFilter === "ALL" || r.status === statusFilter;
    const searchOk =
      !employeeSearch ||
      `${r.employee?.firstName} ${r.employee?.lastName}`
        .toLowerCase()
        .includes(employeeSearch.toLowerCase());
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
            {isAdmin ? "Attendance" : "Attendance"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isAdmin
              ? "Monitor employee attendance records"
              : "Track your daily attendance"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

      {/* Today's status — Employee only (Excalidraw state machine) */}
      {!isAdmin && (
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Today — {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>

            {/* State 3: Attendance completed */}
            {attendanceComplete && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Attendance Completed
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: LogIn, label: "Check In", value: formatTime(todayAtt!.checkIn!) },
                    { icon: LogOut, label: "Check Out", value: formatTime(todayAtt!.checkOut!) },
                    { icon: Clock, label: "Worked", value: formatWorkedTime(todayAtt!.workedMinutes) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
                      <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium status-success">
                  Present
                </span>
              </div>
            )}

            {/* State 2: Checked in, not out */}
            {!attendanceComplete && todayAtt?.checkIn && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium">
                    Checked in at <strong>{formatTime(todayAtt.checkIn)}</strong>
                  </span>
                </div>
                <Button
                  onClick={() => checkOut.mutate()}
                  disabled={checkOut.isPending}
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

            {/* State 1: Not checked in yet */}
            {!todayAtt?.checkIn && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You haven&apos;t checked in yet today.
                </p>
                <Button
                  onClick={() => checkIn.mutate()}
                  disabled={checkIn.isPending}
                  className="gap-2"
                >
                  {checkIn.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Check In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance History header with period navigation (employee) */}
      {!isAdmin && (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Attendance History
          </h2>
          {!dateRange && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[160px] text-center">
                {format(currentWeekStart, "MMM d")} – {format(currentWeekEnd, "MMM d, yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isCurrentWeek}
                onClick={() => setWeekOffset((w) => w + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentWeek && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setWeekOffset(0)}
                >
                  This Week
                </Button>
              )}
            </div>
          )}
        </div>
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

        <DatePickerWithRange
          date={dateRange}
          setDate={(d) => { setDateRange(d); if (!d) setWeekOffset(0); }}
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
                  : "Attendance records will appear here once you check in"
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
