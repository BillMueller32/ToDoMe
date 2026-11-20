import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { addDays } from "./dates";
import { SCENES, sceneFor, type Scene } from "./scenes";

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

  test("still cycles fully with a larger manifest (e.g. 30 scenes)", () => {
    const many: Scene[] = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}`, src: "", focusX: 50 }));
    const run = many.map((_, i) => sceneFor(addDays("2027-03-01", i), many).id);
    expect(new Set(run).size).toBe(30);
  });

  test("works for dates before the start of the rotation", () => {
    expect(SCENES).toContain(sceneFor("2024-02-29"));
  });

  test("every scene in the manifest has a unique id and an image file", () => {
    expect(new Set(SCENES.map((s) => s.id)).size).toBe(SCENES.length);
    for (const s of SCENES) {
      expect(s.src).toBe(`/scenes/${s.id}.webp`);
      expect(existsSync(join(import.meta.dir, "../../public", s.src))).toBe(true);
      expect(s.focusX).toBeGreaterThanOrEqual(0);
      expect(s.focusX).toBeLessThanOrEqual(100);
    }
  });
});
