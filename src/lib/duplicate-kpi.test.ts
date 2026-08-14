import { describe, it, expect, vi, beforeEach } from "vitest";
import { duplicateKpi } from "./duplicate-kpi";
import { prisma } from "@/lib/prisma";
import { requireUser, assertKpiEditable } from "@/lib/authz";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kpi: { create: vi.fn() },
    measurement: { findMany: vi.fn(), createMany: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/authz", () => ({
  requireUser: vi.fn(),
  assertKpiEditable: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/kpi", () => ({ currentPeriod: vi.fn(() => "2026-08") }));

const requireUserMock = vi.mocked(requireUser);
const assertKpiEditableMock = vi.mocked(assertKpiEditable);
const kpiCreate = vi.mocked(prisma.kpi.create);
const measurementFindMany = vi.mocked(prisma.measurement.findMany);
const measurementCreateMany = vi.mocked(prisma.measurement.createMany);
const measurementCreate = vi.mocked(prisma.measurement.create);
const userFindUnique = vi.mocked(prisma.user.findUnique);

const stub = <T,>(value: T) => value as never;

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const SOURCE_KPI = stub({
  id: "kpi-1",
  name: "Despesa",
  description: "Nota",
  departmentId: "dept-1",
  parentId: "parent-1",
  metricUnit: "R$",
  direction: "MORE",
  calculationType: "MANUAL",
  weight: 10,
  yellowRange: 5,
  redRange: 15,
  priority: 0,
});

describe("duplicateKpi", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "user-1", username: "jsantos", role: "COLABORADOR" }));
    assertKpiEditableMock.mockResolvedValue(SOURCE_KPI);
    kpiCreate.mockResolvedValue(stub({ id: "kpi-copy" }));
  });

  it("copies the item's fields onto a new row owned by the caller", async () => {
    await expect(
      duplicateKpi(null, form({ kpiId: "kpi-1", targetUsername: "" }))
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(kpiCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Despesa (cópia)",
        ownerId: "user-1",
        departmentId: "dept-1",
        parentId: "parent-1",
        metricUnit: "R$",
      }),
    });
  });

  it("seeds a zero-goal measurement for the current period when not copying history", async () => {
    await expect(duplicateKpi(null, form({ kpiId: "kpi-1" }))).rejects.toThrow("NEXT_REDIRECT");

    expect(measurementCreate).toHaveBeenCalledWith({
      data: { kpiId: "kpi-copy", period: "2026-08", goal: 0, actual: null },
    });
    expect(measurementCreateMany).not.toHaveBeenCalled();
  });

  it("copies every measurement when copyMeasurements is set", async () => {
    measurementFindMany.mockResolvedValue(
      stub([
        { period: "2026-06", goal: 100, actual: 90, trafficLight: "AMARELO", justification: null, reportedById: "user-1" },
        { period: "2026-07", goal: 100, actual: 110, trafficLight: "VERDE", justification: null, reportedById: "user-1" },
      ])
    );

    await expect(
      duplicateKpi(null, form({ kpiId: "kpi-1", copyMeasurements: "on" }))
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(measurementCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ kpiId: "kpi-copy", period: "2026-06", goal: 100, actual: 90 }),
        expect.objectContaining({ kpiId: "kpi-copy", period: "2026-07", goal: 100, actual: 110 }),
      ],
    });
    expect(measurementCreate).not.toHaveBeenCalled();
  });

  it("blocks a non-admin from duplicating onto another user", async () => {
    const result = await duplicateKpi(
      null,
      form({ kpiId: "kpi-1", targetUsername: "outra.pessoa" })
    );
    expect(result?.error).toMatch(/administradores/);
    expect(kpiCreate).not.toHaveBeenCalled();
  });

  it("resolves targetUsername to another owner when the caller is admin", async () => {
    requireUserMock.mockResolvedValue(stub({ id: "admin-1", username: "admin", role: "ADMIN" }));
    userFindUnique.mockResolvedValue(stub({ id: "target-user" }));

    await expect(
      duplicateKpi(null, form({ kpiId: "kpi-1", targetUsername: "outra.pessoa" }))
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(kpiCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ownerId: "target-user" }) })
    );
  });

  it("returns a field error for an unknown target username", async () => {
    requireUserMock.mockResolvedValue(stub({ id: "admin-1", username: "admin", role: "ADMIN" }));
    userFindUnique.mockResolvedValue(null);

    const result = await duplicateKpi(
      null,
      form({ kpiId: "kpi-1", targetUsername: "fantasma" })
    );
    expect(result?.fieldErrors?.targetUsername).toBeDefined();
    expect(kpiCreate).not.toHaveBeenCalled();
  });
});
