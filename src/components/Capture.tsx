import { forwardRef, useState } from "react";
import { formatDay, formatTime, type DateStr } from "../lib/dates";
import { parse } from "../lib/parse";
import { repeatLabel } from "../lib/repeat";
import { ArrowUpIcon, CalendarIcon, ClockIcon, RepeatIcon } from "./icons";

interface Props {
  today: DateStr;
  onAdd: (raw: string) => void;
}

/** The always-there writing line. Dates, times and repeats are picked up as you type. */
export const Capture = forwardRef<HTMLInputElement, Props>(function Capture({ today, onAdd }, ref) {
  const [value, setValue] = useState("");
  const parsed = value.trim() ? parse(value.trim(), today) : null;

  return (
    <div className="capture-wrap">
      <form
        className="capture"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim()) return;
          onAdd(value.trim());
          setValue("");
        }}
      >
        <div className="capture-row">
          <input
            ref={ref}
            id="capture"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") (e.target as HTMLInputElement).blur();
            }}
            placeholder="Write it down…"
            aria-label="New to-do"
            enterKeyHint="done"
            autoCapitalize="sentences"
          />
          <button type="submit" className="icon-btn add-btn" aria-label="Add" disabled={!value.trim()}>
            <ArrowUpIcon />
          </button>
        </div>
        {parsed && (parsed.due || parsed.time || parsed.repeat) && (
          <div className="chips" aria-live="polite">
            {parsed.due && (
              <span className="chip">
                <CalendarIcon />
                {formatDay(parsed.due, today)}
              </span>
            )}
            {parsed.time && (
              <span className="chip">
                <ClockIcon />
                {formatTime(parsed.time)}
              </span>
            )}
            {parsed.repeat && (
              <span className="chip">
                <RepeatIcon />
                {repeatLabel(parsed.repeat)}
              </span>
            )}
          </div>
        )}
      </form>
      <div className="kbd-hint">
        <span><kbd>N</kbd> new</span>
        <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> switch page</span>
        <span><kbd>Esc</kbd> done typing</span>
      </div>
    </div>
  );
});
