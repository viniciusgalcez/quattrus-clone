import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertPeriodWritable, findPeriodLock, PeriodLockedError } from "./period-locks";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    periodLock: { findFirst: vi.fn() },
  },
}));

const periodLockFindFirst = vi.mocked(prisma.periodLock.findFirst);
const stub = <T,>(value: T) => value as never;

describe("period locks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("looks for both a global lock and the KPI department lock", async () => {
    periodLockFindFirst.mockResolvedValue(null);

    await findPeriodLock("2026-08", "dept-1");

    expect(periodLockFindFirst).toHaveBeenCalledWith({
      where: {
        period: "2026-08",
        OR: [{ departmentId: null }, { departmentId: "dept-1" }],
      },
      select: { id: true, period: true, departmentId: true, note: true, createdAt: true },
      orderBy: { departmentId: "asc" },
    });
  });

  it("does not query the database for malformed periods", async () => {
    await expect(findPeriodLock("2026-99", "dept-1")).resolves.toBeNull();
    expect(periodLockFindFirst).not.toHaveBeenCalled();
  });

  it("throws the standard lock error when the cycle is closed", async () => {
    periodLockFindFirst.mockResolvedValue(stub({ id: "lock-1" }));

    await expect(assertPeriodWritable("2026-08", null)).rejects.toBeInstanceOf(PeriodLockedError);
  });
});
