import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date Formatters ──────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "h:mm a");
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatWorkedTime(minutes: number): string {
  if (minutes === 0) return "0h 0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatCurrencyCompact(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num}`;
}

// ─── Strings ──────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export function calculateWorkedMinutes(
  checkIn: Date | string,
  checkOut: Date | string
): number {
  return differenceInMinutes(new Date(checkOut), new Date(checkIn));
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

export function successResponse<T>(data: T, message = "Success") {
  return { success: true, data, message };
}

export function errorResponse(
  code: string,
  message: string,
  fields?: Record<string, string[]>,
  status = 400
) {
  return Response.json(
    { success: false, error: { code, message, fields } },
    { status }
  );
}

// ─── Error Handling (ported from Faceviz) ────────────────────────────────────

/**
 * Extracts a human-readable error message from any API error shape.
 * Handles: DRF/Django-style errors objects, axios response errors,
 * plain Error instances, and string errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractErrorMessage(error: any): string {
  if (typeof error === "string") return error;

  const data = error?.response?.data ?? error?.data;
  if (data) {
    if (typeof data === "string") return data;

    // 1. Check for 'errors' object (common in DRF/Django)
    if (data.errors && typeof data.errors === "object") {
      const errorValues = Object.values(data.errors);
      if (errorValues.length > 0) {
        const firstError = errorValues[0];
        if (Array.isArray(firstError)) return firstError[0] as string;
        if (typeof firstError === "string") return firstError;
      }
    }

    // 2. Check for explicit error message fields
    // Prefer 'error' over 'message' as backends often return both
    const directMessage = data.error || data.message || data.msg;
    if (directMessage && typeof directMessage === "string") return directMessage;

    // 2b. Nested message (e.g. upstream APIs passed through as-is)
    if (
      directMessage &&
      typeof directMessage === "object" &&
      typeof directMessage.message === "string"
    ) {
      return directMessage.message;
    }

    // 3. Fallback: scan all fields, skip known non-error keys
    const ignoreKeys = ["success", "status"];
    for (const key of Object.keys(data)) {
      if (ignoreKeys.includes(key)) continue;
      const value = data[key];
      if (Array.isArray(value) && value.length > 0) return value[0] as string;
      if (typeof value === "string") return value;
    }
  }

  if (error?.message) return error.message;

  return "An unexpected error occurred. Please try again.";
}

// ─── Date Utilities (ported from Faceviz) ────────────────────────────────────

/**
 * Converts a display-format date (DD-MM-YYYY) to API format (YYYY-MM-DD).
 * Returns the input unchanged if it's already in YYYY-MM-DD format.
 */
export function formatDateToApi(dateString: string): string {
  if (!dateString) return "";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day.length === 2 && month.length === 2 && year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }
    return dateString;
  } catch {
    return dateString;
  }
}

/**
 * Validates that a date string is in DD-MM-YYYY format and is a real date.
 */
export function isValidDate(dateString: string): boolean {
  const regex = /^\d{2}-\d{2}-\d{4}$/;
  if (!regex.test(dateString)) return false;
  const [day, month, year] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Returns the ISO start (Sunday) and end (Saturday) dates for the week
 * containing the given date. Used for weekly attendance summaries.
 */
export function getWeekRange(date: Date): { startDate: string; endDate: string } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { startDate: fmt(start), endDate: fmt(end) };
}
