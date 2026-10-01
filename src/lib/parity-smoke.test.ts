import { describe, expect, it } from "vitest";
import { parseImportJobErrors, shouldQueueImport } from "./import-queue";
import { FORMULA_REASON_LABEL, calculateFormula } from "./kpi-formula";
import { buildBandPoint } from "./band-chart";
import { swapMultiChartSlots } from "./multigraficos";

/**
 * Lightweight parity smoke — pure functions covering the M3/M4 regression
 * surface without a browser. Manual E2E path is documented in
 * docs/roadmap-debug-matriz-testes.md.
 */
describe("parity smoke (F6–F8)", () => {
  it("band chart skips meta 0 without actual across shared builder", () => {
    expect(buildBandPoint({ name: "Jan", goal: 0, actual: null, yellowRange: 5 }).meta).toBeNull();
  });

  it("quotient zero denominator has a clear label", () => {
    const result = calculateFormula("QUOTIENT", [], { numerator: 10, denominator: 0 });
    expect(result.reason).toBe("ZERO_DENOMINATOR");
    expect(FORMULA_REASON_LABEL.ZERO_DENOMINATOR).toMatch(/Denominador zero/i);
  });

  it("multigráfico DnD swap moves into empty quadrant", () => {
    expect(swapMultiChartSlots([{ position: 0, kpiId: "a" }], 0, 2)).toEqual([{ position: 2, kpiId: "a" }]);
  });

  it("import queue thresholds and error parsing", () => {
    expect(shouldQueueImport(39)).toBe(false);
    expect(shouldQueueImport(40)).toBe(true);
    expect(parseImportJobErrors([{ line: 3, message: "meta inválida" }])).toEqual([
      { line: 3, message: "meta inválida" },
    ]);
  });
});
