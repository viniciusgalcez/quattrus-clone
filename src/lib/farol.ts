import type { Direction } from "@prisma/client";
import { getDeviationPct, getKpiStatus, type KpiStatus } from "@/lib/kpi";

export const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

/** The 12 periods of a year, in order: 2026-01 … 2026-12. */
export function periodsOfYear(year: number): string[] {
  return MONTH_LABELS.map((_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

export function yearOf(period: string): number {
  return Number(period.slice(0, 4));
}

/**
 * Years offered in the selector: every year that has data, plus the current
 * one, so a fresh account still sees a usable grid.
 */
export function availableYears(periods: string[], currentYear: number): number[] {
  const years = new Set<number>([currentYear]);
  for (const p of periods) {
    const y = yearOf(p);
    if (Number.isFinite(y) && y > 0) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export type FarolCell = {
  period: string;
  monthLabel: string;
  goal: number | null;
  actual: number | null;
  deviation: number | null;
  status: KpiStatus;
  measurementId: string | null;
};

export type FarolRow = {
  kpiId: string;
  name: string;
  metricUnit: string;
  ownerName: string | null;
  cells: FarolCell[];
};

/** The shape the builder needs — deliberately narrower than the Prisma model. */
export type FarolKpiInput = {
  id: string;
  name: string;
  metricUnit: string;
  direction: Direction;
  yellowRange: number;
  redRange: number;
  owner?: { name: string } | null;
  measurements: {
    id: string;
    period: string;
    goal: number;
    actual: number | null;
  }[];
};

/**
 * One row per KPI, always exactly 12 cells regardless of how many measurements
 * exist — a month with no data is a SEM_DADO cell, not a missing column, or
 * the grid would misalign against its header.
 *
 * Status is recomputed from the KPI's *current* thresholds rather than read
 * from the stored `trafficLight` column, matching `buildKpiTree`: editing a
 * KPI's ranges does not rewrite past measurements, so the stored value goes
 * stale and the farol would disagree with the dashboard.
 */
export function buildFarolRows(kpis: FarolKpiInput[], year: number): FarolRow[] {
  const periods = periodsOfYear(year);

  return kpis.map((kpi) => {
    const byPeriod = new Map(kpi.measurements.map((m) => [m.period, m]));

    const cells: FarolCell[] = periods.map((period, index) => {
      const m = byPeriod.get(period);
      if (!m) {
        return {
          period,
          monthLabel: MONTH_LABELS[index],
          goal: null,
          actual: null,
          deviation: null,
          status: "SEM_DADO",
          measurementId: null,
        };
      }
      return {
        period,
        monthLabel: MONTH_LABELS[index],
        goal: m.goal,
        actual: m.actual,
        deviation: getDeviationPct(m.goal, m.actual, kpi.direction),
        status: getKpiStatus(m.goal, m.actual, kpi.direction, kpi.yellowRange, kpi.redRange),
        measurementId: m.id,
      };
    });

    return {
      kpiId: kpi.id,
      name: kpi.name,
      metricUnit: kpi.metricUnit,
      ownerName: kpi.owner?.name ?? null,
      cells,
    };
  });
}

/** Counts per status across a whole row — drives the "resumo do ano" column. */
export function summarizeRow(row: FarolRow): Record<KpiStatus, number> {
  const counts: Record<KpiStatus, number> = {
    VERDE: 0,
    AMARELO: 0,
    VERMELHO: 0,
    CRITICO: 0,
    SEM_DADO: 0,
  };
  for (const cell of row.cells) counts[cell.status]++;
  return counts;
}
