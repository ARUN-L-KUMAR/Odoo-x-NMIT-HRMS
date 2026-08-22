"use client";

import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  placeholder?: string;
  /** Width of the trigger button. Defaults to "w-[260px]" */
  triggerClassName?: string;
}

/**
 * DatePickerWithRange — ported from Faceviz, adapted for Dayflow + react-day-picker v10.
 *
 * Usage:
 *   const [dateRange, setDateRange] = useState<DateRange | undefined>();
 *   <DatePickerWithRange date={dateRange} setDate={setDateRange} />
 */
export function DatePickerWithRange({
  className,
  date,
  setDate,
  placeholder = "Pick a date range",
  triggerClassName,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date-range"
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground",
              triggerClassName ?? "w-[260px]"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} –{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
          {date && (
            <div className="flex justify-end p-3 border-t border-border">
              <button
                onClick={() => setDate(undefined)}
                className="px-3 py-1 text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
