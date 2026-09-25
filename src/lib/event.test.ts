import { describe, expect, it } from "vitest";
import { agendaRange, dateKey, normalizeEventCategoryFilters, parseAgendaAnchor } from "./event";

describe("agenda event helpers", () => {
  it("normalizes category filters and drops unknown values", () => {
    expect(normalizeEventCategoryFilters(["FEEDBACK", "INVALID", "FEEDBACK", "PEMPB"])).toEqual([
      "FEEDBACK",
      "PEMPB",
    ]);
  });

  it("returns no filters when the category query is absent", () => {
    expect(normalizeEventCategoryFilters(undefined)).toEqual([]);
  });

  it("formats agenda dates as stable URL keys", () => {
    expect(dateKey(new Date("2026-09-03T12:00:00"))).toBe("2026-09-03");
  });

  it("falls back when the agenda date query is malformed", () => {
    const fallback = new Date("2026-01-10T12:00:00");
    expect(parseAgendaAnchor("2026-9-3", fallback)).toBe(fallback);
  });

  it("builds a monday-to-monday week range for agenda queries", () => {
    const range = agendaRange("week", new Date("2026-09-08T12:00:00"));

    expect(dateKey(range.start)).toBe("2026-09-07");
    expect(dateKey(range.end)).toBe("2026-09-14");
  });
});
