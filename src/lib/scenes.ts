import { daysBetween, type DateStr } from "./dates";

/**
 * The pencil illustration behind the list: one scene per local calendar day, going through
 * every scene in turn before repeating. The order alternates landscape → city → golf.
 *
 * To add a scene: put a 3:2 image with a white background in public/scenes/<id>.webp and add
 * an entry below (anywhere in the order).
 *
 * Per-scene placement and strength (the global settings live in src/styles.css):
 * - `focusX` (phones): the horizontal point, 0–100%, kept in view when the sides are cropped.
 * - `featureTop` (laptops): how far down the image its highest feature starts, as a fraction of
 *   the image height (e.g. the bridge tower's tip). The picture is never placed so high that
 *   this feature rises above the writing box and keyboard hints (see --scene-clear-top).
 * - `opacity` (optional): a multiplier on the global faintness, for unusually dense drawings.
 *   1 (the default) means "use the approved global value".
 */
export type SceneCategory = "landscape" | "city" | "golf";

export interface Scene {
  id: string;
  title: string;
  category: SceneCategory;
  focusX: number;
  featureTop: number;
  opacity?: number;
}

export const SCENES: Scene[] = [
  { id: "big-sur", title: "Big Sur", category: "landscape", focusX: 35, featureTop: 0.256 },
  { id: "golden-gate", title: "Golden Gate Bridge", category: "city", focusX: 48, featureTop: 0.29 },
  { id: "coastal-golf", title: "Coastal Golf", category: "golf", focusX: 62, featureTop: 0.259 },
  { id: "yosemite", title: "Yosemite Valley", category: "landscape", focusX: 46, featureTop: 0.284 },
  { id: "paris", title: "Paris — Seine & Eiffel Tower", category: "city", focusX: 44, featureTop: 0.228, opacity: 0.9 },
  { id: "st-andrews-links", title: "St Andrews–Inspired Links", category: "golf", focusX: 54, featureTop: 0.37 },
  { id: "lake-tahoe", title: "Lake Tahoe — Emerald Bay", category: "landscape", focusX: 43, featureTop: 0.314 },
  { id: "venice", title: "Venice — Grand Canal", category: "city", focusX: 48, featureTop: 0.258, opacity: 0.75 },
  { id: "augusta-creek", title: "Augusta–Inspired Creek & Azaleas", category: "golf", focusX: 47, featureTop: 0.192 },
  { id: "grand-canyon", title: "Grand Canyon", category: "landscape", focusX: 45, featureTop: 0.406 },
  { id: "new-york", title: "New York — Brooklyn Bridge", category: "city", focusX: 43, featureTop: 0.29, opacity: 0.9 },
  { id: "island-green", title: "Sawgrass–Inspired Island Green", category: "golf", focusX: 51, featureTop: 0.312 },
  { id: "monument-valley", title: "Monument Valley", category: "landscape", focusX: 43, featureTop: 0.288 },
  { id: "london", title: "London — Westminster", category: "city", focusX: 48, featureTop: 0.36 },
  { id: "bandon-dunes", title: "Bandon–Inspired Coastal Dunes", category: "golf", focusX: 50, featureTop: 0.403 },
  { id: "mount-fuji", title: "Mount Fuji", category: "landscape", focusX: 42, featureTop: 0.248 },
  { id: "rome", title: "Rome — Colosseum", category: "city", focusX: 45, featureTop: 0.233, opacity: 0.75 },
  { id: "cypress-coast", title: "Cypress Point–Inspired Coast", category: "golf", focusX: 59, featureTop: 0.292 },
  { id: "dolomites", title: "Dolomites — Alpine Meadow", category: "landscape", focusX: 48, featureTop: 0.235 },
  { id: "kyoto", title: "Kyoto — Pagoda Lane", category: "city", focusX: 47, featureTop: 0.15, opacity: 0.7 },
  { id: "pinehurst-sandhills", title: "Pinehurst–Inspired Sandhills", category: "golf", focusX: 44, featureTop: 0.228 },
  { id: "moorea", title: "Moorea — Island Lagoon", category: "landscape", focusX: 40, featureTop: 0.286 },
  { id: "lisbon", title: "Lisbon — Hillside Tram", category: "city", focusX: 46, featureTop: 0.177, opacity: 0.75 },
  { id: "palm-springs-golf", title: "Palm Springs — Desert Golf", category: "golf", focusX: 55, featureTop: 0.238 },
  { id: "joshua-tree", title: "Joshua Tree Desert", category: "landscape", focusX: 43, featureTop: 0.247 },
  { id: "amsterdam", title: "Amsterdam — Canal Houses", category: "city", focusX: 52, featureTop: 0.258, opacity: 0.85 },
  { id: "alpine-golf", title: "Alpine Golf", category: "golf", focusX: 44, featureTop: 0.286 },
  { id: "scottish-highlands", title: "Scottish Highlands", category: "landscape", focusX: 49, featureTop: 0.279 },
  { id: "sydney", title: "Sydney — Opera House", category: "city", focusX: 49, featureTop: 0.318 },
  { id: "castle-links", title: "Scottish Castle Links", category: "golf", focusX: 49, featureTop: 0.373 },
];

export const sceneSrc = (s: Scene) => `/scenes/${s.id}.webp`;

/** Day 0 of the rotation. Any fixed date works; it only sets which scene comes first. */
const EPOCH = "2026-01-01";

/**
 * Today's scene. Counts whole local calendar days since EPOCH (daysBetween rounds, so the
 * 23- and 25-hour days at daylight-saving changes still count as one day each). The same all
 * day on every device in the same time zone; the next one tomorrow.
 */
export function sceneFor(day: DateStr, scenes: Scene[] = SCENES): Scene {
  const n = scenes.length;
  const i = daysBetween(EPOCH, day) % n;
  return scenes[(i + n) % n];
}
