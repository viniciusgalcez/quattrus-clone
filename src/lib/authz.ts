import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/hierarchy";

export class ForbiddenError extends Error {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

type SessionUser = { id: string; role: string };

/** Only the owner of a record, or an admin, may write to it. */
function canEdit(user: SessionUser, ownerId: string): boolean {
  return user.id === ownerId || user.role === "ADMIN";
}

export async function assertKpiEditable(kpiId: string, user: SessionUser) {
  const kpi = await prisma.kpi.findUnique({ where: { id: kpiId } });
  if (!kpi) throw new ForbiddenError("Indicador não encontrado.");
  if (!canEdit(user, kpi.ownerId)) throw new ForbiddenError();
  return kpi;
}

export async function assertMeasurementEditable(measurementId: string, user: SessionUser) {
  const measurement = await prisma.measurement.findUnique({
    where: { id: measurementId },
    include: { kpi: true },
  });
  if (!measurement) throw new ForbiddenError("Medição não encontrada.");
  if (!canEdit(user, measurement.kpi.ownerId)) throw new ForbiddenError();
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

export async function assertActionPlanEditable(actionPlanId: string, user: SessionUser) {
  const plan = await prisma.actionPlan.findUnique({
    where: { id: actionPlanId },
    include: { kpi: true },
  });
  if (!plan) throw new ForbiddenError("Plano de ação não encontrado.");
  if (!canEdit(user, plan.kpi.ownerId)) throw new ForbiddenError();
  return plan;
}
