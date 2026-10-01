import { prisma } from "@/lib/prisma";
import { periodsOfYear, MONTH_LABELS } from "@/lib/farol";
import { buildBandPoint, type BandPoint } from "@/lib/band-chart";
import { thresholdsForPeriod } from "@/lib/kpi";

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

/** Swap (or move into empty) two quadrant positions — DnD target. */
export function swapMultiChartSlots(slots: unknown, fromPosition: number, toPosition: number): MultiChartSlot[] {
  if (
    !Number.isInteger(fromPosition) ||
    !Number.isInteger(toPosition) ||
    fromPosition < 0 ||
    toPosition < 0 ||
    fromPosition >= MAX_MULTICHART_SLOTS ||
    toPosition >= MAX_MULTICHART_SLOTS
  ) {
    throw new Error("Posição inválida.");
  }
  if (fromPosition === toPosition) return normalizeMultiChartSlots(slots);

  const current = normalizeMultiChartSlots(slots);
  const from = current.find((slot) => slot.position === fromPosition);
  const to = current.find((slot) => slot.position === toPosition);
  const rest = current.filter((slot) => slot.position !== fromPosition && slot.position !== toPosition);
  const next: MultiChartSlot[] = [...rest];
  if (from) next.push({ position: toPosition, kpiId: from.kpiId });
  if (to) next.push({ position: fromPosition, kpiId: to.kpiId });
  return normalizeMultiChartSlots(next);
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
      thresholdValidities: {
        select: {
          startPeriod: true,
          endPeriod: true,
          yellowRange: true,
          redRange: true,
          thresholdMode: true,
          upperLimit: true,
          lowerLimit: true,
        },
      },
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
        if (!m) {
          return buildBandPoint({
            name: MONTH_LABELS[i],
            goal: null,
            actual: null,
            yellowRange: kpi.yellowRange,
          });
        }
        const thresholds = thresholdsForPeriod(period, kpi, kpi.thresholdValidities);
        const absolute =
          thresholds.thresholdMode === "ABSOLUTE" &&
          thresholds.lowerLimit != null &&
          thresholds.upperLimit != null
            ? { lower: thresholds.lowerLimit, upper: thresholds.upperLimit }
            : null;
        return buildBandPoint({
          name: MONTH_LABELS[i],
          goal: m.goal,
          actual: m.actual,
          yellowRange: thresholds.yellowRange,
          absoluteLimits: absolute,
        });
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
