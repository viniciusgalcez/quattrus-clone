"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { canView } from "@/lib/hierarchy";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { recordAuditLog } from "@/lib/audit";

/**
 * Approves a pending goal — the manager side of "aprovação de meta". The
 * owner can never approve their own goal here, even an admin acting as the
 * owner: self-approval would make the whole flow decorative. Reuses
 * `canView`'s hierarchy scoping so only the owner's manager (or an org-wide
 * admin) can act on it.
 */
export async function approveGoal(measurementId: string) {
  const user = await requireUser("approvals");

  const measurement = await prisma.measurement.findUnique({
    where: { id: measurementId },
    include: { kpi: { select: { ownerId: true } } },
  });
  if (!measurement) throw new Error("Medição não encontrada.");
  if (measurement.kpi.ownerId === user.id) {
    throw new Error("Você não pode aprovar sua própria meta.");
  }
  if (!(await canView(user.id, user.role, measurement.kpi.ownerId))) {
    throw new Error("Você não tem permissão para aprovar esta meta.");
  }

  await prisma.measurement.update({
    where: { id: measurementId },
    data: { goalApprovalStatus: "APROVADA", goalApprovedById: user.id, goalApprovedAt: new Date() },
  });

  await recordAuditLog({
    userId: user.id,
    action: "STATUS_CHANGE",
    entity: "Measurement",
    entityId: measurementId,
    details: { field: "goalApprovalStatus", value: "APROVADA", ownerId: measurement.kpi.ownerId },
  });

  revalidatePath("/aprovacoes");
  revalidatePath("/metas");
}

/** Approves every pending team goal currently visible to the acting manager. */
export async function approveAllPendingGoals() {
  const user = await requireUser("approvals");
  if (user.role === "COLABORADOR") throw new Error("Você não tem permissão para aprovar metas.");
  const ownerIds = (await exportableOwnerIds(user)).filter((ownerId) => ownerId !== user.id);
  if (!ownerIds.length) return 0;
  const pending = await prisma.measurement.findMany({
    where: { goalApprovalStatus: "PENDENTE", kpi: { ownerId: { in: ownerIds }, archivedAt: null } },
    select: { id: true },
  });
  for (const measurement of pending) await approveGoal(measurement.id);
  return pending.length;
}
