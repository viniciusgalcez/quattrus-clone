import { describe, it, expect, vi, beforeEach } from "vitest";
import { recalculateParentMeasurement } from "./kpi-cascading";
import { prisma } from "@/lib/prisma";
import { getKpiStatus } from "@/lib/kpi";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kpi: { findUnique: vi.fn() },
    measurement: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/kpi", () => ({
  getKpiStatus: vi.fn(),
}));

const kpiFindUnique = vi.mocked(prisma.kpi.findUnique);
const measurementUpsert = vi.mocked(prisma.measurement.upsert);
const getKpiStatusMock = vi.mocked(getKpiStatus);

const stub = <T,>(value: T) => value as never;

describe("recalculateParentMeasurement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("does nothing if parent not found or calculationType is MANUAL", async () => {
    kpiFindUnique.mockResolvedValue(null);
    await recalculateParentMeasurement("parent-1", "2026-08");
    expect(measurementUpsert).not.toHaveBeenCalled();

    kpiFindUnique.mockResolvedValue(stub({ calculationType: "MANUAL" }));
    await recalculateParentMeasurement("parent-1", "2026-08");
    expect(measurementUpsert).not.toHaveBeenCalled();
  });

  it("calculates SUM correctly", async () => {
    kpiFindUnique.mockResolvedValue(stub({
      id: "parent-1",
      calculationType: "SUM",
      direction: "MORE",
      yellowRange: 10,
      redRange: 20,
      parentId: null,
      children: [
        { measurements: [{ goal: 10, actual: 5 }] },
        { measurements: [{ goal: 20, actual: 15 }] },
        { measurements: [] }, // No measurement
      ],
      measurements: [],
    }));
    getKpiStatusMock.mockReturnValue("VERDE");

    await recalculateParentMeasurement("parent-1", "2026-08");

    expect(getKpiStatusMock).toHaveBeenCalledWith(30, 20, "MORE", 10, 20);
    expect(measurementUpsert).toHaveBeenCalledWith({
      where: { kpiId_period: { kpiId: "parent-1", period: "2026-08" } },
      update: { goal: 30, actual: 20, trafficLight: "VERDE" },
      create: { kpiId: "parent-1", period: "2026-08", goal: 30, actual: 20, trafficLight: "VERDE" },
    });
  });

  it("calculates AVERAGE correctly", async () => {
    kpiFindUnique.mockResolvedValue(stub({
      id: "parent-1",
      calculationType: "AVERAGE",
      direction: "MORE",
      yellowRange: 10,
      redRange: 20,
      parentId: null,
      children: [
        { measurements: [{ goal: 10, actual: 5 }] },
        { measurements: [{ goal: 20, actual: null }] }, // missing actual
        { measurements: [{ goal: 30, actual: 25 }] },
      ],
      measurements: [],
    }));
    getKpiStatusMock.mockReturnValue("VERDE");

    await recalculateParentMeasurement("parent-1", "2026-08");

    // goals: (10+20+30)/3 = 20, actuals: (5+25)/2 = 15
    expect(getKpiStatusMock).toHaveBeenCalledWith(20, 15, "MORE", 10, 20); 
    expect(measurementUpsert).toHaveBeenCalled();
  });

  it("calculates WEIGHTED correctly", async () => {
    kpiFindUnique.mockResolvedValue(stub({
      id: "parent-1",
      calculationType: "WEIGHTED",
      direction: "MORE",
      yellowRange: 10,
      redRange: 20,
      parentId: null,
      children: [
        { weight: 2, measurements: [{ goal: 10, actual: 5 }] },
        { weight: 3, measurements: [{ goal: 20, actual: 10 }] },
      ],
      measurements: [],
    }));
    getKpiStatusMock.mockReturnValue("VERMELHO");

    await recalculateParentMeasurement("parent-1", "2026-08");

    // goal: (10*2 + 20*3) / 5 = 80 / 5 = 16
    // actual: (5*2 + 10*3) / 5 = 40 / 5 = 8
    expect(getKpiStatusMock).toHaveBeenCalledWith(16, 8, "MORE", 10, 20);
    expect(measurementUpsert).toHaveBeenCalled();
  });

  it("recursively calls itself if parentId is present", async () => {
    kpiFindUnique
      .mockResolvedValueOnce(stub({
        id: "child-1",
        calculationType: "SUM",
        direction: "MORE",
        yellowRange: 10,
        redRange: 20,
        parentId: "parent-2",
        children: [
          { measurements: [{ goal: 10, actual: 10 }] },
        ],
        measurements: [],
      }))
      .mockResolvedValueOnce(stub({
        id: "parent-2",
        calculationType: "SUM",
        direction: "MORE",
        yellowRange: 10,
        redRange: 20,
        parentId: null,
        children: [
          { measurements: [{ goal: 10, actual: 10 }] },
        ],
        measurements: [],
      }));

    getKpiStatusMock.mockReturnValue("VERDE");

    await recalculateParentMeasurement("child-1", "2026-08");

    expect(kpiFindUnique).toHaveBeenCalledTimes(2);
    expect(kpiFindUnique).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { id: "child-1" } }));
    expect(kpiFindUnique).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { id: "parent-2" } }));
  });
});
