import { describe, it, expect } from "vitest";
import {
  buildFarolRows,
  periodsOfYear,
  availableYears,
  summarizeRow,
  type FarolKpiInput,
} from "./farol";

function kpi(overrides: Partial<FarolKpiInput> = {}): FarolKpiInput {
  return {
    id: "kpi-1",
    name: "Refugo de tecelagem",
    metricUnit: "%",
    direction: "MORE",
    yellowRange: 10,
    redRange: 20,
    owner: { name: "Julia" },
    measurements: [],
    ...overrides,
  };
}

const m = (period: string, goal: number, actual: number | null, id = `m-${period}`) => ({
  id,
  period,
  goal,
  actual,
});

describe("periodsOfYear", () => {
  it("returns the 12 months of the year in order, zero-padded", () => {
    const periods = periodsOfYear(2026);
    expect(periods).toHaveLength(12);
    expect(periods[0]).toBe("2026-01");
    expect(periods[8]).toBe("2026-09");
    expect(periods[11]).toBe("2026-12");
  });
});

describe("availableYears", () => {
  it("always includes the current year, even with no data", () => {
    expect(availableYears([], 2026)).toEqual([2026]);
  });

  it("merges years found in the data, newest first, without duplicates", () => {
    const years = availableYears(["2024-03", "2024-11", "2025-01"], 2026);
    expect(years).toEqual([2026, 2025, 2024]);
  });
});

describe("buildFarolRows", () => {
  it("always produces exactly 12 cells, even with no measurements", () => {
    const [row] = buildFarolRows([kpi()], 2026);
    expect(row.cells).toHaveLength(12);
    expect(row.cells.every((c) => c.status === "SEM_DADO")).toBe(true);
    expect(row.cells[0]).toMatchObject({ period: "2026-01", goal: null, actual: null });
  });

  it("keeps the cells aligned to the month header when data is sparse", () => {
    const [row] = buildFarolRows([kpi({ measurements: [m("2026-03", 100, 90)] })], 2026);
    expect(row.cells.map((c) => c.monthLabel)).toEqual([
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ]);
    expect(row.cells[2]).toMatchObject({ period: "2026-03", goal: 100, actual: 90 });
    expect(row.cells[1].status).toBe("SEM_DADO");
  });

  it("ignores measurements from another year", () => {
    const [row] = buildFarolRows(
      [kpi({ measurements: [m("2025-03", 100, 90), m("2026-03", 100, 110)] })],
      2026
    );
    expect(row.cells[2].actual).toBe(110);
    expect(row.cells.filter((c) => c.actual !== null)).toHaveLength(1);
  });

  it("recomputes status from the KPI's current thresholds", () => {
    // Gap of 15%: yellow at 10 and red at 20 makes this VERMELHO...
    const strict = buildFarolRows([kpi({ measurements: [m("2026-01", 100, 85)] })], 2026);
    expect(strict[0].cells[0].status).toBe("VERMELHO");

    // ...while a wider yellow band makes the very same numbers AMARELO.
    const lenient = buildFarolRows(
      [kpi({ yellowRange: 20, redRange: 30, measurements: [m("2026-01", 100, 85)] })],
      2026
    );
    expect(lenient[0].cells[0].status).toBe("AMARELO");
  });

  it("respects direction when computing the deviation", () => {
    const [row] = buildFarolRows(
      [kpi({ direction: "LESS", measurements: [m("2026-01", 100, 90)] })],
      2026
    );
    expect(row.cells[0].deviation).toBe(10);
    expect(row.cells[0].status).toBe("VERDE");
  });

  it("carries the measurement id so a cell can link to its FCA", () => {
    const [row] = buildFarolRows(
      [kpi({ measurements: [m("2026-01", 100, 50, "meas-42")] })],
      2026
    );
    expect(row.cells[0].measurementId).toBe("meas-42");
    expect(row.cells[1].measurementId).toBeNull();
  });

  it("preserves the order of the KPIs it was given", () => {
    const rows = buildFarolRows(
      [kpi({ id: "a", name: "A" }), kpi({ id: "b", name: "B" })],
      2026
    );
    expect(rows.map((r) => r.kpiId)).toEqual(["a", "b"]);
  });
});

describe("summarizeRow", () => {
  it("counts every tier and always totals twelve", () => {
    const [row] = buildFarolRows(
      [
        kpi({
          measurements: [
            m("2026-01", 100, 110), // VERDE
            m("2026-02", 100, 95), // AMARELO
            m("2026-03", 100, 85), // VERMELHO
            m("2026-04", 100, 70), // CRITICO
          ],
        }),
      ],
      2026
    );
    const counts = summarizeRow(row);
    expect(counts).toMatchObject({ VERDE: 1, AMARELO: 1, VERMELHO: 1, CRITICO: 1, SEM_DADO: 8 });
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(12);
  });
});
