"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { canView } from "@/lib/hierarchy";

/**
 * Approves a pending goal — the manager side of "aprovação de meta". The
 * owner can never approve their own goal here, even an admin acting as the
 * owner: self-approval would make the whole flow decorative. Reuses
 * `canView`'s hierarchy scoping so only the owner's manager (or an org-wide
 * admin) can act on it.
 */
export async function approveGoal(measurementId: string) {
  const user = await requireUser();

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

  revalidatePath("/aprovacoes");
  revalidatePath("/metas");
}
