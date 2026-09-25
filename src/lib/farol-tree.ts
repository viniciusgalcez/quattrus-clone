import { prisma } from "@/lib/prisma";
import { getDeviationPct, getKpiStatus, thresholdsForPeriod } from "@/lib/kpi";
import { MONTH_LABELS, periodsOfYear, type FarolCell } from "@/lib/farol";

export type BandPoint = {
  name: string;
  meta: number | null;
  realizado: number | null;
  /** Invisible base of the stacked bar — recharts' way of drawing a floating range bar. */
  faixaBase: number | null;
  faixaAltura: number | null;
};

export type FarolTreeNode = {
  kpiId: string;
  name: string;
  metricUnit: string;
  ownerId: string;
  ownerName: string;
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
        select: { id: true, period: true, goal: true, actual: true },
      },
      thresholdValidities: {
        select: { startPeriod: true, endPeriod: true, yellowRange: true, redRange: true },
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
        deviation: getDeviationPct(m.goal, m.actual, kpi.direction),
        status: getKpiStatus(m.goal, m.actual, kpi.direction, thresholds.yellowRange, thresholds.redRange),
        measurementId: m.id,
      };
    });

    // The green band is the tolerance zone around the goal (± yellowRange%,
    // the same threshold that decides VERDE vs AMARELO) — an approximation of
    // the real Quattrus "Faixa Verde" band, not a stored value of its own.
    const bandData: BandPoint[] = cells.map((cell) => {
      if (cell.goal === null) {
        return { name: cell.monthLabel, meta: null, realizado: null, faixaBase: null, faixaAltura: null };
      }
      const thresholds = thresholdsForPeriod(cell.period, kpi, kpi.thresholdValidities);
      const tolerance = (cell.goal * thresholds.yellowRange) / 100;
      const low = cell.goal - tolerance;
      const high = cell.goal + tolerance;
      return {
        name: cell.monthLabel,
        meta: cell.goal,
        realizado: cell.actual,
        faixaBase: low,
        faixaAltura: high - low,
      };
    });

    byId.set(kpi.id, {
      kpiId: kpi.id,
      name: kpi.name,
      metricUnit: kpi.metricUnit,
      ownerId: kpi.owner.id,
      ownerName: kpi.owner.name,
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
