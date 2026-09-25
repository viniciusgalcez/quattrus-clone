import { z } from "zod";
import { toCsv, rowsToRecords, type parseCsv } from "@/lib/csv";
import type { ActionPlanStatus, Direction, KpiCalculationType } from "@prisma/client";

export const KPI_CSV_HEADERS = [
  "id",
  "nome",
  "descricao",
  "dono",
  "departamento",
  "item_pai_id",
  "unidade",
  "direcao",
  "tipo_calculo",
  "peso",
  "faixa_amarela",
  "faixa_vermelha",
  "prioridade",
] as const;

export const MEASUREMENT_CSV_HEADERS = ["item_id", "periodo", "meta", "realizado", "justificativa"] as const;
export const PERIODICITY_CSV_HEADERS = ["item_id", "vigencia_inicio", "vigencia_fim"] as const;
export const THRESHOLD_CSV_HEADERS = ["item_id", "vigencia_inicio", "vigencia_fim", "faixa_amarela", "faixa_vermelha"] as const;
export const COMPANY_ITEM_CSV_HEADERS = [
  "nome_empresa",
  "meses_exibidos",
  "meses_em_branco",
  "vermelho_cronico",
  "data_base_fixa",
  "exibir_meta",
  "amarelo_bom",
  "vermelho_bom",
  "automacoes_desativadas",
] as const;
export const ACTION_PLAN_CSV_HEADERS = [
  "medicao_id",
  "fato",
  "porque1",
  "porque2",
  "porque3",
  "porque4",
  "porque5",
  "causa_raiz",
  "o_que",
  "quem",
  "onde",
  "quando",
  "por_que",
  "como",
  "quanto",
  "status",
] as const;

const numberField = (label: string) =>
  z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), z
    .number({ error: `${label}: informe um número válido.` }));

const optionalNumberField = (label: string) =>
  z.preprocess((v) => (v === "" || v === undefined || v === null ? null : Number(v)), z
    .number({ error: `${label}: informe um número válido.` })
    .nullable());

const optionalText = (max = 1000) => z.string().trim().max(max).optional().default("");

const optionalDateText = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "quando deve estar no formato AAAA-MM-DD.");

const optionalPeriodText = z
  .string()
  .trim()
  .optional()
  .default("")
  .refine((value) => value === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(value), "vigencia_fim deve estar no formato AAAA-MM.");

const booleanField = (label: string) =>
  z.preprocess((value) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["1", "true", "sim", "s", "yes", "y"].includes(normalized)) return true;
    if (["0", "false", "não", "nao", "n", "no", ""].includes(normalized)) return false;
    return value;
  }, z.boolean({ error: `${label}: use sim/não ou true/false.` }));

/** One validated row from the item (Kpi) import spreadsheet. */
export const kpiImportRowSchema = z.object({
  id: z.string().trim().optional().default(""),
  nome: z.string().trim().min(1, "Informe o nome."),
  descricao: z.string().trim().optional().default(""),
  dono: z.string().trim().optional().default(""),
  departamento: z.string().trim().optional().default(""),
  item_pai_id: z.string().trim().optional().default(""),
  unidade: z.string().trim().min(1, "Informe a unidade de medida."),
  direcao: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(z.enum(["MORE", "LESS", "EQUAL"], { error: "direcao deve ser MORE, LESS ou EQUAL." })),
  tipo_calculo: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? "MANUAL" : String(v).trim().toUpperCase()),
    z.enum(["MANUAL", "SUM", "AVERAGE", "WEIGHTED"], { error: "tipo_calculo inválido." })
  ) as z.ZodType<KpiCalculationType>,
  peso: optionalNumberField("peso"),
  faixa_amarela: optionalNumberField("faixa_amarela"),
  faixa_vermelha: optionalNumberField("faixa_vermelha"),
  prioridade: optionalNumberField("prioridade"),
});

export type KpiImportRow = z.infer<typeof kpiImportRowSchema>;

/** One validated row from the measurement import spreadsheet. */
export const measurementImportRowSchema = z.object({
  item_id: z.string().trim().min(1, "Informe o item_id."),
  periodo: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "periodo deve estar no formato AAAA-MM."),
  meta: numberField("meta"),
  realizado: optionalNumberField("realizado"),
  justificativa: z.string().trim().optional().default(""),
});

export type MeasurementImportRow = z.infer<typeof measurementImportRowSchema>;

export const periodicityImportRowSchema = z.object({
  item_id: z.string().trim().min(1, "Informe o item_id."),
  vigencia_inicio: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "vigencia_inicio deve estar no formato AAAA-MM."),
  vigencia_fim: optionalPeriodText,
});

export type PeriodicityImportRow = z.infer<typeof periodicityImportRowSchema>;

export const thresholdImportRowSchema = z.object({
  item_id: z.string().trim().min(1, "Informe o item_id."),
  vigencia_inicio: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "vigencia_inicio deve estar no formato AAAA-MM."),
  vigencia_fim: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(value), "vigencia_fim deve estar no formato AAAA-MM."),
  faixa_amarela: numberField("faixa_amarela"),
  faixa_vermelha: numberField("faixa_vermelha"),
});

export type ThresholdImportRow = z.infer<typeof thresholdImportRowSchema>;

export const companyItemImportRowSchema = z.object({
  nome_empresa: z.string().trim().min(3, "Informe o nome da empresa.").max(160),
  meses_exibidos: numberField("meses_exibidos").pipe(z.number().min(1).max(24)),
  meses_em_branco: numberField("meses_em_branco").pipe(z.number().min(0).max(24)),
  vermelho_cronico: numberField("vermelho_cronico").pipe(z.number().min(1).max(24)),
  data_base_fixa: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(value), "data_base_fixa deve estar no formato AAAA-MM."),
  exibir_meta: booleanField("exibir_meta"),
  amarelo_bom: booleanField("amarelo_bom"),
  vermelho_bom: booleanField("vermelho_bom"),
  automacoes_desativadas: booleanField("automacoes_desativadas"),
});

export type CompanyItemImportRow = z.infer<typeof companyItemImportRowSchema>;

export const actionPlanImportRowSchema = z.object({
  medicao_id: z.string().trim().min(1, "Informe o medicao_id."),
  fato: z.string().trim().min(1, "Informe o fato observado.").max(1000),
  porque1: optionalText(1000),
  porque2: optionalText(1000),
  porque3: optionalText(1000),
  porque4: optionalText(1000),
  porque5: optionalText(1000),
  causa_raiz: optionalText(1000),
  o_que: optionalText(500),
  quem: optionalText(160),
  onde: optionalText(300),
  quando: optionalDateText,
  por_que: optionalText(500),
  como: optionalText(500),
  quanto: optionalNumberField("quanto"),
  status: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? "ABERTO" : String(v).trim().toUpperCase()),
    z.enum(["ABERTO", "CONCLUIDO"], { error: "status deve ser ABERTO ou CONCLUIDO." })
  ) as z.ZodType<ActionPlanStatus>,
});

export type ActionPlanImportRow = z.infer<typeof actionPlanImportRowSchema>;

export type ParsedRow<T> =
  | { ok: true; line: number; data: T }
  | { ok: false; line: number; error: string };

/** Validates every CSV record, keeping going past a bad row so one typo doesn't block the whole file. */
function parseRows<T>(
  records: Record<string, string>[],
  schema: z.ZodType<T>
): ParsedRow<T>[] {
  return records.map((record, i) => {
    const parsed = schema.safeParse(record);
    // +2: header is line 1, records are 0-indexed.
    const line = i + 2;
    if (!parsed.success) {
      return { ok: false, line, error: parsed.error.issues[0]?.message ?? "Linha inválida." };
    }
    return { ok: true, line, data: parsed.data };
  });
}

export function parseKpiImportRows(rows: ReturnType<typeof parseCsv>): ParsedRow<KpiImportRow>[] {
  return parseRows(rowsToRecords(rows), kpiImportRowSchema);
}

export function parseMeasurementImportRows(
  rows: ReturnType<typeof parseCsv>
): ParsedRow<MeasurementImportRow>[] {
  return parseRows(rowsToRecords(rows), measurementImportRowSchema);
}

export function parsePeriodicityImportRows(rows: ReturnType<typeof parseCsv>): ParsedRow<PeriodicityImportRow>[] {
  return parseRows(rowsToRecords(rows), periodicityImportRowSchema);
}

export function parseThresholdImportRows(rows: ReturnType<typeof parseCsv>): ParsedRow<ThresholdImportRow>[] {
  return parseRows(rowsToRecords(rows), thresholdImportRowSchema);
}

export function parseCompanyItemImportRows(rows: ReturnType<typeof parseCsv>): ParsedRow<CompanyItemImportRow>[] {
  return parseRows(rowsToRecords(rows), companyItemImportRowSchema);
}

export function parseActionPlanImportRows(rows: ReturnType<typeof parseCsv>): ParsedRow<ActionPlanImportRow>[] {
  return parseRows(rowsToRecords(rows), actionPlanImportRowSchema);
}

export type KpiExportRow = {
  id: string;
  name: string;
  description: string | null;
  ownerUsername: string;
  departmentName: string | null;
  parentId: string | null;
  metricUnit: string;
  direction: Direction;
  calculationType: KpiCalculationType;
  weight: number;
  yellowRange: number;
  redRange: number;
  priority: number;
};

export function kpisToCsv(kpis: KpiExportRow[]): string {
  const rows = kpis.map((k) => [
    k.id,
    k.name,
    k.description ?? "",
    k.ownerUsername,
    k.departmentName ?? "",
    k.parentId ?? "",
    k.metricUnit,
    k.direction,
    k.calculationType,
    k.weight,
    k.yellowRange,
    k.redRange,
    k.priority,
  ]);
  return toCsv([[...KPI_CSV_HEADERS], ...rows]);
}

export type MeasurementExportRow = {
  kpiId: string;
  period: string;
  goal: number;
  actual: number | null;
  justification: string | null;
};

export function measurementsToCsv(measurements: MeasurementExportRow[]): string {
  const rows = measurements.map((m) => [
    m.kpiId,
    m.period,
    m.goal,
    m.actual ?? "",
    m.justification ?? "",
  ]);
  return toCsv([[...MEASUREMENT_CSV_HEADERS], ...rows]);
}
