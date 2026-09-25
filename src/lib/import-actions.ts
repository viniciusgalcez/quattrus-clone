"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertKpiEditable,
  assertMeasurementEditable,
  assertKpiParentAssignable,
  assertDepartmentAssignable,
  assertFcaResolved,
} from "@/lib/authz";
import { parseTabularText } from "@/lib/csv";
import { parseXlsxRows } from "@/lib/xlsx";
import {
  parseKpiImportRows,
  parseMeasurementImportRows,
  parseActionPlanImportRows,
  parseCompanyItemImportRows,
  parsePeriodicityImportRows,
  parseThresholdImportRows,
  type ActionPlanImportRow,
  type CompanyItemImportRow,
  type KpiImportRow,
  type MeasurementImportRow,
  type PeriodicityImportRow,
  type ThresholdImportRow,
} from "@/lib/import-export";
import { currentPeriod } from "@/lib/kpi";
import { comparePeriods } from "@/lib/period";
import { decideMeasurementWrite, decideGoalApproval } from "@/lib/measurement";
import { wouldCreateKpiCycle } from "@/lib/kpi-tree";
import { recalculateParentMeasurement } from "@/lib/kpi-cascading";
import { assertPeriodWritable } from "@/lib/period-locks";
import { recordAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { getGoalApproverIds, notifyUsers } from "@/lib/notifications";

type SessionUser = { id: string; username: string; role: string };
const MAX_CSV_BYTES = 15 * 1024 * 1024;
const OLE_XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

export type ImportReport = {
  created: number;
  updated: number;
  errors: { line: number; message: string }[];
};

export type ImportState = { error?: string; report?: ImportReport };

async function readTabularFile(formData: FormData): Promise<{ rows: string[][]; fileName: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Selecione um arquivo CSV, TXT, XLS ou XLSX.");
  }
  if (file.size > MAX_CSV_BYTES) {
    throw new Error("O arquivo deve ter no máximo 15 MB.");
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx") return { rows: parseXlsxRows(new Uint8Array(await file.arrayBuffer())), fileName: file.name };
  if (extension !== "csv" && extension !== "txt" && extension !== "xls") {
    throw new Error("Use um arquivo CSV, TXT, XLS ou XLSX.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Legacy binary XLS (pre-2007 BIFF/OLE2) is deliberately not parsed: the
  // only maintained JS libraries for that format (e.g. SheetJS's `xlsx` on
  // npm) ship with known, unpatched prototype-pollution/ReDoS advisories —
  // npm never received SheetJS's fixed builds, only their own CDN did. Since
  // this endpoint parses untrusted uploads, that trade isn't worth it for a
  // shrinking legacy format; ask for XLSX/CSV/TXT instead.
  if (extension === "xls" && OLE_XLS_MAGIC.every((byte, index) => bytes[index] === byte)) {
    throw new Error("XLS binário legado (Excel 97-2003) não é suportado por motivos de segurança. Salve a planilha como XLSX, CSV, TXT ou XLS tabulado.");
  }
  return { rows: parseTabularText(new TextDecoder().decode(bytes)), fileName: file.name };
}

/**
 * Bulk item import. Every row is applied independently — a bad row is
 * reported and skipped rather than aborting the whole file, matching the
 * "corrige a planilha e importa de novo" workflow described for the real
 * Quattrus: nobody wants a batch of 40 items to fail because of one typo.
 */
export async function importKpisCsv(_prevState: ImportState | null, formData: FormData): Promise<ImportState> {
  const user = await requireUser("imports");
  if (!checkRateLimit("import", user.id, { limit: 5, windowMs: 60 * 1000 })) {
    return { error: "Muitas importações em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  let file: { rows: string[][]; fileName: string };
  try {
    file = await readTabularFile(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Arquivo inválido." };
  }

  const parsedRows = parseKpiImportRows(file.rows);
  if (parsedRows.length === 0) return { error: "Nenhuma linha encontrada no arquivo." };

  const report: ImportReport = { created: 0, updated: 0, errors: [] };

  for (const row of parsedRows) {
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

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "ImportKpis",
    entityId: user.id,
    details: { created: report.created, updated: report.updated, errorCount: report.errors.length },
  });
  await prisma.importJob.create({ data: { type: "ITEM_CONTROLE", fileName: file.fileName, status: report.errors.length ? "CONCLUIDO_COM_ERROS" : "CONCLUIDO", created: report.created, updated: report.updated, errors: report.errors, completedAt: new Date(), requestedById: user.id } });

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
  const user = await requireUser("imports");
  if (!checkRateLimit("import", user.id, { limit: 5, windowMs: 60 * 1000 })) {
    return { error: "Muitas importações em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  let file: { rows: string[][]; fileName: string };
  try {
    file = await readTabularFile(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Arquivo inválido." };
  }

  const parsedRows = parseMeasurementImportRows(file.rows);
  if (parsedRows.length === 0) return { error: "Nenhuma linha encontrada no arquivo." };

  const report: ImportReport = { created: 0, updated: 0, errors: [] };

  for (const row of parsedRows) {
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

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "ImportMeasurements",
    entityId: user.id,
    details: { created: report.created, updated: report.updated, errorCount: report.errors.length },
  });
  await prisma.importJob.create({ data: { type: "MEDICAO", fileName: file.fileName, status: report.errors.length ? "CONCLUIDO_COM_ERROS" : "CONCLUIDO", created: report.created, updated: report.updated, errors: report.errors, completedAt: new Date(), requestedById: user.id } });

  revalidatePath("/metas");
  revalidatePath("/");
  return { report };
}

async function importMeasurementRow(row: MeasurementImportRow, user: SessionUser): Promise<boolean> {
  if (comparePeriods(row.periodo, currentPeriod()) > 0) {
    throw new Error("Não é possível lançar em um período futuro.");
  }

  const kpi = await assertKpiEditable(row.item_id, user);
  await assertPeriodWritable(row.periodo, kpi.departmentId);
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

  if (goalApprovalStatus === "PENDENTE" && existing?.goalApprovalStatus !== "PENDENTE") {
    await notifyUsers(await getGoalApproverIds(kpi.ownerId), {
      type: "GOAL_PENDING",
      title: "Meta aguardando aprovação",
      body: `${user.username} alterou uma meta por importação e ela precisa de aprovação.`,
      href: "/aprovacoes",
    });
  }

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

export async function importPeriodicitiesCsv(
  _prevState: ImportState | null,
  formData: FormData
): Promise<ImportState> {
  const user = await requireUser("imports");
  if (!checkRateLimit("import", user.id, { limit: 5, windowMs: 60 * 1000 })) {
    return { error: "Muitas importações em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  let file: { rows: string[][]; fileName: string };
  try {
    file = await readTabularFile(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Arquivo inválido." };
  }

  const parsedRows = parsePeriodicityImportRows(file.rows);
  if (parsedRows.length === 0) return { error: "Nenhuma linha encontrada no arquivo." };

  const report: ImportReport = { created: 0, updated: 0, errors: [] };
  for (const row of parsedRows) {
    if (!row.ok) {
      report.errors.push({ line: row.line, message: row.error });
      continue;
    }
    try {
      const created = await importPeriodicityRow(row.data, user);
      if (created) report.created++;
      else report.updated++;
    } catch (err) {
      report.errors.push({
        line: row.line,
        message: err instanceof Error ? err.message : "Falha ao importar a linha.",
      });
    }
  }

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "ImportPeriodicities",
    entityId: user.id,
    details: { created: report.created, updated: report.updated, errorCount: report.errors.length },
  });
  await prisma.importJob.create({
    data: {
      type: "PERIODICIDADE",
      fileName: file.fileName,
      status: report.errors.length ? "CONCLUIDO_COM_ERROS" : "CONCLUIDO",
      created: report.created,
      updated: report.updated,
      errors: report.errors,
      completedAt: new Date(),
      requestedById: user.id,
    },
  });

  revalidatePath("/metas");
  revalidatePath("/medicoes");
  return { report };
}

async function importPeriodicityRow(row: PeriodicityImportRow, user: SessionUser): Promise<boolean> {
  if (row.vigencia_fim && comparePeriods(row.vigencia_fim, row.vigencia_inicio) < 0) {
    throw new Error("vigencia_fim deve ser maior ou igual a vigencia_inicio.");
  }
  await assertKpiEditable(row.item_id, user);
  const endPeriod = row.vigencia_fim || null;
  const existing = await prisma.kpiMeasurementPeriod.findFirst({
    where: { kpiId: row.item_id, startPeriod: row.vigencia_inicio, endPeriod },
    select: { id: true },
  });
  if (existing) {
    await prisma.kpiMeasurementPeriod.update({ where: { id: existing.id }, data: { startPeriod: row.vigencia_inicio, endPeriod } });
    return false;
  }
  await prisma.kpiMeasurementPeriod.create({
    data: { kpiId: row.item_id, startPeriod: row.vigencia_inicio, endPeriod },
  });
  return true;
}

export async function importThresholdsCsv(
  _prevState: ImportState | null,
  formData: FormData
): Promise<ImportState> {
  const user = await requireUser("imports");
  if (!checkRateLimit("import", user.id, { limit: 5, windowMs: 60 * 1000 })) {
    return { error: "Muitas importações em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  let file: { rows: string[][]; fileName: string };
  try {
    file = await readTabularFile(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Arquivo inválido." };
  }

  const parsedRows = parseThresholdImportRows(file.rows);
  if (parsedRows.length === 0) return { error: "Nenhuma linha encontrada no arquivo." };

  const report: ImportReport = { created: 0, updated: 0, errors: [] };
  for (const row of parsedRows) {
    if (!row.ok) {
      report.errors.push({ line: row.line, message: row.error });
      continue;
    }
    try {
      const created = await importThresholdRow(row.data, user);
      if (created) report.created++;
      else report.updated++;
    } catch (err) {
      report.errors.push({
        line: row.line,
        message: err instanceof Error ? err.message : "Falha ao importar a linha.",
      });
    }
  }

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "ImportThresholds",
    entityId: user.id,
    details: { created: report.created, updated: report.updated, errorCount: report.errors.length },
  });
  await prisma.importJob.create({
    data: {
      type: "FAIXAS_CONTROLE",
      fileName: file.fileName,
      status: report.errors.length ? "CONCLUIDO_COM_ERROS" : "CONCLUIDO",
      created: report.created,
      updated: report.updated,
      errors: report.errors,
      completedAt: new Date(),
      requestedById: user.id,
    },
  });

  revalidatePath("/metas");
  revalidatePath("/farol");
  revalidatePath("/");
  return { report };
}

async function importThresholdRow(row: ThresholdImportRow, user: SessionUser): Promise<boolean> {
  if (row.faixa_vermelha < row.faixa_amarela) {
    throw new Error("faixa_vermelha deve ser maior ou igual a faixa_amarela.");
  }
  if (row.vigencia_fim && comparePeriods(row.vigencia_fim, row.vigencia_inicio) < 0) {
    throw new Error("vigencia_fim deve ser maior ou igual a vigencia_inicio.");
  }

  await assertKpiEditable(row.item_id, user);
  const endPeriod = row.vigencia_fim || null;
  const existing = await prisma.kpiThresholdValidity.findFirst({
    where: { kpiId: row.item_id, startPeriod: row.vigencia_inicio, endPeriod },
    select: { id: true },
  });
  const data = { yellowRange: row.faixa_amarela, redRange: row.faixa_vermelha };

  if (existing) {
    await prisma.kpiThresholdValidity.update({ where: { id: existing.id }, data });
    await prisma.kpi.update({ where: { id: row.item_id }, data });
    return false;
  }

  await prisma.kpiThresholdValidity.create({
    data: { kpiId: row.item_id, startPeriod: row.vigencia_inicio, endPeriod, ...data },
  });
  await prisma.kpi.update({ where: { id: row.item_id }, data });
  return true;
}

export async function importActionPlansCsv(
  _prevState: ImportState | null,
  formData: FormData
): Promise<ImportState> {
  const user = await requireUser("imports");
  if (!checkRateLimit("import", user.id, { limit: 5, windowMs: 60 * 1000 })) {
    return { error: "Muitas importações em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  let file: { rows: string[][]; fileName: string };
  try {
    file = await readTabularFile(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Arquivo inválido." };
  }

  const parsedRows = parseActionPlanImportRows(file.rows);
  if (parsedRows.length === 0) return { error: "Nenhuma linha encontrada no arquivo." };

  const report: ImportReport = { created: 0, updated: 0, errors: [] };
  for (const row of parsedRows) {
    if (!row.ok) {
      report.errors.push({ line: row.line, message: row.error });
      continue;
    }
    try {
      const created = await importActionPlanRow(row.data, user);
      if (created) report.created++;
      else report.updated++;
    } catch (err) {
      report.errors.push({
        line: row.line,
        message: err instanceof Error ? err.message : "Falha ao importar a linha.",
      });
    }
  }

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "ImportActionPlans",
    entityId: user.id,
    details: { created: report.created, updated: report.updated, errorCount: report.errors.length },
  });
  await prisma.importJob.create({
    data: {
      type: "PLANO_ACAO",
      fileName: file.fileName,
      status: report.errors.length ? "CONCLUIDO_COM_ERROS" : "CONCLUIDO",
      created: report.created,
      updated: report.updated,
      errors: report.errors,
      completedAt: new Date(),
      requestedById: user.id,
    },
  });

  revalidatePath("/metas");
  revalidatePath("/tarefas");
  revalidatePath("/");
  return { report };
}

async function importActionPlanRow(row: ActionPlanImportRow, user: SessionUser): Promise<boolean> {
  const measurement = await assertMeasurementEditable(row.medicao_id, user);
  const existing = await prisma.actionPlan.findUnique({
    where: { measurementId: row.medicao_id },
    select: { id: true },
  });
  const data = {
    fact: row.fato,
    why1: row.porque1 || null,
    why2: row.porque2 || null,
    why3: row.porque3 || null,
    why4: row.porque4 || null,
    why5: row.porque5 || null,
    rootCause: row.causa_raiz || null,
    what: row.o_que || null,
    who: row.quem || null,
    where: row.onde || null,
    when: row.quando ? new Date(row.quando) : null,
    why: row.por_que || null,
    how: row.como || null,
    howMuch: row.quanto,
    status: row.status,
  };

  await prisma.actionPlan.upsert({
    where: { measurementId: row.medicao_id },
    update: data,
    create: { ...data, measurementId: row.medicao_id, kpiId: measurement.kpiId, createdById: user.id },
  });
  return existing === null;
}

export async function importCompanyItemsCsv(
  _prevState: ImportState | null,
  formData: FormData
): Promise<ImportState> {
  const user = await requireUser("imports");
  if (user.role !== "ADMIN") return { error: "Apenas administradores podem importar item empresa." };
  if (!checkRateLimit("import", user.id, { limit: 5, windowMs: 60 * 1000 })) {
    return { error: "Muitas importações em pouco tempo. Aguarde um minuto e tente novamente." };
  }

  let file: { rows: string[][]; fileName: string };
  try {
    file = await readTabularFile(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Arquivo inválido." };
  }

  const parsedRows = parseCompanyItemImportRows(file.rows);
  if (parsedRows.length === 0) return { error: "Nenhuma linha encontrada no arquivo." };

  const report: ImportReport = { created: 0, updated: 0, errors: [] };
  for (const row of parsedRows) {
    if (!row.ok) {
      report.errors.push({ line: row.line, message: row.error });
      continue;
    }
    try {
      await importCompanyItemRow(row.data, user);
      report.updated++;
    } catch (err) {
      report.errors.push({
        line: row.line,
        message: err instanceof Error ? err.message : "Falha ao importar a linha.",
      });
    }
  }

  await recordAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "ImportCompanyItems",
    entityId: "capricornio",
    details: { updated: report.updated, errorCount: report.errors.length },
  });
  await prisma.importJob.create({
    data: {
      type: "ITEM_EMPRESA",
      fileName: file.fileName,
      status: report.errors.length ? "CONCLUIDO_COM_ERROS" : "CONCLUIDO",
      created: report.created,
      updated: report.updated,
      errors: report.errors,
      completedAt: new Date(),
      requestedById: user.id,
    },
  });

  revalidatePath("/empresa");
  revalidatePath("/preferencias");
  revalidatePath("/farol");
  return { report };
}

async function importCompanyItemRow(row: CompanyItemImportRow, user: SessionUser) {
  const data = {
    legalName: row.nome_empresa,
    displayMonths: row.meses_exibidos,
    blankMonths: row.meses_em_branco,
    chronicRedMonths: row.vermelho_cronico,
    fixedBaseDate: row.data_base_fixa || null,
    showGoal: row.exibir_meta,
    yellowGood: row.amarelo_bom,
    redGood: row.vermelho_bom,
    automationDisabled: row.automacoes_desativadas,
  };
  const settings = await prisma.companySettings.upsert({
    where: { id: "capricornio" },
    create: { id: "capricornio", ...data },
    update: data,
  });
  await recordAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "CompanySettings",
    entityId: settings.id,
    details: data,
  });
}
