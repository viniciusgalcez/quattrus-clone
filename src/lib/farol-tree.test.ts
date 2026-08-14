import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFarolTree } from "./farol-tree";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { kpi: { findMany: vi.fn() } },
}));

const findMany = vi.mocked(prisma.kpi.findMany);
const stub = <T,>(value: T) => value as never;

function kpi(overrides: Record<string, unknown>) {
  return stub({
    id: overrides.id,
    name: overrides.name ?? "KPI",
    parentId: overrides.parentId ?? null,
    metricUnit: "R$",
    direction: "MORE",
    yellowRange: 10,
    redRange: 20,
    owner: { id: overrides.ownerId ?? "owner-1", name: overrides.ownerName ?? "Owner" },
    measurements: overrides.measurements ?? [],
    ...overrides,
  });
}

describe("buildFarolTree", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns a root for every kpi with no parent", async () => {
    findMany.mockResolvedValue([kpi({ id: "a" }), kpi({ id: "b" })]);
    const tree = await buildFarolTree(["owner-1"], 2026);
    expect(tree.map((n) => n.kpiId).sort()).toEqual(["a", "b"]);
  });

  it("nests a child under its parent", async () => {
    findMany.mockResolvedValue([kpi({ id: "parent" }), kpi({ id: "child", parentId: "parent" })]);
    const tree = await buildFarolTree(["owner-1"], 2026);
    expect(tree).toHaveLength(1);
    expect(tree[0].kpiId).toBe("parent");
    expect(tree[0].children.map((c) => c.kpiId)).toEqual(["child"]);
  });

  it("promotes a node to root when its parent is outside the visible set", async () => {
    findMany.mockResolvedValue([kpi({ id: "orphan", parentId: "outside-scope" })]);
    const tree = await buildFarolTree(["owner-1"], 2026);
    expect(tree.map((n) => n.kpiId)).toEqual(["orphan"]);
  });

  it("promotes the first node of a cycle to root instead of dropping the subtree", async () => {
    findMany.mockResolvedValue([kpi({ id: "a", parentId: "b" }), kpi({ id: "b", parentId: "a" })]);
    const tree = await buildFarolTree(["owner-1"], 2026);
    expect(tree.length).toBeGreaterThan(0);
  });

  it("produces 12 cells, one SEM_DADO per month with no measurement", async () => {
    findMany.mockResolvedValue([kpi({ id: "a" })]);
    const [node] = await buildFarolTree(["owner-1"], 2026);
    expect(node.cells).toHaveLength(12);
    expect(node.cells.every((c) => c.status === "SEM_DADO")).toBe(true);
  });

  it("computes the green band as goal ± yellowRange% around the month's goal", async () => {
    findMany.mockResolvedValue([
      kpi({ id: "a", yellowRange: 10, measurements: [{ id: "m1", period: "2026-01", goal: 100, actual: 95 }] }),
    ]);
    const [node] = await buildFarolTree(["owner-1"], 2026);
    const jan = node.bandData[0];
    expect(jan.meta).toBe(100);
    expect(jan.realizado).toBe(95);
    expect(jan.faixaBase).toBe(90);
    expect(jan.faixaAltura).toBe(20);
  });

  it("leaves the band null for a month with no measurement", async () => {
    findMany.mockResolvedValue([kpi({ id: "a" })]);
    const [node] = await buildFarolTree(["owner-1"], 2026);
    expect(node.bandData[0]).toEqual({
      name: "Jan",
      meta: null,
      realizado: null,
      faixaBase: null,
      faixaAltura: null,
    });
  });

  it("carries the owner id and name onto each node", async () => {
    findMany.mockResolvedValue([kpi({ id: "a", ownerId: "user-9", ownerName: "Julia" })]);
    const [node] = await buildFarolTree(["user-9"], 2026);
    expect(node.ownerId).toBe("user-9");
    expect(node.ownerName).toBe("Julia");
  });
});
