"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { canView } from "@/lib/hierarchy";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { recordAuditLog } from "@/lib/audit";
import { type ActionResult, handleActionError } from "@/lib/action-result";

/**
 * Approves a pending goal — the manager side of "aprovação de meta". The
 * owner can never approve their own goal here, even an admin acting as the
 * owner: self-approval would make the whole flow decorative. Reuses
 * `canView`'s hierarchy scoping so only the owner's manager (or an org-wide
 * admin) can act on it.
 */
export async function approveGoal(measurementId: string): Promise<ActionResult> {
  try {
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
    return { ok: true };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Quattrus-style inline approval: manager may tweak the proposed goal in the
 * cell and approve in one step. Empty/invalid goal keeps the existing value
 * and only flips the approval status (same as approveGoal).
 */
export async function approveGoalWithValue(measurementId: string, goalRaw: string): Promise<ActionResult> {
  try {
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

    const trimmed = goalRaw.trim().replace(",", ".");
    let nextGoal = measurement.goal;
    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) throw new Error("Informe um valor numérico válido para a meta.");
      nextGoal = parsed;
    }

    await prisma.measurement.update({
      where: { id: measurementId },
      data: {
        goal: nextGoal,
        goalApprovalStatus: "APROVADA",
        goalApprovedById: user.id,
        goalApprovedAt: new Date(),
      },
    });

    await recordAuditLog({
      userId: user.id,
      action: "STATUS_CHANGE",
      entity: "Measurement",
      entityId: measurementId,
      details: {
        field: "goalApprovalStatus",
        value: "APROVADA",
        goal: nextGoal,
        previousGoal: measurement.goal,
        ownerId: measurement.kpi.ownerId,
        via: "inline",
      },
    });

    revalidatePath("/aprovacoes");
    revalidatePath("/metas");
    return { ok: true };
  } catch (error) {
    return handleActionError(error);
  }
}

/** Approves every pending team goal currently visible to the acting manager. */
export async function approveAllPendingGoals(): Promise<ActionResult> {
  try {
    const user = await requireUser("approvals");
    if (user.role === "COLABORADOR") throw new Error("Você não tem permissão para aprovar metas.");
    const ownerIds = (await exportableOwnerIds(user)).filter((ownerId) => ownerId !== user.id);
    if (!ownerIds.length) return { ok: true };
    const pending = await prisma.measurement.findMany({
      where: { goalApprovalStatus: "PENDENTE", kpi: { ownerId: { in: ownerIds }, archivedAt: null } },
      select: { id: true },
    });
    for (const measurement of pending) {
      const result = await approveGoal(measurement.id);
      if (!result.ok) return result;
    }
    return { ok: true };
  } catch (error) {
    return handleActionError(error);
  }
}
