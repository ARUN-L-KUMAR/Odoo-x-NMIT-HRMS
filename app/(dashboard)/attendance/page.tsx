"use client";

import { useState, useMemo } from "react";
import {
  format,
  subDays,
  addDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  eachDayOfInterval,
  isWeekend,
  isSameDay,
  isToday,
} from "date-fns";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  UserCheck,
  CalendarOff,
  Briefcase,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  X,
  User,
  Users,
  Eye,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { ExportButton } from "@/components/shared/export-button";
import {
  useMyAttendance,
  useAllAttendance,
  useEmployees,
  useTodayAttendance,
} from "@/hooks";
import {
  formatDate,
  formatTime,
  formatTime24,
  formatHHMM,
  getInitials,
} from "@/lib/utils";
import { useDepartments } from "@/hooks";
import type { Attendance, Employee } from "@/types";

export default function AttendancePage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role?.toUpperCase();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;
  const { data: departments = [] } = useDepartments();


  // ─── ADMIN STATE ────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [adminSearch, setAdminSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [selectedDesignation, setSelectedDesignation] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);


  // ─── MONTH NAVIGATION STATE ─────────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));

  // ─── FORMATTED DATES ────────────────────────────────────────────────────────
  const formattedSelectedDate = format(selectedDate, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  // All employees for admin directory & searching
  const { data: allEmployees, isLoading: empLoading } = useEmployees();

  // Extract unique designations from existing employees list
  const uniqueDesignations = useMemo(() => {
    const set = new Set<string>();
    (allEmployees || []).forEach((e) => {
      if (e.designation) set.add(e.designation.trim());
    });
    return Array.from(set).sort();
  }, [allEmployees]);

  // Admin daily attendance query (for all employees on selected date)
  const { data: adminDailyAttendance, isLoading: dailyLoading } = useAllAttendance(
    isAdmin && !selectedEmployeeId
      ? { from: formattedSelectedDate, to: formattedSelectedDate }
      : undefined
  );

  // Single employee monthly attendance query (used when admin inspects a specific user)
  const { data: targetEmployeeAttendance, isLoading: targetLoading } = useAllAttendance(
    isAdmin && selectedEmployeeId
      ? { employeeId: selectedEmployeeId, from: monthStart, to: monthEnd }
      : undefined
  );

  // Current logged in user monthly attendance
  const { data: myAttendance, isLoading: myLoading } = useMyAttendance(
    !isAdmin
      ? { from: monthStart, to: monthEnd }
      : undefined
  );

  const selectedEmployee = useMemo(() => {
    if (!selectedEmployeeId || !allEmployees) return null;
    return allEmployees.find((e) => e.id === selectedEmployeeId) || null;
  }, [selectedEmployeeId, allEmployees]);

  // ─── ADMIN DAILY TABLE ROWS ─────────────────────────────────────────────────
  const adminDailyRows = useMemo(() => {
    if (!isAdmin || selectedEmployeeId) return [];

    const attendanceRecords = adminDailyAttendance || [];
    const attMap = new Map<string, Attendance>();
    attendanceRecords.forEach((att) => {
      attMap.set(att.employeeId, att);
    });

    let rows = (allEmployees || []).map((emp) => {
      const att = attMap.get(emp.id);
      const checkInDate = att?.checkIn ? new Date(att.checkIn) : null;
      const checkOutDate = att?.checkOut ? new Date(att.checkOut) : null;

      let workedMinutes = 0;
      if (checkInDate && checkOutDate) {
        workedMinutes = Math.max(
          0,
          Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60))
        );
      } else if (att?.workedMinutes) {
        workedMinutes = att.workedMinutes;
      }

      // Standard work day = 8 hours (480 minutes)
      const standardDayMinutes = 480;
      const extraMinutes = Math.max(0, workedMinutes - standardDayMinutes);

      return {
        employee: emp,
        attendance: att,
        status: att?.status || "ABSENT",
        checkInFormatted: checkInDate ? formatTime24(checkInDate) : "—",
        checkOutFormatted: checkOutDate ? formatTime24(checkOutDate) : "—",
        workHoursFormatted:
          workedMinutes > 0
            ? formatHHMM(workedMinutes)
            : att?.checkIn
            ? "In Progress"
            : "00:00",
        extraHoursFormatted: extraMinutes > 0 ? formatHHMM(extraMinutes) : "00:00",
        workedMinutes,
        extraMinutes,
      };
    });

    // Filter by department
    if (selectedDepartment !== "ALL") {
      rows = rows.filter((r) => r.employee.department === selectedDepartment);
    }

    // Filter by designation
    if (selectedDesignation !== "ALL") {
      rows = rows.filter((r) => r.employee.designation === selectedDesignation);
    }

    // Filter by attendance status (Present, On Leave, Absent)
    if (selectedStatus !== "ALL") {
      if (selectedStatus === "PRESENT") {
        rows = rows.filter((r) => r.status === "PRESENT" || r.checkInFormatted !== "—");
      } else if (selectedStatus === "LEAVE") {
        rows = rows.filter((r) => r.status === "LEAVE");
      } else if (selectedStatus === "ABSENT") {
        rows = rows.filter((r) => r.status === "ABSENT" && r.checkInFormatted === "—");
      }
    }

    // Filter by search keyword
    if (adminSearch) {
      const q = adminSearch.toLowerCase();
      rows = rows.filter((r) => {
        const name = `${r.employee.firstName} ${r.employee.lastName}`.toLowerCase();
        const code = (r.employee.user?.employeeId || "").toLowerCase();
        const dept = (r.employee.department || "").toLowerCase();
        const email = (r.employee.user?.email || "").toLowerCase();
        return name.includes(q) || code.includes(q) || dept.includes(q) || email.includes(q);
      });
    }

    return rows;
  }, [isAdmin, selectedEmployeeId, adminDailyAttendance, allEmployees, selectedDepartment, selectedDesignation, selectedStatus, adminSearch]);



  // ─── MONTHLY DAY-WISE CALCULATION (FOR EMPLOYEE OR SELECTED USER) ───────────
  const activeMonthlyRecords = isAdmin && selectedEmployeeId ? targetEmployeeAttendance : myAttendance;
  const isMonthlyLoading = isAdmin && selectedEmployeeId ? targetLoading : myLoading;

  const { monthDays, presentCount, leaveCount, totalWorkingDays } = useMemo(() => {
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });

    const records = activeMonthlyRecords || [];
    const recordByDate = new Map<string, Attendance>();

    records.forEach((r) => {
      if (r.attendanceDate) {
        const key = format(new Date(r.attendanceDate), "yyyy-MM-dd");
        recordByDate.set(key, r);
      }
    });

    let present = 0;
    let leaves = 0;
    let workingDays = 0;

    const days = daysInMonth.map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const att = recordByDate.get(dateKey);
      const isWknd = isWeekend(day);

      if (!isWknd) {
        workingDays++;
      }

      const checkInDate = att?.checkIn ? new Date(att.checkIn) : null;
      const checkOutDate = att?.checkOut ? new Date(att.checkOut) : null;

      let workedMinutes = 0;
      if (checkInDate && checkOutDate) {
        workedMinutes = Math.max(
          0,
          Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60))
        );
      } else if (att?.workedMinutes) {
        workedMinutes = att.workedMinutes;
      }

      const extraMinutes = Math.max(0, workedMinutes - 480);

      if (att?.status === "PRESENT" || (checkInDate && att?.status !== "LEAVE")) {
        present++;
      } else if (att?.status === "LEAVE") {
        leaves++;
      }

      return {
        date: day,
        dateFormatted: format(day, "dd/MM/yyyy"),
        dayName: format(day, "EEE"),
        isWeekend: isWknd,
        attendance: att,
        status: att?.status || (isWknd ? "WEEKEND" : day > new Date() ? "UPCOMING" : "ABSENT"),
        checkInFormatted: checkInDate ? formatTime24(checkInDate) : "—",
        checkOutFormatted: checkOutDate ? formatTime24(checkOutDate) : "—",
        workHoursFormatted: workedMinutes > 0 ? formatHHMM(workedMinutes) : "00:00",
        extraHoursFormatted: extraMinutes > 0 ? formatHHMM(extraMinutes) : "00:00",
      };
    });

    return {
      monthDays: days.reverse(),
      presentCount: present,
      leaveCount: leaves,
      totalWorkingDays: workingDays,
    };
  }, [currentMonth, activeMonthlyRecords]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── ADMIN: SPECIFIC EMPLOYEE MONTHLY VIEW ─────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (isAdmin && selectedEmployee) {
    const fullName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim();
    return (
      <div className="space-y-6 w-full pb-12">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedEmployeeId(null)}
              className="gap-2 text-xs font-medium"
            >
              <ChevronLeft className="h-4 w-4" /> Back to All Employees
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {fullName} — Attendance
              </h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Login ID: <span className="font-mono font-semibold">{selectedEmployee.user?.employeeId}</span> • {selectedEmployee.designation || selectedEmployee.department || "Employee"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExportButton
              data={monthDays}
              filename={`attendance-${selectedEmployee.user?.employeeId}-${format(currentMonth, "yyyy-MM")}`}
              columns={[
                { header: "Date", accessor: (r) => r.dateFormatted },
                { header: "Day", accessor: (r) => r.dayName },
                { header: "Check In", accessor: (r) => r.checkInFormatted },
                { header: "Check Out", accessor: (r) => r.checkOutFormatted },
                { header: "Work Hours", accessor: (r) => r.workHoursFormatted },
                { header: "Extra Hours", accessor: (r) => r.extraHoursFormatted },
                { header: "Status", accessor: (r) => r.status },
              ]}
            />
          </div>
        </div>

        {/* ─── Top Controls & Summary Badges (Matches Excalidraw) ───────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-xs">
          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Select
              value={format(currentMonth, "yyyy-MM")}
              onValueChange={(val) => {
                if (val) {
                  const [y, m] = val.split("-");
                  setCurrentMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
                }
              }}
            >
              <SelectTrigger className="h-9 text-xs font-semibold w-36">
                <SelectValue>{format(currentMonth, "MMM yyyy")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[-5, -4, -3, -2, -1, 0, 1, 2].map((offset) => {
                  const d = addMonths(new Date(), offset);
                  const val = format(d, "yyyy-MM");
                  return (
                    <SelectItem key={val} value={val}>
                      {format(d, "MMMM yyyy")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stat Badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="px-3 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-center sm:text-left">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Count of days present
              </p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                {presentCount}
              </p>
            </div>

            <div className="px-3 py-2 rounded-lg border bg-amber-500/10 border-amber-500/20 text-center sm:text-left">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Leaves count
              </p>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                {leaveCount}
              </p>
            </div>

            <div className="px-3 py-2 rounded-lg border bg-primary/10 border-primary/20 text-center sm:text-left">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                Total working days
              </p>
              <p className="text-lg font-bold text-primary font-mono mt-0.5">
                {totalWorkingDays}
              </p>
            </div>
          </div>
        </div>

        {/* Day-Wise Table */}
        <Card className="border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-transparent">
                    <TableHead className="font-semibold text-xs py-3 w-[25%]">Date</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Check In</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Check Out</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Work Hours</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Extra hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isMonthlyLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        {[1, 2, 3, 4, 5].map((j) => (
                          <TableCell key={j} className="py-3">
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    monthDays.map((row) => {
                      const isCurrentDay = isSameDay(row.date, new Date());
                      return (
                        <TableRow
                          key={row.dateFormatted}
                          className={`transition-colors ${
                            isCurrentDay ? "bg-primary/5 font-semibold" : row.isWeekend ? "bg-muted/15 opacity-70" : "hover:bg-muted/30"
                          }`}
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-foreground">
                                {row.dateFormatted}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0 px-1.5 font-normal ${
                                  row.isWeekend
                                    ? "bg-muted text-muted-foreground"
                                    : isCurrentDay
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {row.dayName}
                              </Badge>
                              {isCurrentDay && (
                                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                                  Today
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs font-medium py-3">
                            {row.checkInFormatted !== "—" ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                {row.checkInFormatted}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>

                          <TableCell className="font-mono text-xs font-medium py-3">
                            {row.checkOutFormatted !== "—" ? (
                              <span className="text-foreground font-semibold">
                                {row.checkOutFormatted}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>

                          <TableCell className="font-mono text-xs font-bold py-3">
                            {row.workHoursFormatted !== "00:00" ? (
                              <span className="text-foreground">{row.workHoursFormatted}</span>
                            ) : (
                              <span className="text-muted-foreground/60">00:00</span>
                            )}
                          </TableCell>

                          <TableCell className="font-mono text-xs font-semibold py-3">
                            {row.extraHoursFormatted !== "00:00" ? (
                              <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                                +{row.extraHoursFormatted}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">00:00</span>
                            )}
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
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── ADMIN / HR OFFICER: DAILY TEAM VIEW (Diagram 1 with Searchbar) ────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (isAdmin) {
    return (
      <div className="space-y-6 w-full pb-12">
        {/* ─── Top Header Bar: Title + Prominent Searchbar (Matches Excalidraw) ─ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Daily employee attendance, check-ins, and overtime hours
            </p>
          </div>

          {/* Prominent Searchbar on Header (per Excalidraw diagram) */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder="Search employee by name, ID..."
                className="pl-9 pr-8 h-9 text-xs shadow-xs"
              />
              {adminSearch && (
                <button
                  type="button"
                  onClick={() => setAdminSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <ExportButton
              data={adminDailyRows}
              filename={`attendance-${formattedSelectedDate}`}
              columns={[
                { header: "Employee", accessor: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
                { header: "Login ID", accessor: (r) => r.employee.user?.employeeId || "" },
                { header: "Check In", accessor: (r) => r.checkInFormatted },
                { header: "Check Out", accessor: (r) => r.checkOutFormatted },
                { header: "Work Hours", accessor: (r) => r.workHoursFormatted },
                { header: "Extra Hours", accessor: (r) => r.extraHoursFormatted },
                { header: "Status", accessor: (r) => r.status },
              ]}
            />
          </div>
        </div>

        {/* ─── Navigation Row: [ <- ] [ -> ] [ Date Picker ] [ Day (Today) ] ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Date Picker Input */}
            <div className="relative">
              <Input
                type="date"
                value={formattedSelectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(new Date(e.target.value));
                }}
                className="h-9 text-xs font-medium w-40"
              />
            </div>

            <Button
              variant={isToday(selectedDate) ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="h-9 text-xs px-3 font-medium"
            >
              Day (Today)
            </Button>
          </div>

          {/* Filters: Department + Designation + Quick Inspect User */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
<Select
              value={selectedDepartment}
              onValueChange={(val) => setSelectedDepartment(val ?? "ALL")}
            >
              <SelectTrigger className="h-9 text-xs w-40">
                <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>

            </Select>

            {/* Designation Filter */}
            <Select
              value={selectedDesignation}
              onValueChange={(val) => setSelectedDesignation(val ?? "ALL")}
            >
              <SelectTrigger className="h-9 text-xs w-44">
                <Briefcase className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Designations</SelectItem>
                {uniqueDesignations.map((desig) => (
                  <SelectItem key={desig} value={desig}>
                    {desig}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Attendance Status Filter (Present / On Leave / Absent) */}
            <Select
              value={selectedStatus}
              onValueChange={(val) => setSelectedStatus(val ?? "ALL")}
            >
              <SelectTrigger className="h-9 text-xs w-36">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PRESENT">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    Present
                  </span>
                </SelectItem>
                <SelectItem value="LEAVE">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                    On Leave
                  </span>
                </SelectItem>
                <SelectItem value="ABSENT">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                    Absent
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Inspect User Dropdown */}
            <Select

              value={selectedEmployeeId || "ALL"}
              onValueChange={(val) => {
                if (val === "ALL") setSelectedEmployeeId(null);
                else setSelectedEmployeeId(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-48">
                <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Inspect User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Users (Daily)</SelectItem>
                {(allEmployees || []).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.user?.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>


        {/* Date Display Banner (from Excalidraw) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">
              {format(selectedDate, "d, MMMM yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              Present ({adminDailyRows.filter((r) => r.status === "PRESENT" || r.checkInFormatted !== "—").length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 inline-block" />
              On Leave ({adminDailyRows.filter((r) => r.status === "LEAVE").length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
              Absent ({adminDailyRows.filter((r) => r.status === "ABSENT" && r.checkInFormatted === "—").length})
            </span>
          </div>
        </div>

        {/* ─── Admin Attendance List Table (Matches Excalidraw) ─────────────── */}
        <Card className="border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-transparent">
                    <TableHead className="font-semibold text-xs py-3 w-[32%]">Emp</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Check In</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Check Out</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Work Hours</TableHead>
                    <TableHead className="font-semibold text-xs py-3">Extra hours</TableHead>
                    <TableHead className="font-semibold text-xs py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyLoading || empLoading ? (
                    [1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i}>
                        {[1, 2, 3, 4, 5, 6].map((j) => (
                          <TableCell key={j} className="py-3">
                            <Skeleton className="h-6 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : adminDailyRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                        {adminSearch
                          ? "No employees matched your search query."
                          : "No attendance records found for this date."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    adminDailyRows.map((row) => {
                      const isPresent =
                        row.status === "PRESENT" || row.checkInFormatted !== "—";
                      return (
                        <TableRow
                          key={row.employee.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* Emp Column */}
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 ring-2 ring-background shadow-xs">
                                <AvatarImage src={row.employee.profileImage ?? undefined} />
                                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                  {getInitials(
                                    `${row.employee.firstName} ${row.employee.lastName}`
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold tracking-tight text-foreground">
                                    {row.employee.firstName} {row.employee.lastName}
                                  </p>
                                  {isSuperAdmin && (row.employee as any)?.company?.name && (
                                    <span className="text-[10px] text-primary font-medium bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
                                      {(row.employee as any).company.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                    {row.employee.user?.employeeId}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
                                    • {row.employee.designation || row.employee.department || "Team"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Check In */}
                          <TableCell className="font-mono text-xs font-medium py-3">
                            {row.checkInFormatted !== "—" ? (
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                {row.checkInFormatted}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>

                          {/* Check Out */}
                          <TableCell className="font-mono text-xs font-medium py-3">
                            {row.checkOutFormatted !== "—" ? (
                              <span className="text-foreground font-semibold">
                                {row.checkOutFormatted}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </TableCell>

                          {/* Work Hours */}
                          <TableCell className="font-mono text-xs font-bold py-3">
                            {row.workHoursFormatted !== "00:00" ? (
                              <span className="text-foreground">{row.workHoursFormatted}</span>
                            ) : (
                              <span className="text-muted-foreground/60">00:00</span>
                            )}
                          </TableCell>

                          {/* Extra Hours (Overtime) */}
                          <TableCell className="font-mono text-xs font-semibold py-3">
                            {row.extraHoursFormatted !== "00:00" ? (
                              <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                                +{row.extraHoursFormatted}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">00:00</span>
                            )}
                          </TableCell>

                          {/* Actions: View Monthly Record */}
                          <TableCell className="py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEmployeeId(row.employee.id)}
                              className="h-7 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Sheet
                            </Button>
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
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── EMPLOYEE VIEW: Monthly Day-Wise (Diagram 2) ──────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Day-wise attendance for ongoing month displaying working time and breaks
        </p>
      </div>

      {/* ─── Top Controls & Summary Badges (Matches Excalidraw) ─────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-xs">
        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Select
            value={format(currentMonth, "yyyy-MM")}
            onValueChange={(val) => {
              if (val) {
                const [y, m] = val.split("-");
                setCurrentMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
              }
            }}
          >
            <SelectTrigger className="h-9 text-xs font-semibold w-36">
              <SelectValue>{format(currentMonth, "MMM yyyy")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {[-3, -2, -1, 0, 1, 2].map((offset) => {
                const d = addMonths(new Date(), offset);
                const val = format(d, "yyyy-MM");
                return (
                  <SelectItem key={val} value={val}>
                    {format(d, "MMMM yyyy")}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* ─── Summary Stat Badges (per Excalidraw) ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="px-3 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/20 text-center sm:text-left">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              Count of days present
            </p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
              {presentCount}
            </p>
          </div>

          <div className="px-3 py-2 rounded-lg border bg-amber-500/10 border-amber-500/20 text-center sm:text-left">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              Leaves count
            </p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono mt-0.5">
              {leaveCount}
            </p>
          </div>

          <div className="px-3 py-2 rounded-lg border bg-primary/10 border-primary/20 text-center sm:text-left">
            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
              Total working days
            </p>
            <p className="text-lg font-bold text-primary font-mono mt-0.5">
              {totalWorkingDays}
            </p>
          </div>
        </div>
      </div>

      {/* Month Display Banner */}
      <div className="flex items-center gap-2 px-1">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold tracking-tight">
          {format(currentMonth, "MMMM yyyy")} — Day-Wise Records
        </span>
      </div>

      {/* ─── Employee Day-Wise Table (Matches Excalidraw) ────────────────────── */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-transparent">
                  <TableHead className="font-semibold text-xs py-3 w-[25%]">Date</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Check In</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Check Out</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Work Hours</TableHead>
                  <TableHead className="font-semibold text-xs py-3">Extra hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isMonthlyLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5].map((j) => (
                        <TableCell key={j} className="py-3">
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  monthDays.map((row) => {
                    const isCurrentDay = isSameDay(row.date, new Date());
                    return (
                      <TableRow
                        key={row.dateFormatted}
                        className={`transition-colors ${
                          isCurrentDay ? "bg-primary/5 font-semibold" : row.isWeekend ? "bg-muted/15 opacity-70" : "hover:bg-muted/30"
                        }`}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {row.dateFormatted}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] py-0 px-1.5 font-normal ${
                                row.isWeekend
                                  ? "bg-muted text-muted-foreground"
                                  : isCurrentDay
                                  ? "bg-primary/10 text-primary border-primary/30"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {row.dayName}
                            </Badge>
                            {isCurrentDay && (
                              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                                Today
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs font-medium py-3">
                          {row.checkInFormatted !== "—" ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              {row.checkInFormatted}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-xs font-medium py-3">
                          {row.checkOutFormatted !== "—" ? (
                            <span className="text-foreground font-semibold">
                              {row.checkOutFormatted}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-xs font-bold py-3">
                          {row.workHoursFormatted !== "00:00" ? (
                            <span className="text-foreground">{row.workHoursFormatted}</span>
                          ) : (
                            <span className="text-muted-foreground/60">00:00</span>
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-xs font-semibold py-3">
                          {row.extraHoursFormatted !== "00:00" ? (
                            <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                              +{row.extraHoursFormatted}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">00:00</span>
                          )}
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
    </div>
  );
}
