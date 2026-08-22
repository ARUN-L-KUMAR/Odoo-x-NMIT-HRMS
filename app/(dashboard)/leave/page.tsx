"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Plus, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const STATUS_CLASS: Record<LeaveStatus, string> = {
  PENDING: "status-warning",
  APPROVED: "status-success",
  REJECTED: "status-destructive",
};

export default function LeavePage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [applyOpen, setApplyOpen] = useState(false);
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
    reset,
    formState: { errors },
  } = useForm<CreateLeaveInput>({
    resolver: zodResolver(createLeaveSchema),
  });

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

  const requests = isAdmin ? allRequests : myRequests;
  const isLoading = isAdmin ? allLoading : myLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isAdmin ? "Leave Requests" : "My Leave"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isAdmin ? "Review and manage team leave requests" : "Apply for leave and track your requests"}
          </p>
        </div>

        {!isAdmin && (
          <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
            <DialogTrigger
              render={
                <button className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition-colors" />
              }
            >
              <Plus className="h-4 w-4" />
              Apply Leave
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onApply)} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
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
                    <Label>Start Date</Label>
                    <Input type="date" {...register("startDate")} />
                    {errors.startDate && (
                      <p className="text-xs text-destructive">{errors.startDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" {...register("endDate")} />
                    {errors.endDate && (
                      <p className="text-xs text-destructive">{errors.endDate.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    {...register("reason")}
                    placeholder="Please provide a reason for your leave..."
                    rows={3}
                  />
                  {errors.reason && (
                    <p className="text-xs text-destructive">{errors.reason.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createLeave.isPending}>
                  {createLeave.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                  ) : "Submit Request"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Leave Balance Cards (Employee) */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {balancesLoading
            ? [1, 2, 3].map((i) => (
                <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))
            : balances?.map((b) => (
                <Card key={b.leaveTypeId}>
                  <CardContent className="p-5">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{b.leaveTypeName}</p>
                    <p className="text-2xl font-bold text-primary">
                      {b.remaining !== null ? b.remaining : "∞"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.remaining !== null
                        ? `${b.used} used / ${b.annualLimit} days`
                        : "Unlimited"}
                    </p>
                  </CardContent>
                </Card>
              ))}
        </div>
      )}

      {/* Leave Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {isAdmin ? "All Leave Requests" : "My Requests"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !requests || requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {isAdmin && <TableHead>Employee</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={req.employee?.profileImage ?? undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {getInitials(`${req.employee?.firstName} ${req.employee?.lastName}`)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {req.employee?.firstName} {req.employee?.lastName}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-sm">{req.leaveType?.name}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(req.startDate)}
                        {req.startDate !== req.endDate && ` – ${formatDate(req.endDate)}`}
                      </TableCell>
                      <TableCell className="text-sm">{Number(req.totalDays)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[req.status as LeaveStatus]}`}>
                          {LEAVE_STATUS_CONFIG[req.status as LeaveStatus]?.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelative(req.createdAt)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          {req.status === "PENDING" && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600 hover:bg-green-100"
                                onClick={() => { setReviewId(req.id); setReviewType("approve"); }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:bg-red-100"
                                onClick={() => { setReviewId(req.id); setReviewType("reject"); }}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                          {req.adminComment && (
                            <p className="text-xs text-muted-foreground max-w-32 truncate ml-auto" title={req.adminComment}>
                              {req.adminComment}
                            </p>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewId} onOpenChange={(o) => { if (!o) { setReviewId(null); setComment(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reviewType === "approve" ? "Approve Leave" : "Reject Leave"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Comment (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  reviewType === "approve"
                    ? "Approved. Enjoy your leave."
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
