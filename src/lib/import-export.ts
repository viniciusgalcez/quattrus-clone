import { z } from "zod";
import { toCsv, rowsToRecords, type parseCsv } from "@/lib/csv";
import type { Direction, KpiCalculationType } from "@prisma/client";

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

const numberField = (label: string) =>
  z.preprocess((v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), z
    .number({ error: `${label}: informe um número válido.` }));

const optionalNumberField = (label: string) =>
  z.preprocess((v) => (v === "" || v === undefined || v === null ? null : Number(v)), z
    .number({ error: `${label}: informe um número válido.` })
    .nullable());

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
