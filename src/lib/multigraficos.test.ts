import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildMultigraficoData,
  clearMultiChartSlot,
  kpiIdsFromMultiChartSlots,
  normalizeMultiChartSlots,
  setMultiChartSlot,
} from "./multigraficos";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kpi: { findMany: vi.fn() },
  },
}));

const kpiFindMany = vi.mocked(prisma.kpi.findMany);

describe("buildMultigraficoData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes requested KPI ids to visible owners and active indicators", async () => {
    kpiFindMany.mockResolvedValue([]);

    await buildMultigraficoData(["visible-kpi", "hidden-kpi"], 2026, ["user-1"]);

    expect(kpiFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["visible-kpi", "hidden-kpi"] },
          ownerId: { in: ["user-1"] },
          archivedAt: null,
        },
      })
    );
  });

  it("does not query when there are no visible owners", async () => {
    await buildMultigraficoData(["kpi-1"], 2026, []);

    expect(kpiFindMany).not.toHaveBeenCalled();
  });
});

describe("multi chart saved slots", () => {
  it("keeps only valid unique positions and indicators", () => {
    expect(
      normalizeMultiChartSlots([
        { position: 2, kpiId: "kpi-3" },
        { position: 0, kpiId: "kpi-1" },
        { position: 0, kpiId: "duplicate-position" },
        { position: 1, kpiId: "kpi-1" },
        { position: 4, kpiId: "outside-grid" },
        { position: 3, kpiId: "" },
        null,
      ])
    ).toEqual([
      { position: 0, kpiId: "kpi-1" },
      { position: 2, kpiId: "kpi-3" },
    ]);
  });

  it("sets a slot by replacing its position and preventing duplicated KPIs", () => {
    expect(
      setMultiChartSlot(
        [
          { position: 0, kpiId: "kpi-1" },
          { position: 1, kpiId: "kpi-2" },
        ],
        1,
        "kpi-1"
      )
    ).toEqual([{ position: 1, kpiId: "kpi-1" }]);
  });

  it("clears a slot without disturbing the other quadrants", () => {
    expect(
      clearMultiChartSlot(
        [
          { position: 0, kpiId: "kpi-1" },
          { position: 3, kpiId: "kpi-4" },
        ],
        0
      )
    ).toEqual([{ position: 3, kpiId: "kpi-4" }]);
  });

  it("extracts selected KPI ids in grid order", () => {
    expect(kpiIdsFromMultiChartSlots([{ position: 2, kpiId: "c" }, { position: 0, kpiId: "a" }])).toEqual([
      "a",
      "c",
    ]);
  });
});
