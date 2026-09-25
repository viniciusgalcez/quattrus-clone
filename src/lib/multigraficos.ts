import { prisma } from "@/lib/prisma";
import { periodsOfYear, MONTH_LABELS } from "@/lib/farol";
import type { BandPoint } from "@/lib/farol-tree";

export type MultigraficoKpi = {
  id: string;
  name: string;
  metricUnit: string;
  ownerName: string;
  bandData: BandPoint[];
};

export const MAX_MULTICHART_SLOTS = 4;

export type MultiChartSlot = {
  position: number;
  kpiId: string;
};

export function normalizeMultiChartSlots(value: unknown): MultiChartSlot[] {
  if (!Array.isArray(value)) return [];

  const seenPositions = new Set<number>();
  const seenKpis = new Set<string>();
  const slots: MultiChartSlot[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const { position, kpiId } = raw as { position?: unknown; kpiId?: unknown };
    if (
      typeof position !== "number" ||
      !Number.isInteger(position) ||
      position < 0 ||
      position >= MAX_MULTICHART_SLOTS
    ) {
      continue;
    }
    if (typeof kpiId !== "string" || kpiId.trim().length === 0) continue;
    if (seenPositions.has(position) || seenKpis.has(kpiId)) continue;

    seenPositions.add(position);
    seenKpis.add(kpiId);
    slots.push({ position, kpiId });
  }

  return slots.sort((a, b) => a.position - b.position);
}

export function setMultiChartSlot(slots: unknown, position: number, kpiId: string): MultiChartSlot[] {
  if (!Number.isInteger(position) || position < 0 || position >= MAX_MULTICHART_SLOTS) {
    throw new Error("Posição inválida.");
  }

  return normalizeMultiChartSlots([
    ...normalizeMultiChartSlots(slots).filter((slot) => slot.position !== position && slot.kpiId !== kpiId),
    { position, kpiId },
  ]);
}

export function clearMultiChartSlot(slots: unknown, position: number): MultiChartSlot[] {
  if (!Number.isInteger(position) || position < 0 || position >= MAX_MULTICHART_SLOTS) {
    throw new Error("Posição inválida.");
  }

  return normalizeMultiChartSlots(slots).filter((slot) => slot.position !== position);
}

export function kpiIdsFromMultiChartSlots(slots: unknown): string[] {
  return normalizeMultiChartSlots(slots).map((slot) => slot.kpiId);
}

/**
 * Fetches the same "realizado vs. meta ± faixa verde" series as the farol
 * tree's per-node chart, but for an arbitrary, user-picked set of KPIs —
 * the data source behind the Multigráficos 2x2 comparison grid.
 */
export async function buildMultigraficoData(
  kpiIds: string[],
  year: number,
  ownerIds: string[]
): Promise<MultigraficoKpi[]> {
  if (kpiIds.length === 0) return [];
  if (ownerIds.length === 0) return [];
  const periods = periodsOfYear(year);

  const kpis = await prisma.kpi.findMany({
    where: { id: { in: kpiIds }, ownerId: { in: ownerIds }, archivedAt: null },
    include: {
      owner: { select: { name: true } },
      measurements: {
        where: { period: { gte: periods[0], lte: periods[11] } },
        select: { period: true, goal: true, actual: true },
      },
    },
  });

  // Preserve the order the caller picked the KPIs in, not the DB's.
  const byId = new Map(kpis.map((k) => [k.id, k]));

  return kpiIds
    .map((id) => byId.get(id))
    .filter((k): k is NonNullable<typeof k> => !!k)
    .map((kpi) => {
      const byPeriod = new Map(kpi.measurements.map((m) => [m.period, m]));
      const bandData: BandPoint[] = periods.map((period, i) => {
        const m = byPeriod.get(period);
        if (!m) return { name: MONTH_LABELS[i], meta: null, realizado: null, faixaBase: null, faixaAltura: null };
        const tolerance = (m.goal * kpi.yellowRange) / 100;
        const low = m.goal - tolerance;
        const high = m.goal + tolerance;
        return { name: MONTH_LABELS[i], meta: m.goal, realizado: m.actual, faixaBase: low, faixaAltura: high - low };
      });

      return {
        id: kpi.id,
        name: kpi.name,
        metricUnit: kpi.metricUnit,
        ownerName: kpi.owner.name,
        bandData,
      };
    });
}
