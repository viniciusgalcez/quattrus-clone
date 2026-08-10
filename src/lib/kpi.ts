import type { Direction } from "@prisma/client";

export type KpiStatus = "AZUL" | "VERDE" | "AMARELO" | "VERMELHO" | "CRITICO" | "SEM_DADO";

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
  
  // Bolinha Azul: Resultado muito acima da meta (>= 20% acima).
  if (deviation >= 20) return "AZUL";
  if (deviation >= 0) return "VERDE";
  const gap = Math.abs(deviation);
  if (gap <= yellowRange) return "AMARELO";
  if (gap <= Math.max(redRange, yellowRange)) return "VERMELHO";
  return "CRITICO";
}

export const STATUS_COLOR: Record<KpiStatus, string> = {
  AZUL: "#2563eb",
  VERDE: "#16a34a",
  AMARELO: "#eab308",
  VERMELHO: "#dc2626",
  CRITICO: "#7f1d1d",
  SEM_DADO: "#9ca3af",
};

export const STATUS_LABEL: Record<KpiStatus, string> = {
  AZUL: "Super Meta",
  VERDE: "No alvo",
  AMARELO: "Atenção",
  VERMELHO: "Fora da meta",
  CRITICO: "Crítico",
  SEM_DADO: "Sem dado",
};

// Now we use generic 'bolinha' classes instead of badges
export const STATUS_BADGE_CLASS: Record<KpiStatus, string> = {
  AZUL: "bolinha bolinha-azul",
  VERDE: "bolinha bolinha-verde",
  AMARELO: "bolinha bolinha-amarelo",
  VERMELHO: "bolinha bolinha-vermelho",
  CRITICO: "bolinha bolinha-critico",
  SEM_DADO: "bolinha bolinha-neutro",
};

export const STATUS_RAIL_CLASS: Record<KpiStatus, string> = {
  AZUL: "status-rail-azul",
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
