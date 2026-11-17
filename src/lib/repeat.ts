import { addDays, addMonths, daysBetween, fromDateStr, nextWeekday, weekday, WEEKDAYS, type DateStr } from "./dates";

/**
 * How an item repeats.
 *  daily | weekdays | weekly | monthly | "wd:<0-6>" (a specific weekday, 0 = Sunday)
 */
export type Repeat = "daily" | "weekdays" | "weekly" | "monthly" | `wd:${number}`;

export function repeatLabel(r: Repeat | null | undefined): string {
  if (!r) return "";
  switch (r) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Every weekday";
    case "weekly":
      return "Every week";
    case "monthly":
      return "Every month";
    default: {
      const name = WEEKDAYS[Number(r.slice(3))] ?? "";
      return "Every " + name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
}

const isWorkday = (s: DateStr) => weekday(s) % 6 !== 0;

/** The next occurrence strictly after `after`, anchored on the item's original date. */
export function nextOccurrence(r: Repeat, anchor: DateStr, after: DateStr): DateStr {
  switch (r) {
    case "daily":
      return addDays(after, 1);
    case "weekdays": {
      let d = addDays(after, 1);
      while (!isWorkday(d)) d = addDays(d, 1);
      return d;
    }
    case "weekly":
      return nextWeekday(after, weekday(anchor), true);
    case "monthly": {
      const dom = fromDateStr(anchor).getDate();
      let d = anchor;
      for (let i = 1; d <= after; i++) d = addMonths(anchor, i, dom);
      return d;
    }
    default:
      return nextWeekday(after, Number(r.slice(3)), true);
  }
}

/**
 * For a repeating item whose date has passed, the most recent occurrence on or before today.
 * Missed repeats collapse into one: "water plants every Sunday" missed three weeks running
 * shows up once, dated last Sunday.
 */
export function latestOccurrence(r: Repeat, due: DateStr, today: DateStr): DateStr {
  if (due >= today) return due;
  // Walk forward from the original date; cheap because gaps are bounded by how long you're away.
  let cur = due;
  let guard = 0;
  // Jump close first for daily-ish repeats.
  if (r === "daily") return today;
  if (r === "weekly" || r.startsWith("wd:")) {
    const weeks = Math.floor(daysBetween(due, today) / 7);
    cur = addDays(due, Math.max(0, weeks - 1) * 7);
  }
  for (;;) {
    const next = nextOccurrence(r, due, cur);
    if (next > today || guard++ > 1000) return cur;
    cur = next;
  }
}
