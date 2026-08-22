"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  useLeaveBalances,
  useMyLeaveRequests,
  useLeaveRequests,
  useLeaveTypes,
  useCreateLeave,
  useApproveLeave,
  useRejectLeave,
} from "@/hooks";
import { createLeaveSchema, type CreateLeaveInput } from "@/lib/validations";
import { formatDate, formatRelative, getInitials } from "@/lib/utils";
import { LEAVE_STATUS_CONFIG } from "@/lib/constants";
import type { LeaveStatus } from "@/types";
import { TimeOffCalendar } from "@/components/time-off/TimeOffCalendar";

const STATUS_CLASS: Record<LeaveStatus, string> = {
  PENDING: "status-warning",
  APPROVED: "status-success",
  REJECTED: "status-destructive",
};

type AdminTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export default function TimeOffPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Employee state
  const [applyOpen, setApplyOpen] = useState(false);

  // Admin state
  const [adminTab, setAdminTab] = useState<AdminTab>("ALL");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");

  const { data: balances, isLoading: balancesLoading } = useLeaveBalances();
  const { data: myRequests, isLoading: myLoading } = useMyLeaveRequests();
  const { data: allRequests, isLoading: allLoading } = useLeaveRequests();
  const { data: leaveTypes } = useLeaveTypes();
  const createLeave = useCreateLeave();
  const approveLeave = useApproveLeave();
  const rejectLeave = useRejectLeave();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateLeaveInput>({
    resolver: zodResolver(createLeaveSchema),
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  // Calculate duration dynamically
  const calculateDuration = () => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
  };

  const duration = calculateDuration();

  const onApply = async (data: CreateLeaveInput) => {
    createLeave.mutate(data, {
      onSuccess: () => {
        setApplyOpen(false);
        reset();
      },
    });
  };

  const onReview = () => {
    if (!reviewId) return;
    if (reviewType === "approve") {
      approveLeave.mutate(
        { id: reviewId, comment },
        { onSuccess: () => { setReviewId(null); setComment(""); } }
      );
    } else {
      rejectLeave.mutate(
        { id: reviewId, comment },
        { onSuccess: () => { setReviewId(null); setComment(""); } }
      );
    }
  };

  // Filter for admin tab
  const filteredRequests = allRequests?.filter((req) => {
    if (adminTab === "ALL") return true;
    return req.status === adminTab;
  });

  const pendingCount = allRequests?.filter((r) => r.status === "PENDING").length ?? 0;

  // ─── EMPLOYEE VIEW ────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Time Off</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your leave and time-off requests
            </p>
          </div>

          <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
            <DialogTrigger
              render={
                <button className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors" />
              }
            >
              <Plus className="h-4 w-4" />
              Request Time Off
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Request Time Off</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onApply)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Time Off Type</Label>
                  <Select onValueChange={(v) => setValue("leaveTypeId", v as string)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes?.map((lt) => (
                        <SelectItem key={lt.id} value={lt.id}>
                          {lt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.leaveTypeId && (
                    <p className="text-xs text-destructive">{errors.leaveTypeId.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Valid From</Label>
                    <Input type="date" {...register("startDate")} />
                    {errors.startDate && (
                      <p className="text-xs text-destructive">{errors.startDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Valid To</Label>
                    <Input type="date" {...register("endDate")} />
                    {errors.endDate && (
                      <p className="text-xs text-destructive">{errors.endDate.message}</p>
                    )}
                  </div>
                </div>

                {duration !== null && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Duration: <strong>{duration} {duration === 1 ? "day" : "days"}</strong>
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    {...register("reason")}
                    placeholder="Please provide a reason for your time off..."
                    rows={3}
                  />
                  {errors.reason && (
                    <p className="text-xs text-destructive">{errors.reason.message}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setApplyOpen(false); reset(); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={createLeave.isPending}>
                    {createLeave.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
                    ) : "Submit Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Leave Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {balancesLoading
            ? [1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))
            : balances?.map((b) => (
                <Card key={b.leaveTypeId}>
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {b.leaveTypeName}
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {b.remaining !== null ? b.remaining : "∞"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.remaining !== null
                        ? `${b.used} used of ${b.annualLimit} days`
                        : "Unlimited"}
                    </p>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Calendar */}
        <TimeOffCalendar requests={myRequests ?? []} />

        {/* My Time Off History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">My Time Off</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {myLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !myRequests || myRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No time-off requests yet.</p>
                <p className="text-xs mt-1">Request time off using the button above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-sm font-medium">
                          {req.leaveType?.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(req.startDate)}
                          {req.startDate !== req.endDate && ` – ${formatDate(req.endDate)}`}
                        </TableCell>
                        <TableCell className="text-sm">
                          {Number(req.totalDays)} {Number(req.totalDays) === 1 ? "day" : "days"}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[req.status as LeaveStatus]}`}>
                            {LEAVE_STATUS_CONFIG[req.status as LeaveStatus]?.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatRelative(req.createdAt)}
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

  // ─── ADMIN VIEW ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Time Off Requests</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Review and manage team time-off requests
        </p>
      </div>

      {/* Status tabs */}
      <Tabs value={adminTab} onValueChange={(v) => setAdminTab(v as AdminTab)}>
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="PENDING" className="relative">
            Pending
            {pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Requests table */}
      <Card>
        <CardContent className="p-0">
          {allLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !filteredRequests || filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {adminTab === "PENDING"
                  ? "No pending time-off requests."
                  : adminTab === "ALL"
                  ? "No time-off requests found."
                  : `No ${adminTab.toLowerCase()} requests.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getInitials(`${req.employee?.firstName} ${req.employee?.lastName}`)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {req.employee?.firstName} {req.employee?.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{req.leaveType?.name}</TableCell>
                      <TableCell className="text-sm">{formatDate(req.startDate)}</TableCell>
                      <TableCell className="text-sm">{formatDate(req.endDate)}</TableCell>
                      <TableCell className="text-sm">
                        {Number(req.totalDays)} {Number(req.totalDays) === 1 ? "day" : "days"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[req.status as LeaveStatus]}`}>
                          {LEAVE_STATUS_CONFIG[req.status as LeaveStatus]?.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelative(req.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "PENDING" && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                              title="Approve"
                              onClick={() => { setReviewId(req.id); setReviewType("approve"); }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              title="Reject"
                              onClick={() => { setReviewId(req.id); setReviewType("reject"); }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {req.adminComment && (
                          <p
                            className="text-xs text-muted-foreground max-w-32 truncate ml-auto"
                            title={req.adminComment}
                          >
                            {req.adminComment}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve / Reject dialog */}
      <Dialog
        open={!!reviewId}
        onOpenChange={(o) => { if (!o) { setReviewId(null); setComment(""); } }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reviewType === "approve" ? "Approve Time Off" : "Reject Time Off"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>
                Comment {reviewType === "reject" ? "(recommended)" : "(optional)"}
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  reviewType === "approve"
                    ? "Approved. Enjoy your time off."
                    : "Leave cannot be approved due to project requirements."
                }
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setReviewId(null); setComment(""); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                variant={reviewType === "approve" ? "default" : "destructive"}
                onClick={onReview}
                disabled={approveLeave.isPending || rejectLeave.isPending}
              >
                {approveLeave.isPending || rejectLeave.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : reviewType === "approve" ? "Approve" : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
