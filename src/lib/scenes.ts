import { daysBetween, type DateStr } from "./dates";

/**
 * The pencil illustration behind the list: one scene per local calendar day, going through
 * every scene in turn before repeating.
 *
 * To add a scene: put a 3:2 image with a white background in public/scenes/ (named like
 * `big-sur.webp`) and append an entry here. `focusX` is the horizontal point (0–100%) to keep
 * in view when a narrow screen crops the sides.
 */
export interface Scene {
  id: string;
  src: string;
  focusX: number;
}

export const SCENES: Scene[] = [
  { id: "big-sur", src: "/scenes/big-sur.webp", focusX: 35 },
  { id: "golden-gate", src: "/scenes/golden-gate.webp", focusX: 48 },
  { id: "coastal-golf", src: "/scenes/coastal-golf.webp", focusX: 62 },
];

/** Day 0 of the rotation. Any fixed date works; it only sets which scene comes first. */
const EPOCH = "2026-01-01";

/** Today's scene. The same all day on every device; the next one tomorrow. */
export function sceneFor(day: DateStr, scenes: Scene[] = SCENES): Scene {
  const n = scenes.length;
  const i = daysBetween(EPOCH, day) % n;
  return scenes[(i + n) % n];
}
