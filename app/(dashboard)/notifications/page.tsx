"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CalendarDays,
  Clock,
  DollarSign,
  Info,
  ShieldAlert,
  Sparkles,
  Trash2,
  Filter,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { formatRelative, formatDate } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "LEAVE" | "ATTENDANCE" | "PAYROLL" | "SYSTEM";
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, UNREAD, READ

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      return json?.data || { notifications: [], unreadCount: 0 };
    },
  });

  const notifications: NotificationItem[] = data?.notifications || [];
  const unreadCount: number = data?.unreadCount || 0;

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id?: string) => {
      const url = id ? `/api/notifications?id=${id}` : "/api/notifications";
      await fetch(url, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  // Filtered
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const query = search.toLowerCase();
      const matchSearch = !search || n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query);
      const matchType = typeFilter === "ALL" || n.type === typeFilter;
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "UNREAD" && !n.isRead) ||
        (statusFilter === "READ" && n.isRead);
      return matchSearch && matchType && matchStatus;
    });
  }, [notifications, search, typeFilter, statusFilter]);

  const leaveCount = notifications.filter((n) => n.type === "LEAVE").length;
  const attendanceCount = notifications.filter((n) => n.type === "ATTENDANCE").length;
  const payrollCount = notifications.filter((n) => n.type === "PAYROLL").length;

  const getIcon = (type: string) => {
    switch (type) {
      case "LEAVE":
        return <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case "ATTENDANCE":
        return <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case "PAYROLL":
        return <DollarSign className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case "WARNING":
        return <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const handleAction = (n: NotificationItem) => {
    if (!n.isRead) markAsReadMutation.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
            {unreadCount > 0 && (
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-semibold">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            System alerts, leave requests, attendance verifications, and payroll announcements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-9 gap-1.5 text-xs shadow-2xs"
            >
              <CheckCheck className="h-4 w-4 text-primary" />
              Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteNotificationMutation.mutate(undefined)}
              disabled={deleteNotificationMutation.isPending}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Notifications"
          value={notifications.length}
          icon={Bell}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          label="Unread Alerts"
          value={unreadCount}
          icon={Inbox}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <StatCard
          label="Leave & Approvals"
          value={leaveCount}
          icon={CalendarDays}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-500/10"
        />
        <StatCard
          label="Attendance & Shifts"
          value={attendanceCount}
          icon={Clock}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="pl-9 h-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "ALL")}>
          <SelectTrigger className="w-40 h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="LEAVE">Leaves & Time-Off</SelectItem>
            <SelectItem value="ATTENDANCE">Attendance</SelectItem>
            <SelectItem value="PAYROLL">Payroll</SelectItem>
            <SelectItem value="SYSTEM">System & Info</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "ALL")}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="UNREAD">Unread Only</SelectItem>
            <SelectItem value="READ">Read Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notifications Stream Card */}
      <Card className="border shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-5 flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-16 px-4 text-center text-muted-foreground">
                <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30 text-primary" />
                <h3 className="text-base font-semibold text-foreground">No notifications found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  {search ? "No notifications match your search filters." : "You're all caught up with your workforce notifications."}
                </p>
              </div>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-muted/30 ${
                    !n.isRead ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-background border shadow-2xs shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!n.isRead ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0 h-4">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 font-mono">
                        {formatRelative(n.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {n.link && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(n)}
                        className="h-8 text-xs gap-1.5 shadow-2xs"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    {!n.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsReadMutation.mutate(n.id)}
                        disabled={markAsReadMutation.isPending}
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteNotificationMutation.mutate(n.id)}
                      disabled={deleteNotificationMutation.isPending}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
