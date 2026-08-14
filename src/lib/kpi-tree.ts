import { prisma } from "@/lib/prisma";
import { getDeviationPct, getKpiStatus, type KpiStatus } from "@/lib/kpi";
import type { Direction } from "@prisma/client";

export type KpiTreeNode = {
  id: string;
  name: string;
  metricUnit: string;
  direction: Direction;
  ownerName: string;
  departmentName: string | null;
  goal: number | null;
  actual: number | null;
  deviation: number | null;
  status: KpiStatus;
  children: KpiTreeNode[];
};

/**
 * Builds the indicator tree (parent → children) for a set of KPI owners in a
 * single query, then assembles it in memory. A KPI whose parent is outside the
 * visible set is promoted to a root so nothing disappears from the view.
 */
export async function buildKpiTree(ownerIds: string[], period: string): Promise<KpiTreeNode[]> {
  const kpis = await prisma.kpi.findMany({
    where: { ownerId: { in: ownerIds }, archivedAt: null },
    include: {
      owner: { select: { name: true } },
      department: { select: { name: true } },
      measurements: { where: { period } },
    },
    orderBy: [{ priority: "asc" }, { name: "asc" }],
  });

  const byId = new Map<string, KpiTreeNode>();
  for (const kpi of kpis) {
    const m = kpi.measurements[0] ?? null;
    byId.set(kpi.id, {
      id: kpi.id,
      name: kpi.name,
      metricUnit: kpi.metricUnit,
      direction: kpi.direction,
      ownerName: kpi.owner.name,
      departmentName: kpi.department?.name ?? null,
      goal: m?.goal ?? null,
      actual: m?.actual ?? null,
      deviation: m ? getDeviationPct(m.goal, m.actual, kpi.direction) : null,
      // Recomputed from the KPI's *current* thresholds rather than read from
      // the stored `trafficLight` column: editing a KPI's ranges does not
      // rewrite past measurements, so the stored value goes stale and this
      // view would disagree with the dashboard for the same KPI and period.
      status: m
        ? getKpiStatus(m.goal, m.actual, kpi.direction, kpi.yellowRange, kpi.redRange)
        : "SEM_DADO",
      children: [],
    });
  }

  // A parent cycle (A → B → A) would leave every node in the loop with a
  // resolvable parent and therefore no root, silently erasing the whole
  // subtree from the view. Walking up from each node and promoting the first
  // node of a cycle to a root keeps the data visible even if bad rows exist.
  const roots: KpiTreeNode[] = [];
  for (const kpi of kpis) {
    const node = byId.get(kpi.id)!;
    const parent = kpi.parentId ? byId.get(kpi.parentId) : undefined;
    if (parent && !isAncestorOf(node.id, kpi.parentId!, kpis)) parent.children.push(node);
    else roots.push(node);
  }

  return roots;
}

/** True if `nodeId` is reachable by walking up from `startParentId`. */
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

/**
 * True if making `candidateParentId` the parent of `kpiId` would close a loop.
 * The edit form only hides the KPI itself from the dropdown, so without this a
 * two-step edit (B under A, then A under B) creates a cycle server-side.
 */
export async function wouldCreateKpiCycle(
  kpiId: string,
  candidateParentId: string
): Promise<boolean> {
  const seen = new Set<string>();
  let cursor: string | null = candidateParentId;

  while (cursor) {
    if (cursor === kpiId) return true;
    if (seen.has(cursor)) return true; // pre-existing cycle upstream
    seen.add(cursor);
    const parent: { parentId: string | null } | null = await prisma.kpi.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = parent?.parentId ?? null;
  }

  return false;
}
