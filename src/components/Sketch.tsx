import { useEffect, useRef, useState, type RefObject } from "react";
import type { DateStr } from "../lib/dates";
import { drawingOf, sceneFor } from "../lib/scenes";

interface Props {
  today: DateStr;
  /** The end of the list. When it reaches the drawing, the drawing steps back. */
  listEnd: RefObject<HTMLElement | null>;
}

/** Today's pencil sketch, fixed low on the page behind everything. */
export function Sketch({ today, listEnd }: Props) {
  const drawing = drawingOf(sceneFor(today));
  const ref = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState(false);

  useEffect(() => {
    const check = () => {
      const end = listEnd.current?.getBoundingClientRect().bottom;
      const box = ref.current?.getBoundingClientRect();
      if (end === undefined || !box) return;
      // The top of the drawing is faded out already; dim once the list reaches the rest.
      setDim(end > box.top + box.height * 0.3);
    };
    check();
    const ro = new ResizeObserver(check);
    if (listEnd.current?.parentElement) ro.observe(listEnd.current.parentElement);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [listEnd]);

  return (
    <div ref={ref} className={`sketch${dim ? " dim" : ""}`} aria-hidden="true">
      <svg viewBox="0 40 390 300" preserveAspectRatio="xMidYMax meet">
        <defs>
          <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={9} result="wob" />
            <feDisplacementMap in="SourceGraphic" in2="wob" scale={2} result="shaky" />
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={1} seed={3} result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.8 1.6" result="grainA" />
            <feComposite in="shaky" in2="grainA" operator="in" />
          </filter>
        </defs>
        <g filter="url(#pencil)" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {drawing.strokes.map(([d, w], i) => (
            <path key={i} d={d} strokeWidth={w} />
          ))}
        </g>
        {drawing.notes.map((n, i) => (
          <text key={i} x={n.x} y={n.y} fontSize={n.size ?? 9} textAnchor={n.anchor ?? "start"} className="sketch-note">
            {n.text}
          </text>
        ))}
      </svg>
    </div>
  );
}
