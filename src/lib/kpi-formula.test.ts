import { describe, expect, it } from "vitest";
import { calculateFormula, roundFormulaValue } from "./kpi-formula";

describe("calculateFormula", () => {
  it("returns the manual value", () => {
    expect(calculateFormula("MANUAL", [{ value: 12 }])).toEqual({ value: 12 });
  });

  it("calculates sum and totalizer", () => {
    expect(calculateFormula("SUM", [{ value: 10 }, { value: 5 }, { value: null }])).toEqual({ value: 15 });
    expect(calculateFormula("TOTALIZER", [{ value: 2 }, { value: 3 }])).toEqual({ value: 5 });
  });

  it("calculates average and weighted average", () => {
    expect(calculateFormula("AVERAGE", [{ value: 10 }, { value: 20 }])).toEqual({ value: 15 });
    expect(calculateFormula("WEIGHTED", [{ value: 10, weight: 1 }, { value: 20, weight: 3 }])).toEqual({ value: 17.5 });
  });

  it("calculates quotients without hiding a zero denominator", () => {
    expect(calculateFormula("QUOTIENT", [], { numerator: 20, denominator: 4 })).toEqual({ value: 5 });
    expect(calculateFormula("QUOTIENT", [], { numerator: 20, denominator: 0 })).toEqual({ value: null, reason: "ZERO_DENOMINATOR" });
  });

  it("reports missing data and rounds safely", () => {
    expect(calculateFormula("AVERAGE", [{ value: null }])).toEqual({ value: null, reason: "NO_DATA" });
    expect(roundFormulaValue(12.345, 2)).toBe(12.35);
    expect(roundFormulaValue(null)).toBeNull();
  });
});
