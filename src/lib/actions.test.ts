import { describe, it, expect, vi, beforeEach } from "vitest";
import { upsertMeasurement } from "./actions";
import { prisma } from "@/lib/prisma";
import { assertKpiEditable } from "@/lib/authz";
import { auth } from "@/lib/auth";
import { getKpiStatus } from "@/lib/kpi";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    measurement: { upsert: vi.fn() },
    actionPlan: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/authz", () => ({ assertKpiEditable: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/kpi", () => ({
  currentPeriod: vi.fn(() => "2026-08"),
  getKpiStatus: vi.fn(),
}));

const authMock = vi.mocked(auth);
const assertKpiEditableMock = vi.mocked(assertKpiEditable);
const getKpiStatusMock = vi.mocked(getKpiStatus);
const measurementUpsert = vi.mocked(prisma.measurement.upsert);
const actionPlanFindUnique = vi.mocked(prisma.actionPlan.findUnique);
const actionPlanCreate = vi.mocked(prisma.actionPlan.create);

/** Prisma/NextAuth return wide types; tests only supply the fields under test. */
const stub = <T,>(value: T) => value as never;

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("upsertMeasurement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue(stub({ user: { id: "user-1" } }));
    assertKpiEditableMock.mockResolvedValue(
      stub({ direction: "MORE", yellowRange: 10, redRange: 20 })
    );
    measurementUpsert.mockResolvedValue(stub({ id: "meas-1" }));
  });

  describe("automatic FCA", () => {
    it.each(["AMARELO", "VERMELHO", "CRITICO"] as const)(
      "opens an action plan when the status is %s",
      async (status) => {
        getKpiStatusMock.mockReturnValue(status);
        actionPlanFindUnique.mockResolvedValue(null);

        await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "50" }));

        expect(actionPlanCreate).toHaveBeenCalledWith({
          data: expect.objectContaining({
            kpiId: "kpi-1",
            measurementId: "meas-1",
            status: "ABERTO",
          }),
        });
      }
    );

    it("does not open an action plan when the status is VERDE", async () => {
      getKpiStatusMock.mockReturnValue("VERDE");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "120" }));
      expect(actionPlanCreate).not.toHaveBeenCalled();
    });

    it("does not open an action plan when there is no measurement (SEM_DADO)", async () => {
      getKpiStatusMock.mockReturnValue("SEM_DADO");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "" }));
      expect(actionPlanCreate).not.toHaveBeenCalled();
    });

    it("does not open a second plan when one already exists", async () => {
      getKpiStatusMock.mockReturnValue("VERMELHO");
      actionPlanFindUnique.mockResolvedValue(stub({ id: "plan-1" }));

      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "50" }));

      expect(actionPlanCreate).not.toHaveBeenCalled();
    });
  });

  describe("status calculation and persistence", () => {
    it("derives the status from the KPI's own direction and thresholds", async () => {
      assertKpiEditableMock.mockResolvedValue(
        stub({ direction: "LESS", yellowRange: 5, redRange: 15 })
      );
      getKpiStatusMock.mockReturnValue("VERDE");

      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "120" }));

      expect(getKpiStatusMock).toHaveBeenCalledWith(100, 120, "LESS", 5, 15);
    });

    it("persists the computed status and the reporter on both upsert branches", async () => {
      getKpiStatusMock.mockReturnValue("CRITICO");
      actionPlanFindUnique.mockResolvedValue(null);

      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "10" }));

      expect(measurementUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kpiId_period: { kpiId: "kpi-1", period: "2026-08" } },
          update: expect.objectContaining({ trafficLight: "CRITICO", reportedById: "user-1" }),
          create: expect.objectContaining({ trafficLight: "CRITICO", reportedById: "user-1" }),
        })
      );
    });

    it("treats an empty actual as null rather than zero", async () => {
      getKpiStatusMock.mockReturnValue("SEM_DADO");
      await upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "" }));
      expect(getKpiStatusMock).toHaveBeenCalledWith(100, null, "MORE", 10, 20);
    });
  });

  describe("guards", () => {
    it("ignores a client-supplied period and always writes the current month", async () => {
      getKpiStatusMock.mockReturnValue("VERDE");

      await upsertMeasurement(
        form({ kpiId: "kpi-1", goal: "100", actual: "90", period: "2020-01" })
      );

      expect(measurementUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kpiId_period: { kpiId: "kpi-1", period: "2026-08" } },
        })
      );
    });

    it("rejects before touching the database when the caller cannot edit the KPI", async () => {
      assertKpiEditableMock.mockRejectedValue(new Error("forbidden"));

      await expect(
        upsertMeasurement(form({ kpiId: "kpi-1", goal: "100", actual: "90" }))
      ).rejects.toThrow();

      expect(measurementUpsert).not.toHaveBeenCalled();
    });

    it("rejects a non-numeric goal", async () => {
      await expect(
        upsertMeasurement(form({ kpiId: "kpi-1", goal: "abc", actual: "90" }))
      ).rejects.toThrow();

      expect(measurementUpsert).not.toHaveBeenCalled();
    });
  });
});
