"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentPeriod, getKpiStatus } from "@/lib/kpi";
import {
  requireUser,
  assertKpiEditable,
  assertMeasurementEditable,
  assertActionPlanEditable,
  assertKpiParentAssignable,
  assertDepartmentAssignable,
  assertKpiOwnerOrAdmin,
  assertFcaResolved,
  ForbiddenError,
} from "@/lib/authz";
import { canView, getManagerIds } from "@/lib/hierarchy";
import { getGoalApproverIds, notifyUsers, notifyUser } from "@/lib/notifications";
import { wouldCreateCycle } from "@/lib/hierarchy";
import { wouldCreateKpiCycle } from "@/lib/kpi-tree";
import { recalculateDependentMeasurements, recalculateParentMeasurement } from "@/lib/kpi-cascading";
import { decideGoalApproval } from "@/lib/measurement";
import { purgeArchivedKpiWithHistory } from "@/lib/archive";
import { recordAuditLog } from "@/lib/audit";
import { assertPeriodWritable } from "@/lib/period-locks";
import { resetRateLimit } from "@/lib/rate-limit";
import { comparePeriods } from "@/lib/period";
import {
  createKpiSchema,
  updateKpiSchema,
  saveKpiConfigurationSchema,
  upsertMeasurementSchema,
  upsertAnnualMeasurementSchema,
  saveActionPlanSchema,
  createUserSchema,
  updateUserSchema,
  createAccessProfileSchema,
  updateAccessProfileSchema,
  saveCompanySettingsSchema,
  createDepartmentSchema,
  createTaskSchema,
  createStrategicProjectSchema,
  updateStrategicProjectStatusSchema,
  updateTaskStatusSchema,
  createEventSchema,
  createDelegationSchema,
  createFacilitationSchema,
  closePeriodSchema,
  createActionPlanStepSchema,
  updateActionPlanStepSchema,
  createForecastRequestSchema,
  reviewForecastSchema,
  fieldErrorsFrom,
  type FormActionState,
} from "@/lib/schemas";
import { permissionsFromForm } from "@/lib/profile-permissions";

export async function createKpi(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const user = await requireUser("measurements");

  const parsed = createKpiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const {
    name,
    description,
    metricUnit,
    direction,
    weight,
    yellowRange,
    redRange,
    goal,
    calculationType,
    departmentId,
    parentId,
    category,
    client,
    bomFor,
    chronicRedMonths,
    decimalPlaces,
    coefficient,
    auxiliary,
    shared,
  } = parsed.data;

  // Both ids arrive from the client; being allowed to create a KPI says
  // nothing about which parent/department it may be attached to.
  try {
    await assertKpiParentAssignable(parentId, user);
    await assertDepartmentAssignable(departmentId, user);
    await assertPeriodWritable(currentPeriod(), departmentId);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  const kpi = await prisma.kpi.create({
    data: {
      name,
      description: description || null,
      ownerId: user.id,
      departmentId: departmentId || null,
      parentId: parentId || null,
      metricUnit,
      direction,
      weight,
      yellowRange,
      redRange,
      calculationType,
      category,
      client: client || null,
      bomFor: bomFor || null,
      chronicRedMonths,
      decimalPlaces,
      coefficient,
      auxiliary,
      shared,
    },
  });

  const initialMeasurement = await prisma.measurement.create({
    data: {
      kpiId: kpi.id,
      period: currentPeriod(),
      goal,
      actual: null,
      goalApprovalStatus: decideGoalApproval({
        actorRole: user.role as "ADMIN" | "GESTOR" | "COLABORADOR",
        goalChanged: true,
        previousStatus: "APROVADA",
      }),
      goalApprovedById: user.role === "COLABORADOR" ? null : user.id,
      goalApprovedAt: user.role === "COLABORADOR" ? null : new Date(),
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "Kpi",
    entityId: kpi.id,
    details: {
      name,
      ownerId: user.id,
      departmentId: departmentId || null,
      parentId: parentId || null,
      metricUnit,
      direction,
      calculationType,
      initialMeasurementId: initialMeasurement.id,
      initialGoal: goal,
      initialGoalApprovalStatus: user.role === "COLABORADOR" ? "PENDENTE" : "APROVADA",
    },
  });

  if (user.role === "COLABORADOR") {
    const approverIds = await getGoalApproverIds(user.id);
    await notifyUsers(approverIds, {
      type: "GOAL_PENDING",
      title: "Novo indicador aguardando aprovação",
      body: `${user.name ?? user.username} criou o indicador ${kpi.name} com uma meta pendente de aprovação.`,
      href: "/aprovacoes",
      relatedKpiId: kpi.id,
      fromUserId: user.id,
      originLabel: "Aprovações",
    });
  }

  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}

export async function updateKpi(
  kpiId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser("measurements");
  const existingKpi = await assertKpiEditable(kpiId, user);

  const parsed = updateKpiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const {
    name,
    description,
    metricUnit,
    direction,
    weight,
    yellowRange,
    redRange,
    priority,
    calculationType,
    departmentId,
    parentId,
    category,
    client,
    bomFor,
    chronicRedMonths,
    decimalPlaces,
    coefficient,
    auxiliary,
    shared,
  } = parsed.data;

  if (parentId === kpiId) {
    return { error: "Um indicador não pode ser pai de si mesmo.", fieldErrors: { parentId: "Escolha outro." } };
  }

  // The form only hides the KPI itself from the dropdown, so a deeper cycle
  // (B under A, then A under B) is reachable with two ordinary submissions.
  // Every node in such a loop has a resolvable parent and therefore no root,
  // which silently erases the whole subtree from the desdobramento view.
  if (parentId && (await wouldCreateKpiCycle(kpiId, parentId))) {
    return {
      error: "Esse vínculo criaria um ciclo no desdobramento.",
      fieldErrors: { parentId: "Escolha outro indicador." },
    };
  }

  try {
    await assertKpiParentAssignable(parentId, user);
    await assertDepartmentAssignable(departmentId, user);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  await prisma.kpi.update({
    where: { id: kpiId },
    data: {
      name,
      description: description || null,
      metricUnit,
      direction,
      weight,
      yellowRange,
      redRange,
      priority,
      calculationType,
      departmentId: departmentId || null,
      parentId: parentId || null,
      category,
      client: client || null,
      bomFor: bomFor || null,
      chronicRedMonths,
      decimalPlaces,
      coefficient,
      auxiliary,
      shared,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "Kpi",
    entityId: kpiId,
    details: {
      before: {
        name: existingKpi.name,
        description: existingKpi.description,
        metricUnit: existingKpi.metricUnit,
        direction: existingKpi.direction,
        weight: existingKpi.weight,
        yellowRange: existingKpi.yellowRange,
        redRange: existingKpi.redRange,
        priority: existingKpi.priority,
        calculationType: existingKpi.calculationType,
        departmentId: existingKpi.departmentId,
        parentId: existingKpi.parentId,
        category: existingKpi.category,
        client: existingKpi.client,
        bomFor: existingKpi.bomFor,
        chronicRedMonths: existingKpi.chronicRedMonths,
        decimalPlaces: existingKpi.decimalPlaces,
        coefficient: existingKpi.coefficient,
        auxiliary: existingKpi.auxiliary,
        shared: existingKpi.shared,
      },
      after: {
        name,
        description: description || null,
        metricUnit,
        direction,
        weight,
        yellowRange,
        redRange,
        priority,
        calculationType,
        departmentId: departmentId || null,
        parentId: parentId || null,
        category,
        client: client || null,
        bomFor: bomFor || null,
        chronicRedMonths,
        decimalPlaces,
        coefficient,
        auxiliary,
        shared,
      },
    },
  });

  revalidatePath("/metas");
  revalidatePath("/");
  revalidatePath(`/metas/${kpiId}`);
  redirect(`/metas/${kpiId}`);
}

export async function archiveKpi(kpiId: string) {
  const user = await requireUser("measurements");
  await assertKpiEditable(kpiId, user);
  await prisma.kpi.update({ where: { id: kpiId }, data: { archivedAt: new Date() } });
  await recordAuditLog({ userId: user.id, action: "ARCHIVE", entity: "Kpi", entityId: kpiId });
  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}

function formIds(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name).map(String).map((value) => value.trim()).filter(Boolean))];
}

/**
 * A formula reference is a directed edge: the configured item depends on its
 * inputs. Following the graph from a proposed input back to the item catches
 * cycles that would otherwise surface only as a recursive calculation error.
 */
async function wouldCreateFormulaReferenceCycle(sourceKpiId: string, targetKpiIds: string[]) {
  if (targetKpiIds.length === 0) return false;
  const [dependencies, formulas] = await Promise.all([
    prisma.kpiDependency.findMany({ select: { sourceKpiId: true, targetKpiId: true } }),
    prisma.kpiFormula.findMany({ select: { kpiId: true, numeratorKpiId: true, denominatorKpiId: true } }),
  ]);
  const graph = new Map<string, string[]>();
  for (const edge of dependencies) graph.set(edge.sourceKpiId, [...(graph.get(edge.sourceKpiId) ?? []), edge.targetKpiId]);
  for (const formula of formulas) {
    const targets = [formula.numeratorKpiId, formula.denominatorKpiId].filter((id): id is string => !!id);
    if (targets.length) graph.set(formula.kpiId, [...(graph.get(formula.kpiId) ?? []), ...targets]);
  }
  // Replace the source's existing outgoing edges with this submission before
  // checking it, otherwise a removed dependency can falsely look cyclic.
  graph.delete(sourceKpiId);
  graph.set(sourceKpiId, targetKpiIds);

  const visit = (id: string, seen = new Set<string>()): boolean => {
    if (id === sourceKpiId) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return (graph.get(id) ?? []).some((next) => visit(next, seen));
  };
  return targetKpiIds.some((id) => visit(id));
}

/** Saves the seven-tab Item de Controle configuration without rewriting history. */
export async function saveKpiConfiguration(
  kpiId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser("measurements");
  await assertKpiEditable(kpiId, user);
  const parsed = saveKpiConfigurationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Confira a configuração informada.", fieldErrors: fieldErrorsFrom(parsed.error) };

  const data = parsed.data;
  const linkedKpiIds = formIds(formData, "linkedKpiIds");
  const dependencyKpiIds = formIds(formData, "dependencyKpiIds");
  const formulaKpiIds = data.formulaKind === "QUOTIENT"
    ? [data.numeratorKpiId!, data.denominatorKpiId!]
    : [];
  const referencedIds = [...new Set([...linkedKpiIds, ...dependencyKpiIds, ...formulaKpiIds])];

  if (referencedIds.includes(kpiId)) {
    return { error: "Um item não pode referenciar a si mesmo." };
  }

  const targets = referencedIds.length
    ? await prisma.kpi.findMany({ where: { id: { in: referencedIds }, archivedAt: null }, select: { id: true, ownerId: true, shared: true } })
    : [];
  if (targets.length !== referencedIds.length) return { error: "Uma referência selecionada não está mais disponível." };
  for (const target of targets) {
    if (!target.shared && !(await canView(user.id, user.role, target.ownerId))) {
      return { error: "Você não pode usar um item de controle fora do seu escopo." };
    }
  }

  const calculationInputs = [...new Set([...dependencyKpiIds, ...formulaKpiIds])];
  if (await wouldCreateFormulaReferenceCycle(kpiId, calculationInputs)) {
    return { error: "Esta configuração criaria um ciclo de cálculo entre itens." };
  }

  const hasWindow = (start?: string, end?: string) => Boolean(start || end);
  await prisma.$transaction(async (tx) => {
    if (hasWindow(data.itemValidityStart, data.itemValidityEnd)) {
      const existing = await tx.kpiValidity.findFirst({ where: { kpiId, startPeriod: data.itemValidityStart || currentPeriod(), endPeriod: data.itemValidityEnd || null } });
      if (!existing) await tx.kpiValidity.create({ data: { kpiId, startPeriod: data.itemValidityStart || currentPeriod(), endPeriod: data.itemValidityEnd || null } });
    }
    if (hasWindow(data.measurementValidityStart, data.measurementValidityEnd)) {
      const existing = await tx.kpiMeasurementPeriod.findFirst({ where: { kpiId, startPeriod: data.measurementValidityStart || currentPeriod(), endPeriod: data.measurementValidityEnd || null } });
      if (!existing) await tx.kpiMeasurementPeriod.create({ data: { kpiId, startPeriod: data.measurementValidityStart || currentPeriod(), endPeriod: data.measurementValidityEnd || null } });
    }
    const existingThreshold = await tx.kpiThresholdValidity.findFirst({
      where: { kpiId, startPeriod: data.thresholdStart, endPeriod: data.thresholdEnd || null, yellowRange: data.yellowRange, redRange: data.redRange },
    });
    if (!existingThreshold) {
      await tx.kpiThresholdValidity.create({ data: { kpiId, startPeriod: data.thresholdStart, endPeriod: data.thresholdEnd || null, yellowRange: data.yellowRange, redRange: data.redRange } });
    }
    await tx.kpi.update({ where: { id: kpiId }, data: { calculationType: data.formulaKind === "TOTALIZER" ? "SUM" : data.formulaKind === "QUOTIENT" ? "MANUAL" : data.formulaKind, yellowRange: data.yellowRange, redRange: data.redRange } });
    await tx.kpiFormula.upsert({
      where: { kpiId },
      create: { kpiId, kind: data.formulaKind, numeratorKpiId: data.formulaKind === "QUOTIENT" ? data.numeratorKpiId : null, denominatorKpiId: data.formulaKind === "QUOTIENT" ? data.denominatorKpiId : null, denominatorAverage: data.formulaKind === "QUOTIENT" && data.denominatorAverage },
      update: { kind: data.formulaKind, numeratorKpiId: data.formulaKind === "QUOTIENT" ? data.numeratorKpiId : null, denominatorKpiId: data.formulaKind === "QUOTIENT" ? data.denominatorKpiId : null, denominatorAverage: data.formulaKind === "QUOTIENT" && data.denominatorAverage },
    });
    await tx.kpiLinkedItem.deleteMany({ where: { sourceKpiId: kpiId } });
    if (linkedKpiIds.length) await tx.kpiLinkedItem.createMany({ data: linkedKpiIds.map((targetKpiId) => ({ sourceKpiId: kpiId, targetKpiId })) });
    await tx.kpiDependency.deleteMany({ where: { sourceKpiId: kpiId } });
    if (dependencyKpiIds.length) await tx.kpiDependency.createMany({ data: dependencyKpiIds.map((targetKpiId) => ({ sourceKpiId: kpiId, targetKpiId, dependencyType: "CALCULO" })) });
  });

  await recordAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "KpiConfiguration",
    entityId: kpiId,
    details: { formulaKind: data.formulaKind, linkedKpiIds, dependencyKpiIds, itemValidityStart: data.itemValidityStart || null, measurementValidityStart: data.measurementValidityStart || null, thresholdStart: data.thresholdStart },
  });
  revalidatePath(`/metas/${kpiId}`);
  revalidatePath(`/metas/${kpiId}/editar`);
  revalidatePath("/metas");
  return { error: undefined };
}

/** Reparents an existing, editable item under this one for totalization purposes. */
export async function addTotalizationChild(
  parentKpiId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser("measurements");
  await assertKpiEditable(parentKpiId, user);
  const childKpiId = String(formData.get("childKpiId") ?? "").trim();
  if (!childKpiId) return { error: "Selecione um item para adicionar." };
  if (childKpiId === parentKpiId) return { error: "Um item não pode ser subordinado a si mesmo." };
  await assertKpiEditable(childKpiId, user);
  if (await wouldCreateKpiCycle(childKpiId, parentKpiId)) {
    return { error: "Esta associação criaria um ciclo na hierarquia." };
  }
  await prisma.kpi.update({ where: { id: childKpiId }, data: { parentId: parentKpiId } });
  await recordAuditLog({ userId: user.id, action: "UPDATE", entity: "KpiTotalization", entityId: parentKpiId, details: { addedChild: childKpiId } });
  revalidatePath(`/metas/${parentKpiId}/editar`);
  revalidatePath(`/metas/${parentKpiId}`);
  return { error: undefined };
}

/** Removes an item from this one's totalization, without archiving it. */
export async function removeTotalizationChild(parentKpiId: string, childKpiId: string) {
  const user = await requireUser("measurements");
  await assertKpiEditable(parentKpiId, user);
  await assertKpiEditable(childKpiId, user);
  const child = await prisma.kpi.findUnique({ where: { id: childKpiId }, select: { parentId: true } });
  if (child?.parentId !== parentKpiId) throw new ForbiddenError("Este item não é subordinado deste indicador.");
  await prisma.kpi.update({ where: { id: childKpiId }, data: { parentId: null } });
  await recordAuditLog({ userId: user.id, action: "UPDATE", entity: "KpiTotalization", entityId: parentKpiId, details: { removedChild: childKpiId } });
  revalidatePath(`/metas/${parentKpiId}/editar`);
  revalidatePath(`/metas/${parentKpiId}`);
}

/** Bulk-saves the per-child weight/coefficient used by the parent's totalization. */
export async function updateTotalizationWeights(
  parentKpiId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser("measurements");
  await assertKpiEditable(parentKpiId, user);
  const children = await prisma.kpi.findMany({ where: { parentId: parentKpiId }, select: { id: true } });
  if (children.length === 0) return { error: undefined };

  await prisma.$transaction(
    children.map((child) => {
      const weightRaw = formData.get(`weight_${child.id}`);
      const coefficientRaw = formData.get(`coefficient_${child.id}`);
      const weight = weightRaw !== null && String(weightRaw).trim() !== "" ? Number(weightRaw) : null;
      const coefficient = coefficientRaw !== null && String(coefficientRaw).trim() !== "" ? Number(coefficientRaw) : null;
      return prisma.kpi.update({
        where: { id: child.id },
        data: {
          ...(weight !== null && Number.isFinite(weight) ? { weight } : {}),
          coefficient: coefficient !== null && Number.isFinite(coefficient) ? coefficient : null,
        },
      });
    })
  );
  await recordAuditLog({ userId: user.id, action: "UPDATE", entity: "KpiTotalization", entityId: parentKpiId, details: { updatedWeights: children.map((c) => c.id) } });
  revalidatePath(`/metas/${parentKpiId}/editar`);
  return { error: undefined };
}

/** Re-runs the totalizer/formula cascade for the current period on demand. */
export async function recalculateTotalization(parentKpiId: string) {
  const user = await requireUser("measurements");
  await assertKpiEditable(parentKpiId, user);
  const period = currentPeriod();
  await recalculateParentMeasurement(parentKpiId, period);
  await recalculateDependentMeasurements(parentKpiId, period);
  revalidatePath(`/metas/${parentKpiId}`);
  revalidatePath(`/metas/${parentKpiId}/editar`);
}

/** Toggles whether every user (not just the owner's scope) can see/use this item. */
export async function updateKpiSharing(
  kpiId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser("measurements");
  await assertKpiOwnerOrAdmin(kpiId, user);
  const shared = formData.get("shared") === "true";
  await prisma.kpi.update({ where: { id: kpiId }, data: { shared } });
  await recordAuditLog({ userId: user.id, action: "UPDATE", entity: "Kpi", entityId: kpiId, details: { shared } });
  revalidatePath(`/metas/${kpiId}/editar`);
  revalidatePath(`/metas/${kpiId}`);
  return { error: undefined };
}

// ── Indicadores arquivados (admin-only) ─────────────────────────────────────

export async function restoreKpi(kpiId: string) {
  const user = await requireUser("measurements");
  if (user.role !== "ADMIN") throw new ForbiddenError("Apenas administradores podem restaurar indicadores.");

  await prisma.kpi.update({ where: { id: kpiId }, data: { archivedAt: null } });
  await recordAuditLog({ userId: user.id, action: "RESTORE", entity: "Kpi", entityId: kpiId });
  revalidatePath("/metas/arquivados");
  revalidatePath("/metas");
  revalidatePath("/");
}

/** Manual, immediate version of the 1-year auto-purge — for one item, on demand. */
export async function purgeArchivedKpiNow(kpiId: string) {
  const user = await requireUser("measurements");
  if (user.role !== "ADMIN") throw new ForbiddenError("Apenas administradores podem excluir indicadores arquivados.");

  const kpi = await prisma.kpi.findUnique({ where: { id: kpiId }, select: { archivedAt: true } });
  if (!kpi) throw new ForbiddenError("Indicador não encontrado.");
  if (!kpi.archivedAt) throw new ForbiddenError("Este indicador não está arquivado.");

  await purgeArchivedKpiWithHistory(kpiId, user.id);
  revalidatePath("/metas/arquivados");
}

export async function upsertMeasurement(formData: FormData) {
  const user = await requireUser("measurements");

  const kpiId = String(formData.get("kpiId"));
  const kpi = await assertKpiEditable(kpiId, user);

  const parsed = upsertMeasurementSchema.safeParse({
    kpiId,
    goal: formData.get("goal"),
    actual: formData.get("actual"),
  });
  if (!parsed.success) {
    throw new Error(Object.values(fieldErrorsFrom(parsed.error))[0] ?? "Valores inválidos.");
  }

  // The current month is the only editable period — never trust a period
  // string coming from the client, or a past month could be silently rewritten.
  const period = currentPeriod();
  await assertPeriodWritable(period, kpi.departmentId);
  await assertFcaResolved(kpiId, period);

  const { goal, actual } = parsed.data;
  const trafficLight = getKpiStatus(goal, actual, kpi.direction, kpi.yellowRange, kpi.redRange);

  const existing = await prisma.measurement.findUnique({
    where: { kpiId_period: { kpiId, period } },
    select: { goal: true, actual: true, trafficLight: true, goalApprovalStatus: true },
  });
  const goalApprovalStatus = decideGoalApproval({
    actorRole: user.role as "ADMIN" | "GESTOR" | "COLABORADOR",
    goalChanged: existing ? existing.goal !== goal : true,
    previousStatus: existing?.goalApprovalStatus ?? "APROVADA",
  });
  const goalApprovedById = goalApprovalStatus === "APROVADA" ? user.id : null;
  const goalApprovedAt = goalApprovalStatus === "APROVADA" ? new Date() : null;

  const measurement = await prisma.measurement.upsert({
    where: { kpiId_period: { kpiId, period } },
    update: { goal, actual, trafficLight, reportedById: user.id, goalApprovalStatus, goalApprovedById, goalApprovedAt },
    create: {
      kpiId,
      period,
      goal,
      actual,
      trafficLight,
      reportedById: user.id,
      goalApprovalStatus,
      goalApprovedById,
      goalApprovedAt,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "UPSERT",
    entity: "Measurement",
    entityId: measurement.id,
    details: {
      kpiId,
      period,
      before: existing,
      after: { goal, actual, trafficLight, goalApprovalStatus },
    },
  });

  if (goalApprovalStatus === "PENDENTE" && existing?.goalApprovalStatus !== "PENDENTE") {
    await notifyUsers(await getGoalApproverIds(kpi.ownerId), {
      type: "GOAL_PENDING",
      title: "Meta aguardando aprovação",
      body: `${user.name ?? user.username} alterou a meta de um indicador e ela precisa de aprovação.`,
      href: "/aprovacoes",
      relatedKpiId: kpi.id,
      fromUserId: user.id,
      originLabel: "Aprovações",
    });
  }

  // CRITICO is the worst tier — it must open an action plan too. Leaving it
  // out meant a mildly-off KPI got an FCA while a catastrophically-off one
  // did not.
  if (trafficLight === "AMARELO" || trafficLight === "VERMELHO" || trafficLight === "CRITICO") {
    await prisma.actionPlan.upsert({
      where: { measurementId: measurement.id },
      update: {},
      create: {
        kpiId,
        measurementId: measurement.id,
        fact: `Desvio reportado no período ${period}`,
        status: "ABERTO",
        createdById: user.id,
      },
    });
  } else if (trafficLight === "VERDE") {
    // Optional: if it improved to VERDE, we could theoretically close or delete the pending FCA, 
    // but typically it's left as is or resolved manually.
  }

  // Trigger cascading calculations
  if (kpi.parentId) {
    await recalculateParentMeasurement(kpi.parentId, period);
  }
  await recalculateDependentMeasurements(kpiId, period);

  revalidatePath("/metas");
  revalidatePath("/");
  revalidatePath(`/metas/${kpiId}`);
}

/**
 * Annual-grid write path. Unlike the compact current-cycle editor, the period
 * comes from a selected month and is therefore validated, locked and audited
 * server-side before any value is persisted.
 */
export async function upsertAnnualMeasurement(formData: FormData) {
  const user = await requireUser("measurements");
  const parsed = upsertAnnualMeasurementSchema.safeParse({
    kpiId: formData.get("kpiId"),
    period: formData.get("period"),
    goal: formData.get("goal"),
    actual: formData.get("actual"),
    forecast: formData.get("forecast"),
    measured: formData.get("measured"),
    justification: formData.get("justification"),
    benchmark: formData.get("benchmark"),
    benchmarkValue: formData.get("benchmarkValue"),
  });
  if (!parsed.success) throw new Error(Object.values(fieldErrorsFrom(parsed.error))[0] ?? "Valores inválidos.");

  const data = parsed.data;
  if (comparePeriods(data.period, currentPeriod()) > 0) throw new Error("Não é possível lançar medições em um período futuro.");
  const kpi = await assertKpiEditable(data.kpiId, user);
  await assertPeriodWritable(data.period, kpi.departmentId);
  await assertFcaResolved(data.kpiId, data.period);

  const [existing, threshold] = await Promise.all([
    prisma.measurement.findUnique({ where: { kpiId_period: { kpiId: data.kpiId, period: data.period } }, select: { id: true, goal: true, actual: true, measured: true, forecast: true, justification: true, benchmark: true, benchmarkValue: true, trafficLight: true, goalApprovalStatus: true } }),
    prisma.kpiThresholdValidity.findFirst({ where: { kpiId: data.kpiId, startPeriod: { lte: data.period }, OR: [{ endPeriod: null }, { endPeriod: { gte: data.period } }] }, orderBy: { startPeriod: "desc" }, select: { yellowRange: true, redRange: true } }),
  ]);
  const yellowRange = threshold?.yellowRange ?? kpi.yellowRange;
  const redRange = threshold?.redRange ?? kpi.redRange;
  const trafficLight = getKpiStatus(data.goal, data.measured ? data.actual : null, kpi.direction, yellowRange, redRange);
  const goalApprovalStatus = decideGoalApproval({
    actorRole: user.role as "ADMIN" | "GESTOR" | "COLABORADOR",
    goalChanged: existing ? existing.goal !== data.goal : true,
    previousStatus: existing?.goalApprovalStatus ?? "APROVADA",
  });
  const goalApprovedById = goalApprovalStatus === "APROVADA" ? user.id : null;
  const goalApprovedAt = goalApprovalStatus === "APROVADA" ? new Date() : null;
  const values = {
    goal: data.goal,
    actual: data.measured ? data.actual : null,
    measured: data.measured,
    forecast: data.forecast,
    justification: data.justification || null,
    benchmark: data.benchmark || null,
    benchmarkValue: data.benchmarkValue,
    trafficLight,
    reportedById: user.id,
    goalApprovalStatus,
    goalApprovedById,
    goalApprovedAt,
  };
  const measurement = await prisma.measurement.upsert({
    where: { kpiId_period: { kpiId: data.kpiId, period: data.period } },
    update: values,
    create: { kpiId: data.kpiId, period: data.period, ...values },
  });
  await recordAuditLog({ userId: user.id, action: "UPSERT", entity: "Measurement", entityId: measurement.id, details: { kpiId: data.kpiId, period: data.period, before: existing, after: values } });
  if (goalApprovalStatus === "PENDENTE" && existing?.goalApprovalStatus !== "PENDENTE") {
    await notifyUsers(await getGoalApproverIds(kpi.ownerId), { type: "GOAL_PENDING", title: "Meta aguardando aprovação", body: `${user.name ?? user.username} alterou uma meta anual e ela precisa de aprovação.`, href: "/aprovacoes", relatedKpiId: kpi.id, fromUserId: user.id, originLabel: "Aprovações" });
  }
  if (["AMARELO", "VERMELHO", "CRITICO"].includes(trafficLight)) {
    await prisma.actionPlan.upsert({ where: { measurementId: measurement.id }, update: {}, create: { kpiId: data.kpiId, measurementId: measurement.id, fact: `Desvio reportado no período ${data.period}`, status: "ABERTO", createdById: user.id } });
  }
  if (kpi.parentId) await recalculateParentMeasurement(kpi.parentId, data.period);
  await recalculateDependentMeasurements(data.kpiId, data.period);
  revalidatePath("/medicoes");
  revalidatePath("/farol");
  revalidatePath(`/metas/${data.kpiId}`);
}

export async function saveActionPlan(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser("tasks");

  const measurementId = String(formData.get("measurementId"));
  const measurement = await assertMeasurementEditable(measurementId, user);
  // kpiId is derived from the measurement itself, never trusted from the
  // form — otherwise an ActionPlan could be pointed at a KPI that doesn't
  // match its measurement, corrupting per-owner counters.
  const kpiId = measurement.kpiId;

  const parsed = saveActionPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const v = parsed.data;
  const data = {
    fact: v.fact,
    why1: v.why1 || null,
    why2: v.why2 || null,
    why3: v.why3 || null,
    why4: v.why4 || null,
    why5: v.why5 || null,
    rootCause: v.rootCause || null,
    what: v.what || null,
    who: v.who || null,
    where: v.where || null,
    when: v.when ? new Date(v.when) : null,
    why: v.why || null,
    how: v.how || null,
    howMuch: v.howMuch,
  };

  const plan = await prisma.actionPlan.upsert({
    where: { measurementId },
    update: data,
    create: {
      ...data,
      measurementId,
      kpiId,
      createdById: user.id,
      status: "ABERTO",
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "UPSERT",
    entity: "ActionPlan",
    entityId: plan.id,
    details: { measurementId, kpiId },
  });

  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}

export async function concludeActionPlan(actionPlanId: string) {
  const user = await requireUser("tasks");
  await assertActionPlanEditable(actionPlanId, user);
  await prisma.actionPlan.update({
    where: { id: actionPlanId },
    data: { status: "CONCLUIDO" },
  });
  await recordAuditLog({
    userId: user.id,
    action: "STATUS_CHANGE",
    entity: "ActionPlan",
    entityId: actionPlanId,
    details: { status: "CONCLUIDO" },
  });
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function reopenActionPlan(actionPlanId: string) {
  const user = await requireUser("tasks");
  await assertActionPlanEditable(actionPlanId, user);
  await prisma.actionPlan.update({
    where: { id: actionPlanId },
    data: { status: "ABERTO" },
  });
  await recordAuditLog({
    userId: user.id,
    action: "STATUS_CHANGE",
    entity: "ActionPlan",
    entityId: actionPlanId,
    details: { status: "ABERTO" },
  });
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function createActionPlanStep(formData: FormData): Promise<void> {
  const user = await requireUser("tasks");
  const parsed = createActionPlanStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(Object.values(fieldErrorsFrom(parsed.error))[0] ?? "Etapa inválida.");

  const data = parsed.data;
  await assertActionPlanEditable(data.actionPlanId, user);
  const step = await prisma.actionPlanStep.create({
    data: {
      actionPlanId: data.actionPlanId,
      parentId: data.parentId || null,
      name: data.name,
      responsibleId: data.responsibleId || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      value: data.value,
    },
  });
  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "ActionPlanStep",
    entityId: step.id,
    details: { actionPlanId: data.actionPlanId, name: data.name, responsibleId: data.responsibleId || null },
  });
  revalidatePath(`/fca/${(await prisma.actionPlan.findUnique({ where: { id: data.actionPlanId }, select: { measurementId: true } }))?.measurementId ?? ""}`);
}

export async function updateActionPlanStep(stepId: string, formData: FormData): Promise<void> {
  const user = await requireUser("tasks");
  const step = await prisma.actionPlanStep.findUnique({ where: { id: stepId }, select: { actionPlanId: true } });
  if (!step) throw new ForbiddenError("Etapa não encontrada.");
  await assertActionPlanEditable(step.actionPlanId, user);
  const parsed = updateActionPlanStepSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(Object.values(fieldErrorsFrom(parsed.error))[0] ?? "Etapa inválida.");
  const data = parsed.data;
  await prisma.actionPlanStep.update({
    where: { id: stepId },
    data: {
      parentId: data.parentId || null,
      name: data.name,
      responsibleId: data.responsibleId || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      value: data.value,
      status: data.status,
    },
  });
  await recordAuditLog({ userId: user.id, action: "UPDATE", entity: "ActionPlanStep", entityId: stepId, details: data });
}

export async function deleteActionPlanStep(stepId: string): Promise<void> {
  const user = await requireUser("tasks");
  const step = await prisma.actionPlanStep.findUnique({ where: { id: stepId }, select: { actionPlanId: true } });
  if (!step) throw new ForbiddenError("Etapa não encontrada.");
  await assertActionPlanEditable(step.actionPlanId, user);
  await prisma.actionPlanStep.delete({ where: { id: stepId } });
  await recordAuditLog({ userId: user.id, action: "DELETE", entity: "ActionPlanStep", entityId: stepId, details: { actionPlanId: step.actionPlanId } });
}

export async function createForecastRequest(formData: FormData): Promise<void> {
  const user = await requireUser("measurements");
  const parsed = createForecastRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(Object.values(fieldErrorsFrom(parsed.error))[0] ?? "Previsão inválida.");
  const data = parsed.data;
  const kpi = await assertKpiEditable(data.kpiId, user);
  const existing = await prisma.forecastRequest.findFirst({
    where: { kpiId: data.kpiId, period: data.period, status: "PENDENTE" },
    select: { id: true },
  });
  if (existing) throw new Error("Já existe uma previsão pendente para este indicador e período.");
  const request = await prisma.forecastRequest.create({
    data: {
      kpiId: kpi.id,
      period: data.period,
      proposedGoal: data.proposedGoal,
      proposedActual: data.proposedActual,
      reason: data.reason,
      requestedById: user.id,
    },
  });
  const managerIds = await getManagerIds(kpi.ownerId);
  const reviewers = managerIds.length ? managerIds : await prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } }).then((users) => users.map((item) => item.id));
  await notifyUsers(reviewers, { type: "FORECAST_PENDING", title: "Previsão aguardando aprovação", body: `Há uma previsão de ${kpi.name} para ${data.period} aguardando análise.`, href: "/aprovacoes/previsoes", relatedKpiId: kpi.id, fromUserId: user.id, originLabel: "Previsões" });
  await recordAuditLog({ userId: user.id, action: "CREATE", entity: "ForecastRequest", entityId: request.id, details: data });
  revalidatePath("/aprovacoes/previsoes");
}

export async function reviewForecast(forecastId: string, formData: FormData): Promise<void> {
  const user = await requireUser("approvals");
  const parsed = reviewForecastSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(Object.values(fieldErrorsFrom(parsed.error))[0] ?? "Decisão inválida.");
  const forecast = await prisma.forecastRequest.findUnique({ where: { id: forecastId }, include: { kpi: { select: { ownerId: true, departmentId: true, direction: true, yellowRange: true, redRange: true, parentId: true } } } });
  if (!forecast) throw new ForbiddenError("Previsão não encontrada.");
  if (forecast.status !== "PENDENTE") throw new Error("Esta previsão já foi analisada.");
  if (forecast.kpi.ownerId === user.id || !(await canView(user.id, user.role, forecast.kpi.ownerId))) {
    throw new ForbiddenError("Você não pode analisar esta previsão.");
  }
  await assertPeriodWritable(forecast.period, forecast.kpi.departmentId);
  const data = parsed.data;
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.forecastRequest.updateMany({
      where: { id: forecastId, status: "PENDENTE" },
      data: { status: data.status, reviewNote: data.reviewNote || null, reviewedById: user.id, reviewedAt: new Date() },
    });
    if (claimed.count !== 1) throw new Error("Esta previsão já foi analisada.");

    if (data.status !== "APROVADA") return;

    const current = await tx.measurement.findUnique({
      where: { kpiId_period: { kpiId: forecast.kpiId, period: forecast.period } },
      select: { goal: true, actual: true },
    });
    const goal = forecast.proposedGoal ?? current?.goal;
    const actual = forecast.proposedActual ?? current?.actual ?? null;
    if (goal === undefined) throw new Error("A previsão aprovada não possui uma meta válida.");
    const trafficLight = getKpiStatus(goal, actual, forecast.kpi.direction, forecast.kpi.yellowRange, forecast.kpi.redRange);

    await tx.measurement.upsert({
      where: { kpiId_period: { kpiId: forecast.kpiId, period: forecast.period } },
      update: { goal, actual, trafficLight, reportedById: forecast.requestedById, goalApprovalStatus: "APROVADA", goalApprovedById: user.id, goalApprovedAt: new Date() },
      create: { kpiId: forecast.kpiId, period: forecast.period, goal, actual, trafficLight, reportedById: forecast.requestedById, goalApprovalStatus: "APROVADA", goalApprovedById: user.id, goalApprovedAt: new Date() },
    });
  });
  if (data.status === "APROVADA" && forecast.kpi.parentId) {
    await recalculateParentMeasurement(forecast.kpi.parentId, forecast.period);
  }
  if (data.status === "APROVADA") {
    await recalculateDependentMeasurements(forecast.kpiId, forecast.period);
  }
  await notifyUser({ recipientId: forecast.requestedById, type: "FORECAST_REVIEWED", title: `Previsão ${data.status === "APROVADA" ? "aprovada" : "rejeitada"}`, body: `A previsão do período ${forecast.period} foi analisada pelo gestor.`, href: `/metas/${forecast.kpiId}`, relatedKpiId: forecast.kpiId, fromUserId: user.id, originLabel: "Previsões" });
  await recordAuditLog({ userId: user.id, action: "STATUS_CHANGE", entity: "ForecastRequest", entityId: forecastId, details: { status: data.status, reviewNote: data.reviewNote || null } });
  revalidatePath("/aprovacoes/previsoes");
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await requireUser();
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count > 0) {
    await recordAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Notification",
      entityId: notificationId,
      details: { read: true },
    });
  }
  revalidatePath("/notificacoes");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  const result = await prisma.notification.updateMany({
    where: { recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count > 0) {
    await recordAuditLog({
      userId: user.id,
      action: "UPDATE",
      entity: "Notification",
      entityId: user.id,
      details: { readAll: true, count: result.count },
    });
  }
  revalidatePath("/notificacoes");
}

export async function saveUserPreferences(formData: FormData): Promise<void> {
  const user = await requireUser();
  const density = formData.get("density") === "compact" ? "compact" : "comfortable";
  const theme = formData.get("theme") === "light" ? "light" : "dark";
  const startPage = ["/", "/metas", "/farol", "/agenda"].includes(String(formData.get("startPage"))) ? String(formData.get("startPage")) : "/";
  const dashboardMonths = Math.min(12, Math.max(1, Number(formData.get("dashboardMonths")) || 12));
  const blankMonths = Math.min(12, Math.max(0, Number(formData.get("blankMonths")) || 0));
  const basePeriodRaw = String(formData.get("basePeriod") ?? "");
  const basePeriod = /^\d{4}-(0[1-9]|1[0-2])$/.test(basePeriodRaw) ? basePeriodRaw : null;
  const preferences = { density, theme, startPage, emailNotifications: formData.get("emailNotifications") === "on", dashboardMonths, blankMonths, basePeriod, showDelegated: formData.get("showDelegated") === "on", showTeamReds: formData.get("showTeamReds") === "on" };
  await prisma.userPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, ...preferences }, update: preferences });
  await recordAuditLog({ userId: user.id, action: "UPDATE", entity: "UserPreference", entityId: user.id, details: preferences });
  // Theme and density are consumed by the shared application layout, while
  // /inicio resolves the preferred destination after a sign-in.
  revalidatePath("/", "layout");
  revalidatePath("/inicio");
  revalidatePath("/preferencias");
}

/**
 * Keeps the "Gestor" dropdown (a shortcut for the common single-manager
 * case) in sync with the full `Subordination` grid: it always targets the
 * principal row, without touching any other manager the user might also
 * answer to via "Configurar Subordinação".
 */
async function syncPrincipalManager(userId: string, managerId: string | null) {
  await prisma.subordination.updateMany({ where: { userId, principal: true }, data: { principal: false } });
  if (managerId) {
    await prisma.subordination.upsert({
      where: { userId_managerId: { userId, managerId } },
      create: { userId, managerId, principal: true },
      update: { principal: true },
    });
  }
}

export async function createUser(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const actingUser = await requireUser("users");
  if (actingUser.role !== "ADMIN") {
    return { error: "Apenas administradores podem cadastrar usuários." };
  }

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { username, name, password, role, managerId, departmentId, accessProfileId } = parsed.data;

  if (accessProfileId) {
    const profile = await prisma.accessProfile.findUnique({ where: { id: accessProfileId }, select: { type: true } });
    if (!profile || profile.type !== role) {
      return { error: "O perfil de acesso deve pertencer ao mesmo tipo do usuário.", fieldErrors: { accessProfileId: "Selecione um perfil compatível." } };
    }
  }

  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash(password, 10);

  let created;
  try {
    created = await prisma.user.create({
      data: {
        username,
        name,
        passwordHash,
        role,
        managerId: managerId || null,
        departmentId: departmentId || null,
        accessProfileId: accessProfileId || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Este nome de usuário já está em uso.", fieldErrors: { username: "Já está em uso." } };
    }
    throw err;
  }

  if (managerId) await syncPrincipalManager(created.id, managerId);

  await recordAuditLog({
    userId: actingUser.id,
    action: "CREATE",
    entity: "User",
    entityId: created.id,
    details: { username, role, managerId, departmentId, accessProfileId },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateUser(
  targetUserId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const actingUser = await requireUser("users");
  if (actingUser.role !== "ADMIN") {
    return { error: "Apenas administradores podem editar usuários." };
  }

  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { name, role, managerId, departmentId, password, accessProfileId } = parsed.data;

  if (accessProfileId) {
    const profile = await prisma.accessProfile.findUnique({ where: { id: accessProfileId }, select: { type: true } });
    if (!profile || profile.type !== role) {
      return { error: "O perfil de acesso deve pertencer ao mesmo tipo do usuário.", fieldErrors: { accessProfileId: "Selecione um perfil compatível." } };
    }
  }

  if (managerId && (await wouldCreateCycle(targetUserId, managerId))) {
    return {
      error: "Esse gestor criaria um ciclo de hierarquia.",
      fieldErrors: { managerId: "Escolha outro gestor." },
    };
  }

  const data: {
    name: string;
    role: "ADMIN" | "GESTOR" | "COLABORADOR";
    managerId: string | null;
    departmentId: string | null;
    accessProfileId: string | null;
    passwordHash?: string;
  } = { name, role, managerId: managerId || null, departmentId: departmentId || null, accessProfileId: accessProfileId || null };

  const passwordChanged = Boolean(password);
  if (password) {
    const bcrypt = (await import("bcryptjs")).default;
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id: targetUserId }, data });
  await syncPrincipalManager(targetUserId, managerId || null);

  await recordAuditLog({
    userId: actingUser.id,
    action: "UPDATE",
    entity: "User",
    entityId: targetUserId,
    // Never log the password itself — only whether it changed.
    details: { name, role, managerId, departmentId, accessProfileId, passwordChanged },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

/** Clears the login rate-limit bucket for a user locked out by failed attempts. */
export async function unlockUserAccount(targetUserId: string) {
  const actingUser = await requireUser("users");
  if (actingUser.role !== "ADMIN") throw new ForbiddenError("Apenas administradores podem desbloquear contas.");

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { username: true } });
  if (!target) throw new ForbiddenError("Usuário não encontrado.");

  resetRateLimit("login", target.username.trim().toLowerCase());
  await recordAuditLog({ userId: actingUser.id, action: "UPDATE", entity: "User", entityId: targetUserId, details: { unlockedLogin: true } });
  revalidatePath(`/usuarios/${targetUserId}/editar`);
}

export async function createAccessProfile(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const actingUser = await requireUser("profiles");
  if (actingUser.role !== "ADMIN") return { error: "Apenas administradores podem configurar perfis." };

  const parsed = createAccessProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };

  try {
    const profile = await prisma.accessProfile.create({
      data: { ...parsed.data, permissions: permissionsFromForm(formData) },
    });
    await recordAuditLog({ userId: actingUser.id, action: "CREATE", entity: "AccessProfile", entityId: profile.id, details: { name: profile.name, type: profile.type, permissions: profile.permissions } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Já existe um perfil com esse nome.", fieldErrors: { name: "Já existe." } };
    }
    throw err;
  }
  revalidatePath("/perfis");
  revalidatePath("/usuarios");
  return {};
}

export async function updateAccessProfile(profileId: string, _prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const actingUser = await requireUser("profiles");
  if (actingUser.role !== "ADMIN") return { error: "Apenas administradores podem configurar perfis." };

  const parsed = updateAccessProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };

  const linkedUsers = await prisma.user.count({ where: { accessProfileId: profileId, role: { not: parsed.data.type } } });
  if (linkedUsers) return { error: "Não é possível trocar o tipo de um perfil que está vinculado a usuários de outro papel." };

  try {
    const profile = await prisma.accessProfile.update({
      where: { id: profileId },
      data: { ...parsed.data, permissions: permissionsFromForm(formData) },
    });
    await recordAuditLog({ userId: actingUser.id, action: "UPDATE", entity: "AccessProfile", entityId: profile.id, details: { name: profile.name, type: profile.type, permissions: profile.permissions } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { error: "Já existe um perfil com esse nome.", fieldErrors: { name: "Já existe." } };
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return { error: "Perfil não encontrado." };
    throw err;
  }
  revalidatePath("/perfis");
  revalidatePath("/usuarios");
  return {};
}

export async function saveCompanySettings(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const actingUser = await requireUser("profiles");
  if (actingUser.role !== "ADMIN") return { error: "Apenas administradores podem alterar as configurações da empresa." };
  const parsed = saveCompanySettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  const settings = await prisma.companySettings.upsert({ where: { id: "capricornio" }, create: { id: "capricornio", ...parsed.data }, update: parsed.data });
  await recordAuditLog({ userId: actingUser.id, action: "UPDATE", entity: "CompanySettings", entityId: settings.id, details: parsed.data });
  revalidatePath("/empresa");
  return {};
}

export async function setUserActive(targetUserId: string, active: boolean) {
  const actingUser = await requireUser("users");
  if (actingUser.role !== "ADMIN") throw new Error("Apenas administradores podem fazer isso.");
  if (targetUserId === actingUser.id && !active) {
    throw new Error("Você não pode desativar sua própria conta.");
  }

  await prisma.user.update({ where: { id: targetUserId }, data: { active } });
  await recordAuditLog({
    userId: actingUser.id,
    action: "STATUS_CHANGE",
    entity: "User",
    entityId: targetUserId,
    details: { active },
  });
  revalidatePath("/usuarios");
}

// ── Departamentos ────────────────────────────────────────────────────────

export async function createDepartment(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const actingUser = await requireUser("departments");
  if (actingUser.role !== "ADMIN") {
    return { error: "Apenas administradores podem cadastrar departamentos." };
  }

  const parsed = createDepartmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    await prisma.department.create({ data: { name: parsed.data.name } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Já existe um departamento com esse nome.", fieldErrors: { name: "Já existe." } };
    }
    throw err;
  }

  revalidatePath("/departamentos");
  revalidatePath("/usuarios");
  revalidatePath("/metas/novo");
  return {};
}

export async function deleteDepartment(departmentId: string) {
  const actingUser = await requireUser("departments");
  if (actingUser.role !== "ADMIN") {
    throw new Error("Apenas administradores podem excluir departamentos.");
  }

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { name: true, _count: { select: { users: true } } },
  });
  if (!department) throw new Error("Departamento não encontrado.");

  // KPIs and locks just detach (departmentId → null) on delete, but people
  // left in an orphaned department would silently vanish from every
  // department-scoped view — reassign or deactivate them first.
  if (department._count.users > 0) {
    throw new Error(
      `Remova ou realoque as ${department._count.users} pessoa(s) do departamento "${department.name}" antes de excluí-lo.`
    );
  }

  await prisma.department.delete({ where: { id: departmentId } });

  await recordAuditLog({
    userId: actingUser.id,
    action: "DELETE",
    entity: "Department",
    entityId: departmentId,
    details: { name: department.name },
  });

  revalidatePath("/departamentos");
  revalidatePath("/usuarios");
  revalidatePath("/metas/novo");
}

// ── Tarefas (5W2H avulso) ──────────────────────────────────────────────────

export async function createStrategicProject(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const user = await requireUser("tasks");
  if (user.role !== "GESTOR" && user.role !== "ADMIN") return { error: "Apenas gestores podem cadastrar projetos estratégicos." };
  const parsed = createStrategicProjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  const data = parsed.data;
  if (data.departmentId) await assertDepartmentAssignable(data.departmentId, user);
  const project = await prisma.strategicProject.create({ data: { name: data.name, description: data.description || null, ownerId: user.id, departmentId: data.departmentId || null, kpiId: data.kpiId || null, startDate: data.startDate ? new Date(data.startDate) : null, dueDate: data.dueDate ? new Date(data.dueDate) : null, budget: data.budget } });
  await recordAuditLog({ userId: user.id, action: "CREATE", entity: "StrategicProject", entityId: project.id, details: { name: project.name, kpiId: project.kpiId, departmentId: project.departmentId } });
  revalidatePath("/projetos");
  redirect("/projetos");
}

export async function updateStrategicProjectStatus(projectId: string, formData: FormData) {
  const user = await requireUser("tasks");
  const project = await prisma.strategicProject.findUnique({ where: { id: projectId } });
  if (!project) throw new ForbiddenError("Projeto não encontrado.");
  if (project.ownerId !== user.id && user.role !== "ADMIN") throw new ForbiddenError();
  const parsed = updateStrategicProjectStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Status inválido.");
  await prisma.strategicProject.update({ where: { id: projectId }, data: { status: parsed.data.status } });
  await recordAuditLog({ userId: user.id, action: "STATUS_CHANGE", entity: "StrategicProject", entityId: projectId, details: { status: parsed.data.status } });
  revalidatePath("/projetos");
}

export async function createTask(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const user = await requireUser("tasks");

  const parsed = createTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { what, why, howWhere, actionPlanId, assigneeId, startDate, dueDate, value } = parsed.data;
  if (actionPlanId) await assertActionPlanEditable(actionPlanId, user);
  if (assigneeId) {
    const assignee = await prisma.user.findFirst({ where: { id: assigneeId, active: true }, select: { id: true } });
    if (!assignee) return { error: "Responsável indisponível." };
  }

  const task = await prisma.task.create({
    data: {
      what,
      why: why || null,
      howWhere: howWhere || null,
      actionPlanId: actionPlanId || null,
      assigneeId: assigneeId || null,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      value,
      createdById: user.id,
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "Task",
    entityId: task.id,
    details: { what, actionPlanId: actionPlanId || null, assigneeId: assigneeId || null, dueDate: dueDate || null },
  });

  revalidatePath("/tarefas");
  redirect("/tarefas");
}

export async function updateTaskStatus(taskId: string, formData: FormData) {
  const user = await requireUser("tasks");
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new ForbiddenError("Tarefa não encontrada.");
  if (task.createdById !== user.id && task.assigneeId !== user.id && user.role !== "ADMIN") {
    throw new ForbiddenError();
  }

  const parsed = updateTaskStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Status inválido.");

  await prisma.task.update({ where: { id: taskId }, data: { status: parsed.data.status } });
  await recordAuditLog({
    userId: user.id,
    action: "STATUS_CHANGE",
    entity: "Task",
    entityId: taskId,
    details: { from: task.status, to: parsed.data.status },
  });
  revalidatePath("/tarefas");
}

export async function deleteTask(taskId: string) {
  const user = await requireUser("tasks");
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new ForbiddenError("Tarefa não encontrada.");
  if (task.createdById !== user.id && user.role !== "ADMIN") throw new ForbiddenError();

  await prisma.task.delete({ where: { id: taskId } });
  await recordAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "Task",
    entityId: taskId,
    details: { what: task.what, assigneeId: task.assigneeId, actionPlanId: task.actionPlanId },
  });
  revalidatePath("/tarefas");
}

// ── Agenda ──────────────────────────────────────────────────────────────────

export async function createEvent(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const user = await requireUser("agenda");

  const parsed = createEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { title, category, startAt, endAt } = parsed.data;
  const participantIds = [...new Set(formData.getAll("participantIds").filter((id): id is string => typeof id === "string" && id.length > 0))];
  if (participantIds.length) {
    const count = await prisma.user.count({ where: { id: { in: participantIds }, active: true } });
    if (count !== participantIds.length) return { error: "Um dos participantes não está disponível." };
  }

  const event = await prisma.calendarEvent.create({
    data: {
      title,
      category,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      createdById: user.id,
      participants: { create: participantIds.map((userId) => ({ userId })) },
    },
  });

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "CalendarEvent",
    entityId: event.id,
    details: { title, category, startAt, endAt, participantCount: participantIds.length },
  });

  revalidatePath("/agenda");
  redirect("/agenda");
}

export async function deleteEvent(eventId: string) {
  const user = await requireUser("agenda");
  const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new ForbiddenError("Evento não encontrado.");
  if (event.createdById !== user.id && user.role !== "ADMIN") throw new ForbiddenError();

  await prisma.calendarEvent.delete({ where: { id: eventId } });
  await recordAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "CalendarEvent",
    entityId: eventId,
    details: { title: event.title, category: event.category },
  });
  revalidatePath("/agenda");
}

// ── Delegação de item (Configurar Delegação) ────────────────────────────────

export async function createDelegation(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser("users");

  const parsed = createDelegationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { kpiId, delegateId } = parsed.data;

  try {
    await assertKpiOwnerOrAdmin(kpiId, user);
  } catch (err) {
    if (err instanceof ForbiddenError) return { error: err.message };
    throw err;
  }

  if (delegateId === user.id) {
    return { error: "Você já pode editar seus próprios indicadores." };
  }

  try {
    const delegation = await prisma.kpiDelegation.create({
      data: { kpiId, delegateId, delegatedById: user.id },
    });
    await recordAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "KpiDelegation",
      entityId: delegation.id,
      details: { kpiId, delegateId },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Esse usuário já está delegado neste indicador." };
    }
    throw err;
  }

  revalidatePath(`/metas/${kpiId}`);
  return {};
}

export async function removeDelegation(delegationId: string) {
  const user = await requireUser("users");
  const delegation = await prisma.kpiDelegation.findUnique({ where: { id: delegationId } });
  if (!delegation) throw new ForbiddenError("Delegação não encontrada.");
  await assertKpiOwnerOrAdmin(delegation.kpiId, user);

  await prisma.kpiDelegation.delete({ where: { id: delegationId } });
  await recordAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "KpiDelegation",
    entityId: delegationId,
    details: { kpiId: delegation.kpiId, delegateId: delegation.delegateId },
  });
  revalidatePath(`/metas/${delegation.kpiId}`);
}

// ── Facilitador (Cadastrar Facilitador / Meus Facilitados) ─────────────────

export async function createFacilitation(
  targetUserId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const actingUser = await requireUser("users");
  if (actingUser.role !== "ADMIN") {
    return { error: "Apenas administradores podem gerenciar facilitadores." };
  }

  const parsed = createFacilitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { facilitatedId } = parsed.data;

  if (facilitatedId === targetUserId) {
    return { error: "Um usuário não pode facilitar a si mesmo." };
  }

  try {
    const facilitation = await prisma.facilitation.create({
      data: { facilitatorId: targetUserId, facilitatedId },
    });
    await recordAuditLog({
      userId: actingUser.id,
      action: "CREATE",
      entity: "Facilitation",
      entityId: facilitation.id,
      details: { facilitatorId: targetUserId, facilitatedId },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Esse vínculo de facilitação já existe." };
    }
    throw err;
  }

  revalidatePath(`/usuarios/${targetUserId}/editar`);
  return {};
}

export async function removeFacilitation(facilitationId: string) {
  const user = await requireUser("users");
  if (user.role !== "ADMIN") throw new ForbiddenError("Apenas administradores podem remover facilitadores.");

  const facilitation = await prisma.facilitation.findUnique({ where: { id: facilitationId } });
  if (!facilitation) throw new ForbiddenError("Facilitação não encontrada.");

  await prisma.facilitation.delete({ where: { id: facilitationId } });
  await recordAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "Facilitation",
    entityId: facilitationId,
    details: { facilitatorId: facilitation.facilitatorId, facilitatedId: facilitation.facilitatedId },
  });
  revalidatePath(`/usuarios/${facilitation.facilitatorId}/editar`);
}

// ── Subordinação (multi-gestor) ─────────────────────────────────────────────

/** Adds another manager to a user's "Responde para" grid — doesn't touch the existing principal. */
export async function addSubordination(
  targetUserId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const actingUser = await requireUser("users");
  if (actingUser.role !== "ADMIN") return { error: "Apenas administradores podem configurar subordinação." };

  const managerId = String(formData.get("managerId") ?? "").trim();
  if (!managerId) return { error: "Selecione um gestor." };
  if (managerId === targetUserId) return { error: "Um usuário não pode responder para si mesmo." };
  if (await wouldCreateCycle(targetUserId, managerId)) {
    return { error: "Esse gestor criaria um ciclo de hierarquia." };
  }

  const principalAlready = (await prisma.subordination.count({ where: { userId: targetUserId } })) === 0;
  try {
    const row = await prisma.subordination.create({
      data: { userId: targetUserId, managerId, principal: principalAlready },
    });
    if (principalAlready) await prisma.user.update({ where: { id: targetUserId }, data: { managerId } });
    await recordAuditLog({ userId: actingUser.id, action: "CREATE", entity: "Subordination", entityId: row.id, details: { userId: targetUserId, managerId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Esse usuário já responde para esse gestor." };
    }
    throw err;
  }

  revalidatePath(`/usuarios/${targetUserId}/editar`);
  return {};
}

/** Marks one row as the principal manager, demoting whichever row held it before. */
export async function setPrincipalSubordination(subordinationId: string) {
  const actingUser = await requireUser("users");
  if (actingUser.role !== "ADMIN") throw new ForbiddenError("Apenas administradores podem configurar subordinação.");

  const target = await prisma.subordination.findUnique({ where: { id: subordinationId } });
  if (!target) throw new ForbiddenError("Vínculo não encontrado.");

  await prisma.$transaction([
    prisma.subordination.updateMany({ where: { userId: target.userId, principal: true }, data: { principal: false } }),
    prisma.subordination.update({ where: { id: subordinationId }, data: { principal: true } }),
    prisma.user.update({ where: { id: target.userId }, data: { managerId: target.managerId } }),
  ]);
  await recordAuditLog({ userId: actingUser.id, action: "UPDATE", entity: "Subordination", entityId: subordinationId, details: { setPrincipal: true } });
  revalidatePath(`/usuarios/${target.userId}/editar`);
}

/** Removes one manager relationship. If it was the principal, another remaining row (if any) is promoted. */
export async function removeSubordination(subordinationId: string) {
  const actingUser = await requireUser("users");
  if (actingUser.role !== "ADMIN") throw new ForbiddenError("Apenas administradores podem configurar subordinação.");

  const target = await prisma.subordination.findUnique({ where: { id: subordinationId } });
  if (!target) throw new ForbiddenError("Vínculo não encontrado.");

  await prisma.subordination.delete({ where: { id: subordinationId } });

  let nextPrincipalManagerId: string | null = null;
  if (target.principal) {
    const remaining = await prisma.subordination.findFirst({ where: { userId: target.userId }, orderBy: { createdAt: "asc" } });
    if (remaining) {
      await prisma.subordination.update({ where: { id: remaining.id }, data: { principal: true } });
      nextPrincipalManagerId = remaining.managerId;
    }
    await prisma.user.update({ where: { id: target.userId }, data: { managerId: nextPrincipalManagerId } });
  }

  await recordAuditLog({ userId: actingUser.id, action: "DELETE", entity: "Subordination", entityId: subordinationId, details: { userId: target.userId, managerId: target.managerId } });
  revalidatePath(`/usuarios/${target.userId}/editar`);
}

// ── Fechamento de ciclo ────────────────────────────────────────────────────

export async function closePeriod(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const user = await requireUser("measurements");
  if (user.role !== "ADMIN") return { error: "Apenas administradores podem fechar ciclos." };

  const parsed = closePeriodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { period, note } = parsed.data;

  try {
    const lock = await prisma.periodLock.create({
      data: { period, note: note || null, closedById: user.id },
    });
    await prisma.periodLockEvent.create({
      data: { period, note: note || null, closed: true, actorId: user.id },
    });
    await recordAuditLog({
      userId: user.id,
      action: "STATUS_CHANGE",
      entity: "PeriodLock",
      entityId: lock.id,
      details: { period, closed: true, note: note || null },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Este ciclo já está fechado." };
    }
    throw err;
  }

  revalidatePath("/metas");
  revalidatePath("/");
  return {};
}

export async function reopenPeriod(period: string) {
  const user = await requireUser("measurements");
  if (user.role !== "ADMIN") throw new ForbiddenError("Apenas administradores podem reabrir ciclos.");

  const lock = await prisma.periodLock.findFirst({ where: { period, departmentId: null } });
  if (!lock) throw new ForbiddenError("Ciclo não está fechado.");

  await prisma.periodLock.delete({ where: { id: lock.id } });
  await prisma.periodLockEvent.create({
    data: { period, departmentId: null, closed: false, actorId: user.id, note: lock.note },
  });
  await recordAuditLog({
    userId: user.id,
    action: "STATUS_CHANGE",
    entity: "PeriodLock",
    entityId: lock.id,
    details: { period, closed: false, note: lock.note },
  });

  revalidatePath("/metas");
  revalidatePath("/");
}
