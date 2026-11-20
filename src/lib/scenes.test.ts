import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { addDays } from "./dates";
import { SCENES, sceneFor, sceneSrc, type Scene } from "./scenes";

describe("daily scene", () => {
  test("the same all day, and a different one the next day", () => {
    expect(sceneFor("2026-11-20")).toBe(sceneFor("2026-11-20"));
    expect(sceneFor("2026-11-21")).not.toBe(sceneFor("2026-11-20"));
  });

  test("goes through every scene before repeating", () => {
    const start = "2026-11-20";
    const run = SCENES.map((_, i) => sceneFor(addDays(start, i)).id);
    expect(new Set(run).size).toBe(SCENES.length);
    expect(sceneFor(addDays(start, SCENES.length)).id).toBe(run[0]);
  });

  test("still cycles fully with a larger manifest", () => {
    const many: Scene[] = Array.from({ length: 45 }, (_, i) => ({ id: `s${i}`, title: "", category: "city", focusX: 50, featureTop: 0.3 }));
    const run = many.map((_, i) => sceneFor(addDays("2027-03-01", i), many).id);
    expect(new Set(run).size).toBe(45);
  });

  test("works for dates before the start of the rotation", () => {
    expect(SCENES).toContain(sceneFor("2024-02-29"));
  });

  test("the full collection: 30 unique scenes, ten per category, landscape → city → golf", () => {
    expect(SCENES.length).toBe(30);
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(30);
    for (const c of ["landscape", "city", "golf"]) expect(SCENES.filter((s) => s.category === c).length).toBe(10);
    SCENES.forEach((s, i) => expect(s.category).toBe(["landscape", "city", "golf"][i % 3]));
    expect(SCENES.slice(0, 3).map((s) => s.id)).toEqual(["big-sur", "golden-gate", "coastal-golf"]);
  });

  test("a whole 30-day run shows every scene once; day 31 starts again", () => {
    const run = Array.from({ length: 30 }, (_, i) => sceneFor(addDays("2026-11-20", i)).id);
    expect(new Set(run).size).toBe(30);
    expect(sceneFor(addDays("2026-11-20", 30)).id).toBe(run[0]);
  });

  test("days across daylight-saving changes still advance one scene per day", () => {
    const idx = (d: string) => SCENES.indexOf(sceneFor(d));
    for (const [a, b] of [["2026-03-07", "2026-03-08"], ["2026-03-08", "2026-03-09"], ["2026-10-31", "2026-11-01"], ["2026-11-01", "2026-11-02"], ["2026-03-28", "2026-03-29"], ["2026-10-24", "2026-10-25"]]) {
      expect((idx(b) - idx(a) + 30) % 30).toBe(1);
    }
  });

  test("every scene in the manifest has an image file and sensible placement", () => {
    for (const s of SCENES) {
      expect(sceneSrc(s)).toBe(`/scenes/${s.id}.webp`);
      expect(existsSync(join(import.meta.dir, "../../public", sceneSrc(s)))).toBe(true);
      expect(s.focusX).toBeGreaterThanOrEqual(0);
      expect(s.focusX).toBeLessThanOrEqual(100);
      expect(s.featureTop).toBeGreaterThan(0);
      expect(s.featureTop).toBeLessThan(1);
      if (s.opacity !== undefined) expect(s.opacity > 0 && s.opacity <= 1).toBe(true);
    }
  });
});
