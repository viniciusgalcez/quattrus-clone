import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { purgeExpiredArchivedKpis } from "@/lib/archive";

vi.mock("@/lib/archive", () => ({
  purgeExpiredArchivedKpis: vi.fn(),
}));

const purgeExpiredArchivedKpisMock = vi.mocked(purgeExpiredArchivedKpis);
const originalCronSecret = process.env.CRON_SECRET;

describe("GET /api/cron/purge-archived", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it("refuses to run when CRON_SECRET is not configured", async () => {
    process.env.CRON_SECRET = "";

    const response = await GET(new Request("http://localhost/api/cron/purge-archived"));

    expect(response.status).toBe(503);
    expect(purgeExpiredArchivedKpisMock).not.toHaveBeenCalled();
  });

  it("refuses to run when the bearer token is missing or wrong", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/purge-archived", {
        headers: { authorization: "Bearer wrong" },
      })
    );

    expect(response.status).toBe(401);
    expect(purgeExpiredArchivedKpisMock).not.toHaveBeenCalled();
  });

  it("runs the purge only with the configured bearer token", async () => {
    purgeExpiredArchivedKpisMock.mockResolvedValue(2);

    const response = await GET(
      new Request("http://localhost/api/cron/purge-archived", {
        headers: { authorization: "Bearer cron-secret" },
      })
    );

    await expect(response.json()).resolves.toEqual({ purged: 2 });
    expect(response.status).toBe(200);
    expect(purgeExpiredArchivedKpisMock).toHaveBeenCalledWith();
  });
});
