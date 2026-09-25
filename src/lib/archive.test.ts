import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ARCHIVE_RETENTION_DAYS,
  archiveCutoffDate,
  purgeArchivedKpiWithHistory,
  purgeEligibleAt,
  purgeExpiredArchivedKpis,
} from "@/lib/archive";
import { prisma } from "@/lib/prisma";
import { recordAuditLogs } from "@/lib/audit";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kpi: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLogs: vi.fn(),
}));

const kpiFindMany = vi.mocked(prisma.kpi.findMany);
const kpiFindUnique = vi.mocked(prisma.kpi.findUnique);
const kpiDeleteMany = vi.mocked(prisma.kpi.deleteMany);
const kpiDelete = vi.mocked(prisma.kpi.delete);
const recordAuditLogsMock = vi.mocked(recordAuditLogs);

const stub = <T,>(value: T) => value as never;

describe("archive retention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses a 365-day retention window", () => {
    expect(ARCHIVE_RETENTION_DAYS).toBe(365);
    expect(archiveCutoffDate(new Date("2026-09-09T00:00:00Z")).toISOString()).toBe(
      "2025-09-09T00:00:00.000Z"
    );
    expect(purgeEligibleAt(new Date("2025-09-09T00:00:00Z")).toISOString()).toBe(
      "2026-09-09T00:00:00.000Z"
    );
  });

  it("does nothing when no archived KPI is past retention", async () => {
    kpiFindMany.mockResolvedValue([]);

    await expect(purgeExpiredArchivedKpis("admin-1")).resolves.toBe(0);

    expect(recordAuditLogsMock).not.toHaveBeenCalled();
    expect(kpiDeleteMany).not.toHaveBeenCalled();
  });

  it("records an audit snapshot before deleting expired archived KPIs", async () => {
    const archivedAt = new Date("2025-09-01T00:00:00Z");
    kpiFindMany.mockResolvedValue(
      stub([
        {
          id: "kpi-1",
          name: "Refugo",
          metricUnit: "%",
          ownerId: "user-1",
          departmentId: "dept-1",
          archivedAt,
          measurements: [{ period: "2025-08", goal: 2, actual: 3 }],
        },
      ])
    );
    kpiDeleteMany.mockResolvedValue(stub({ count: 1 }));

    await expect(purgeExpiredArchivedKpis("admin-1")).resolves.toBe(1);

    expect(recordAuditLogsMock).toHaveBeenCalledWith([
      {
        userId: "admin-1",
        action: "PURGE_ARCHIVED",
        entity: "Kpi",
        entityId: "kpi-1",
        details: {
          name: "Refugo",
          metricUnit: "%",
          ownerId: "user-1",
          departmentId: "dept-1",
          archivedAt,
          purgedAt: expect.any(Date),
          measurements: [{ period: "2025-08", goal: 2, actual: 3 }],
        },
      },
    ]);
    expect(kpiDeleteMany).toHaveBeenCalledWith({ where: { id: { in: ["kpi-1"] } } });
  });

  it("snapshots a single archived KPI before immediate purge", async () => {
    kpiFindUnique.mockResolvedValue(
      stub({
        id: "kpi-2",
        name: "Qualidade",
        metricUnit: "%",
        ownerId: "user-2",
        departmentId: null,
        archivedAt: new Date("2026-01-01T00:00:00Z"),
        measurements: [],
      })
    );

    await purgeArchivedKpiWithHistory("kpi-2", "admin-1");

    expect(recordAuditLogsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: "admin-1",
        action: "PURGE_ARCHIVED",
        entityId: "kpi-2",
      }),
    ]);
    expect(kpiDelete).toHaveBeenCalledWith({ where: { id: "kpi-2" } });
  });
});
