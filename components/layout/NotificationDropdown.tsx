"use client";

import { useState } from "react";
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
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "LEAVE" | "ATTENDANCE" | "PAYROLL" | "SYSTEM";
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<"ALL" | "UNREAD" | "LEAVE" | "ATTENDANCE">("ALL");

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      return json?.data || { notifications: [], unreadCount: 0 };
    },
    refetchInterval: 30000, // Poll every 30s
  });

  // Mark single as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications: NotificationItem[] = data?.notifications || [];
  const unreadCount: number = data?.unreadCount || 0;

  const filtered = notifications.filter((n) => {
    if (filterTab === "UNREAD") return !n.isRead;
    if (filterTab === "LEAVE") return n.type === "LEAVE";
    if (filterTab === "ATTENDANCE") return n.type === "ATTENDANCE";
    return true;
  });

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) {
      markAsReadMutation.mutate(n.id);
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "LEAVE":
        return <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "ATTENDANCE":
        return <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "PAYROLL":
        return <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "WARNING":
        return <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors outline-hidden select-none cursor-pointer"
        title="Notifications & Alerts"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
            <span className="absolute -inset-0.5 rounded-full bg-destructive/40 animate-ping" />
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 overflow-hidden shadow-2xl rounded-2xl border">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-primary/5 via-background to-accent/5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] font-semibold h-5 px-1.5 bg-primary/10 text-primary">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Real-time alerts and workforce updates</p>
          </div>

          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-primary"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="text-[11px]">Mark all read</span>
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="p-2 border-b bg-muted/20">
          <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as any)} className="w-full">
            <TabsList className="grid grid-cols-4 h-7 p-0.5 w-full bg-muted/60">
              <TabsTrigger value="ALL" className="text-[11px] font-medium py-1">
                All
              </TabsTrigger>
              <TabsTrigger value="UNREAD" className="text-[11px] font-medium py-1">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="LEAVE" className="text-[11px] font-medium py-1">
                Leaves
              </TabsTrigger>
              <TabsTrigger value="ATTENDANCE" className="text-[11px] font-medium py-1">
                Attendance
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Notification List */}
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
          ) : filtered.length === 0 ? (
            <div className="py-12 px-4 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30 text-primary" />
              <p className="text-xs font-medium">All caught up!</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                {filterTab === "UNREAD" ? "No unread notifications" : "No new alerts at this time"}
              </p>
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-muted/40 ${
                  !n.isRead ? "bg-primary/5" : ""
                }`}
              >
                <div className="p-2 rounded-xl bg-background border shadow-2xs shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs ${!n.isRead ? "font-bold text-foreground" : "font-semibold text-foreground/80"} truncate`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                    {formatRelative(n.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Link */}
        <div className="p-2.5 border-t bg-muted/20 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/notifications")}
            className="w-full h-7 text-xs font-semibold text-primary hover:text-primary gap-1"
          >
            <span>View All Notifications</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
