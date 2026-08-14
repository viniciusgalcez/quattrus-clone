import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireUser,
  assertKpiEditable,
  assertMeasurementEditable,
  assertActionPlanEditable,
  assertKpiParentAssignable,
  assertDepartmentAssignable,
  assertFcaResolved,
  ForbiddenError,
  FcaPendingError,
} from "./authz";
import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/hierarchy";
import { auth } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kpi: { findUnique: vi.fn() },
    measurement: { findUnique: vi.fn() },
    actionPlan: { findUnique: vi.fn(), findFirst: vi.fn() },
    department: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/hierarchy", () => ({ canView: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const kpiFindUnique = vi.mocked(prisma.kpi.findUnique);
const measurementFindUnique = vi.mocked(prisma.measurement.findUnique);
const actionPlanFindUnique = vi.mocked(prisma.actionPlan.findUnique);
const actionPlanFindFirst = vi.mocked(prisma.actionPlan.findFirst);
const departmentFindUnique = vi.mocked(prisma.department.findUnique);
const userFindUnique = vi.mocked(prisma.user.findUnique);
const canViewMock = vi.mocked(canView);
const authMock = vi.mocked(auth);

/** Prisma's findUnique returns a wide model type; tests only need a few fields. */
const asRecord = <T,>(value: T) => value as never;

describe("Authorization Logic", () => {
  const normalUser = { id: "user-1", role: "COLABORADOR" };
  const adminUser = { id: "user-99", role: "ADMIN" };
  const otherUser = { id: "user-2", role: "COLABORADOR" };
  const managerUser = { id: "boss", role: "GESTOR" };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("assertKpiEditable", () => {
    it("allows the owner to edit and returns the record", async () => {
      const record = { id: "kpi-1", ownerId: "user-1" };
      kpiFindUnique.mockResolvedValue(asRecord(record));
      await expect(assertKpiEditable("kpi-1", normalUser)).resolves.toBe(record);
    });

    it("allows an admin to edit", async () => {
      kpiFindUnique.mockResolvedValue(asRecord({ ownerId: "user-1" }));
      await expect(assertKpiEditable("kpi-1", adminUser)).resolves.not.toThrow();
    });

    it("throws ForbiddenError for a non-owner, non-admin", async () => {
      kpiFindUnique.mockResolvedValue(asRecord({ ownerId: "user-1" }));
      await expect(assertKpiEditable("kpi-1", otherUser)).rejects.toThrow(ForbiddenError);
    });

    it("denies a GESTOR who is not the owner — view access is not write access", async () => {
      kpiFindUnique.mockResolvedValue(asRecord({ ownerId: "user-1" }));
      await expect(assertKpiEditable("kpi-1", managerUser)).rejects.toThrow(ForbiddenError);
    });

    it("throws when the kpi does not exist", async () => {
      kpiFindUnique.mockResolvedValue(null);
      await expect(assertKpiEditable("invalid", normalUser)).rejects.toThrow(
        "Indicador não encontrado."
      );
    });
  });

  describe("assertMeasurementEditable", () => {
    it("allows the owner to edit", async () => {
      measurementFindUnique.mockResolvedValue(asRecord({ kpi: { ownerId: "user-1" } }));
      await expect(assertMeasurementEditable("meas-1", normalUser)).resolves.not.toThrow();
    });

    it("allows an admin to edit", async () => {
      measurementFindUnique.mockResolvedValue(asRecord({ kpi: { ownerId: "user-1" } }));
      await expect(assertMeasurementEditable("meas-1", adminUser)).resolves.not.toThrow();
    });

    it("throws for another collaborator", async () => {
      measurementFindUnique.mockResolvedValue(asRecord({ kpi: { ownerId: "user-1" } }));
      await expect(assertMeasurementEditable("meas-1", otherUser)).rejects.toThrow(ForbiddenError);
    });

    it("throws when the measurement does not exist", async () => {
      measurementFindUnique.mockResolvedValue(null);
      await expect(assertMeasurementEditable("nope", normalUser)).rejects.toThrow(
        "Medição não encontrada."
      );
    });
  });

  describe("assertActionPlanEditable", () => {
    it("allows the owner to edit", async () => {
      actionPlanFindUnique.mockResolvedValue(asRecord({ kpi: { ownerId: "user-1" } }));
      await expect(assertActionPlanEditable("plan-1", normalUser)).resolves.not.toThrow();
    });

    it("allows an admin to edit", async () => {
      actionPlanFindUnique.mockResolvedValue(asRecord({ kpi: { ownerId: "user-1" } }));
      await expect(assertActionPlanEditable("plan-1", adminUser)).resolves.not.toThrow();
    });

    it("throws ForbiddenError for a non-owner", async () => {
      actionPlanFindUnique.mockResolvedValue(asRecord({ kpi: { ownerId: "user-1" } }));
      await expect(assertActionPlanEditable("plan-1", otherUser)).rejects.toThrow(ForbiddenError);
    });

    it("throws when the plan does not exist", async () => {
      actionPlanFindUnique.mockResolvedValue(null);
      await expect(assertActionPlanEditable("nope", normalUser)).rejects.toThrow(
        "Plano de ação não encontrado."
      );
    });
  });

  // Being allowed to write a KPI row says nothing about which other row it may
  // point at — without this, anyone could graft their KPI onto the CEO's tree.
  describe("assertKpiParentAssignable", () => {
    it("is a no-op when no parent is given", async () => {
      await expect(assertKpiParentAssignable(null, normalUser)).resolves.toBeUndefined();
      expect(kpiFindUnique).not.toHaveBeenCalled();
    });

    it("allows a parent the user can view", async () => {
      kpiFindUnique.mockResolvedValue(asRecord({ ownerId: "boss", archivedAt: null }));
      canViewMock.mockResolvedValue(true);
      await expect(assertKpiParentAssignable("kpi-parent", normalUser)).resolves.toBeUndefined();
    });

    it("rejects a parent the user cannot view", async () => {
      kpiFindUnique.mockResolvedValue(asRecord({ ownerId: "ceo", archivedAt: null }));
      canViewMock.mockResolvedValue(false);
      await expect(assertKpiParentAssignable("kpi-ceo", normalUser)).rejects.toThrow(ForbiddenError);
    });

    it("rejects a nonexistent parent", async () => {
      kpiFindUnique.mockResolvedValue(null);
      await expect(assertKpiParentAssignable("ghost", normalUser)).rejects.toThrow(
        "Indicador pai inválido."
      );
    });

    it("rejects an archived parent", async () => {
      kpiFindUnique.mockResolvedValue(asRecord({ ownerId: "user-1", archivedAt: new Date() }));
      await expect(assertKpiParentAssignable("old", normalUser)).rejects.toThrow(
        "Indicador pai inválido."
      );
    });
  });

  describe("requireUser", () => {
    it("returns the session user when authenticated", async () => {
      authMock.mockResolvedValue(asRecord({ user: { id: "user-1" } }));
      await expect(requireUser()).resolves.toEqual({ id: "user-1" });
    });

    it("throws when there is no session", async () => {
      authMock.mockResolvedValue(asRecord(null));
      await expect(requireUser()).rejects.toThrow("Não autenticado.");
    });
  });

  describe("assertFcaResolved", () => {
    it("passes when there is no pending FCA before the period", async () => {
      actionPlanFindFirst.mockResolvedValue(null);
      await expect(assertFcaResolved("kpi-1", "2026-08")).resolves.toBeUndefined();
      expect(actionPlanFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kpiId: "kpi-1", status: "ABERTO", measurement: { period: { lt: "2026-08" } } },
        })
      );
    });

    it("throws FcaPendingError naming the oldest pending period", async () => {
      actionPlanFindFirst.mockResolvedValue(asRecord({ measurement: { period: "2026-06" } }));
      const err = await assertFcaResolved("kpi-1", "2026-08").catch((e) => e);
      expect(err).toBeInstanceOf(FcaPendingError);
      expect(err.period).toBe("2026-06");
    });

    it("does not block writing the very period the FCA belongs to", async () => {
      // The query itself excludes the target period (`lt`), so an ABERTO plan
      // on the period being written never surfaces here — verified by intent,
      // not by re-asserting the mocked query above.
      actionPlanFindFirst.mockResolvedValue(null);
      await expect(assertFcaResolved("kpi-1", "2026-06")).resolves.toBeUndefined();
    });
  });

  describe("assertDepartmentAssignable", () => {
    it("is a no-op when no department is given", async () => {
      await expect(assertDepartmentAssignable("", normalUser)).resolves.toBeUndefined();
      expect(departmentFindUnique).not.toHaveBeenCalled();
    });

    it("allows an admin to file a KPI under any department", async () => {
      departmentFindUnique.mockResolvedValue(asRecord({ id: "dept-x" }));
      await expect(assertDepartmentAssignable("dept-x", adminUser)).resolves.toBeUndefined();
      expect(userFindUnique).not.toHaveBeenCalled();
    });

    it("allows a collaborator to use their own department", async () => {
      departmentFindUnique.mockResolvedValue(asRecord({ id: "dept-a" }));
      userFindUnique.mockResolvedValue(asRecord({ departmentId: "dept-a" }));
      await expect(assertDepartmentAssignable("dept-a", normalUser)).resolves.toBeUndefined();
    });

    it("rejects a collaborator using someone else's department", async () => {
      departmentFindUnique.mockResolvedValue(asRecord({ id: "dept-b" }));
      userFindUnique.mockResolvedValue(asRecord({ departmentId: "dept-a" }));
      await expect(assertDepartmentAssignable("dept-b", normalUser)).rejects.toThrow(ForbiddenError);
    });

    it("rejects a nonexistent department", async () => {
      departmentFindUnique.mockResolvedValue(null);
      await expect(assertDepartmentAssignable("ghost", normalUser)).rejects.toThrow(
        "Departamento inválido."
      );
    });
  });
});
