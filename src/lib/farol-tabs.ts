import type { FarolTreeNode } from "@/lib/farol-tree";

export const FAROL_TABS = ["meus", "auxiliares", "delegados", "vermelhos"] as const;
export type FarolTab = (typeof FAROL_TABS)[number];

export const FAROL_TAB_LABEL: Record<FarolTab, string> = {
  meus: "Meus itens",
  auxiliares: "Auxiliares",
  delegados: "Delegados",
  vermelhos: "Vermelhos da equipe",
};

export function parseFarolTab(value: string | undefined | null): FarolTab {
  if (value && (FAROL_TABS as readonly string[]).includes(value)) return value as FarolTab;
  return "meus";
}

export type FarolTabFilterOptions = {
  userId: string;
  /** Owners in the rollup (self + hierarchy + facilitated). */
  ownerIds: Set<string>;
  delegatedKpiIds: Set<string>;
  /** Prefer reds in this period; fall back to any month in the year. */
  currentPeriod: string;
};

function isRedStatus(status: string): boolean {
  return status === "VERMELHO" || status === "CRITICO";
}

function nodeIsRed(node: FarolTreeNode, currentPeriod: string): boolean {
  const current = node.cells.find((cell) => cell.period === currentPeriod);
  if (current && isRedStatus(current.status)) return true;
  return node.cells.some((cell) => isRedStatus(cell.status));
}

/** True if this node itself belongs on the tab (ignores children). */
export function nodeMatchesFarolTab(
  node: FarolTreeNode,
  tab: FarolTab,
  opts: FarolTabFilterOptions
): boolean {
  switch (tab) {
    case "meus":
      return !node.auxiliary && opts.ownerIds.has(node.ownerId);
    case "auxiliares":
      return node.auxiliary && (opts.ownerIds.has(node.ownerId) || opts.delegatedKpiIds.has(node.kpiId));
    case "delegados":
      return opts.delegatedKpiIds.has(node.kpiId);
    case "vermelhos":
      return node.ownerId !== opts.userId && opts.ownerIds.has(node.ownerId) && nodeIsRed(node, opts.currentPeriod);
    default:
      return false;
  }
}

/**
 * Keeps a node when it matches or any descendant matches; prunes non-matching
 * branches so the grid stays hierarchical for Meus itens / Auxiliares.
 */
export function filterFarolTreeByTab(
  roots: FarolTreeNode[],
  tab: FarolTab,
  opts: FarolTabFilterOptions
): FarolTreeNode[] {
  const result: FarolTreeNode[] = [];
  for (const node of roots) {
    const children = filterFarolTreeByTab(node.children, tab, opts);
    const selfMatch = nodeMatchesFarolTab(node, tab, opts);

    // Delegados / vermelhos are flat exception views — each match is a root.
    if (tab === "delegados" || tab === "vermelhos") {
      if (selfMatch) result.push({ ...node, children: [] });
      result.push(...children);
      continue;
    }

    if (selfMatch || children.length > 0) {
      result.push({ ...node, children });
    }
  }
  return result;
}

/** Count of nodes that themselves match the tab (not ancestors kept only for structure). */
export function countFarolTabMatches(
  roots: FarolTreeNode[],
  tab: FarolTab,
  opts: FarolTabFilterOptions
): number {
  let count = 0;
  function walk(nodes: FarolTreeNode[]) {
    for (const node of nodes) {
      if (nodeMatchesFarolTab(node, tab, opts)) count += 1;
      walk(node.children);
    }
  }
  walk(roots);
  return count;
}
