import { prisma } from "@/lib/prisma";
import { PERIOD_BLOCK_MESSAGE, isValidPeriod } from "@/lib/period";

export class PeriodLockedError extends Error {
  constructor() {
    super(PERIOD_BLOCK_MESSAGE.FECHADO);
    this.name = "PeriodLockedError";
  }
}

export async function findPeriodLock(period: string, departmentId?: string | null) {
  if (!isValidPeriod(period)) return null;

  return prisma.periodLock.findFirst({
    where: {
      period,
      OR: [{ departmentId: null }, ...(departmentId ? [{ departmentId }] : [])],
    },
    select: { id: true, period: true, departmentId: true, note: true, createdAt: true },
    orderBy: { departmentId: "asc" },
  });
}

export async function assertPeriodWritable(period: string, departmentId?: string | null) {
  const lock = await findPeriodLock(period, departmentId);
  if (lock) throw new PeriodLockedError();
}
