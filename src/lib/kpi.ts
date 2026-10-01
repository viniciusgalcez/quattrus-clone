import type { Direction } from "@prisma/client";

export type KpiStatus = "VERDE" | "AMARELO" | "VERMELHO" | "CRITICO" | "SEM_DADO";

export type ThresholdMode = "PERCENT" | "ABSOLUTE";
export type AmplitudeReference = "FORECAST" | "MINIMUM" | "FIXED";

export type ThresholdWindow = {
  startPeriod: string;
  endPeriod: string | null;
  yellowRange: number;
  redRange: number;
  thresholdMode?: ThresholdMode | null;
  upperLimit?: number | null;
  lowerLimit?: number | null;
  clientMetaFrom?: number | null;
  clientMetaTo?: number | null;
  amplitudeMonth?: AmplitudeReference | null;
  amplitudeYear?: AmplitudeReference | null;
};

export type ResolvedThresholds = {
  yellowRange: number;
  redRange: number;
  thresholdMode: ThresholdMode;
  upperLimit: number | null;
  lowerLimit: number | null;
  clientMetaFrom: number | null;
  clientMetaTo: number | null;
  amplitudeMonth: AmplitudeReference;
  amplitudeYear: AmplitudeReference;
};

type ThresholdFallback = {
  yellowRange: number;
  redRange: number;
  thresholdMode?: ThresholdMode | null;
  upperLimit?: number | null;
  lowerLimit?: number | null;
  clientMetaFrom?: number | null;
  clientMetaTo?: number | null;
  amplitudeMonth?: AmplitudeReference | null;
  amplitudeYear?: AmplitudeReference | null;
};

/**
 * Resolves the range that was effective in a cycle. Windows are append-only;
 * when old data overlaps because of legacy imports, the most recently started
 * valid window wins deterministically.
 */
export function thresholdsForPeriod(
  period: string,
  fallback: ThresholdFallback,
  windows: ThresholdWindow[] | undefined
): ResolvedThresholds {
  const active = (windows ?? [])
    .filter((window) => window.startPeriod <= period && (!window.endPeriod || window.endPeriod >= period))
    .sort((left, right) => right.startPeriod.localeCompare(left.startPeriod))[0];
  const source = active ?? fallback;
  return {
    yellowRange: source.yellowRange,
    redRange: source.redRange,
    thresholdMode: source.thresholdMode ?? "PERCENT",
    upperLimit: source.upperLimit ?? null,
    lowerLimit: source.lowerLimit ?? null,
    clientMetaFrom: source.clientMetaFrom ?? null,
    clientMetaTo: source.clientMetaTo ?? null,
    amplitudeMonth: source.amplitudeMonth ?? "FORECAST",
    amplitudeYear: source.amplitudeYear ?? "FORECAST",
  };
}

/**
 * Deviation is expressed so that a positive value always means "on/above goal"
 * regardless of whether the KPI is better when higher, lower, or on-target.
 */
export function getDeviationPct(
  goal: number,
  actual: number | null | undefined,
  direction: Direction
): number | null {
  if (actual === null || actual === undefined) return null;

  // A goal of zero makes "percent off goal" undefined, but the *sign* still is
  // not: for MORE, any positive result beats a zero goal; for LESS, any
  // negative one does; for EQUAL, anything but zero is a miss. Use a sentinel
  // magnitude of 100 so the tier logic still classifies it.
  if (goal === 0) {
    if (actual === 0) return 0;
    const beatsGoal =
      direction === "MORE" ? actual > 0 : direction === "LESS" ? actual < 0 : false;
    return beatsGoal ? 100 : -100;
  }

  const rawPct = ((actual - goal) / Math.abs(goal)) * 100;

  if (direction === "LESS") return -rawPct;
  if (direction === "EQUAL") return -Math.abs(rawPct);
  return rawPct;
}

function classifyGap(gapPct: number, yellowRange: number, redRange: number): KpiStatus {
  if (gapPct <= yellowRange) return "AMARELO";
  if (gapPct <= Math.max(redRange, yellowRange)) return "VERMELHO";
  return "CRITICO";
}

/**
 * Absolute green band: VERDE when actual is inside [lower, upper]. Direction
 * still matters outside the band — beating the band (MORE above upper, LESS
 * below lower) stays VERDE. Misses are ranked by distance relative to band
 * width (or the single limit / goal when only one bound exists), using the
 * vigência yellow/red % as tier cutoffs.
 */
function getAbsoluteKpiStatus(
  goal: number,
  actual: number,
  direction: Direction,
  yellowRange: number,
  redRange: number,
  lowerLimit: number | null,
  upperLimit: number | null
): KpiStatus {
  const hasLower = lowerLimit !== null && lowerLimit !== undefined;
  const hasUpper = upperLimit !== null && upperLimit !== undefined;

  if (hasLower && hasUpper) {
    const lo = Math.min(lowerLimit!, upperLimit!);
    const hi = Math.max(lowerLimit!, upperLimit!);
    if (actual >= lo && actual <= hi) return "VERDE";
    if (direction === "MORE" && actual > hi) return "VERDE";
    if (direction === "LESS" && actual < lo) return "VERDE";

    const width = Math.max(hi - lo, 1);
    const distance = actual < lo ? lo - actual : actual - hi;
    return classifyGap((distance / width) * 100, yellowRange, redRange);
  }

  if (hasLower) {
    if (direction === "MORE" || direction === "EQUAL") {
      if (actual >= lowerLimit!) return "VERDE";
      const base = Math.abs(lowerLimit!) || Math.abs(goal) || 1;
      return classifyGap(((lowerLimit! - actual) / base) * 100, yellowRange, redRange);
    }
    // LESS: lower is the "too high" edge when only lower is set — fall through
    // to percent-of-goal using the bound as the effective goal.
    return getPercentKpiStatus(lowerLimit!, actual, direction, yellowRange, redRange);
  }

  if (hasUpper) {
    if (direction === "LESS" || direction === "EQUAL") {
      if (actual <= upperLimit!) return "VERDE";
      const base = Math.abs(upperLimit!) || Math.abs(goal) || 1;
      return classifyGap(((actual - upperLimit!) / base) * 100, yellowRange, redRange);
    }
    return getPercentKpiStatus(upperLimit!, actual, direction, yellowRange, redRange);
  }

  return getPercentKpiStatus(goal, actual, direction, yellowRange, redRange);
}

/**
 * Three tolerance tiers beyond the goal: within `yellowRange` = AMARELO,
 * beyond that but within `redRange` = VERMELHO, beyond `redRange` = CRITICO.
 * `redRange` is expected to be >= `yellowRange` (enforced at input validation).
 */
function getPercentKpiStatus(
  goal: number,
  actual: number,
  direction: Direction,
  yellowRange: number,
  redRange: number
): KpiStatus {
  const deviation = getDeviationPct(goal, actual, direction);
  if (deviation === null) return "SEM_DADO";
  if (deviation >= 0) return "VERDE";
  return classifyGap(Math.abs(deviation), yellowRange, redRange);
}

/**
 * Three tolerance tiers beyond the goal: within `yellowRange` = AMARELO,
 * beyond that but within `redRange` = VERMELHO, beyond `redRange` = CRITICO.
 * `redRange` is expected to be >= `yellowRange` (enforced at input validation).
 *
 * Optional absolute bounds (6th arg) switch to Limite Superior/Inferior logic
 * without breaking existing PERCENT call sites.
 */
export function getKpiStatus(
  goal: number,
  actual: number | null | undefined,
  direction: Direction,
  yellowRange: number,
  redRange: number,
  absolute?: {
    thresholdMode?: ThresholdMode | null;
    lowerLimit?: number | null;
    upperLimit?: number | null;
  }
): KpiStatus {
  if (actual === null || actual === undefined) return "SEM_DADO";
  if (absolute?.thresholdMode === "ABSOLUTE") {
    return getAbsoluteKpiStatus(
      goal,
      actual,
      direction,
      yellowRange,
      redRange,
      absolute.lowerLimit ?? null,
      absolute.upperLimit ?? null
    );
  }
  return getPercentKpiStatus(goal, actual, direction, yellowRange, redRange);
}

/** Convenience: resolve status from a full thresholds object for a period. */
export function getKpiStatusFromThresholds(
  goal: number,
  actual: number | null | undefined,
  direction: Direction,
  thresholds: Pick<ResolvedThresholds, "yellowRange" | "redRange" | "thresholdMode" | "lowerLimit" | "upperLimit">
): KpiStatus {
  return getKpiStatus(goal, actual, direction, thresholds.yellowRange, thresholds.redRange, {
    thresholdMode: thresholds.thresholdMode,
    lowerLimit: thresholds.lowerLimit,
    upperLimit: thresholds.upperLimit,
  });
}

/**
 * Single entry for UI + writes: resolve vigência for `period` then classify.
 * Prefer this over bare `getKpiStatus(...)` so ABSOLUTE / vigência stay consistent.
 */
export type KpiStatusSource = ThresholdFallback & {
  direction: Direction;
  thresholdValidities?: ThresholdWindow[];
};

export function statusForKpiPeriod(
  kpi: KpiStatusSource,
  period: string,
  goal: number,
  actual: number | null | undefined
): KpiStatus {
  const thresholds = thresholdsForPeriod(period, kpi, kpi.thresholdValidities);
  return getKpiStatusFromThresholds(goal, actual, kpi.direction, thresholds);
}

export const STATUS_COLOR: Record<KpiStatus, string> = {
  VERDE: "#157f4a",
  AMARELO: "#b56a05",
  VERMELHO: "#c62b2b",
  CRITICO: "#7a1d2e",
  SEM_DADO: "#6b6b82",
};

export const STATUS_LABEL: Record<KpiStatus, string> = {
  VERDE: "No alvo",
  AMARELO: "Atenção",
  VERMELHO: "Fora da meta",
  CRITICO: "Crítico",
  SEM_DADO: "Sem dado",
};

export const STATUS_BADGE_CLASS: Record<KpiStatus, string> = {
  VERDE: "badge badge-verde",
  AMARELO: "badge badge-amarelo",
  VERMELHO: "badge badge-vermelho",
  CRITICO: "badge badge-critico",
  SEM_DADO: "badge badge-neutro",
};

export const STATUS_RAIL_CLASS: Record<KpiStatus, string> = {
  VERDE: "status-rail-verde",
  AMARELO: "status-rail-amarelo",
  VERMELHO: "status-rail-vermelho",
  CRITICO: "status-rail-critico",
  SEM_DADO: "status-rail-neutro",
};

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function periodLabel(period: string): string {
  const [year, month] = period.split("-");
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${meses[Number(month) - 1]}/${year.slice(2)}`;
}

/** Hover text for KPI name (farol / lists) — Código, Indicador, Tipo, Crônico, Descrição. */
export function kpiNameTooltip(kpi: {
  sequenceNumber: number;
  name: string;
  metricUnit: string;
  category?: string | null;
  chronicRedMonths?: number | null;
  description?: string | null;
}): string {
  const code = `IC-${String(kpi.sequenceNumber).padStart(5, "0")}`;
  const lines = [
    `Código: ${code}`,
    `Item de Controle: ${kpi.name}`,
    `Indicador: ${kpi.metricUnit}`,
    `Tipo: ${kpi.category ?? "KPI"}`,
    kpi.chronicRedMonths != null ? `Vermelho Crônico: ${kpi.chronicRedMonths}` : null,
    kpi.description ? `Descrição: ${kpi.description}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
