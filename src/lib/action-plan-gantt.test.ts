import { describe, expect, it } from "vitest";
import {
  datesFromMonthSpan,
  defaultGanttYear,
  isStepOverdue,
  monthPosition,
  resizeSpanEnd,
  resizeSpanStart,
  shiftSpan,
  stepMonthSpan,
} from "./action-plan-gantt";

describe("monthPosition", () => {
  it("uses fallback when date is missing", () => {
    expect(monthPosition(null, 3)).toBe(3);
    expect(monthPosition(undefined, 15)).toBe(12);
  });

  it("reads 1-based month from a Date", () => {
    expect(monthPosition(new Date(2026, 0, 15), 1)).toBe(1);
    expect(monthPosition(new Date(2026, 11, 1), 1)).toBe(12);
  });
});

describe("stepMonthSpan", () => {
  it("returns null when both dates are missing", () => {
    expect(stepMonthSpan(null, null, 2026)).toBeNull();
  });

  it("clamps a multi-month step inside the year", () => {
    expect(stepMonthSpan(new Date(2026, 2, 1), new Date(2026, 5, 30), 2026)).toEqual({
      startMonth: 3,
      endMonth: 6,
    });
  });

  it("returns null when the step is entirely outside the year", () => {
    expect(stepMonthSpan(new Date(2025, 0, 1), new Date(2025, 5, 1), 2026)).toBeNull();
    expect(stepMonthSpan(new Date(2027, 0, 1), new Date(2027, 2, 1), 2026)).toBeNull();
  });

  it("uses a single date as both ends", () => {
    expect(stepMonthSpan(new Date(2026, 8, 10), null, 2026)).toEqual({ startMonth: 9, endMonth: 9 });
    expect(stepMonthSpan(null, new Date(2026, 3, 1), 2026)).toEqual({ startMonth: 4, endMonth: 4 });
  });
});

describe("datesFromMonthSpan / shift / resize", () => {
  it("maps months to local first/last day strings", () => {
    expect(datesFromMonthSpan(2026, { startMonth: 3, endMonth: 5 })).toEqual({
      startDate: "2026-03-01",
      dueDate: "2026-05-31",
    });
  });

  it("shifts a bar without leaving 1–12", () => {
    expect(shiftSpan({ startMonth: 2, endMonth: 4 }, 2)).toEqual({ startMonth: 4, endMonth: 6 });
    expect(shiftSpan({ startMonth: 1, endMonth: 3 }, -2)).toEqual({ startMonth: 1, endMonth: 3 });
    expect(shiftSpan({ startMonth: 10, endMonth: 12 }, 3)).toEqual({ startMonth: 10, endMonth: 12 });
  });

  it("resizes edges without inverting the span", () => {
    expect(resizeSpanStart({ startMonth: 3, endMonth: 8 }, 5)).toEqual({ startMonth: 5, endMonth: 8 });
    expect(resizeSpanStart({ startMonth: 3, endMonth: 8 }, 10)).toEqual({ startMonth: 8, endMonth: 8 });
    expect(resizeSpanEnd({ startMonth: 3, endMonth: 8 }, 6)).toEqual({ startMonth: 3, endMonth: 6 });
    expect(resizeSpanEnd({ startMonth: 3, endMonth: 8 }, 1)).toEqual({ startMonth: 3, endMonth: 3 });
  });
});

describe("isStepOverdue", () => {
  const noon = new Date(2026, 9, 1, 12, 0, 0);

  it("ignores concluded steps", () => {
    expect(isStepOverdue({ status: "CONCLUIDO", dueDate: new Date(2026, 0, 1) }, noon)).toBe(false);
  });

  it("flags open steps past due", () => {
    expect(isStepOverdue({ status: "ABERTO", dueDate: new Date(2026, 8, 30) }, noon)).toBe(true);
    expect(isStepOverdue({ status: "ABERTO", dueDate: new Date(2026, 9, 1) }, noon)).toBe(false);
    expect(isStepOverdue({ status: "ABERTO", dueDate: null }, noon)).toBe(false);
  });
});

describe("defaultGanttYear", () => {
  it("prefers the first step with a date", () => {
    expect(defaultGanttYear([{ startDate: null, dueDate: null }, { startDate: new Date(2025, 5, 1) }])).toBe(2025);
  });

  it("falls back when no dates exist", () => {
    expect(defaultGanttYear([], 2030)).toBe(2030);
  });
});
