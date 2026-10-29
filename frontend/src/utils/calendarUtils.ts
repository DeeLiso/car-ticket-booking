/**
 * Pure, dependency-free date helpers for the calendar feature.
 * Everything is local-time based so "today" always matches the user's clock.
 */

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_MIN = ["S", "M", "T", "W", "T", "F", "S"];
export const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function addDays(date: Date, amount: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

/** Clamp a date to be no earlier than `min` (both compared at day granularity). */
export function clampMin(date: Date, min?: Date | null): Date {
  if (!min) return date;
  return startOfDay(date) < startOfDay(min) ? startOfDay(min) : date;
}

/** First day of the week containing `date`, honouring the configured week start. */
export function startOfWeek(date: Date, weekStart: WeekStart): Date {
  const d = startOfDay(date);
  const diff = (d.getDay() - weekStart + 7) % 7;
  return addDays(d, -diff);
}

/** The seven days of the week containing `anchor`. */
export function getWeekDates(anchor: Date, weekStart: WeekStart): Date[] {
  const start = startOfWeek(anchor, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * A 6-week (or sometimes 5-week) matrix of days covering `month`.
 * Rows are weeks; each row always has 7 entries.
 */
export function getMonthMatrix(year: number, month: number, weekStart: WeekStart): Date[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let cursor = startOfWeek(first, weekStart);
  const weeks: Date[][] = [];
  while (cursor <= last && weeks.length < 6) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

/** Local `YYYY-MM-DD` representation (never shifted by timezone/UTC). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a local `YYYY-MM-DD` date; falls back to today when invalid. */
export function fromISODate(value: string | null | undefined): Date {
  if (!value) return startOfDay(new Date());
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return startOfDay(new Date());
  return new Date(y, m - 1, d);
}

export function isValidDate(date: Date): boolean {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/** Weekday labels ordered from the configured week start. */
export function orderedWeekdayLabels(weekStart: WeekStart, variant: "short" | "min" = "short"): string[] {
  const base = variant === "min" ? WEEKDAY_MIN : WEEKDAY_SHORT;
  return Array.from({ length: 7 }, (_, i) => base[(weekStart + i) % 7]);
}

/** "HH:mm" -> localised clock string. Empty/invalid input yields "". */
export function formatTime(value: string | undefined | null, use24Hour: boolean): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const d = new Date(2000, 0, 1, h, m);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24Hour,
  });
}

/** Show a friendly time range, collapsing to a single value when only one end exists. */
export function formatTimeRange(
  start: string | undefined,
  end: string | undefined,
  use24Hour: boolean,
): string {
  const s = formatTime(start, use24Hour);
  const e = formatTime(end, use24Hour);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

export function monthName(date: Date): string {
  return MONTH_NAMES[date.getMonth()];
}

/** Stable unique id that works even without `crypto.randomUUID`. */
export function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
