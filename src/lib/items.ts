import { daysBetween, type DateStr } from "./dates";
import { latestOccurrence, nextOccurrence, type Repeat } from "./repeat";

export interface Item {
  id: string;
  text: string;
  due: DateStr | null;
  time: string | null;
  repeat: Repeat | null;
  /** Highlighted: on Today regardless of date. */
  pinned: boolean;
  done: boolean;
  doneAt: DateStr | null;
  createdAt: number;
  /** Last change, ms since epoch. Newest change wins when devices sync. */
  updatedAt: number;
  deleted?: boolean;
}

/** Things carried over longer than this drop off Today and wait in the Notebook. */
export const CARRY_OVER_DAYS = 7;

/** The date an item counts as due, with missed repeats collapsed to the latest one. */
export function effectiveDue(it: Item, today: DateStr): DateStr | null {
  if (!it.due) return null;
  if (it.repeat) return latestOccurrence(it.repeat, it.due, today);
  return it.due;
}

const open = (it: Item) => !it.deleted && !it.done;

export function isStale(it: Item, today: DateStr): boolean {
  const d = effectiveDue(it, today);
  return !!d && d < today && daysBetween(d, today) > CARRY_OVER_DAYS;
}

export function onToday(it: Item, today: DateStr): boolean {
  if (!open(it)) return false;
  if (it.pinned) return true;
  const d = effectiveDue(it, today);
  return !!d && d <= today && !isStale(it, today);
}

export function isCarriedOver(it: Item, today: DateStr): boolean {
  const d = effectiveDue(it, today);
  return onToday(it, today) && !!d && d < today;
}

export function onUpcoming(it: Item, today: DateStr): boolean {
  if (!open(it) || it.pinned) return false;
  const d = effectiveDue(it, today);
  return !!d && d > today;
}

export function inNotebook(it: Item): boolean {
  return open(it);
}

export function doneOn(it: Item, day: DateStr): boolean {
  return !it.deleted && it.done && it.doneAt === day;
}

export function byDueThenTime(today: DateStr) {
  return (a: Item, b: Item) =>
    (effectiveDue(a, today) ?? "9999").localeCompare(effectiveDue(b, today) ?? "9999") ||
    (a.time ?? "99").localeCompare(b.time ?? "99") ||
    a.createdAt - b.createdAt;
}

/**
 * Checking off an item. A one-off item is simply marked done. A repeating item moves on
 * to its next date, and a done copy is kept so it still shows under "Done today".
 * Returns the records to save.
 */
export function completeItem(it: Item, today: DateStr, newId: () => string, now: number): Item[] {
  if (!it.repeat) return [{ ...it, done: true, doneAt: today, pinned: false, updatedAt: now }];
  const current = effectiveDue(it, today) ?? today;
  const next = nextOccurrence(it.repeat, it.due ?? current, current < today ? today : current);
  const record: Item = {
    ...it,
    id: newId(),
    repeat: null,
    due: current,
    done: true,
    doneAt: today,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  return [{ ...it, due: next, pinned: false, updatedAt: now }, record];
}
