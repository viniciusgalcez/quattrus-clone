import { describe, it, expect } from "vitest";
import {
  countFarolTabMatches,
  filterFarolTreeByTab,
  nodeMatchesFarolTab,
  parseFarolTab,
  type FarolTabFilterOptions,
} from "./farol-tabs";
import type { FarolTreeNode } from "./farol-tree";
import type { FarolCell } from "./farol";

function cell(overrides: Partial<FarolCell> = {}): FarolCell {
  return {
    period: "2026-09",
    monthLabel: "Set",
    goal: 10,
    actual: 10,
    forecast: null,
    measured: true,
    justification: null,
    deviation: 0,
    status: "VERDE",
    measurementId: "m1",
    ...overrides,
  };
}

function node(overrides: Partial<FarolTreeNode> & { kpiId: string }): FarolTreeNode {
  return {
    name: overrides.kpiId,
    metricUnit: "%",
    ownerId: "user-1",
    ownerName: "Ana",
    priority: 0,
    category: "KPI",
    auxiliary: false,
    cells: [cell()],
    bandData: [],
    children: [],
    ...overrides,
  };
}

const baseOpts: FarolTabFilterOptions = {
  userId: "user-1",
  ownerIds: new Set(["user-1", "user-2"]),
  delegatedKpiIds: new Set(["deleg-1"]),
  currentPeriod: "2026-09",
};

describe("farol-tabs", () => {
  it("parses known tabs and defaults to meus", () => {
    expect(parseFarolTab("auxiliares")).toBe("auxiliares");
    expect(parseFarolTab("nope")).toBe("meus");
    expect(parseFarolTab(undefined)).toBe("meus");
  });

  it("matches meus / auxiliares / delegados / vermelhos", () => {
    const mine = node({ kpiId: "a", ownerId: "user-1", auxiliary: false });
    const aux = node({ kpiId: "b", ownerId: "user-1", auxiliary: true });
    const deleg = node({ kpiId: "deleg-1", ownerId: "user-9", auxiliary: false });
    const teamRed = node({
      kpiId: "c",
      ownerId: "user-2",
      cells: [cell({ status: "VERMELHO" })],
    });

    expect(nodeMatchesFarolTab(mine, "meus", baseOpts)).toBe(true);
    expect(nodeMatchesFarolTab(aux, "meus", baseOpts)).toBe(false);
    expect(nodeMatchesFarolTab(aux, "auxiliares", baseOpts)).toBe(true);
    expect(nodeMatchesFarolTab(deleg, "delegados", baseOpts)).toBe(true);
    expect(nodeMatchesFarolTab(teamRed, "vermelhos", baseOpts)).toBe(true);
    expect(nodeMatchesFarolTab(mine, "vermelhos", baseOpts)).toBe(false);
  });

  it("keeps ancestors when a child matches meus", () => {
    const tree = [
      node({
        kpiId: "parent",
        children: [node({ kpiId: "child-aux", auxiliary: true })],
      }),
    ];
    const filtered = filterFarolTreeByTab(tree, "auxiliares", baseOpts);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].kpiId).toBe("parent");
    expect(filtered[0].children.map((c) => c.kpiId)).toEqual(["child-aux"]);
  });

  it("flattens vermelhos matches", () => {
    const tree = [
      node({
        kpiId: "parent",
        ownerId: "user-1",
        children: [
          node({
            kpiId: "red-child",
            ownerId: "user-2",
            cells: [cell({ status: "CRITICO" })],
          }),
        ],
      }),
    ];
    const filtered = filterFarolTreeByTab(tree, "vermelhos", baseOpts);
    expect(filtered.map((n) => n.kpiId)).toEqual(["red-child"]);
  });

  it("counts only self-matching nodes", () => {
    const tree = [
      node({
        kpiId: "parent",
        children: [node({ kpiId: "child-aux", auxiliary: true })],
      }),
    ];
    expect(countFarolTabMatches(tree, "auxiliares", baseOpts)).toBe(1);
    expect(countFarolTabMatches(tree, "meus", baseOpts)).toBe(1);
  });
});
