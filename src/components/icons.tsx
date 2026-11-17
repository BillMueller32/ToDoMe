const s = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const CheckIcon = () => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={3.2} aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={2} aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const ClockIcon = () => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={2} aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
);
export const RepeatIcon = () => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={2} aria-hidden="true"><path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3" /></svg>
);
export const HighlighterIcon = ({ on }: { on?: boolean }) => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={1.9} aria-hidden="true">
    <path d="M14.5 4.5l5 5L11 18H6v-5z" fill={on ? "currentColor" : "none"} />
    <path d="M4 21h8" />
  </svg>
);
export const TrashIcon = () => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={1.9} aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
);
export const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={2.4} aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
);
export const ArrowUpIcon = () => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={2.2} aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
);
export const LaterIcon = () => (
  <svg viewBox="0 0 24 24" {...s} strokeWidth={1.9} aria-hidden="true"><path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20M4 13l2.2-6.5a1.5 1.5 0 0 1 1.4-1h8.8a1.5 1.5 0 0 1 1.4 1L20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /></svg>
);
