"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertKpiEditable,
  assertKpiParentAssignable,
  assertDepartmentAssignable,
  assertFcaResolved,
} from "@/lib/authz";
import { parseCsv } from "@/lib/csv";
import { parseKpiImportRows, parseMeasurementImportRows, type KpiImportRow, type MeasurementImportRow } from "@/lib/import-export";
import { currentPeriod } from "@/lib/kpi";
import { comparePeriods } from "@/lib/period";
import { decideMeasurementWrite, decideGoalApproval } from "@/lib/measurement";
import { wouldCreateKpiCycle } from "@/lib/kpi-tree";
import { recalculateParentMeasurement } from "@/lib/kpi-cascading";

type SessionUser = { id: string; username: string; role: string };

export type ImportReport = {
  created: number;
  updated: number;
  errors: { line: number; message: string }[];
};

export type ImportState = { error?: string; report?: ImportReport };

async function readCsvFile(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo CSV.");
  }
  return file.text();
}

/**
 * Bulk item import. Every row is applied independently — a bad row is
 * reported and skipped rather than aborting the whole file, matching the
 * "corrige a planilha e importa de novo" workflow described for the real
 * Quattrus: nobody wants a batch of 40 items to fail because of one typo.
 */
export async function importKpisCsv(_prevState: ImportState | null, formData: FormData): Promise<ImportState> {
  const user = await requireUser();

  let text: string;
  try {
    text = await readCsvFile(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Arquivo inválido." };
  }

  const rows = parseKpiImportRows(parseCsv(text));
  if (rows.length === 0) return { error: "Nenhuma linha encontrada no arquivo." };

  const report: ImportReport = { created: 0, updated: 0, errors: [] };

  for (const row of rows) {
    if (!row.ok) {
      report.errors.push({ line: row.line, message: row.error });
      continue;
    }
    try {
      const created = await importKpiRow(row.data, user);
      if (created) report.created++;
      else report.updated++;
    } catch (err) {
      report.errors.push({
        line: row.line,
        message: err instanceof Error ? err.message : "Falha ao importar a linha.",
      });
    }
  }

  revalidatePath("/metas");
  revalidatePath("/");
  return { report };
}

async function importKpiRow(row: KpiImportRow, user: SessionUser): Promise<boolean> {
  let ownerId = user.id;
  if (row.dono && row.dono !== user.username) {
    if (user.role !== "ADMIN") {
      throw new Error("Apenas administradores podem importar itens para outro usuário.");
    }
    const owner = await prisma.user.findUnique({ where: { username: row.dono }, select: { id: true } });
    if (!owner) throw new Error(`Usuário "${row.dono}" não encontrado.`);
    ownerId = owner.id;
  }

  let departmentId: string | null = null;
  if (row.departamento) {
    const dept = await prisma.department.findUnique({
      where: { name: row.departamento },
      select: { id: true },
    });
    if (!dept) throw new Error(`Departamento "${row.departamento}" não encontrado.`);
    await assertDepartmentAssignable(dept.id, user);
    departmentId = dept.id;
  }

  const parentId = row.item_pai_id || null;
  if (parentId) await assertKpiParentAssignable(parentId, user);

  const yellowRange = row.faixa_amarela ?? 5;
  const redRange = row.faixa_vermelha ?? 15;
  if (redRange < yellowRange) {
    throw new Error("faixa_vermelha deve ser maior ou igual a faixa_amarela.");
  }

  const data = {
    name: row.nome,
    description: row.descricao || null,
    departmentId,
    parentId,
    metricUnit: row.unidade,
    direction: row.direcao,
    calculationType: row.tipo_calculo,
    weight: row.peso ?? 0,
    yellowRange,
    redRange,
    priority: row.prioridade ?? 0,
  };

  if (row.id) {
    await assertKpiEditable(row.id, user);
    if (parentId === row.id) throw new Error("Um indicador não pode ser pai de si mesmo.");
    if (parentId && (await wouldCreateKpiCycle(row.id, parentId))) {
      throw new Error("Esse vínculo criaria um ciclo no desdobramento.");
    }
    await prisma.kpi.update({ where: { id: row.id }, data });
    return false;
  }

  await prisma.kpi.create({ data: { ...data, ownerId } });
  return true;
}

/**
 * Bulk measurement import — the "importação de medições" flow from the call.
 * Goes through the same FCA-pending lock and auto-FCA-opening rules as a
 * single manual entry (`decideMeasurementWrite`, `assertFcaResolved`), so a
 * spreadsheet can't be used to sneak past either guard.
 */
export async function importMeasurementsCsv(
  _prevState: ImportState | null,
  formData: FormData
): Promise<ImportState> {
  const user = await requireUser();

  let text: string;
  try {
    text = await readCsvFile(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Arquivo inválido." };
  }

  const rows = parseMeasurementImportRows(parseCsv(text));
  if (rows.length === 0) return { error: "Nenhuma linha encontrada no arquivo." };

  const report: ImportReport = { created: 0, updated: 0, errors: [] };

  for (const row of rows) {
    if (!row.ok) {
      report.errors.push({ line: row.line, message: row.error });
      continue;
    }
    try {
      const created = await importMeasurementRow(row.data, user);
      if (created) report.created++;
      else report.updated++;
    } catch (err) {
      report.errors.push({
        line: row.line,
        message: err instanceof Error ? err.message : "Falha ao importar a linha.",
      });
    }
  }

  revalidatePath("/metas");
  revalidatePath("/");
  return { report };
}

async function importMeasurementRow(row: MeasurementImportRow, user: SessionUser): Promise<boolean> {
  if (comparePeriods(row.periodo, currentPeriod()) > 0) {
    throw new Error("Não é possível lançar em um período futuro.");
  }

  const kpi = await assertKpiEditable(row.item_id, user);
  await assertFcaResolved(row.item_id, row.periodo);

  const existing = await prisma.measurement.findUnique({
    where: { kpiId_period: { kpiId: row.item_id, period: row.periodo } },
    select: { id: true, goal: true, goalApprovalStatus: true },
  });

  const hasExistingActionPlan = existing
    ? (await prisma.actionPlan.findUnique({ where: { measurementId: existing.id }, select: { id: true } })) !== null
    : false;

  const { trafficLight, shouldOpenActionPlan } = decideMeasurementWrite({
    goal: row.meta,
    actual: row.realizado,
    direction: kpi.direction,
    yellowRange: kpi.yellowRange,
    redRange: kpi.redRange,
    hasExistingActionPlan,
  });

  const goalApprovalStatus = decideGoalApproval({
    actorRole: user.role as "ADMIN" | "GESTOR" | "COLABORADOR",
    goalChanged: existing ? existing.goal !== row.meta : true,
    previousStatus: existing?.goalApprovalStatus ?? "APROVADA",
  });
  const goalApprovedById = goalApprovalStatus === "APROVADA" ? user.id : null;
  const goalApprovedAt = goalApprovalStatus === "APROVADA" ? new Date() : null;

  const measurement = await prisma.measurement.upsert({
    where: { kpiId_period: { kpiId: row.item_id, period: row.periodo } },
    update: {
      goal: row.meta,
      actual: row.realizado,
      trafficLight,
      justification: row.justificativa || null,
      reportedById: user.id,
      goalApprovalStatus,
      goalApprovedById,
      goalApprovedAt,
    },
    create: {
      kpiId: row.item_id,
      period: row.periodo,
      goal: row.meta,
      actual: row.realizado,
      trafficLight,
      justification: row.justificativa || null,
      reportedById: user.id,
      goalApprovalStatus,
      goalApprovedById,
      goalApprovedAt,
    },
  });

  if (shouldOpenActionPlan) {
    await prisma.actionPlan.upsert({
      where: { measurementId: measurement.id },
      update: {},
      create: {
        kpiId: row.item_id,
        measurementId: measurement.id,
        fact: `Desvio reportado no período ${row.periodo} (importação em massa)`,
        status: "ABERTO",
        createdById: user.id,
      },
    });
  }

  if (kpi.parentId) {
    await recalculateParentMeasurement(kpi.parentId, row.periodo);
  }

  return existing === null;
}
