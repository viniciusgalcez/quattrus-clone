/**
 * Period algebra. A period is the string "YYYY-MM", which is deliberately
 * lexicographically sortable — every comparison here is a plain string compare,
 * so nothing in this module parses a date or reads the clock.
 */

export type PeriodBlockReason = "PERIODO_INVALIDO" | "FUTURO" | "FECHADO" | "SEM_PERMISSAO";

export const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const PERIOD_BLOCK_MESSAGE: Record<PeriodBlockReason, string> = {
  PERIODO_INVALIDO: "Período inválido. Use o formato AAAA-MM.",
  FUTURO: "Não é possível lançar em um período futuro.",
  FECHADO: "Ciclo fechado. Peça a um administrador para reabrir o período.",
  SEM_PERMISSAO: "Você não tem permissão para lançar neste indicador.",
};

export function isValidPeriod(period: string): boolean {
  return PERIOD_PATTERN.test(period);
}

/** Negative if a < b, positive if a > b, zero if equal. */
export function comparePeriods(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export type PeriodWriteState =
  | { writable: true; reason: null }
  | { writable: false; reason: PeriodBlockReason };

/**
 * The single decision for "may this KPI+period be written right now".
 *
 * `today` is a parameter rather than a `currentPeriod()` call so this stays a
 * pure function — testable without freezing the clock, and impossible to get
 * wrong by accident in a different timezone.
 *
 * Precedence is deliberate and asserted in the tests: a malformed period is
 * rejected before anything else, a future period before a closed one, and a
 * closed period before the permission check. The first three are facts about
 * the period itself and are identical for every user; only the last is personal.
 *
 * A closed period blocks *everyone*, administrators included. An admin who
 * needs to fix a closed month reopens it — which leaves an audit row. If an
 * admin could write through a lock, the lock would be decorative.
 */
export function getPeriodWriteState(args: {
  period: string;
  today: string;
  globallyClosed: boolean;
  departmentClosed: boolean;
  isOwnerOrAdmin: boolean;
}): PeriodWriteState {
  const { period, today, globallyClosed, departmentClosed, isOwnerOrAdmin } = args;

  if (!isValidPeriod(period)) return { writable: false, reason: "PERIODO_INVALIDO" };
  if (comparePeriods(period, today) > 0) return { writable: false, reason: "FUTURO" };
  if (globallyClosed || departmentClosed) return { writable: false, reason: "FECHADO" };
  if (!isOwnerOrAdmin) return { writable: false, reason: "SEM_PERMISSAO" };

  return { writable: true, reason: null };
}
