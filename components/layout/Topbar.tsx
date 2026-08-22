"use client";

import { useSession, signOut } from "next-auth/react";
import { Menu, LogIn, LogOut, Clock, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTodayAttendance, useCheckIn, useCheckOut } from "@/hooks";
import { getInitials, formatTime } from "@/lib/utils";
import Link from "next/link";

interface TopbarProps {
  onMenuClick?: () => void;
  pageTitle?: string;
}

export function Topbar({ onMenuClick, pageTitle }: TopbarProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.employeeId || "User";
  const userImage = session?.user?.image;

  // Real-time attendance status for current logged-in user
  const { data: today, isLoading: attLoading } = useTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const isCheckedIn = !!today?.checkIn && !today?.checkOut;
  const isCompleted = !!today?.checkIn && !!today?.checkOut;

  // Status dot color matching Excalidraw: 🟢 Green = checked in, 🔴 Red = not checked in, 🔵 Blue = completed
  const dotColor = isCheckedIn
    ? "bg-emerald-500 ring-2 ring-emerald-400/30 animate-pulse"
    : isCompleted
    ? "bg-blue-500"
    : "bg-red-500";

  const statusLabel = isCheckedIn
    ? `Checked in at ${formatTime(today.checkIn!)}`
    : isCompleted
    ? `Checked out (${formatTime(today.checkOut!)})`
    : "Not Checked In";

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4 gap-4 sticky top-0 z-40">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-8 w-8"
        onClick={onMenuClick}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Page title (mobile) */}
      {pageTitle && (
        <h1 className="font-semibold text-sm lg:hidden">{pageTitle}</h1>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Organization Badge (Desktop) */}
      {session?.user?.companyName && (
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border text-xs text-muted-foreground font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="truncate max-w-[150px]">{session.user.companyName}</span>
        </div>
      )}

      {/* Right actions: Systray Attendance & Avatar */}
      <div className="flex items-center gap-3">
        {/* Quick Check-in / Check-out button in header */}
        {!isCheckedIn && !isCompleted && (
          <Button
            size="sm"
            onClick={() => checkIn.mutate()}
            disabled={checkIn.isPending}
            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm hidden sm:inline-flex"
          >
            {checkIn.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogIn className="h-3.5 w-3.5" />
            )}
            Check IN &rarr;
          </Button>
        )}

        {isCheckedIn && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-full border">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              Since {formatTime(today.checkIn!)}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => checkOut.mutate()}
              disabled={checkOut.isPending}
              className="h-8 text-xs font-medium border-amber-500/30 text-amber-600 hover:bg-amber-500/10 gap-1.5"
            >
              {checkOut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              Check Out &rarr;
            </Button>
          </div>
        )}

        {/* User Menu with Status Dot */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative h-9 gap-2 px-2 rounded-lg flex items-center cursor-pointer hover:bg-accent transition-colors outline-hidden select-none"
          >
            {/* Avatar with live status dot */}
            <div className="relative">
              <Avatar className="h-7 w-7 ring-2 ring-background">
                <AvatarImage src={userImage ?? undefined} />
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>

              {/* Status indicator dot */}
              <span
                title={statusLabel}
                className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${dotColor}`}
              />
            </div>

            <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
              {userName}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 p-1.5">
            <DropdownMenuLabel className="p-2">
              <p className="font-semibold text-sm leading-none">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize mt-1">
                {session?.user?.role?.toLowerCase() || "employee"} &middot;{" "}
                <span className={isCheckedIn ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  {statusLabel}
                </span>
              </p>
            </DropdownMenuLabel>

            {/* Quick check in / out in dropdown (especially useful for mobile) */}
            <div className="p-1.5 sm:hidden">
              {!isCheckedIn && !isCompleted && (
                <Button
                  size="sm"
                  onClick={() => checkIn.mutate()}
                  disabled={checkIn.isPending}
                  className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <LogIn className="h-3.5 w-3.5" /> Check IN &rarr;
                </Button>
              )}
              {isCheckedIn && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => checkOut.mutate()}
                  disabled={checkOut.isPending}
                  className="w-full text-xs font-medium text-amber-600 border-amber-500/30 gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" /> Check Out &rarr;
                </Button>
              )}
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem render={<Link href="/profile" className="flex items-center gap-2 w-full cursor-pointer py-1.5" />}>
              <User className="h-4 w-4 text-muted-foreground" />
              <span>My Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem render={<Link href="/attendance" className="flex items-center gap-2 w-full cursor-pointer py-1.5" />}>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Attendance History</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer gap-2 py-1.5"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
