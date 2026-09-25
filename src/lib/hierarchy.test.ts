import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSubordinateIds, wouldCreateCycle, canView, exportableOwnerIds } from "./hierarchy";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    subordination: {
      findMany: vi.fn(),
    },
  },
}));

const findMany = vi.mocked(prisma.user.findMany);
const subordinationFindMany = vi.mocked(prisma.subordination.findMany);

/** Builds a subordination.findMany implementation from a managerId -> reports map. */
function mockHierarchy(tree: Record<string, string[]>) {
  subordinationFindMany.mockImplementation((async (args: { where: { managerId: { in: string[] } } }) => {
    const managers = args.where.managerId.in;
    const reports = managers.flatMap((m) => tree[m] ?? []);
    return reports.map((userId) => ({ userId }));
  }) as unknown as typeof prisma.subordination.findMany);
}

describe("Hierarchy Logic", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getSubordinateIds", () => {
    it("returns an empty array when there are no subordinates", async () => {
      mockHierarchy({});
      expect(await getSubordinateIds("user-1")).toEqual([]);
    });

    it("traverses the hierarchy breadth-first across levels", async () => {
      mockHierarchy({ "user-1": ["user-2", "user-3"], "user-2": ["user-4"] });
      expect(await getSubordinateIds("user-1")).toEqual(["user-2", "user-3", "user-4"]);
    });

    it("issues one query per level rather than one per node", async () => {
      mockHierarchy({ "user-1": ["user-2", "user-3"], "user-2": ["user-4"] });
      await getSubordinateIds("user-1");
      // level 1, level 2, then the empty terminator
      expect(subordinationFindMany).toHaveBeenCalledTimes(3);
      const secondCall = subordinationFindMany.mock.calls[1][0] as unknown as {
        where: { managerId: { in: string[] } };
      };
      expect(secondCall.where.managerId.in).toEqual(["user-2", "user-3"]);
    });

    it("terminates on a two-node management cycle", { timeout: 2000 }, async () => {
      mockHierarchy({ "user-1": ["user-2"], "user-2": ["user-1"] });
      const ids = await getSubordinateIds("user-1");
      expect(ids).toEqual(["user-2"]);
    });

    it("terminates on a three-node cycle A->B->C->A", { timeout: 2000 }, async () => {
      mockHierarchy({ A: ["B"], B: ["C"], C: ["A"] });
      expect((await getSubordinateIds("A")).sort()).toEqual(["B", "C"]);
    });

    it("does not revisit a node reachable by two paths", async () => {
      mockHierarchy({ root: ["a", "b"], a: ["shared"], b: ["shared"] });
      const ids = await getSubordinateIds("root");
      expect(ids.filter((id) => id === "shared")).toHaveLength(1);
    });

    it("terminates when a user manages themselves", { timeout: 2000 }, async () => {
      mockHierarchy({ "user-1": ["user-1"] });
      expect(await getSubordinateIds("user-1")).toEqual([]);
    });
  });

  describe("wouldCreateCycle", () => {
    it("returns true when setting self as manager, without querying", async () => {
      expect(await wouldCreateCycle("user-1", "user-1")).toBe(true);
      expect(subordinationFindMany).not.toHaveBeenCalled();
    });

    it("returns true when setting a direct subordinate as manager", async () => {
      mockHierarchy({ "user-1": ["user-2"] });
      expect(await wouldCreateCycle("user-1", "user-2")).toBe(true);
    });

    it("returns true when setting a grandchild as manager", async () => {
      mockHierarchy({ "user-1": ["user-2"], "user-2": ["user-3"] });
      expect(await wouldCreateCycle("user-1", "user-3")).toBe(true);
    });

    it("returns false for an unrelated user", async () => {
      mockHierarchy({ "user-1": ["user-2"] });
      expect(await wouldCreateCycle("user-1", "user-99")).toBe(false);
    });
  });

  describe("canView", () => {
    it("allows a user to view themselves", async () => {
      expect(await canView("user-1", "COLABORADOR", "user-1")).toBe(true);
    });

    it("denies a COLABORADOR viewing anyone else", async () => {
      expect(await canView("user-1", "COLABORADOR", "user-2")).toBe(false);
    });

    it("allows a GESTOR to view a direct report", async () => {
      mockHierarchy({ boss: ["report"] });
      expect(await canView("boss", "GESTOR", "report")).toBe(true);
    });

    it("allows a GESTOR to view an indirect (grandchild) report", async () => {
      mockHierarchy({ boss: ["mid"], mid: ["grandchild"] });
      expect(await canView("boss", "GESTOR", "grandchild")).toBe(true);
    });

    it("denies a GESTOR viewing someone outside their own tree", async () => {
      mockHierarchy({ boss: ["report"] });
      expect(await canView("boss", "GESTOR", "stranger")).toBe(false);
    });

    it("allows an ADMIN to view a subordinate", async () => {
      mockHierarchy({ admin: ["report"] });
      expect(await canView("admin", "ADMIN", "report")).toBe(true);
    });

    it("allows an ADMIN to view anyone, without walking the hierarchy", async () => {
      mockHierarchy({});
      expect(await canView("admin", "ADMIN", "stranger")).toBe(true);
      // Short-circuits: an org-wide allow must not pay for a BFS.
      expect(subordinationFindMany).not.toHaveBeenCalled();
    });
  });

  describe("exportableOwnerIds", () => {
    it("returns self plus subordinates for a non-admin", async () => {
      mockHierarchy({ boss: ["a", "b"] });
      const ids = await exportableOwnerIds({ id: "boss", role: "GESTOR" });
      expect(ids).toEqual(["boss", "a", "b"]);
    });

    it("returns just self for a COLABORADOR with no reports", async () => {
      mockHierarchy({});
      expect(await exportableOwnerIds({ id: "user-1", role: "COLABORADOR" })).toEqual(["user-1"]);
    });

    it("returns every user id for an admin, without walking the hierarchy", async () => {
      findMany.mockResolvedValue([{ id: "user-1" }, { id: "user-2" }, { id: "user-3" }] as never);
      const ids = await exportableOwnerIds({ id: "admin", role: "ADMIN" });
      expect(ids).toEqual(["user-1", "user-2", "user-3"]);
      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany).toHaveBeenCalledWith({ select: { id: true } });
    });
  });
});
