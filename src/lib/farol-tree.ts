import { prisma } from "@/lib/prisma";
import { getDeviationPct, getKpiStatusFromThresholds, thresholdsForPeriod } from "@/lib/kpi";
import { MONTH_LABELS, periodsOfYear, type FarolCell } from "@/lib/farol";
import { buildBandPoint, type BandPoint } from "@/lib/band-chart";

export type { BandPoint };

export type FarolTreeNode = {
  kpiId: string;
  name: string;
  metricUnit: string;
  sequenceNumber: number;
  description: string | null;
  chronicRedMonths: number | null;
  ownerId: string;
  ownerName: string;
  /** Display order / "P" column (lower = higher priority). */
  priority: number;
  /** "C" column — PMB or KPI. */
  category: "PMB" | "KPI";
  auxiliary: boolean;
  cells: FarolCell[];
  bandData: BandPoint[];
  children: FarolTreeNode[];
};

/**
 * Same shape the farol grid needs, but for a whole owner subtree (self +
 * subordinates) rather than one person, and carrying a full year of cells per
 * node instead of a single period — the tree structure mirrors buildKpiTree,
 * the per-cell math mirrors buildFarolRows.
 */
export async function buildFarolTree(ownerIds: string[], year: number, visibleKpiIds: string[] = []): Promise<FarolTreeNode[]> {
  const periods = periodsOfYear(year);

  const kpis = await prisma.kpi.findMany({
    where: {
      archivedAt: null,
      OR: [{ ownerId: { in: ownerIds } }, ...(visibleKpiIds.length ? [{ id: { in: visibleKpiIds } }] : [])],
    },
    include: {
      owner: { select: { id: true, name: true } },
      measurements: {
        where: { period: { gte: periods[0], lte: periods[11] } },
        select: {
          id: true,
          period: true,
          goal: true,
          actual: true,
          forecast: true,
          measured: true,
          justification: true,
        },
      },
      thresholdValidities: {
        select: {
          startPeriod: true,
          endPeriod: true,
          yellowRange: true,
          redRange: true,
          thresholdMode: true,
          lowerLimit: true,
          upperLimit: true,
          clientMetaFrom: true,
          clientMetaTo: true,
          amplitudeMonth: true,
          amplitudeYear: true,
        },
      },
    },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });

  const byId = new Map<string, FarolTreeNode>();
  for (const kpi of kpis) {
    const byPeriod = new Map(kpi.measurements.map((m) => [m.period, m]));

    const cells: FarolCell[] = periods.map((period, i) => {
      const m = byPeriod.get(period);
      const thresholds = thresholdsForPeriod(period, kpi, kpi.thresholdValidities);
      if (!m) {
        return {
          period,
          monthLabel: MONTH_LABELS[i],
          goal: null,
          actual: null,
          forecast: null,
          measured: false,
          justification: null,
          deviation: null,
          status: "SEM_DADO",
          measurementId: null,
        };
      }
      return {
        period,
        monthLabel: MONTH_LABELS[i],
        goal: m.goal,
        actual: m.actual,
        forecast: m.forecast,
        measured: m.measured,
        justification: m.justification,
        deviation: getDeviationPct(m.goal, m.actual, kpi.direction),
        status: getKpiStatusFromThresholds(m.goal, m.actual, kpi.direction, thresholds),
        measurementId: m.id,
      };
    });

    // Same band builder as detalhe / multigráficos so Barras never invents a
    // Meta line for goal===0 sem realizado.
    const bandData: BandPoint[] = cells.map((cell) => {
      const thresholds = thresholdsForPeriod(cell.period, kpi, kpi.thresholdValidities);
      const absolute =
        thresholds.thresholdMode === "ABSOLUTE" &&
        thresholds.lowerLimit != null &&
        thresholds.upperLimit != null
          ? { lower: thresholds.lowerLimit, upper: thresholds.upperLimit }
          : null;
      return buildBandPoint({
        name: cell.monthLabel,
        goal: cell.goal,
        actual: cell.actual,
        yellowRange: thresholds.yellowRange,
        absoluteLimits: absolute,
      });
    });

    byId.set(kpi.id, {
      kpiId: kpi.id,
      name: kpi.name,
      metricUnit: kpi.metricUnit,
      sequenceNumber: kpi.sequenceNumber,
      description: kpi.description,
      chronicRedMonths: kpi.chronicRedMonths,
      ownerId: kpi.owner.id,
      ownerName: kpi.owner.name,
      priority: kpi.priority,
      category: kpi.category,
      auxiliary: kpi.auxiliary,
      cells,
      bandData,
      children: [],
    });
  }

  // Same cycle-safety as buildKpiTree: a bad parent link promotes the node to
  // root instead of erasing it from the view.
  const roots: FarolTreeNode[] = [];
  for (const kpi of kpis) {
    const node = byId.get(kpi.id)!;
    const parent = kpi.parentId ? byId.get(kpi.parentId) : undefined;
    if (parent && !isAncestorOf(node.kpiId, kpi.parentId!, kpis)) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

function isAncestorOf(
  nodeId: string,
  startParentId: string,
  kpis: { id: string; parentId: string | null }[]
): boolean {
  const parentOf = new Map(kpis.map((k) => [k.id, k.parentId]));
  const seen = new Set<string>();
  let cursor: string | null | undefined = startParentId;
  while (cursor) {
    if (cursor === nodeId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = parentOf.get(cursor);
  }
  return false;
}
