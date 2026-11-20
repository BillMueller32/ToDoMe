import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capture } from "./components/Capture";
import { ChevronIcon } from "./components/icons";
import { ItemRow } from "./components/ItemRow";
import { Login } from "./components/Login";
import { Scenery } from "./components/Scenery";
import { formatDay, formatShortDate, fromDateStr, todayStr, type DateStr } from "./lib/dates";
import {
  beenAWhile,
  byDueThenTime,
  completeItem,
  doneOn,
  effectiveDue,
  isCarriedOver,
  onLater,
  onToday,
  onUpcoming,
  type Item,
} from "./lib/items";
import { parse } from "./lib/parse";
import { newId, save, signOut, stamp, update, useStore, type SyncStatus } from "./lib/store";

type View = "today" | "upcoming" | "later";
const VIEWS: View[] = ["today", "upcoming", "later"];
const VIEW_LABEL: Record<View, string> = { today: "Today", upcoming: "Upcoming", later: "Later" };
const VIEW_KEY = "todome:view";

/**
 * The local date, kept current: it rolls over right at local midnight, and is re-checked
 * whenever the app comes back (tab shown, window focused, page restored from the back cache).
 */
function useToday(): DateStr {
  const [today, setToday] = useState(todayStr);
  useEffect(() => {
    const check = () => setToday(todayStr());
    const tick = window.setInterval(check, 60_000);
    let midnight = 0;
    const armMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      midnight = window.setTimeout(() => {
        check();
        armMidnight();
      }, next.getTime() - now.getTime());
    };
    armMidnight();
    const resume = () => {
      check();
      clearTimeout(midnight);
      armMidnight(); // timers can stall while the phone sleeps; aim again from now
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      clearInterval(tick);
      clearTimeout(midnight);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, []);
  return today;
}

interface Toast {
  msg: string;
  undo?: () => void;
  key: number;
}

export function App() {
  const { items, status } = useStore();
  const today = useToday();
  const [view, setViewState] = useState<View>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY) as View | null;
      return v && VIEWS.includes(v) ? v : "today";
    } catch {
      return "today";
    }
  });
  const [showDone, setShowDone] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const captureRef = useRef<HTMLInputElement>(null);

  const setView = useCallback((v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  const showToast = useCallback((msg: string, undo?: () => void) => {
    setToast({ msg, undo, key: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Keyboard: N or / to write, 1/2/3 to switch pages.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = document.activeElement as HTMLElement | null;
      if (a && (a.tagName === "INPUT" || a.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n" || e.key === "/") {
        e.preventDefault();
        captureRef.current?.focus();
      } else if (e.key === "1" || e.key === "2" || e.key === "3") setView(VIEWS[Number(e.key) - 1]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setView]);

  const lists = useMemo(() => {
    const live = items.filter((i) => !i.deleted);
    const sort = byDueThenTime(today);
    const todayItems = live.filter((i) => onToday(i, today));
    const old = todayItems.filter((i) => beenAWhile(i, today));
    const fresh = todayItems.filter((i) => !beenAWhile(i, today));
    return {
      carried: fresh.filter((i) => isCarriedOver(i, today)).sort(sort),
      today: fresh.filter((i) => !isCarriedOver(i, today)).sort(sort),
      old: old.sort(sort),
      upcoming: live.filter((i) => onUpcoming(i, today)).sort(sort),
      later: live.filter(onLater).sort((a, b) => a.createdAt - b.createdAt),
      doneToday: live.filter((i) => doneOn(i, today)).sort((a, b) => b.updatedAt - a.updatedAt),
    };
  }, [items, today]);

  if (status === "signed-out") return <Login />;

  // ---------- actions ----------
  const add = (raw: string) => {
    const p = parse(raw, today);
    const now = stamp();
    const it: Item = {
      id: newId(),
      text: p.text || raw,
      due: p.due,
      time: p.time,
      repeat: p.repeat,
      pinned: false,
      later: p.clearDate,
      done: false,
      doneAt: null,
      createdAt: now,
      updatedAt: now,
    };
    save(it);
    setLastAdded(it.id);
    const lands: View = onToday(it, today) ? "today" : onUpcoming(it, today) ? "upcoming" : "later";
    if (lands !== view) {
      showToast(
        lands === "upcoming" && it.due
          ? `Added for ${formatDay(it.due, today).toLowerCase()}`
          : lands === "later"
            ? "Saved for later"
            : "Added to Today",
      );
    }
  };

  const toggle = (it: Item) => {
    if (it.done) {
      update(it.id, { done: false, doneAt: null });
      return;
    }
    const before = { ...it };
    const records = completeItem(it, today, newId, stamp());
    save(...records);
    const moved = records[0];
    const extra = records[1];
    showToast(
      it.repeat && moved.due ? `Done · next ${formatDay(moved.due, today).toLowerCase()}` : "Done",
      () => {
        save({ ...before, updatedAt: stamp() });
        if (extra) update(extra.id, { deleted: true });
      },
    );
  };

  const pin = (it: Item) => update(it.id, { pinned: !it.pinned });

  const park = (it: Item) => {
    const before = { ...it };
    update(it.id, { later: true, pinned: false, due: null, time: null });
    showToast("Saved for later", () => save({ ...before, updatedAt: stamp() }));
  };

  const unpark = (it: Item) => update(it.id, { later: false });

  const del = (it: Item) => {
    update(it.id, { deleted: true });
    showToast("Deleted", () => update(it.id, { deleted: false }));
  };

  const edit = (it: Item, raw: string) => {
    const p = parse(raw, today);
    const patch: Partial<Item> = { text: p.text || raw };
    if (p.due) Object.assign(patch, { due: p.due, later: false });
    if (p.clearDate) Object.assign(patch, { due: null, time: null, repeat: null, later: true, pinned: false });
    if (p.time) patch.time = p.time;
    if (p.repeat) patch.repeat = p.repeat;
    update(it.id, patch);
  };

  const row = (it: Item, showDate = true) => (
    <ItemRow
      key={it.id}
      item={it}
      today={today}
      showDate={showDate}
      isNew={it.id === lastAdded}
      onToggle={toggle}
      onPin={pin}
      onPark={park}
      onUnpark={unpark}
      onDelete={del}
      onEdit={edit}
    />
  );

  // ---------- pages ----------
  let page: React.ReactNode;
  if (view === "today") {
    const empty = !lists.carried.length && !lists.today.length && !lists.old.length;
    page = (
      <>
        {empty && (
          <div className="empty">
            <strong>{lists.doneToday.length ? "All done for today." : "Nothing to do."}</strong>
            <span>Write it down and it lands here. Add a day like “friday” to save it for then, or “someday” to put it aside.</span>
          </div>
        )}
        {lists.carried.length > 0 && (
          <section className="section">
            <div className="section-label">
              <span>Carried over</span>
            </div>
            <ul className="list">{lists.carried.map((i) => row(i))}</ul>
          </section>
        )}
        {lists.today.length > 0 && (
          <section className="section">
            {lists.carried.length > 0 && (
              <div className="section-label">
                <span>Today</span>
              </div>
            )}
            <ul className="list">{lists.today.map((i) => row(i, false))}</ul>
          </section>
        )}
        {lists.old.length > 0 && (
          <section className="section">
            <button className="done-toggle" aria-expanded={showOld} onClick={() => setShowOld(!showOld)}>
              <ChevronIcon />
              Been a while · {lists.old.length}
            </button>
            {showOld && <ul className="list">{lists.old.map((i) => row(i))}</ul>}
          </section>
        )}
        {lists.doneToday.length > 0 && (
          <section className="section">
            <button className="done-toggle" aria-expanded={showDone} onClick={() => setShowDone(!showDone)}>
              <ChevronIcon />
              Done today · {lists.doneToday.length}
            </button>
            {showDone && <ul className="list">{lists.doneToday.map((i) => row(i))}</ul>}
          </section>
        )}
      </>
    );
  } else if (view === "upcoming") {
    const groups = new Map<DateStr, Item[]>();
    for (const i of lists.upcoming) {
      const d = effectiveDue(i, today)!;
      groups.set(d, [...(groups.get(d) ?? []), i]);
    }
    page = groups.size ? (
      [...groups].map(([d, its]) => (
        <section className="section" key={d}>
          <div className="section-label">
            <span>{formatDay(d, today)}</span>
            <span>{formatShortDate(d)}</span>
          </div>
          <ul className="list">{its.map((i) => row(i, false))}</ul>
        </section>
      ))
    ) : (
      <div className="empty">
        <strong>Nothing scheduled.</strong>
        <span>Add a date as you type, like “friday”, “dec 3” or “every sunday”.</span>
      </div>
    );
  } else {
    page = lists.later.length ? (
      <section className="section">
        <ul className="list">{lists.later.map((i) => row(i))}</ul>
      </section>
    ) : (
      <div className="empty">
        <strong>Nothing set aside.</strong>
        <span>Write “someday” after something to keep it here, off your list until you want it.</span>
      </div>
    );
  }

  const counts: Record<View, number> = {
    today: lists.carried.length + lists.today.length,
    upcoming: lists.upcoming.length,
    later: lists.later.length,
  };

  return (
    <div className="page">
      <Scenery today={today} />
      <header className="head">
        <div>
          <h1 className="day">{fromDateStr(today).toLocaleDateString(undefined, { weekday: "long" })}</h1>
          <div className="stamp">
            {fromDateStr(today).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <SyncBadge status={status} />
      </header>

      <Capture ref={captureRef} today={today} onAdd={add} />

      <nav className="tabs" role="tablist" aria-label="Pages">
        {VIEWS.map((v) => (
          <button key={v} className="tab" role="tab" aria-selected={view === v} onClick={() => setView(v)}>
            {VIEW_LABEL[v]}
            <span className="n">{counts[v] || ""}</span>
          </button>
        ))}
      </nav>

      <main>{page}</main>

      <footer className="foot">
        <span>ToDoMe</span>
        <SyncBadge status={status} />
        <button onClick={() => void signOut()}>Sign out of this device</button>
      </footer>

      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        <span>{toast?.msg}</span>
        {toast?.undo && (
          <button
            onClick={() => {
              toast.undo?.();
              setToast(null);
            }}
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  const label = status === "offline" ? "Offline" : status === "error" ? "Not synced" : status === "syncing" ? "Syncing" : "Synced";
  return (
    <span className="sync" data-s={status} title={status === "offline" ? "Changes will sync when you’re back online" : undefined}>
      <i />
      {label}
    </span>
  );
}
