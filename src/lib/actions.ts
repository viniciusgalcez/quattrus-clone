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
  assertFcaResolved,
  ForbiddenError,
} from "@/lib/authz";
import { wouldCreateCycle } from "@/lib/hierarchy";
import { wouldCreateKpiCycle } from "@/lib/kpi-tree";
import { recalculateParentMeasurement } from "@/lib/kpi-cascading";
import { decideGoalApproval } from "@/lib/measurement";
import {
  createKpiSchema,
  updateKpiSchema,
  upsertMeasurementSchema,
  saveActionPlanSchema,
  createUserSchema,
  updateUserSchema,
  fieldErrorsFrom,
  type FormActionState,
} from "@/lib/schemas";

export async function createKpi(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const user = await requireUser();

  const parsed = createKpiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { name, description, metricUnit, direction, weight, yellowRange, redRange, goal, calculationType, departmentId, parentId } =
    parsed.data;

  // Both ids arrive from the client; being allowed to create a KPI says
  // nothing about which parent/department it may be attached to.
  try {
    await assertKpiParentAssignable(parentId, user);
    await assertDepartmentAssignable(departmentId, user);
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
    },
  });

  await prisma.measurement.create({
    data: {
      kpiId: kpi.id,
      period: currentPeriod(),
      goal,
      actual: null,
    },
  });

  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}

export async function updateKpi(
  kpiId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser();
  await assertKpiEditable(kpiId, user);

  const parsed = updateKpiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { name, description, metricUnit, direction, weight, yellowRange, redRange, priority, calculationType, departmentId, parentId } =
    parsed.data;

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
    },
  });

  revalidatePath("/metas");
  revalidatePath("/");
  revalidatePath(`/metas/${kpiId}`);
  redirect(`/metas/${kpiId}`);
}

export async function archiveKpi(kpiId: string) {
  const user = await requireUser();
  await assertKpiEditable(kpiId, user);
  await prisma.kpi.update({ where: { id: kpiId }, data: { archivedAt: new Date() } });
  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}

export async function upsertMeasurement(formData: FormData) {
  const user = await requireUser();

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
  await assertFcaResolved(kpiId, period);

  const { goal, actual } = parsed.data;
  const trafficLight = getKpiStatus(goal, actual, kpi.direction, kpi.yellowRange, kpi.redRange);

  const existing = await prisma.measurement.findUnique({
    where: { kpiId_period: { kpiId, period } },
    select: { goal: true, goalApprovalStatus: true },
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

  revalidatePath("/metas");
  revalidatePath("/");
  revalidatePath(`/metas/${kpiId}`);
}

export async function saveActionPlan(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const user = await requireUser();

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

  await prisma.actionPlan.upsert({
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

  revalidatePath("/metas");
  revalidatePath("/");
  redirect("/metas");
}

export async function concludeActionPlan(actionPlanId: string) {
  const user = await requireUser();
  await assertActionPlanEditable(actionPlanId, user);
  await prisma.actionPlan.update({
    where: { id: actionPlanId },
    data: { status: "CONCLUIDO" },
  });
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function reopenActionPlan(actionPlanId: string) {
  const user = await requireUser();
  await assertActionPlanEditable(actionPlanId, user);
  await prisma.actionPlan.update({
    where: { id: actionPlanId },
    data: { status: "ABERTO" },
  });
  revalidatePath("/metas");
  revalidatePath("/");
}

export async function createUser(_prevState: FormActionState, formData: FormData): Promise<FormActionState> {
  const actingUser = await requireUser();
  if (actingUser.role !== "ADMIN") {
    return { error: "Apenas administradores podem cadastrar usuários." };
  }

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { username, name, password, role, managerId, departmentId } = parsed.data;

  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        username,
        name,
        passwordHash,
        role,
        managerId: managerId || null,
        departmentId: departmentId || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Este nome de usuário já está em uso.", fieldErrors: { username: "Já está em uso." } };
    }
    throw err;
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateUser(
  targetUserId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const actingUser = await requireUser();
  if (actingUser.role !== "ADMIN") {
    return { error: "Apenas administradores podem editar usuários." };
  }

  const parsed = updateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const { name, role, managerId, departmentId, password } = parsed.data;

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
    passwordHash?: string;
  } = { name, role, managerId: managerId || null, departmentId: departmentId || null };

  if (password) {
    const bcrypt = (await import("bcryptjs")).default;
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id: targetUserId }, data });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function setUserActive(targetUserId: string, active: boolean) {
  const actingUser = await requireUser();
  if (actingUser.role !== "ADMIN") throw new Error("Apenas administradores podem fazer isso.");
  if (targetUserId === actingUser.id && !active) {
    throw new Error("Você não pode desativar sua própria conta.");
  }

  await prisma.user.update({ where: { id: targetUserId }, data: { active } });
  revalidatePath("/usuarios");
}
