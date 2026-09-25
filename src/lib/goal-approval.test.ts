import { describe, it, expect, vi, beforeEach } from "vitest";
import { approveAllPendingGoals, approveGoal } from "./goal-approval";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { canView, exportableOwnerIds } from "@/lib/hierarchy";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    measurement: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/authz", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/hierarchy", () => ({ canView: vi.fn(), exportableOwnerIds: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requireUserMock = vi.mocked(requireUser);
const canViewMock = vi.mocked(canView);
const exportableOwnerIdsMock = vi.mocked(exportableOwnerIds);
const measurementFindUnique = vi.mocked(prisma.measurement.findUnique);
const measurementFindMany = vi.mocked(prisma.measurement.findMany);
const measurementUpdate = vi.mocked(prisma.measurement.update);

const stub = <T,>(value: T) => value as never;

describe("approveGoal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "boss-1", role: "GESTOR" }));
    measurementFindUnique.mockResolvedValue(stub({ id: "meas-1", kpi: { ownerId: "report-1" } }));
    canViewMock.mockResolvedValue(true);
    exportableOwnerIdsMock.mockResolvedValue(["boss-1", "report-1"]);
  });

  it("approves a pending goal for a report the manager can view", async () => {
    await approveGoal("meas-1");
    expect(measurementUpdate).toHaveBeenCalledWith({
      where: { id: "meas-1" },
      data: { goalApprovalStatus: "APROVADA", goalApprovedById: "boss-1", goalApprovedAt: expect.any(Date) },
    });
  });

  it("blocks the owner from approving their own goal, even as admin", async () => {
    requireUserMock.mockResolvedValue(stub({ id: "report-1", role: "ADMIN" }));
    await expect(approveGoal("meas-1")).rejects.toThrow("Você não pode aprovar sua própria meta.");
    expect(measurementUpdate).not.toHaveBeenCalled();
  });

  it("blocks a manager who cannot view the owner", async () => {
    canViewMock.mockResolvedValue(false);
    await expect(approveGoal("meas-1")).rejects.toThrow("Você não tem permissão");
    expect(measurementUpdate).not.toHaveBeenCalled();
  });

  it("throws when the measurement does not exist", async () => {
    measurementFindUnique.mockResolvedValue(null);
    await expect(approveGoal("ghost")).rejects.toThrow("Medição não encontrada.");
  });
});

describe("approveAllPendingGoals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireUserMock.mockResolvedValue(stub({ id: "boss-1", role: "GESTOR" }));
    exportableOwnerIdsMock.mockResolvedValue(["boss-1", "report-1"]);
    measurementFindMany.mockResolvedValue(stub([{ id: "meas-1" }, { id: "meas-2" }]));
    measurementFindUnique.mockResolvedValue(stub({ id: "meas-1", kpi: { ownerId: "report-1" } }));
    canViewMock.mockResolvedValue(true);
  });

  it("only batches pending goals from the manager's team", async () => {
    await expect(approveAllPendingGoals()).resolves.toBe(2);
    expect(measurementFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ kpi: { ownerId: { in: ["report-1"] }, archivedAt: null } }) }));
    expect(measurementUpdate).toHaveBeenCalledTimes(2);
  });
});
