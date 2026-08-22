"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  SlidersHorizontal,
  X,
  Palmtree,
  Pill,
  Calendar as CalendarIcon,
  UploadCloud,
  FileText,
  Eye,
  Check,
  AlertCircle,
  Building2,
  ArrowRight,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
} from "lucide-react";
import { format, differenceInCalendarDays, isWeekend, eachDayOfInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImageUpload } from "@/components/shared/image-upload";
import { ExportButton } from "@/components/shared/export-button";
import {
  useLeaveBalances,
  useMyLeaveRequests,
  useLeaveRequests,
  useLeaveTypes,
  useCreateLeave,
  useApproveLeave,
  useRejectLeave,
  useEmployees,
} from "@/hooks";
import { createLeaveSchema, type CreateLeaveInput } from "@/lib/validations";
import { formatDate, getInitials } from "@/lib/utils";
import { LEAVE_STATUS_CONFIG } from "@/lib/constants";
import type { LeaveStatus, LeaveRequest, LeaveBalance, Employee } from "@/types";
import { TimeOffCalendar } from "@/components/time-off/TimeOffCalendar";

const STATUS_CLASS: Record<LeaveStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300",
  REJECTED: "bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-300 border-red-300",
};

export default function TimeOffPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN";

  // Top tabs: "time-off" | "allocation"
  const [topTab, setTopTab] = useState<"time-off" | "allocation">("time-off");

  // View mode: "table" | "calendar"
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  // Table vs Grid view mode for requests
  const [listGridViewMode, setListGridViewMode] = useState<"list" | "grid">("list");

  // Inspect specific user time-off details (when admin clicks an employee)
  const [inspectedEmployeeId, setInspectedEmployeeId] = useState<string | null>(null);

  // Calendar filter for Admin
  const [calendarEmployeeId, setCalendarEmployeeId] = useState<string>("ALL");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  // Review Dialog State (for Admin Approve / Reject with comment)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [adminComment, setAdminComment] = useState("");

  // Queries
  const { data: balances, isLoading: balancesLoading } = useLeaveBalances();
  const { data: myRequests, isLoading: myLoading } = useMyLeaveRequests();
  const { data: allRequests, isLoading: allLoading } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const { data: allEmployees } = useEmployees();

  const createLeave = useCreateLeave();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateLeaveInput>({
    resolver: zodResolver(createLeaveSchema),
    defaultValues: {
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
      reason: "",
    },
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const selectedLeaveTypeId = watch("leaveTypeId");
  const targetEmployeeId = watch("employeeId");

  // Calculate allocation days dynamically excluding weekends
  const allocationDays = useMemo(() => {
    if (!startDate || !endDate) return "00.00";
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return "00.00";

      const days = eachDayOfInterval({ start, end });
      const workingDays = days.filter((d) => !isWeekend(d)).length;
      return workingDays.toString().padStart(2, "0") + ".00";
    } catch {
      return "01.00";
    }
  }, [startDate, endDate]);

  // Open modal pre-filled with clicked date
  const handleCalendarSelectDate = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    setValue("startDate", formatted);
    setValue("endDate", formatted);
    if (inspectedEmployeeId) {
      setValue("employeeId", inspectedEmployeeId);
    }
    setIsRequestModalOpen(true);
  };

  // Submit leave application
  const onApply = async (formData: CreateLeaveInput) => {
    createLeave.mutate(
      {
        ...formData,
        attachmentUrl: attachmentUrl || undefined,
      },
      {
        onSuccess: () => {
          setIsRequestModalOpen(false);
          reset();
          setAttachmentUrl(null);
        },
      }
    );
  };

  // Quick Inline Approve / Reject
  const handleQuickApprove = (id: string) => {
    approveLeave.mutate({ id });
  };

  const handleQuickReject = (id: string) => {
    setSelectedRequestId(id);
    setReviewAction("reject");
    setAdminComment("");
    setReviewModalOpen(true);
  };

  const submitReview = () => {
    if (!selectedRequestId) return;
    if (reviewAction === "approve") {
      approveLeave.mutate(
        { id: selectedRequestId, comment: adminComment || undefined },
        { onSuccess: () => setReviewModalOpen(false) }
      );
    } else {
      rejectLeave.mutate(
        { id: selectedRequestId, comment: adminComment || undefined },
        { onSuccess: () => setReviewModalOpen(false) }
      );
    }
  };

  // ─── Leave Balance Cards Extraction ─────────────────────────────────────────
  const balanceList = (balances || []) as LeaveBalance[];
  const paidTimeOff = balanceList.find((b) => b.leaveTypeName.toLowerCase().includes("paid")) || {
    remaining: 24,
    annualLimit: 24,
    used: 0,
    leaveTypeName: "Paid time Off",
  };

  const sickTimeOff = balanceList.find((b) => b.leaveTypeName.toLowerCase().includes("sick")) || {
    remaining: 7,
    annualLimit: 7,
    used: 0,
    leaveTypeName: "Sick time off",
  };

  // ─── Filtered Requests ──────────────────────────────────────────────────────
  const rawRequests = (isAdmin ? allRequests : myRequests) || [];
  const filteredRequests = useMemo(() => {
    return rawRequests.filter((r: LeaveRequest) => {
      // Status filter
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const empName = `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}`.toLowerCase();
        const code = ((r.employee?.user as any)?.employeeId || "").toLowerCase();
        const typeName = (r.leaveType?.name || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        return empName.includes(q) || code.includes(q) || typeName.includes(q) || reason.includes(q);
      }
      return true;
    });
  }, [rawRequests, statusFilter, searchQuery]);

  // Selected Inspected Employee (when Admin clicks an employee to inspect their login-view time off)
  const inspectedEmployee = useMemo(() => {
    if (!inspectedEmployeeId || !allEmployees) return null;
    return allEmployees.find((e) => e.id === inspectedEmployeeId) || null;
  }, [inspectedEmployeeId, allEmployees]);

  const inspectedEmployeeRequests = useMemo(() => {
    if (!inspectedEmployeeId) return [];
    return rawRequests.filter((r) => r.employeeId === inspectedEmployeeId);
  }, [inspectedEmployeeId, rawRequests]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── INSPECTED EMPLOYEE DETAIL VIEW (Matching User Login View for Admin) ───
  // ═══════════════════════════════════════════════════════════════════════════
  if (isAdmin && inspectedEmployee) {
    const empName = `${inspectedEmployee.firstName} ${inspectedEmployee.lastName}`;
    const empCode = (inspectedEmployee.user as any)?.employeeId || inspectedEmployee.id;

    const empApprovedLeaves = inspectedEmployeeRequests.filter((r) => r.status === "APPROVED");
    const empPaidUsed = empApprovedLeaves
      .filter((r) => r.leaveType?.name.toLowerCase().includes("paid"))
      .reduce((sum, r) => sum + Number(r.totalDays), 0);
    const empSickUsed = empApprovedLeaves
      .filter((r) => r.leaveType?.name.toLowerCase().includes("sick"))
      .reduce((sum, r) => sum + Number(r.totalDays), 0);

    return (
      <div className="space-y-6 w-full pb-16">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectedEmployeeId(null)}
              className="gap-2 text-xs font-medium"
            >
              <ChevronLeft className="h-4 w-4" /> Back to All Requests
            </Button>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-xs">
                <AvatarImage src={inspectedEmployee.profileImage ?? undefined} />
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {getInitials(empName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{empName}</h1>
                <p className="text-muted-foreground text-xs">
                  Login ID: <span className="font-mono font-semibold">{empCode}</span> • {inspectedEmployee.designation || inspectedEmployee.department || "Employee"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                reset();
                setValue("employeeId", inspectedEmployee.id);
                setAttachmentUrl(null);
                setIsRequestModalOpen(true);
              }}
              className="h-9 px-4 text-xs font-bold gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" /> Apply Time Off For {inspectedEmployee.firstName}
            </Button>
          </div>
        </div>

        {/* Balance Cards for Inspected Employee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border shadow-2xs bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                  <Palmtree className="h-4 w-4" /> Paid time Off
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  Annual Quota
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-2xl font-extrabold text-foreground font-mono">
                {Math.max(0, 24 - empPaidUsed)}{" "}
                <span className="text-xs font-medium text-muted-foreground font-sans">Days Available</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Used: <span className="font-semibold">{empPaidUsed}</span> of 24 days
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-2xs bg-gradient-to-br from-card to-amber-500/5">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <Pill className="h-4 w-4" /> Sick time off
                </span>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                  Medical
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-2xl font-extrabold text-foreground font-mono">
                {Math.max(0, 7 - empSickUsed)}{" "}
                <span className="text-xs font-medium text-muted-foreground font-sans">Days Available</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Used: <span className="font-semibold">{empSickUsed}</span> of 7 days
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-2xs bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Clock className="h-4 w-4 text-primary" /> Request History
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {inspectedEmployeeRequests.length} Total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="flex items-center gap-4 mt-1">
                <div>
                  <p className="text-lg font-bold text-amber-600 font-mono">
                    {inspectedEmployeeRequests.filter((r) => r.status === "PENDING").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
                </div>
                <div className="border-r h-8" />
                <div>
                  <p className="text-lg font-bold text-emerald-600 font-mono">
                    {inspectedEmployeeRequests.filter((r) => r.status === "APPROVED").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">Approved</p>
                </div>
                <div className="border-r h-8" />
                <div>
                  <p className="text-lg font-bold text-red-500 font-mono">
                    {inspectedEmployeeRequests.filter((r) => r.status === "REJECTED").length}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 12-Month Calendar for Inspected User */}
        <TimeOffCalendar
          requests={inspectedEmployeeRequests}
          onSelectDate={handleCalendarSelectDate}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── MAIN TIME OFF VIEW (WITH LIST / GRID TOGGLE) ──────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 w-full pb-16">
      {/* ─── Top Bar: Tabs (Time Off | Allocation) & New Request Button ──────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Time Off</h1>
            {isAdmin && (
              <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
                <button
                  type="button"
                  onClick={() => setTopTab("time-off")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    topTab === "time-off"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Time Off
                </button>
                <button
                  type="button"
                  onClick={() => setTopTab("allocation")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    topTab === "allocation"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Allocation
                </button>
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-xs mt-0.5">
            {isAdmin
              ? "Review, approve, and allocate employee time-off and leave requests"
              : "View your leave balances and request time off"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 text-xs font-medium"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" /> Requests List
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className="h-8 text-xs font-medium"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> 12-Month Calendar
            </Button>
          </div>

          {/* "+ NEW" Button (Exact Excalidraw match) */}
          <Button
            onClick={() => {
              reset({
                employeeId: session?.user?.employeeDbId || (allEmployees?.[0]?.id ?? ""),
                leaveTypeId: leaveTypes?.[0]?.id ?? "",
                startDate: format(new Date(), "yyyy-MM-dd"),
                endDate: format(new Date(), "yyyy-MM-dd"),
                reason: "",
              });
              setAttachmentUrl(null);
              setIsRequestModalOpen(true);
            }}
            className="h-9 px-4 text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" /> NEW
          </Button>

        </div>
      </div>

      {/* ─── Balance Summary Cards (from Excalidraw) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Paid Time Off Card */}
        <Card className="border shadow-2xs bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wide">
                <Palmtree className="h-4 w-4" /> Paid time Off
              </span>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                Annual Quota
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold text-foreground font-mono">
              {paidTimeOff.remaining ?? 24}{" "}
              <span className="text-xs font-medium text-muted-foreground font-sans">Days Available</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Used: <span className="font-semibold">{paidTimeOff.used ?? 0}</span> days of {paidTimeOff.annualLimit ?? 24} days
            </p>
          </CardContent>
        </Card>

        {/* Sick Time Off Card */}
        <Card className="border shadow-2xs bg-gradient-to-br from-card to-amber-500/5">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Pill className="h-4 w-4" /> Sick time off
              </span>
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                Medical
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-2xl font-extrabold text-foreground font-mono">
              {sickTimeOff.remaining ?? 7}{" "}
              <span className="text-xs font-medium text-muted-foreground font-sans">Days Available</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Used: <span className="font-semibold">{sickTimeOff.used ?? 0}</span> days of {sickTimeOff.annualLimit ?? 7} days
            </p>
          </CardContent>
        </Card>

        {/* Total Applied / Requests Pending */}
        <Card className="border shadow-2xs bg-gradient-to-br from-card to-muted/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="h-4 w-4 text-primary" /> Request Status
              </span>
              <Badge variant="outline" className="text-[10px]">
                Active Cycle
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-center gap-4 mt-1">
              <div>
                <p className="text-lg font-bold text-amber-600 font-mono">
                  {rawRequests.filter((r) => r.status === "PENDING").length}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">Pending</p>
              </div>
              <div className="border-r h-8" />
              <div>
                <p className="text-lg font-bold text-emerald-600 font-mono">
                  {rawRequests.filter((r) => r.status === "APPROVED").length}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">Approved</p>
              </div>
              <div className="border-r h-8" />
              <div>
                <p className="text-lg font-bold text-red-500 font-mono">
                  {rawRequests.filter((r) => r.status === "REJECTED").length}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── TAB 1: TIME OFF REQUESTS OR CALENDAR ───────────────────────────── */}
      {topTab === "time-off" && (
        <div className="space-y-6">
          {/* 12-Month Calendar Mode (Available to Admin & Employee) */}
          {viewMode === "calendar" ? (
            <div className="space-y-4">
              {isAdmin && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">Filter Calendar by Employee:</span>
                    <Select
                      value={calendarEmployeeId}
                      onValueChange={(val) => setCalendarEmployeeId(val ?? "ALL")}
                    >
                      <SelectTrigger className="h-8 text-xs w-60">
                        <SelectValue placeholder="All Employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Team Members</SelectItem>
                        {(allEmployees || []).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} ({(emp.user as any)?.employeeId || emp.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Badge variant="outline" className="text-xs self-start sm:self-auto">
                    {calendarEmployeeId === "ALL" ? "Showing All Team Leaves" : "Showing Selected Employee"}
                  </Badge>
                </div>
              )}
              <TimeOffCalendar
                requests={
                  calendarEmployeeId === "ALL"
                    ? rawRequests
                    : rawRequests.filter((r) => r.employeeId === calendarEmployeeId)
                }
                onSelectDate={handleCalendarSelectDate}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Controls Bar: Searchbar + Status Filters + Grid/List Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border bg-card shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isAdmin ? "Search by employee name, ID, or leave type..." : "Search your leave requests..."}
                    className="pl-9 pr-8 h-9 text-xs shadow-xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Status:</span>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
                    <SelectTrigger className="h-9 text-xs w-36">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* ─── Grid / List View Toggle ────────────────────────────── */}
                  <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
                    <Button
                      variant={listGridViewMode === "list" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setListGridViewMode("list")}
                      className="h-8 w-8"
                      title="List View"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={listGridViewMode === "grid" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setListGridViewMode("grid")}
                      className="h-8 w-8"
                      title="Grid View"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>

                  <ExportButton
                    data={filteredRequests}
                    filename="time-off-requests"
                    columns={[
                      { header: "Employee", accessor: (r) => `${r.employee?.firstName || ""} ${r.employee?.lastName || ""}` },
                      { header: "Login ID", accessor: (r) => (r.employee?.user as any)?.employeeId || "" },
                      { header: "Type", accessor: (r) => r.leaveType?.name || "" },
                      { header: "Start Date", accessor: (r) => formatDate(r.startDate) },
                      { header: "End Date", accessor: (r) => formatDate(r.endDate) },
                      { header: "Days", accessor: (r) => Number(r.totalDays) },
                      { header: "Status", accessor: (r) => r.status },
                      { header: "Reason", accessor: (r) => r.reason },
                    ]}
                  />
                </div>
              </div>

              {/* ─── VIEW 1: TABLE VIEW ──────────────────────────────────────── */}
              {listGridViewMode === "list" ? (
                <Card className="border shadow-xs overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-transparent">
                            <TableHead className="font-semibold text-xs py-3 w-[26%]">Name</TableHead>
                            <TableHead className="font-semibold text-xs py-3">Start Date</TableHead>
                            <TableHead className="font-semibold text-xs py-3">End Date</TableHead>
                            <TableHead className="font-semibold text-xs py-3">Time off Type</TableHead>
                            <TableHead className="font-semibold text-xs py-3">Status</TableHead>
                            {isAdmin && (
                              <TableHead className="font-semibold text-xs py-3 text-right">Actions</TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(isAdmin ? allLoading : myLoading) ? (
                            [1, 2, 3, 4, 5].map((i) => (
                              <TableRow key={i}>
                                {[1, 2, 3, 4, 5, ...(isAdmin ? [6] : [])].map((j) => (
                                  <TableCell key={j} className="py-3">
                                    <Skeleton className="h-6 w-full" />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          ) : filteredRequests.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={isAdmin ? 6 : 5} className="h-32 text-center text-muted-foreground text-sm">
                                {searchQuery ? "No leave requests matched your search query." : "No time off requests found."}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredRequests.map((req: LeaveRequest) => {
                              const isPending = req.status === "PENDING";
                              return (
                                <TableRow
                                  key={req.id}
                                  onClick={() => {
                                    if (isAdmin && req.employeeId) {
                                      setInspectedEmployeeId(req.employeeId);
                                    }
                                  }}
                                  className={`transition-colors ${
                                    isAdmin ? "cursor-pointer hover:bg-primary/5 group" : "hover:bg-muted/30"
                                  }`}
                                >
                                  {/* Name / Employee info */}
                                  <TableCell className="py-3">
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8 ring-1 ring-border shadow-2xs group-hover:ring-primary/40 transition-all">
                                        <AvatarImage src={req.employee?.profileImage ?? undefined} />
                                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                          {getInitials(`${req.employee?.firstName || ""} ${req.employee?.lastName || ""}`)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="text-xs font-semibold text-foreground leading-none group-hover:text-primary transition-colors">
                                          {req.employee?.firstName} {req.employee?.lastName}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                            {(req.employee?.user as any)?.employeeId || "EMP"}
                                          </span>
                                          <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                                            • {req.employee?.department || "General"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </TableCell>

                                  {/* Start Date */}
                                  <TableCell className="font-mono text-xs font-medium py-3">
                                    {format(new Date(req.startDate), "dd/MM/yyyy")}
                                  </TableCell>

                                  {/* End Date */}
                                  <TableCell className="font-mono text-xs font-medium py-3">
                                    {format(new Date(req.endDate), "dd/MM/yyyy")}
                                  </TableCell>

                                  {/* Time off Type */}
                                  <TableCell className="py-3">
                                    <span className="text-xs font-semibold text-foreground">
                                      {req.leaveType?.name || "Time Off"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                      {Number(req.totalDays)} Day{Number(req.totalDays) > 1 ? "s" : ""}
                                    </span>
                                  </TableCell>

                                  {/* Status Badge */}
                                  <TableCell className="py-3">
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${
                                        STATUS_CLASS[req.status as LeaveStatus] || ""
                                      }`}
                                    >
                                      {req.status}
                                    </Badge>
                                  </TableCell>

                                  {/* Admin Actions: Reject (Red) & Approve (Green) Buttons */}
                                  {isAdmin && (
                                    <TableCell className="py-3 text-right">
                                      {isPending ? (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex items-center justify-end gap-1.5"
                                        >
                                          {/* Reject Button (Red button from Excalidraw) */}
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => handleQuickReject(req.id)}
                                            disabled={rejectLeave.isPending}
                                            className="h-7 w-7 text-red-600 hover:text-white hover:bg-red-600 border-red-200 dark:border-red-900/60 shadow-2xs"
                                            title="Reject Leave Request"
                                          >
                                            <XCircle className="h-4 w-4" />
                                          </Button>

                                          {/* Approve Button (Green button from Excalidraw) */}
                                          <Button
                                            size="icon"
                                            onClick={() => handleQuickApprove(req.id)}
                                            disabled={approveLeave.isPending}
                                            className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                                            title="Approve Leave Request"
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="text-xs text-primary font-medium flex items-center justify-end gap-1 group-hover:underline">
                                          <Eye className="h-3.5 w-3.5" /> View User
                                        </span>
                                      )}
                                    </TableCell>
                                  )}
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
                /* ─── VIEW 2: CARD GRID VIEW ──────────────────────────────────── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(isAdmin ? allLoading : myLoading) ? (
                    [1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="border p-4">
                        <Skeleton className="h-24 w-full" />
                      </Card>
                    ))
                  ) : filteredRequests.length === 0 ? (
                    <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground text-sm border rounded-xl bg-card">
                      {searchQuery ? "No leave requests matched your search query." : "No time off requests found."}
                    </div>
                  ) : (
                    filteredRequests.map((req: LeaveRequest) => {
                      const isPending = req.status === "PENDING";
                      return (
                        <Card
                          key={req.id}
                          onClick={() => {
                            if (isAdmin && req.employeeId) {
                              setInspectedEmployeeId(req.employeeId);
                            }
                          }}
                          className={`border shadow-xs transition-all flex flex-col justify-between group ${
                            isAdmin
                              ? "cursor-pointer hover:border-primary/60 hover:shadow-md hover:ring-1 hover:ring-primary/20"
                              : "hover:border-primary/40"
                          }`}
                        >
                          <CardHeader className="p-4 pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 ring-1 ring-border shadow-2xs group-hover:ring-primary/40 transition-all">
                                  <AvatarImage src={req.employee?.profileImage ?? undefined} />
                                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                    {getInitials(`${req.employee?.firstName || ""} ${req.employee?.lastName || ""}`)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                    {req.employee?.firstName} {req.employee?.lastName}
                                  </p>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {(req.employee?.user as any)?.employeeId || "EMP"} • {req.employee?.department || "General"}
                                  </span>
                                </div>
                              </div>

                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${
                                  STATUS_CLASS[req.status as LeaveStatus] || ""
                                }`}
                              >
                                {req.status}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 pt-0 space-y-3">
                            <div className="p-2.5 rounded-lg bg-muted/40 border space-y-1 text-xs">
                              <div className="flex items-center justify-between font-semibold">
                                <span className="text-foreground">{req.leaveType?.name || "Time Off"}</span>
                                <span className="font-mono text-primary">{Number(req.totalDays)} Day{Number(req.totalDays) > 1 ? "s" : ""}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                                <span>{format(new Date(req.startDate), "dd/MM/yyyy")}</span>
                                <span>→</span>
                                <span>{format(new Date(req.endDate), "dd/MM/yyyy")}</span>
                              </div>
                            </div>

                            {req.reason && (
                              <p className="text-xs text-muted-foreground italic line-clamp-2 bg-muted/10 p-2 rounded border-l-2 border-primary/40">
                                &ldquo;{req.reason}&rdquo;
                              </p>
                            )}

                            {isAdmin && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-between pt-2 border-t mt-2"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (req.employeeId) setInspectedEmployeeId(req.employeeId);
                                  }}
                                  className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Calendar
                                </Button>

                                {isPending && (
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleQuickReject(req.id)}
                                      disabled={rejectLeave.isPending}
                                      className="h-7 px-2 text-xs text-red-600 hover:text-white hover:bg-red-600 border-red-200"
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleQuickApprove(req.id)}
                                      disabled={approveLeave.isPending}
                                      className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: ALLOCATION POLICIES ──────────────────────────────────────── */}
      {topTab === "allocation" && isAdmin && (
        <Card className="border shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold">Leave Policy Allocations</CardTitle>
            <CardDescription className="text-xs">
              Configured annual quota rules for Paid Time Off, Sick Leave, and Unpaid Leaves
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-transparent">
                    <TableHead className="font-semibold text-xs">Policy / Leave Type</TableHead>
                    <TableHead className="font-semibold text-xs">Paid / Unpaid</TableHead>
                    <TableHead className="font-semibold text-xs">Annual Quota</TableHead>
                    <TableHead className="font-semibold text-xs">Carry Forward</TableHead>
                    <TableHead className="font-semibold text-xs">Active Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(leaveTypes || []).map((lt) => {
                    const count = rawRequests.filter((r) => r.leaveTypeId === lt.id).length;
                    return (
                      <TableRow key={lt.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-xs py-3">
                          {lt.name}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant={lt.isPaid ? "default" : "secondary"} className="text-[10px]">
                            {lt.isPaid ? "Paid Leave" : "Unpaid Leave"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs py-3">
                          {lt.annualLimit ? `${lt.annualLimit} Days / Year` : "Unlimited"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">
                          Standard
                        </TableCell>
                        <TableCell className="font-mono text-xs py-3 font-semibold">
                          {count}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ─── TIME OFF TYPE REQUEST MODAL (Exact Excalidraw Match) ────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-base font-bold tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Time off Type Request
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onApply)} className="space-y-4 pt-2">
            {/* Employee: auto-selected or dropdown for admin */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Employee</Label>
              {isAdmin ? (
                <Select
                  value={targetEmployeeId || session?.user?.employeeDbId || undefined}
                  onValueChange={(val) => {
                    if (val) setValue("employeeId", val);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Employee">
                      {(() => {
                        const currentEmpId = targetEmployeeId || session?.user?.employeeDbId;
                        const currentEmp = (allEmployees || []).find((e) => e.id === currentEmpId);
                        return currentEmp
                          ? `${currentEmp.firstName} ${currentEmp.lastName} (${(currentEmp.user as any)?.employeeId || currentEmp.id})`
                          : undefined;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(allEmployees || []).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({(emp.user as any)?.employeeId || emp.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={session?.user?.name || session?.user?.employeeId || "Current Employee"}
                  disabled
                  className="h-9 text-xs bg-muted/50 font-medium"
                />
              )}
            </div>

            {/* Time off Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Time off Type</Label>
              <Select
                value={selectedLeaveTypeId || undefined}
                onValueChange={(val) => {
                  if (val) setValue("leaveTypeId", val);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select time off category">
                    {(() => {
                      const lt = (leaveTypes || []).find((t) => t.id === selectedLeaveTypeId);
                      return lt
                        ? `${lt.name} ${lt.annualLimit ? `(${lt.annualLimit} days/yr)` : "(Unpaid)"}`
                        : undefined;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(leaveTypes || []).map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name} {lt.annualLimit ? `(${lt.annualLimit} days/yr)` : "(Unpaid)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leaveTypeId && (
                <p className="text-[11px] text-destructive">{errors.leaveTypeId.message}</p>
              )}
            </div>


            {/* Validity Period: Start Date To End Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Validity Period</Label>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <Input
                    type="date"
                    {...register("startDate")}
                    className="h-9 text-xs font-mono font-medium"
                  />
                  {errors.startDate && (
                    <p className="text-[10px] text-destructive mt-0.5">{errors.startDate.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold">To</span>
                  <Input
                    type="date"
                    {...register("endDate")}
                    className="h-9 text-xs font-mono font-medium flex-1"
                  />
                </div>
              </div>
              {errors.endDate && (
                <p className="text-[10px] text-destructive mt-0.5">{errors.endDate.message}</p>
              )}
            </div>

            {/* Allocation Days Calculation Display (Exact Excalidraw match) */}
            <div className="p-3 rounded-lg border bg-primary/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Allocation</span>
              <span className="text-sm font-bold text-primary font-mono">
                {allocationDays} <span className="text-xs font-normal text-muted-foreground">Days</span>
              </span>
            </div>

            {/* Reason / Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason / Description</Label>
              <Textarea
                {...register("reason")}
                placeholder="Reason for time off..."
                rows={2}
                className="text-xs resize-none"
              />
              {errors.reason && (
                <p className="text-[11px] text-destructive">{errors.reason.message}</p>
              )}
            </div>

            {/* Attachment: (For sick leave certificate) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Attachment</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  (For sick leave certificate / doctor note)
                </span>
              </Label>
              <ImageUpload
                value={attachmentUrl || ""}
                onChange={(url) => setAttachmentUrl(url || null)}
                label="Certificate or Medical Note"
              />
            </div>

            {/* Action Buttons: [ Submit ] [ Discard ] */}
            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsRequestModalOpen(false);
                  reset();
                }}
                className="text-xs"
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={createLeave.isPending}
                className="text-xs font-bold"
              >
                {createLeave.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── ADMIN REVIEW / REJECT COMMENT MODAL ────────────────────────────── */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              Reject Time Off Request
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please provide a brief reason or comment for rejecting this request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Label className="text-xs font-semibold">Admin Comment / Reason</Label>
            <Textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="e.g., Team staffing shortage on these dates..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={submitReview}
              disabled={rejectLeave.isPending}
              className="text-xs font-bold"
            >
              {rejectLeave.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
