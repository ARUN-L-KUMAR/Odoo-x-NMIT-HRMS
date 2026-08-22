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
  setMonth,
  getYear,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Palmtree, Clock, CheckCircle2, XCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TimeOffRequestItem {
  id: string;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
  reason?: string;
  leaveType?: { name: string; isPaid?: boolean } | null;
}

export interface PublicHoliday {
  date: string; // "yyyy-MM-dd"
  name: string;
}

export const PUBLIC_HOLIDAYS_2026: PublicHoliday[] = [
  { date: "2026-01-14", name: "Kite Festival / Makar Sankranti" },
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-04", name: "Dhuleti / Holi" },
  { date: "2026-05-01", name: "Labor Day / May Day" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-08-28", name: "Raksha Bandhan (Rakhi)" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-11-08", name: "Diwali" },
  { date: "2026-11-10", name: "New Year / Govardhan Puja" },
  { date: "2026-11-11", name: "Bhai Duj" },
  { date: "2026-12-25", name: "Christmas Day" },
];

interface TimeOffCalendarProps {
  requests: TimeOffRequestItem[];
  onSelectDate?: (date: Date) => void;
  year?: number;
}

export function TimeOffCalendar({
  requests,
  onSelectDate,
  year = new Date().getFullYear(),
}: TimeOffCalendarProps) {
  const [selectedYear, setSelectedYear] = useState(year);

  // Map requests by Date string (yyyy-MM-dd)
  const getRequestForDay = (day: Date): TimeOffRequestItem | null => {
    const dayStr = format(day, "yyyy-MM-dd");
    for (const req of requests) {
      const startStr = format(new Date(req.startDate), "yyyy-MM-dd");
      const endStr = format(new Date(req.endDate), "yyyy-MM-dd");
      if (dayStr >= startStr && dayStr <= endStr) {
        return req;
      }
    }
    return null;
  };

  const getHolidayForDay = (day: Date): PublicHoliday | null => {
    const dayStr = format(day, "yyyy-MM-dd");
    return PUBLIC_HOLIDAYS_2026.find((h) => h.date === dayStr) || null;
  };

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
      {/* ─── 12-Month Grid (Left 9 columns) ─────────────────────────────────── */}
      <div className="xl:col-span-9 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold tracking-tight">
              {selectedYear} Time Off Calendar
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> {selectedYear - 1}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setSelectedYear(new Date().getFullYear())}
              className="h-8 px-3 text-xs"
            >
              Current Year
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="h-8 px-2.5 text-xs"
            >
              {selectedYear + 1} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* 12-Month Responsive Grid (4x3 layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, monthIndex) => {
            const monthDate = new Date(selectedYear, monthIndex, 1);
            const monthStart = startOfMonth(monthDate);
            const monthEnd = endOfMonth(monthDate);
            const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
            const startDayIndex = getDay(monthStart); // 0 (Sun) to 6 (Sat)
            const blanks = Array.from({ length: startDayIndex });

            return (
              <Card key={monthIndex} className="border shadow-2xs hover:border-primary/40 transition-colors">
                <CardHeader className="p-3 pb-2 border-b bg-muted/20">
                  <CardTitle className="text-xs font-bold text-center tracking-wide text-foreground">
                    {format(monthDate, "MMMM yyyy")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {weekdays.map((w, idx) => (
                      <span
                        key={idx}
                        className={cn(
                          "text-[10px] font-semibold",
                          idx === 0 || idx === 6 ? "text-muted-foreground/60" : "text-muted-foreground"
                        )}
                      >
                        {w}
                      </span>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {blanks.map((_, i) => (
                      <div key={`blank-${i}`} className="h-6 w-6" />
                    ))}

                    {daysInMonth.map((day) => {
                      const req = getRequestForDay(day);
                      const holiday = getHolidayForDay(day);
                      const isSun = getDay(day) === 0;
                      const isSat = getDay(day) === 6;
                      const isTodayDate = isSameDay(day, new Date());

                      let statusClass = "text-foreground hover:bg-muted/60";
                      let dotColor = null;

                      if (req) {
                        if (req.status === "APPROVED") {
                          statusClass = "bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-2xs";
                          dotColor = "bg-purple-300";
                        } else if (req.status === "PENDING") {
                          statusClass = "bg-amber-400 text-amber-950 font-bold hover:bg-amber-500 shadow-2xs";
                          dotColor = "bg-amber-800";
                        } else if (req.status === "REJECTED") {
                          statusClass = "bg-red-500 text-white line-through opacity-70";
                          dotColor = "bg-red-200";
                        }
                      } else if (holiday) {
                        statusClass = "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/40";
                      } else if (isTodayDate) {
                        statusClass = "ring-2 ring-primary ring-offset-1 font-extrabold text-primary";
                      } else if (isSun || isSat) {
                        statusClass = "text-muted-foreground/50";
                      }

                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => onSelectDate && onSelectDate(day)}
                          title={
                            req
                              ? `${req.leaveType?.name || "Leave"} (${req.status})`
                              : holiday
                              ? `Holiday: ${holiday.name}`
                              : format(day, "d MMM yyyy")
                          }
                          className={cn(
                            "h-6 w-6 mx-auto rounded flex items-center justify-center text-[11px] font-medium transition-transform active:scale-95",
                            statusClass
                          )}
                        >
                          {format(day, "d")}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── Legend & Public Holidays List (Right 3 columns) ────────────────── */}
      <div className="xl:col-span-3 space-y-4">
        {/* Color Legend (from Excalidraw) */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" /> Legend
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 rounded bg-purple-600 shadow-xs flex-shrink-0" />
              <span className="font-medium text-foreground">Validated / Approved</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 rounded bg-amber-400 shadow-xs flex-shrink-0" />
              <span className="font-medium text-foreground">To Approve (Pending)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 rounded bg-red-500 shadow-xs flex-shrink-0" />
              <span className="font-medium text-foreground">Refused / Rejected</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-3.5 w-3.5 rounded bg-emerald-500/20 border border-emerald-500/40 shadow-xs flex-shrink-0" />
              <span className="font-medium text-foreground">Public Holidays</span>
            </div>
          </CardContent>
        </Card>

        {/* Public Holidays List (from Excalidraw) */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Palmtree className="h-3.5 w-3.5 text-emerald-600" /> Public Holidays ({selectedYear})
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">
                {PUBLIC_HOLIDAYS_2026.length} Days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[380px] overflow-y-auto">
              {PUBLIC_HOLIDAYS_2026.map((h, i) => (
                <div key={i} className="px-4 py-2 text-xs flex items-center justify-between hover:bg-muted/20">
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {format(new Date(h.date), "MMM dd")}
                  </span>
                  <span className="font-medium text-foreground text-right pl-2 truncate">
                    {h.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
