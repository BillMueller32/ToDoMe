import { describe, expect, test } from "bun:test";
import { addDays } from "./dates";
import { SCENES, drawingOf, sceneFor } from "./scenes";

describe("daily sketch", () => {
  test("changes every day and cycles through every scene", () => {
    const start = "2026-11-20";
    const week = Array.from({ length: SCENES.length }, (_, i) => sceneFor(addDays(start, i)).name);
    expect(new Set(week).size).toBe(SCENES.length);
    for (let i = 1; i < week.length; i++) expect(week[i]).not.toBe(week[i - 1]);
    expect(sceneFor(addDays(start, SCENES.length)).name).toBe(week[0]);
  });
  test("works for dates before the start of the cycle", () => {
    expect(SCENES).toContain(sceneFor("2025-06-01"));
  });
  test("every scene draws, the same way each time, inside its box", () => {
    for (const sc of SCENES) {
      const a = drawingOf(sc);
      expect(a.strokes.length).toBeGreaterThan(0);
      expect(a.notes.length).toBe(1);
      expect(sc.draw()).toEqual(a);
    }
  });
});
