import { describe, it, expect, vi, afterEach } from "vitest";
import { getDeviationPct, getKpiStatus, currentPeriod, periodLabel, type KpiStatus } from "./kpi";
import type { Direction } from "@prisma/client";

describe("KPI Business Logic", () => {
  describe("getDeviationPct", () => {
    it("returns null when actual is null or undefined", () => {
      expect(getDeviationPct(100, null, "MORE")).toBeNull();
      expect(getDeviationPct(100, undefined, "LESS")).toBeNull();
    });

    it("calculates positive deviation for GREATER correctly", () => {
      // Goal 100, actual 110 => 10% over performance
      expect(getDeviationPct(100, 110, "MORE")).toBe(10);
      expect(getDeviationPct(100, 90, "MORE")).toBe(-10);
    });

    it("calculates positive deviation for LESS correctly", () => {
      // Goal 100, actual 90 => 10% better (because LESS is better)
      expect(getDeviationPct(100, 90, "LESS")).toBe(10);
      // Goal 100, actual 110 => 10% worse (because LESS is better)
      expect(getDeviationPct(100, 110, "LESS")).toBe(-10);
    });

    it("calculates deviation for EQUAL correctly", () => {
      // Equal means deviation should be 0 for exact match, negative otherwise
      expect(getDeviationPct(100, 100, "EQUAL")).toBe(-0); // absolute 0
      expect(getDeviationPct(100, 110, "EQUAL")).toBe(-10);
      expect(getDeviationPct(100, 90, "EQUAL")).toBe(-10);
    });
  });

  describe("getKpiStatus", () => {
    it("returns VERDE if deviation is >= 0", () => {
      // Deviation >= 0
      expect(getKpiStatus(100, 110, "MORE", 10, 20)).toBe("VERDE");
      expect(getKpiStatus(100, 100, "MORE", 10, 20)).toBe("VERDE");
      expect(getKpiStatus(100, 90, "LESS", 10, 20)).toBe("VERDE");
    });

    it("returns AMARELO if deviation is negative but within yellowRange", () => {
      // Goal 100, actual 95 => deviation -5. yellowRange 10 => AMARELO
      expect(getKpiStatus(100, 95, "MORE", 10, 20)).toBe("AMARELO");
      // Goal 100, actual 90 => deviation -10. yellowRange 10 => AMARELO (boundary check)
      expect(getKpiStatus(100, 90, "MORE", 10, 20)).toBe("AMARELO");
    });

    it("returns VERMELHO if deviation gap > yellowRange and <= redRange", () => {
      // Gap 15, yellow 10, red 20
      expect(getKpiStatus(100, 85, "MORE", 10, 20)).toBe("VERMELHO");
      // Gap 20, yellow 10, red 20
      expect(getKpiStatus(100, 80, "MORE", 10, 20)).toBe("VERMELHO");
    });

    it("returns CRITICO if deviation gap > redRange", () => {
      // Gap 25, yellow 10, red 20
      expect(getKpiStatus(100, 75, "MORE", 10, 20)).toBe("CRITICO");
    });

    it("returns SEM_DADO when no actual provided", () => {
      expect(getKpiStatus(100, null, "MORE", 10, 20)).toBe("SEM_DADO");
    });
  });

  // A goal of zero is ordinary in this domain ("meta: 0 acidentes"), and the
  // old implementation returned -100 for any non-zero actual regardless of
  // direction — painting a beaten goal as CRITICO.
  describe("getDeviationPct with a zero goal", () => {
    it("treats any positive result as beating a zero MORE goal", () => {
      expect(getDeviationPct(0, 5, "MORE")).toBe(100);
      expect(getKpiStatus(0, 5, "MORE", 10, 20)).toBe("VERDE");
    });

    it("treats any negative result as missing a zero MORE goal", () => {
      expect(getDeviationPct(0, -5, "MORE")).toBe(-100);
      expect(getKpiStatus(0, -5, "MORE", 10, 20)).toBe("CRITICO");
    });

    it("treats any positive result as missing a zero LESS goal", () => {
      expect(getDeviationPct(0, 3, "LESS")).toBe(-100);
      expect(getKpiStatus(0, 3, "LESS", 10, 20)).toBe("CRITICO");
    });

    it("treats a negative result as beating a zero LESS goal", () => {
      expect(getDeviationPct(0, -3, "LESS")).toBe(100);
      expect(getKpiStatus(0, -3, "LESS", 10, 20)).toBe("VERDE");
    });

    it("treats any deviation from a zero EQUAL goal as a miss", () => {
      expect(getDeviationPct(0, 3, "EQUAL")).toBe(-100);
      expect(getDeviationPct(0, -3, "EQUAL")).toBe(-100);
    });

    it("hits the goal exactly when actual is also zero, in every direction", () => {
      for (const d of ["MORE", "LESS", "EQUAL"] as Direction[]) {
        expect(getDeviationPct(0, 0, d)).toBe(0);
        expect(getKpiStatus(0, 0, d, 10, 20)).toBe("VERDE");
      }
    });
  });

  // The tier boundaries were only ever exercised for MORE; a sign regression
  // in the LESS/EQUAL branches would flip a manager's light unnoticed.
  describe("getKpiStatus tier matrix across directions", () => {
    const cases: [number, number, Direction, KpiStatus][] = [
      // LESS — lower is better, goal 100, yellow 10, red 20
      [100, 90, "LESS", "VERDE"],
      [100, 100, "LESS", "VERDE"],
      [100, 110, "LESS", "AMARELO"],
      [100, 111, "LESS", "VERMELHO"],
      [100, 120, "LESS", "VERMELHO"],
      [100, 121, "LESS", "CRITICO"],
      // EQUAL — symmetric, any drift is a miss
      [100, 100, "EQUAL", "VERDE"],
      [100, 110, "EQUAL", "AMARELO"],
      [100, 90, "EQUAL", "AMARELO"],
      [100, 115, "EQUAL", "VERMELHO"],
      [100, 85, "EQUAL", "VERMELHO"],
      [100, 125, "EQUAL", "CRITICO"],
      [100, 75, "EQUAL", "CRITICO"],
      // MORE — the just-past-boundary cases
      [100, 89, "MORE", "VERMELHO"],
      [100, 79, "MORE", "CRITICO"],
    ];

    it.each(cases)("goal %s actual %s (%s) -> %s", (goal, actual, direction, expected) => {
      expect(getKpiStatus(goal, actual, direction, 10, 20)).toBe(expected);
    });

    it("handles a negative goal using the absolute denominator", () => {
      expect(getKpiStatus(-50, -40, "MORE", 10, 20)).toBe("VERDE");
      // gap is exactly 20 — the red boundary, not yellow
      expect(getKpiStatus(-50, -60, "MORE", 10, 20)).toBe("VERMELHO");
      expect(getKpiStatus(-50, -55, "MORE", 10, 20)).toBe("AMARELO");
    });

    it("uses blue only for a strictly better positive goal", () => {
      expect(getKpiStatus(100, 120, "MORE", 10, 20)).toBe("VERDE");
      expect(getKpiStatus(100, 121, "MORE", 10, 20)).toBe("AZUL");
      expect(getKpiStatus(0, 5, "MORE", 10, 20)).toBe("VERDE");
      expect(getKpiStatus(-50, -40, "MORE", 10, 20)).toBe("VERDE");
    });

    it("falls back to the wider range when redRange is below yellowRange", () => {
      expect(getKpiStatus(100, 85, "MORE", 20, 10)).toBe("AMARELO");
      expect(getKpiStatus(100, 75, "MORE", 20, 10)).toBe("CRITICO");
    });

    it("classifies any miss as CRITICO when both ranges are zero", () => {
      expect(getKpiStatus(100, 100, "MORE", 0, 0)).toBe("VERDE");
      expect(getKpiStatus(100, 99, "MORE", 0, 0)).toBe("CRITICO");
    });
  });

  describe("period utils", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("pads a single-digit month and applies the month offset", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 5));
      expect(currentPeriod()).toBe("2026-01");
    });

    it("does not roll over on the last day of December", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 11, 31));
      expect(currentPeriod()).toBe("2026-12");
    });

    it("formats period label correctly", () => {
      expect(periodLabel("2024-01")).toBe("Jan/24");
      expect(periodLabel("2024-12")).toBe("Dez/24");
    });
  });
});
