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
  // "Dados Básicos" tab fields from the original Quattrus item editor.
  category: z.enum(["PMB", "KPI"]).default("KPI"),
  client: optionalText(120),
  bomFor: optionalText(80),
  chronicRedMonths: nullableNumberFromForm({ min: 1, max: 24 }),
  decimalPlaces: numberFromForm({ min: 0, max: 6 }).default(2),
  coefficient: nullableNumberFromForm(),
  auxiliary: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
  shared: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
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

// `goal` only exists on creation (it seeds the first Measurement); the edit
// form has no such field, so requiring it here made every update fail
// validation silently — the "Confira os campos destacados." message with no
// field actually flagged, since EditarMetaForm never renders a goal error.
export const updateKpiSchema = kpiFields
  .omit({ goal: true })
  .extend({ priority: numberFromForm({ min: 0, max: 9999 }) })
  .superRefine(redRangeInvariant);

const periodField = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use o formato AAAA-MM.");

/**
 * Configuration kept separately from the basic item fields. The relations
 * themselves arrive as repeated FormData values and are normalized in the
 * server action; this schema owns the scalar, historically-versioned parts.
 */
export const saveKpiConfigurationSchema = z
  .object({
    formulaKind: z.enum(["MANUAL", "SUM", "AVERAGE", "WEIGHTED", "QUOTIENT", "TOTALIZER"]),
    numeratorKpiId: optionalText(60),
    denominatorKpiId: optionalText(60),
    denominatorAverage: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
    itemValidityStart: optionalText(7),
    itemValidityEnd: optionalText(7),
    measurementValidityStart: optionalText(7),
    measurementValidityEnd: optionalText(7),
    thresholdStart: periodField,
    thresholdEnd: optionalText(7),
    yellowRange: numberFromForm({ min: 0, max: 100 }),
    redRange: numberFromForm({ min: 0, max: 100 }),
  })
  .superRefine((data, ctx) => {
    const ranges: Array<["itemValidityStart" | "measurementValidityStart" | "thresholdStart", string | undefined, string | undefined]> = [
      ["itemValidityStart", data.itemValidityStart, data.itemValidityEnd],
      ["measurementValidityStart", data.measurementValidityStart, data.measurementValidityEnd],
      ["thresholdStart", data.thresholdStart, data.thresholdEnd],
    ];
    for (const [field, start, end] of ranges) {
      if (start && !/^\d{4}-(0[1-9]|1[0-2])$/.test(start)) {
        ctx.addIssue({ code: "custom", path: [field], message: "Use o formato AAAA-MM." });
      }
      if (end && !/^\d{4}-(0[1-9]|1[0-2])$/.test(end)) {
        ctx.addIssue({ code: "custom", path: [field === "itemValidityStart" ? "itemValidityEnd" : field === "measurementValidityStart" ? "measurementValidityEnd" : "thresholdEnd"], message: "Use o formato AAAA-MM." });
      }
      if (start && end && end < start) {
        ctx.addIssue({ code: "custom", path: [field === "itemValidityStart" ? "itemValidityEnd" : field === "measurementValidityStart" ? "measurementValidityEnd" : "thresholdEnd"], message: "O fim não pode ser anterior ao início." });
      }
    }
    redRangeInvariant(data, ctx);
    if (data.formulaKind === "QUOTIENT" && (!data.numeratorKpiId || !data.denominatorKpiId)) {
      ctx.addIssue({ code: "custom", path: ["numeratorKpiId"], message: "Informe numerador e denominador." });
    }
  });

export const upsertMeasurementSchema = z.object({
  kpiId: z.string().trim().min(1),
  goal: numberFromForm(),
  actual: nullableNumberFromForm(),
});

export const upsertAnnualMeasurementSchema = z.object({
  kpiId: z.string().trim().min(1),
  period: periodField,
  goal: numberFromForm(),
  actual: nullableNumberFromForm(),
  forecast: nullableNumberFromForm(),
  measured: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).default(false),
  justification: optionalText(2000),
  benchmark: optionalText(200),
  benchmarkValue: nullableNumberFromForm(),
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

const actionPlanStepFields = z.object({
  actionPlanId: z.string().trim().min(1),
  parentId: optionalText(60),
  name: z.string().trim().min(1, "Informe o nome da etapa.").max(300),
  responsibleId: optionalText(60),
  startDate: optionalText(20),
  dueDate: optionalText(20),
  value: nullableNumberFromForm({ min: 0 }),
});

function validateActionPlanStepDates(data: { startDate?: string; dueDate?: string }, ctx: z.RefinementCtx) {
  if (data.startDate && Number.isNaN(new Date(data.startDate).getTime())) {
    ctx.addIssue({ code: "custom", path: ["startDate"], message: "Data inicial inválida." });
  }
  if (data.dueDate && Number.isNaN(new Date(data.dueDate).getTime())) {
    ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Data final inválida." });
  }
  if (data.startDate && data.dueDate && new Date(data.dueDate) < new Date(data.startDate)) {
    ctx.addIssue({ code: "custom", path: ["dueDate"], message: "O término não pode ser antes do início." });
  }
}

export const createActionPlanStepSchema = actionPlanStepFields.superRefine(validateActionPlanStepDates);

export const updateActionPlanStepSchema = actionPlanStepFields
  .omit({ actionPlanId: true })
  .extend({ status: z.enum(["ABERTO", "CONCLUIDO"]) })
  .superRefine(validateActionPlanStepDates);

export const createForecastRequestSchema = z.object({
  kpiId: z.string().trim().min(1),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Informe um período válido."),
  proposedGoal: nullableNumberFromForm(),
  proposedActual: nullableNumberFromForm(),
  reason: z.string().trim().min(1, "Informe o motivo da previsão.").max(1000),
});

export const reviewForecastSchema = z.object({
  status: z.enum(["APROVADA", "REJEITADA"]),
  reviewNote: optionalText(1000),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120),
  username: z
    .string()
    .trim()
    .min(3, "O usuário deve ter ao menos 3 caracteres.")
    .max(60)
    .regex(/^[a-z0-9._-]+$/i, "Use apenas letras, números, ponto, hífen e underscore."),
  password: z.string().min(10, "A senha deve ter ao menos 10 caracteres.").max(200),
  role: z.enum(["ADMIN", "GESTOR", "COLABORADOR"]),
  managerId: optionalText(60),
  departmentId: optionalText(60),
  accessProfileId: optionalText(60),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120),
  role: z.enum(["ADMIN", "GESTOR", "COLABORADOR"]),
  managerId: optionalText(60),
  departmentId: optionalText(60),
  password: z.union([z.string().min(10, "A senha deve ter ao menos 10 caracteres."), z.literal("")]).optional(),
  accessProfileId: optionalText(60),
});

export const createAccessProfileSchema = z.object({
  name: z.string().trim().min(3, "Informe um nome de perfil.").max(80),
  type: z.enum(["ADMIN", "GESTOR", "COLABORADOR"]),
});

export const updateAccessProfileSchema = createAccessProfileSchema;

export const saveCompanySettingsSchema = z.object({
  legalName: z.string().trim().min(3, "Informe o nome da empresa.").max(160),
  displayMonths: numberFromForm({ min: 1, max: 24 }),
  blankMonths: numberFromForm({ min: 0, max: 24 }),
  chronicRedMonths: numberFromForm({ min: 1, max: 24 }),
  fixedBaseDate: optionalText(7),
  showGoal: z.preprocess((v) => v === "on", z.boolean()).default(false),
  yellowGood: z.preprocess((v) => v === "on", z.boolean()).default(false),
  redGood: z.preprocess((v) => v === "on", z.boolean()).default(false),
  automationDisabled: z.preprocess((v) => v === "on", z.boolean()).default(false),
});

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do departamento.").max(100),
});

export const createTaskSchema = z.object({
  what: z.string().trim().min(1, "Descreva o que precisa ser feito.").max(300),
  why: optionalText(500),
  howWhere: optionalText(300),
  actionPlanId: optionalText(60),
  assigneeId: optionalText(60),
  startDate: optionalText(20),
  dueDate: optionalText(20),
  value: nullableNumberFromForm(),
});

export const createStrategicProjectSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do projeto.").max(160),
  description: optionalText(1000),
  departmentId: optionalText(60),
  kpiId: optionalText(60),
  startDate: optionalText(20),
  dueDate: optionalText(20),
  budget: nullableNumberFromForm({ min: 0 }),
}).superRefine((data, ctx) => {
  if (data.startDate && data.dueDate && new Date(data.dueDate) < new Date(data.startDate)) {
    ctx.addIssue({ code: "custom", path: ["dueDate"], message: "O término não pode ser antes do início." });
  }
});

export const updateStrategicProjectStatusSchema = z.object({
  status: z.enum(["PLANEJADO", "EM_ANDAMENTO", "CONCLUIDO", "SUSPENSO"]),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["ABERTA", "EM_ANDAMENTO", "CONCLUIDA", "ATRASADA"]),
});

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, "Informe um título.").max(150),
    category: z.enum(["REUNIAO_RESULTADO", "PEMPB", "REUNIAO_TIME", "TREINAMENTO", "FEEDBACK"]),
    startAt: z.string().trim().min(1, "Informe a data/hora de início."),
    endAt: z.string().trim().min(1, "Informe a data/hora de término."),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startAt);
    const end = new Date(data.endAt);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({ code: "custom", path: ["startAt"], message: "Data/hora de início inválida." });
    }
    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "Data/hora de término inválida." });
    }
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "O término não pode ser antes do início." });
    }
  });

export const createDelegationSchema = z.object({
  kpiId: z.string().trim().min(1),
  delegateId: z.string().trim().min(1, "Escolha um usuário."),
});

export const createFacilitationSchema = z.object({
  facilitatedId: z.string().trim().min(1, "Escolha um usuário."),
});

export const closePeriodSchema = z.object({
  period: z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use o formato AAAA-MM."),
  note: optionalText(1000),
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
