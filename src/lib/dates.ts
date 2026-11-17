// Calendar dates are plain "YYYY-MM-DD" strings in the device's local time zone.
// That keeps "today" meaning the user's today and makes dates compare as strings.

export type DateStr = string;

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
export const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromDateStr(s: DateStr): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(now = new Date()): DateStr {
  return toDateStr(now);
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = fromDateStr(s);
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Same day-of-month n months later, clamped to the month's last day (Jan 31 + 1 → Feb 28). */
export function addMonths(s: DateStr, n: number, dayOfMonth?: number): DateStr {
  const d = fromDateStr(s);
  const want = dayOfMonth ?? d.getDate();
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + n, Math.min(want, last)));
}

export function daysBetween(a: DateStr, b: DateStr): number {
  return Math.round((fromDateStr(b).getTime() - fromDateStr(a).getTime()) / 864e5);
}

export function weekday(s: DateStr): number {
  return fromDateStr(s).getDay();
}

/** The first date on or after `from` (or strictly after, if `strict`) that falls on weekday `wd`. */
export function nextWeekday(from: DateStr, wd: number, strict = false): DateStr {
  let diff = (wd - weekday(from) + 7) % 7;
  if (diff === 0 && strict) diff = 7;
  return addDays(from, diff);
}

export function isoWeek(s: DateStr): number {
  const d = fromDateStr(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dn = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dn);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 864e5 + 1) / 7);
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  const [hh, mm] = t.split(":").map(Number);
  const ap = hh >= 12 ? "pm" : "am";
  const h = hh % 12 || 12;
  return mm ? `${h}:${String(mm).padStart(2, "0")} ${ap}` : `${h} ${ap}`;
}

/** "Today", "Tomorrow", "Friday", or "Mon, Dec 8". */
export function formatDay(s: DateStr, today: DateStr): string {
  const diff = daysBetween(today, s);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const d = fromDateStr(s);
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  const sameYear = d.getFullYear() === fromDateStr(today).getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function formatShortDate(s: DateStr): string {
  return fromDateStr(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
