import { useRef, useState } from "react";
import { formatDay, formatTime, type DateStr } from "../lib/dates";
import { effectiveDue, type Item } from "../lib/items";
import { repeatLabel } from "../lib/repeat";
import { ArrowUpIcon, CalendarIcon, CheckIcon, ClockIcon, HighlighterIcon, LaterIcon, RepeatIcon, TrashIcon } from "./icons";

interface Props {
  item: Item;
  today: DateStr;
  showDate?: boolean;
  isNew?: boolean;
  onToggle: (it: Item) => void;
  onPin: (it: Item) => void;
  onPark: (it: Item) => void;
  onUnpark: (it: Item) => void;
  onDelete: (it: Item) => void;
  onEdit: (it: Item, raw: string) => void;
}

/** How far a row has to be dragged before letting go does something. */
const SWIPE_AT = 84;

interface Move {
  label: string;
  icon: React.ReactNode;
  run: () => void;
  on?: boolean;
}

export function ItemRow({ item, today, showDate = true, isNew, onToggle, onPin, onPark, onUnpark, onDelete, onEdit }: Props) {
  const [checking, setChecking] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // non-null while editing
  const [dx, setDx] = useState(0);
  const [settling, setSettling] = useState(false);
  const drag = useRef<{ x: number; y: number; id: number; swiping: boolean; armed: boolean } | null>(null);
  const justSwiped = useRef(false);

  const done = item.done || checking;
  const due = effectiveDue(item, today);
  const future = !!due && due > today;

  // The one "move" for this row: swipe right on a phone, a hover button on a laptop.
  // Later → back to Today; Upcoming → do it today; Today → set aside for later.
  let move: Move | null = null;
  if (!item.done) {
    if (item.later) move = { label: "Today", icon: <ArrowUpIcon />, run: () => onUnpark(item) };
    else if (item.pinned) move = { label: "Off Today", icon: <HighlighterIcon on />, run: () => onPin(item), on: true };
    else if (future) move = { label: "Do today", icon: <HighlighterIcon />, run: () => onPin(item) };
    else if (!item.repeat) move = { label: "Later", icon: <LaterIcon />, run: () => onPark(item) };
  }

  const toggle = () => {
    if (item.done) return onToggle(item);
    if (checking) return;
    setChecking(true);
    navigator.vibrate?.(8);
    window.setTimeout(() => onToggle(item), 420); // let the pen stroke finish
  };

  const startEdit = () => {
    if (justSwiped.current) return;
    if (draft === null && !item.done) setDraft(item.text);
  };

  const finishEdit = (commit: boolean) => {
    const v = draft?.trim() ?? "";
    setDraft(null);
    if (commit && v && v !== item.text) onEdit(item, v);
  };

  // ---------- swipe (touch only; a mouse never drags rows) ----------
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || draft !== null || checking) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, swiping: false, armed: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    let x = e.clientX - d.x;
    const y = e.clientY - d.y;
    if (!d.swiping) {
      if (Math.abs(y) > 10 && Math.abs(y) > Math.abs(x)) return void (drag.current = null); // a scroll
      if (Math.abs(x) < 10) return;
      d.swiping = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (x > 0 && !move) x = x / 4; // nothing to do that way: resist
    const armed = Math.abs(x) >= SWIPE_AT && (x < 0 || !!move);
    if (armed !== d.armed) {
      d.armed = armed;
      if (armed) navigator.vibrate?.(6);
    }
    setDx(x);
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.swiping) return;
    justSwiped.current = true;
    window.setTimeout(() => (justSwiped.current = false), 50);
    setSettling(true);
    if (d.armed) {
      const width = (e.currentTarget as HTMLElement).offsetWidth;
      setDx(dx < 0 ? -width : width);
      window.setTimeout(() => {
        if (dx < 0) onDelete(item);
        else move?.run();
        setDx(0);
        setSettling(false);
      }, 180);
    } else {
      setDx(0);
      window.setTimeout(() => setSettling(false), 200);
    }
  };

  const swiping = dx !== 0 || settling;

  return (
    <li
      className={`item${done ? " done" : ""}${item.pinned && !done ? " hl" : ""}${isNew ? " enter" : ""}${swiping ? " swiping" : ""}`}
    >
      {swiping && (
        <div className={`swipe-under ${dx >= 0 ? "right" : "left"}${Math.abs(dx) >= SWIPE_AT ? " armed" : ""}`} aria-hidden="true">
          {dx >= 0 ? (
            move && (
              <span>
                {move.icon}
                {move.label}
              </span>
            )
          ) : (
            <span>
              Delete
              <TrashIcon />
            </span>
          )}
        </div>
      )}
      <div
        className="row"
        style={swiping ? { transform: `translateX(${dx}px)`, transition: settling ? "transform 0.18s ease-out" : "none" } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button className="check" onClick={toggle} aria-label={item.done ? "Mark not done" : "Mark done"}>
          <CheckIcon />
        </button>
        <div className="body">
          {draft !== null ? (
            <input
              className="edit"
              aria-label="Edit to-do"
              value={draft}
              autoFocus
              enterKeyHint="done"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => finishEdit(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishEdit(true);
                else if (e.key === "Escape") finishEdit(false);
              }}
            />
          ) : (
            <span className="strike">
              <span className="text" onClick={startEdit}>
                {item.text}
              </span>
            </span>
          )}
          {(due || item.time || item.repeat) && (
            <div className="meta">
              {due && showDate && (
                <span className={!item.done && due < today ? "late" : undefined}>
                  <CalendarIcon />
                  {formatDay(due, today)}
                </span>
              )}
              {item.time && (
                <span>
                  <ClockIcon />
                  {formatTime(item.time)}
                </span>
              )}
              {item.repeat && (
                <span>
                  <RepeatIcon />
                  {repeatLabel(item.repeat)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="actions">
          {move && (
            <button className={`act${move.on ? " on" : ""}`} onClick={move.run} aria-label={move.label} title={move.label}>
              {move.icon}
            </button>
          )}
          <button className="act del" onClick={() => onDelete(item)} aria-label="Delete" title="Delete">
            <TrashIcon />
          </button>
        </div>
      </div>
    </li>
  );
}
