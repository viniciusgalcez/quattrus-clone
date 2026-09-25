import { prisma } from "@/lib/prisma";
import { recordAuditLogs } from "@/lib/audit";

/** How long an archived KPI is kept before it's purged for good. */
export const ARCHIVE_RETENTION_DAYS = 365;

export function archiveCutoffDate(from: Date = new Date()): Date {
  const cutoff = new Date(from);
  cutoff.setDate(cutoff.getDate() - ARCHIVE_RETENTION_DAYS);
  return cutoff;
}

export function purgeEligibleAt(archivedAt: Date): Date {
  const date = new Date(archivedAt);
  date.setDate(date.getDate() + ARCHIVE_RETENTION_DAYS);
  return date;
}

/**
 * Writes one AuditLog row per KPI about to be purged, snapshotting the data
 * (not the live, editable record) — name, owner, unit, and every
 * period/goal/actual it ever measured — before the row and its cascaded
 * children (Measurement, ActionPlan, KpiDelegation) are gone for good.
 * `actingUserId` is the admin who triggered the purge, or omitted for the
 * unattended cron route (an automatic event has no human actor).
 */
async function recordPurgeSnapshot(
  kpis: Array<{
    id: string;
    name: string;
    metricUnit: string;
    ownerId: string;
    departmentId: string | null;
    archivedAt: Date | null;
    measurements: Array<{ period: string; goal: number; actual: number | null }>;
  }>,
  actingUserId: string | undefined
) {
  if (kpis.length === 0) return;
  await recordAuditLogs(
    kpis.map((kpi) => ({
      userId: actingUserId ?? null,
      action: "PURGE_ARCHIVED",
      entity: "Kpi",
      entityId: kpi.id,
      details: {
        name: kpi.name,
        metricUnit: kpi.metricUnit,
        ownerId: kpi.ownerId,
        departmentId: kpi.departmentId,
        archivedAt: kpi.archivedAt,
        purgedAt: new Date(),
        measurements: kpi.measurements,
      },
    }))
  );
}

/**
 * Hard-deletes any KPI that has sat archived for over a year — cascades to
 * its measurements, action plans and delegations (all `onDelete: Cascade`
 * from Kpi in schema.prisma) — but keeps a data-only snapshot in AuditLog
 * first, so the history survives even though the live record doesn't. Meant
 * to run lazily whenever an admin opens the archived-indicators screen,
 * and/or from the `/api/cron/purge-archived` route on a real schedule. Safe
 * to call often: a no-op when nothing is due.
 */
export async function purgeExpiredArchivedKpis(actingUserId?: string): Promise<number> {
  const due = await prisma.kpi.findMany({
    where: { archivedAt: { lte: archiveCutoffDate() } },
    select: {
      id: true,
      name: true,
      metricUnit: true,
      ownerId: true,
      departmentId: true,
      archivedAt: true,
      measurements: { select: { period: true, goal: true, actual: true } },
    },
  });
  if (due.length === 0) return 0;

  await recordPurgeSnapshot(due, actingUserId);
  const { count } = await prisma.kpi.deleteMany({ where: { id: { in: due.map((k) => k.id) } } });
  return count;
}

/** Same snapshot-then-delete, for the single-item "Excluir agora" action. */
export async function purgeArchivedKpiWithHistory(kpiId: string, actingUserId: string) {
  const kpi = await prisma.kpi.findUnique({
    where: { id: kpiId },
    select: {
      id: true,
      name: true,
      metricUnit: true,
      ownerId: true,
      departmentId: true,
      archivedAt: true,
      measurements: { select: { period: true, goal: true, actual: true } },
    },
  });
  if (!kpi) return;

  await recordPurgeSnapshot([kpi], actingUserId);
  await prisma.kpi.delete({ where: { id: kpiId } });
}
