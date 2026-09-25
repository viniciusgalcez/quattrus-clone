import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/hierarchy";
import { periodLabel } from "@/lib/kpi";
import { auth } from "@/lib/auth";
import type { ProfileModule } from "@/lib/profile-permissions";

/** Every write path — actions.ts and import-actions.ts alike — starts here. */
export async function requireUser(module?: ProfileModule) {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado.");
  // This is intentionally evaluated in every Server Action. The session
  // callback refreshes profile permissions from PostgreSQL, so revocation
  // takes effect without relying on the client menu or a stale JWT.
  if (module && !session.user.permissions?.includes(module)) {
    throw new ForbiddenError("Seu perfil não permite esta operação.");
  }
  return session.user;
}

export class ForbiddenError extends Error {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** A pending FCA on an earlier period is blocking a new measurement. */
export class FcaPendingError extends Error {
  constructor(public readonly period: string) {
    super(
      `Existe um FCA pendente em ${periodLabel(period)}. Resolva-o antes de lançar um novo resultado.`
    );
    this.name = "FcaPendingError";
  }
}

type SessionUser = { id: string; role: string };

/**
 * The owner, an admin, someone individually delegated on this exact KPI, or a
 * facilitator of the owner (blanket edit rights over everything they own) may
 * write to it. Delegation/facilitation mirror "Configurar Delegação" and
 * "Cadastrar Facilitador" in the original Quattrus.
 */
async function canEdit(user: SessionUser, ownerId: string, kpiId: string): Promise<boolean> {
  if (user.id === ownerId || user.role === "ADMIN") return true;

  const delegation = await prisma.kpiDelegation.findUnique({
    where: { kpiId_delegateId: { kpiId, delegateId: user.id } },
    select: { id: true },
  });
  if (delegation) return true;

  const facilitation = await prisma.facilitation.findUnique({
    where: { facilitatorId_facilitatedId: { facilitatorId: user.id, facilitatedId: ownerId } },
    select: { id: true },
  });
  return !!facilitation;
}

export async function assertKpiEditable(kpiId: string, user: SessionUser) {
  const kpi = await prisma.kpi.findUnique({ where: { id: kpiId } });
  if (!kpi) throw new ForbiddenError("Indicador não encontrado.");
  // Archived is admin-only territory — a delegate/facilitator (or even the
  // owner, once it's archived) shouldn't still be able to write to it via a
  // stale tab or a direct action call.
  if (kpi.archivedAt && user.role !== "ADMIN") throw new ForbiddenError();
  if (!(await canEdit(user, kpi.ownerId, kpi.id))) throw new ForbiddenError();
  return kpi;
}

export async function assertMeasurementEditable(measurementId: string, user: SessionUser) {
  const measurement = await prisma.measurement.findUnique({
    where: { id: measurementId },
    include: { kpi: true },
  });
  if (!measurement) throw new ForbiddenError("Medição não encontrada.");
  if (!(await canEdit(user, measurement.kpi.ownerId, measurement.kpi.id))) throw new ForbiddenError();
  return measurement;
}

/**
 * Being allowed to write a KPI row does not imply being allowed to point it at
 * an arbitrary other row. The parent must be a KPI the user can at least see —
 * otherwise anyone could graft their indicator onto the CEO's strategic tree
 * and show up in a cascade (and a department rollup) they have no claim to.
 */
export async function assertKpiParentAssignable(
  parentId: string | null | undefined,
  user: SessionUser
) {
  if (!parentId) return;
  const parent = await prisma.kpi.findUnique({
    where: { id: parentId },
    select: { ownerId: true, archivedAt: true },
  });
  if (!parent || parent.archivedAt) throw new ForbiddenError("Indicador pai inválido.");
  if (!(await canView(user.id, user.role, parent.ownerId))) throw new ForbiddenError();
}

/** Non-admins may only file a KPI under their own department. */
export async function assertDepartmentAssignable(
  departmentId: string | null | undefined,
  user: SessionUser
) {
  if (!departmentId) return;
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { id: true },
  });
  if (!dept) throw new ForbiddenError("Departamento inválido.");
  if (user.role === "ADMIN") return;
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { departmentId: true },
  });
  if (me?.departmentId !== departmentId) throw new ForbiddenError();
}

/**
 * A KPI with an unresolved (ABERTO) FCA from an earlier period locks out new
 * measurements for that KPI until the plan is closed — otherwise a red month
 * could simply be buried under a green one with no explanation ever filed.
 * The period being written is exempt: that's the same measurement the FCA
 * was opened for, and it must stay editable to fix the numbers that caused it.
 */
export async function assertFcaResolved(kpiId: string, period: string) {
  const pending = await prisma.actionPlan.findFirst({
    where: { kpiId, status: "ABERTO", measurement: { period: { lt: period } } },
    include: { measurement: { select: { period: true } } },
    orderBy: { measurement: { period: "asc" } },
  });
  if (pending) throw new FcaPendingError(pending.measurement.period);
}

export async function assertActionPlanEditable(actionPlanId: string, user: SessionUser) {
  const plan = await prisma.actionPlan.findUnique({
    where: { id: actionPlanId },
    include: { kpi: true },
  });
  if (!plan) throw new ForbiddenError("Plano de ação não encontrado.");
  if (!(await canEdit(user, plan.kpi.ownerId, plan.kpi.id))) throw new ForbiddenError();
  return plan;
}

/** Only the KPI's owner or an admin may manage who is delegated/facilitating on it. */
export async function assertKpiOwnerOrAdmin(kpiId: string, user: SessionUser) {
  const kpi = await prisma.kpi.findUnique({ where: { id: kpiId }, select: { ownerId: true } });
  if (!kpi) throw new ForbiddenError("Indicador não encontrado.");
  if (user.id !== kpi.ownerId && user.role !== "ADMIN") throw new ForbiddenError();
  return kpi;
}
