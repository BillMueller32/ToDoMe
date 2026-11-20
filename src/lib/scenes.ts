import { daysBetween, type DateStr } from "./dates";

/**
 * The pencil illustration behind the list: one scene per local calendar day, going through
 * every scene in turn before repeating.
 *
 * To add a scene: put a 3:2 image with a white background in public/scenes/ (named like
 * `big-sur.webp`) and append an entry here.
 *
 * Per-scene placement:
 * - `focusX` (phones): the horizontal point, 0–100%, kept in view when the sides are cropped.
 * - `featureTop` (laptops): how far down the image its highest feature starts, as a fraction of
 *   the image height (e.g. the bridge tower's tip). The picture is never placed so high that
 *   this feature rises above the writing box and keyboard hints (see --scene-clear-top).
 */
export interface Scene {
  id: string;
  src: string;
  focusX: number;
  featureTop: number;
}

export const SCENES: Scene[] = [
  { id: "big-sur", src: "/scenes/big-sur.webp", focusX: 35, featureTop: 0.256 },
  { id: "golden-gate", src: "/scenes/golden-gate.webp", focusX: 48, featureTop: 0.29 },
  { id: "coastal-golf", src: "/scenes/coastal-golf.webp", focusX: 62, featureTop: 0.259 },
];

/** Day 0 of the rotation. Any fixed date works; it only sets which scene comes first. */
const EPOCH = "2026-01-01";

/** Today's scene. The same all day on every device; the next one tomorrow. */
export function sceneFor(day: DateStr, scenes: Scene[] = SCENES): Scene {
  const n = scenes.length;
  const i = daysBetween(EPOCH, day) % n;
  return scenes[(i + n) % n];
}
