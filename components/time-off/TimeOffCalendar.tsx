"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeOffRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  leaveType?: { name: string } | null;
}

interface TimeOffCalendarProps {
  requests: TimeOffRequest[];
}

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-400",
  APPROVED: "bg-emerald-500",
  REJECTED: "bg-destructive",
};

const STATUS_BG: Record<string, string> = {
  PENDING: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-red-50 dark:bg-red-950/40 text-red-400 dark:text-red-400 line-through opacity-60",
};

export function TimeOffCalendar({ requests }: TimeOffCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Blank cells to align the first day to correct weekday (Mon=0)
  const startDay = (getDay(monthStart) + 6) % 7; // Mon-based: Mon=0 … Sun=6
  const blanks = Array(startDay).fill(null);

  // Map each date to its request info
  const getRequestForDay = (day: Date) => {
    for (const req of requests) {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      // normalize to date-only comparison
      const dayTime = day.setHours(0, 0, 0, 0);
      const startTime = new Date(req.startDate).setHours(0, 0, 0, 0);
      const endTime = new Date(req.endDate).setHours(0, 0, 0, 0);
      if (dayTime >= startTime && dayTime <= endTime) {
        return req;
      }
    }
    return null;
  };

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekdays.map((wd) => (
            <div
              key={wd}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-9" />
          ))}
          {days.map((day) => {
            const req = getRequestForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "h-9 flex flex-col items-center justify-center rounded-md text-xs relative transition-colors",
                  isToday && !req && "ring-1 ring-primary ring-offset-1",
                  req ? STATUS_BG[req.status] : "hover:bg-muted/50",
                  !isSameMonth(day, currentMonth) && "opacity-30"
                )}
                title={req ? `${req.leaveType?.name ?? "Time Off"} — ${req.status}` : undefined}
              >
                <span
                  className={cn(
                    "font-medium leading-none",
                    isToday && !req && "text-primary font-bold"
                  )}
                >
                  {format(day, "d")}
                </span>
                {req && (
                  <span
                    className={cn(
                      "w-1 h-1 rounded-full mt-0.5",
                      STATUS_DOT[req.status]
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t">
          {[
            { status: "PENDING", label: "Pending" },
            { status: "APPROVED", label: "Approved" },
            { status: "REJECTED", label: "Rejected" },
          ].map(({ status, label }) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", STATUS_DOT[status])} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
