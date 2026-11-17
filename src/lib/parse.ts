import { addDays, MONTHS, nextWeekday, toDateStr, fromDateStr, weekday, type DateStr } from "./dates";
import type { Repeat } from "./repeat";

export interface Parsed {
  /** The text with the date/time/repeat words taken out. */
  text: string;
  due: DateStr | null;
  time: string | null; // "HH:MM", 24h
  repeat: Repeat | null;
  /** The user typed "someday" / "no date": clear any existing date when editing. */
  clearDate: boolean;
}

// Full day names are always dates. Short ones ("sat", "sun", "wed") are ordinary words too,
// so they only count after "on", "next" or "every".
const WD_FULL = "(monday|tuesday|tues|wednesday|thursday|thurs|friday|saturday|sunday)";
const WD_ANY = "(mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?";
const MON_RE = "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";

function weekdayIndex(word: string): number {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(word.slice(0, 3).toLowerCase());
}

/**
 * Pull dates, times and repeats out of free text, Todoist-style:
 *   "call dentist tomorrow 9am"      → Tomorrow, 9:00
 *   "water plants every sunday"      → next Sunday, repeats weekly on Sunday
 *   "pay rent nov 30" / "30 nov"     → Nov 30 (next year if already past)
 *   "dinner with sam friday at 7"    → Friday, 19:00
 *   "stretch every weekday 7:30am"   → repeats Mon–Fri
 *   "someday" / "no date"            → no date
 */
export function parse(raw: string, today: DateStr): Parsed {
  let text = ` ${raw} `;
  let due: DateStr | null = null;
  let time: string | null = null;
  let repeat: Repeat | null = null;
  let clearDate = false;

  const take = (re: RegExp): RegExpMatchArray | null => {
    const m = text.match(re);
    if (m) text = text.slice(0, m.index) + " " + text.slice(m.index! + m[0].length);
    return m;
  };

  // --- repeats ---
  let m: RegExpMatchArray | null;
  if ((m = take(new RegExp(`\\s(?:every|each)\\s+(day|weekday|week|month|${WD_ANY})\\b`, "i")))) {
    const w = m[1].toLowerCase();
    if (w === "day") {
      repeat = "daily";
      due = today;
    } else if (w === "weekday") {
      repeat = "weekdays";
      due = weekday(today) % 6 === 0 ? nextWeekday(today, 1) : today;
    } else if (w === "week") {
      repeat = "weekly";
      due = today;
    } else if (w === "month") {
      repeat = "monthly";
      due = today;
    } else {
      const i = weekdayIndex(w);
      repeat = `wd:${i}`;
      due = nextWeekday(today, i);
    }
  } else if ((m = take(/\s(daily|weekly|monthly)\b/i))) {
    repeat = m[1].toLowerCase() as Repeat;
    due = today;
  }

  // --- dates (an explicit date also sets where a repeat starts) ---
  if ((m = take(/\s(someday|no date|whenever)\b/i))) {
    clearDate = true;
    due = null;
  } else if ((m = take(/\s(today|tonight|tomorrow|tmrw|tmr)\b/i))) {
    const w = m[1].toLowerCase();
    due = w === "today" || w === "tonight" ? today : addDays(today, 1);
    if (w === "tonight") time = "19:00";
  } else if (
    (m = take(new RegExp(`\\s(?:on\\s+)?(next\\s+)?${WD_FULL}\\b`, "i"))) ||
    (m = take(new RegExp(`\\s(?:on\\s+|(next)\\s+)${WD_ANY}\\b`, "i")))
  ) {
    const i = weekdayIndex(m[2]);
    due = nextWeekday(today, i, true);
    if (m[1] && due < addDays(today, 7)) due = addDays(due, 7);
    if (repeat?.startsWith("wd:")) repeat = `wd:${i}`;
  } else if ((m = take(/\snext\s+week\b/i))) {
    due = nextWeekday(today, 1, true);
  } else if ((m = take(/\snext\s+month\b/i))) {
    const t = fromDateStr(today);
    due = toDateStr(new Date(t.getFullYear(), t.getMonth() + 1, 1));
  } else if ((m = take(/\sin\s+(\d{1,3}|a|an|one|two|three)\s+(days?|weeks?|months?)\b/i))) {
    const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3 };
    const n = words[m[1].toLowerCase()] ?? Number(m[1]);
    const unit = m[2].toLowerCase();
    if (unit.startsWith("day")) due = addDays(today, n);
    else if (unit.startsWith("week")) due = addDays(today, n * 7);
    else {
      const t = fromDateStr(today);
      due = toDateStr(new Date(t.getFullYear(), t.getMonth() + n, t.getDate()));
    }
  } else if (
    (m = take(new RegExp(`\\s(?:on\\s+)?${MON_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"))) ||
    (m = take(new RegExp(`\\s(?:on\\s+)?(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON_RE}`, "i")))
  ) {
    const [monWord, dayNum] = isNaN(Number(m[1])) ? [m[1], Number(m[2])] : [m[2], Number(m[1])];
    const mi = MONTHS.indexOf(monWord.slice(0, 3).toLowerCase());
    const t = fromDateStr(today);
    if (mi >= 0 && dayNum >= 1 && dayNum <= 31) {
      let d = toDateStr(new Date(t.getFullYear(), mi, dayNum));
      if (d < today) d = toDateStr(new Date(t.getFullYear() + 1, mi, dayNum));
      due = d;
    }
  } else if ((m = take(/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})(?=\s)/))) {
    // US-style 12/3
    const t = fromDateStr(today);
    const mi = Number(m[1]) - 1;
    const dd = Number(m[2]);
    if (mi >= 0 && mi < 12 && dd >= 1 && dd <= 31) {
      let d = toDateStr(new Date(t.getFullYear(), mi, dd));
      if (d < today) d = toDateStr(new Date(t.getFullYear() + 1, mi, dd));
      due = d;
    }
  }

  // --- times ---
  if ((m = take(/\s(?:at\s+|@\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?=[\s.,!?]|$)/i))) {
    const h12 = Number(m[1]);
    const mins = m[2] ? Number(m[2]) : 0;
    if (h12 >= 1 && h12 <= 12 && mins < 60) {
      const h = (h12 % 12) + (/^p/i.test(m[3]) ? 12 : 0);
      time = `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    }
  } else if ((m = take(/\s(?:at\s+|@\s*)?([01]?\d|2[0-3]):([0-5]\d)(?=[\s.,!?]|$)/))) {
    time = `${m[1].padStart(2, "0")}:${m[2]}`;
  } else if ((m = take(/\s(?:at|@)\s*(\d{1,2})(?=[\s.,!?]|$)/i))) {
    // "at 7" — assume afternoon/evening for 1–7, as people mean.
    let h = Number(m[1]);
    if (h >= 1 && h <= 7) h += 12;
    if (h <= 23) time = `${String(h).padStart(2, "0")}:00`;
  } else if ((m = take(/\s(?:at\s+)?(noon|midday)\b/i))) {
    time = "12:00";
  }

  if (time && !due && !clearDate) due = today;

  text = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(on|at|by|for|this|the)$/i, "")
    .replace(/^(on|at|by)\s+/i, "")
    .trim();

  return { text, due, time, repeat, clearDate };
}
