import { useState } from "react";
import { formatDay, formatShortDate, formatTime, type DateStr } from "../lib/dates";
import { effectiveDue, isStale, type Item } from "../lib/items";
import { repeatLabel } from "../lib/repeat";
import { CalendarIcon, CheckIcon, ClockIcon, HighlighterIcon, RepeatIcon, TrashIcon } from "./icons";

interface Props {
  item: Item;
  today: DateStr;
  showDate?: boolean;
  isNew?: boolean;
  onToggle: (it: Item) => void;
  onPin: (it: Item) => void;
  onDelete: (it: Item) => void;
  onEdit: (it: Item, raw: string) => void;
}

export function ItemRow({ item, today, showDate = true, isNew, onToggle, onPin, onDelete, onEdit }: Props) {
  const [checking, setChecking] = useState(false);
  const [draft, setDraft] = useState<string | null>(null); // non-null while editing
  const done = item.done || checking;
  const due = effectiveDue(item, today);
  const stale = !item.done && isStale(item, today);

  const toggle = () => {
    if (item.done) return onToggle(item);
    if (checking) return;
    setChecking(true);
    navigator.vibrate?.(8);
    window.setTimeout(() => onToggle(item), 420); // let the pen stroke finish
  };

  const startEdit = () => {
    if (draft === null && !item.done) setDraft(item.text);
  };

  const finishEdit = (commit: boolean) => {
    const v = draft?.trim() ?? "";
    setDraft(null);
    if (commit && v && v !== item.text) onEdit(item, v);
  };

  return (
    <li className={`item${done ? " done" : ""}${item.pinned && !done ? " hl" : ""}${isNew ? " enter" : ""}`}>
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
            {due && stale && <span>Was due {formatShortDate(due)}</span>}
            {due && !stale && showDate && (
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
        {!item.done && (
          <button
            className={`act${item.pinned ? " on" : ""}`}
            onClick={() => onPin(item)}
            aria-label={item.pinned ? "Take off Today" : "Put on Today"}
            title={item.pinned ? "Take off Today" : "Put on Today"}
          >
            <HighlighterIcon on={item.pinned} />
          </button>
        )}
        <button className="act del" onClick={() => onDelete(item)} aria-label="Delete" title="Delete">
          <TrashIcon />
        </button>
      </div>
    </li>
  );
}
