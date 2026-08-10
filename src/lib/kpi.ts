import type { Direction } from "@prisma/client";

export type KpiStatus = "VERDE" | "AMARELO" | "VERMELHO" | "CRITICO" | "SEM_DADO";

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

/**
 * Three tolerance tiers beyond the goal: within `yellowRange` = AMARELO,
 * beyond that but within `redRange` = VERMELHO, beyond `redRange` = CRITICO.
 * `redRange` is expected to be >= `yellowRange` (enforced at input validation).
 */
export function getKpiStatus(
  goal: number,
  actual: number | null | undefined,
  direction: Direction,
  yellowRange: number,
  redRange: number
): KpiStatus {
  const deviation = getDeviationPct(goal, actual, direction);
  if (deviation === null) return "SEM_DADO";
  if (deviation >= 0) return "VERDE";
  const gap = Math.abs(deviation);
  if (gap <= yellowRange) return "AMARELO";
  if (gap <= Math.max(redRange, yellowRange)) return "VERMELHO";
  return "CRITICO";
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
