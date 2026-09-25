import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { recordAuditLog } from "@/lib/audit";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/hierarchy", () => ({ exportableOwnerIds: vi.fn() }));
vi.mock("@/lib/import-export", () => ({ kpisToCsv: vi.fn(() => "id,name\n") }));
vi.mock("@/lib/audit", () => ({ recordAuditLog: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    kpi: { findMany: vi.fn() },
  },
}));

const authMock = vi.mocked(auth);
const checkRateLimitMock = vi.mocked(checkRateLimit);
const exportableOwnerIdsMock = vi.mocked(exportableOwnerIds);
const kpiFindMany = vi.mocked(prisma.kpi.findMany);
const recordAuditLogMock = vi.mocked(recordAuditLog);

const stub = <T,>(value: T) => value as never;

describe("GET /api/export/kpis", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    checkRateLimitMock.mockReturnValue(true);
    exportableOwnerIdsMock.mockResolvedValue(["user-1"]);
    kpiFindMany.mockResolvedValue([]);
  });

  it("rejects direct export URLs when the profile lacks the imports module", async () => {
    authMock.mockResolvedValue(
      stub({ user: { id: "user-1", role: "COLABORADOR", permissions: ["dashboard"] } })
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(kpiFindMany).not.toHaveBeenCalled();
    expect(recordAuditLogMock).not.toHaveBeenCalled();
  });

  it("exports only after the imports module guard passes", async () => {
    authMock.mockResolvedValue(
      stub({ user: { id: "user-1", role: "COLABORADOR", permissions: ["imports"] } })
    );

    const response = await GET();

    expect(response.status).toBe(200);
    expect(exportableOwnerIdsMock).toHaveBeenCalled();
    expect(recordAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EXPORT",
        entity: "Kpi",
      })
    );
  });
});
