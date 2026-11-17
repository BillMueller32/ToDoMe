import { describe, expect, test } from "bun:test";
import { parse } from "./parse";
import { completeItem, effectiveDue, isCarriedOver, onToday, onUpcoming, type Item } from "./items";
import { latestOccurrence, nextOccurrence } from "./repeat";

// Tuesday, Nov 17 2026
const T = "2026-11-17";
const p = (s: string) => parse(s, T);

describe("parse", () => {
  test("plain text has no date", () => {
    expect(p("buy milk")).toEqual({ text: "buy milk", due: null, time: null, repeat: null, clearDate: false });
  });
  test("tomorrow + time", () => {
    expect(p("call dentist tomorrow 9am")).toMatchObject({ text: "call dentist", due: "2026-11-18", time: "09:00" });
    expect(p("call dentist tomorrow at 9:30 pm")).toMatchObject({ text: "call dentist", due: "2026-11-18", time: "21:30" });
  });
  test("today / tonight", () => {
    expect(p("pick up meds today")).toMatchObject({ text: "pick up meds", due: T });
    expect(p("call mom tonight")).toMatchObject({ text: "call mom", due: T, time: "19:00" });
  });
  test("weekday names go forward", () => {
    expect(p("dinner with sam friday at 7")).toMatchObject({ text: "dinner with sam", due: "2026-11-20", time: "19:00" });
    expect(p("standup tuesday")).toMatchObject({ due: "2026-11-24" }); // today is Tuesday → next week
    expect(p("dentist next friday")).toMatchObject({ text: "dentist", due: "2026-11-27" });
    expect(p("drop off parcel on sat")).toMatchObject({ text: "drop off parcel", due: "2026-11-21" });
  });
  test("short day names are only dates when it's clear", () => {
    expect(p("buy sun cream")).toMatchObject({ text: "buy sun cream", due: null });
    expect(p("sat down with the budget")).toMatchObject({ due: null });
  });
  test("month + day, rolling into next year when past", () => {
    expect(p("pay rent nov 30")).toMatchObject({ text: "pay rent", due: "2026-11-30" });
    expect(p("pay rent 30 nov")).toMatchObject({ text: "pay rent", due: "2026-11-30" });
    expect(p("renew passport jan 5")).toMatchObject({ due: "2027-01-05" });
    expect(p("tax stuff on the 3rd of march")).toMatchObject({ text: "tax stuff", due: "2027-03-03" });
    expect(p("party 12/24")).toMatchObject({ text: "party", due: "2026-12-24" });
  });
  test("relative", () => {
    expect(p("follow up in 3 days")).toMatchObject({ text: "follow up", due: "2026-11-20" });
    expect(p("check tires in two weeks")).toMatchObject({ due: "2026-12-01" });
    expect(p("plan trip next week")).toMatchObject({ text: "plan trip", due: "2026-11-23" });
  });
  test("repeats", () => {
    expect(p("water plants every sunday")).toMatchObject({ text: "water plants", due: "2026-11-22", repeat: "wd:0" });
    expect(p("stretch every weekday 7:30am")).toMatchObject({ text: "stretch", due: T, time: "07:30", repeat: "weekdays" });
    expect(p("pay rent every month")).toMatchObject({ text: "pay rent", repeat: "monthly", due: T });
    expect(p("vitamins daily")).toMatchObject({ text: "vitamins", repeat: "daily", due: T });
    expect(p("pay rent every month dec 1")).toMatchObject({ repeat: "monthly", due: "2026-12-01" });
  });
  test("time alone means today", () => {
    expect(p("call bank at 3pm")).toMatchObject({ text: "call bank", due: T, time: "15:00" });
    expect(p("lunch at noon")).toMatchObject({ text: "lunch", due: T, time: "12:00" });
  });
  test("numbers that aren't times are left alone", () => {
    expect(p("buy 2 apples")).toMatchObject({ text: "buy 2 apples", time: null, due: null });
    expect(p("take 2 a day")).toMatchObject({ time: null });
  });
  test("someday clears a date", () => {
    expect(p("learn piano someday")).toMatchObject({ text: "learn piano", due: null, clearDate: true });
  });
});

describe("repeats", () => {
  test("next occurrence", () => {
    expect(nextOccurrence("wd:0", "2026-11-22", "2026-11-22")).toBe("2026-11-29");
    expect(nextOccurrence("weekdays", T, "2026-11-20")).toBe("2026-11-23");
    expect(nextOccurrence("monthly", "2026-01-31", "2026-01-31")).toBe("2026-02-28");
    expect(nextOccurrence("monthly", "2026-01-31", "2026-02-28")).toBe("2026-03-31");
  });
  test("missed repeats collapse to the latest", () => {
    expect(latestOccurrence("wd:0", "2026-10-25", T)).toBe("2026-11-15");
    expect(latestOccurrence("daily", "2026-11-01", T)).toBe(T);
    expect(latestOccurrence("monthly", "2026-08-05", T)).toBe("2026-11-05");
  });
});

const item = (over: Partial<Item>): Item => ({
  id: "a",
  text: "x",
  due: null,
  time: null,
  repeat: null,
  pinned: false,
  done: false,
  doneAt: null,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("upkeep rules", () => {
  test("dated items appear on Today on their day", () => {
    expect(onToday(item({ due: T }), T)).toBe(true);
    expect(onToday(item({ due: "2026-11-18" }), T)).toBe(false);
    expect(onUpcoming(item({ due: "2026-11-18" }), T)).toBe(true);
  });
  test("missed items carry over for a week, then fall back to the Notebook", () => {
    const yesterday = item({ due: "2026-11-16" });
    expect(onToday(yesterday, T)).toBe(true);
    expect(isCarriedOver(yesterday, T)).toBe(true);
    expect(onToday(item({ due: "2026-11-10" }), T)).toBe(true); // 7 days
    expect(onToday(item({ due: "2026-11-09" }), T)).toBe(false); // 8 days
  });
  test("repeating items never go stale; they show once at their latest date", () => {
    const plants = item({ due: "2026-10-04", repeat: "wd:0" });
    expect(effectiveDue(plants, T)).toBe("2026-11-15");
    expect(onToday(plants, T)).toBe(true);
  });
  test("pinned items are on Today regardless of date", () => {
    expect(onToday(item({ pinned: true }), T)).toBe(true);
    expect(onToday(item({ pinned: true, due: "2027-01-01" }), T)).toBe(true);
  });
  test("completing a repeat moves it on and keeps a done record", () => {
    const [moved, record] = completeItem(item({ due: "2026-11-15", repeat: "wd:0" }), T, () => "b", 1);
    expect(moved).toMatchObject({ id: "a", due: "2026-11-22", done: false });
    expect(record).toMatchObject({ id: "b", done: true, doneAt: T, repeat: null });
  });
});
