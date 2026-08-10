import { z } from "zod";

/** Coerces a FormData value into a required, finite number within [min, max]. */
function numberFromForm(opts?: { min?: number; max?: number }) {
  return z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }, z.number({ error: "Informe um número válido." }).min(opts?.min ?? -Infinity).max(opts?.max ?? Infinity));
}

/** Same as numberFromForm, but an empty value becomes null instead of an error. */
function nullableNumberFromForm(opts?: { min?: number; max?: number }) {
  return z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }, z.number({ error: "Informe um número válido." }).min(opts?.min ?? -Infinity).max(opts?.max ?? Infinity).nullable());
}

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const kpiFields = z.object({
  name: z.string().trim().min(1, "Informe o nome do indicador.").max(120),
  description: optionalText(1000),
  metricUnit: z.string().trim().min(1, "Informe a unidade de medida.").max(20),
  direction: z.enum(["MORE", "LESS", "EQUAL"]),
  weight: numberFromForm({ min: 0, max: 100 }),
  yellowRange: numberFromForm({ min: 0, max: 100 }),
  redRange: numberFromForm({ min: 0, max: 100 }),
  goal: numberFromForm(),
  calculationType: z.enum(["MANUAL", "SUM", "AVERAGE", "WEIGHTED"]).default("MANUAL"),
  departmentId: optionalText(60),
  parentId: optionalText(60),
});

const redRangeInvariant = (data: { yellowRange: number; redRange: number }, ctx: z.RefinementCtx) => {
  if (data.redRange < data.yellowRange) {
    ctx.addIssue({
      code: "custom",
      path: ["redRange"],
      message: "A faixa vermelha deve ser maior ou igual à faixa amarela.",
    });
  }
};

export const createKpiSchema = kpiFields.superRefine(redRangeInvariant);

export const updateKpiSchema = kpiFields
  .extend({ priority: numberFromForm({ min: 0, max: 9999 }) })
  .superRefine(redRangeInvariant);

export const upsertMeasurementSchema = z.object({
  kpiId: z.string().trim().min(1),
  goal: numberFromForm(),
  actual: nullableNumberFromForm(),
});

export const saveActionPlanSchema = z.object({
  measurementId: z.string().trim().min(1),
  fact: z.string().trim().min(1, "Descreva o desvio.").max(2000),
  why1: optionalText(500),
  why2: optionalText(500),
  why3: optionalText(500),
  why4: optionalText(500),
  why5: optionalText(500),
  rootCause: optionalText(1000),
  what: optionalText(500),
  who: optionalText(200),
  where: optionalText(200),
  when: optionalText(20),
  why: optionalText(1000),
  how: optionalText(1000),
  howMuch: nullableNumberFromForm({ min: 0 }),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120),
  username: z
    .string()
    .trim()
    .min(3, "O usuário deve ter ao menos 3 caracteres.")
    .max(60)
    .regex(/^[a-z0-9._-]+$/i, "Use apenas letras, números, ponto, hífen e underscore."),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres.").max(200),
  role: z.enum(["ADMIN", "GESTOR", "COLABORADOR"]),
  managerId: optionalText(60),
  departmentId: optionalText(60),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120),
  role: z.enum(["ADMIN", "GESTOR", "COLABORADOR"]),
  managerId: optionalText(60),
  departmentId: optionalText(60),
  password: z.union([z.string().min(6, "A senha deve ter ao menos 6 caracteres."), z.literal("")]).optional(),
});

/** Flattens a zod safeParse failure into { field: message } for form re-display. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type FormActionState = { error?: string; fieldErrors?: Record<string, string> } | null;
