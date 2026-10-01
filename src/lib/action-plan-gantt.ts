/** Helpers for Quattrus-style monthly Gantt bars (no day-level precision). */

export const GANTT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;

export type GanttSpan = { startMonth: number; endMonth: number };

/** Clamp a calendar month (1–12). Falls back when date is missing. */
export function monthPosition(date: Date | null | undefined, fallback: number): number {
  if (!date) return Math.max(1, Math.min(12, fallback));
  return Math.max(1, Math.min(12, date.getMonth() + 1));
}

/** Inclusive month span for a step within a display year. */
export function stepMonthSpan(
  startDate: Date | null | undefined,
  dueDate: Date | null | undefined,
  year: number,
): GanttSpan | null {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const start = startDate ?? dueDate ?? null;
  const end = dueDate ?? startDate ?? null;
  if (!start && !end) return null;

  const clampedStart = start && start > yearStart ? start : yearStart;
  const clampedEnd = end && end < yearEnd ? end : yearEnd;

  // Entirely outside the display year
  if (start && start > yearEnd) return null;
  if (end && end < yearStart) return null;
  if (!startDate && !dueDate) return null;

  const startMonth = monthPosition(clampedStart, 1);
  const endMonth = Math.max(startMonth, monthPosition(clampedEnd, startMonth));
  return { startMonth, endMonth };
}

function localYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Build local YYYY-MM-DD strings for the first/last day of the month span. */
export function datesFromMonthSpan(year: number, span: GanttSpan): { startDate: string; dueDate: string } {
  const startMonth = Math.max(1, Math.min(12, span.startMonth));
  const endMonth = Math.max(startMonth, Math.min(12, span.endMonth));
  const start = new Date(year, startMonth - 1, 1);
  const due = new Date(year, endMonth, 0); // last day of endMonth
  return { startDate: localYmd(start), dueDate: localYmd(due) };
}

export function shiftSpan(span: GanttSpan, deltaMonths: number): GanttSpan {
  const width = span.endMonth - span.startMonth;
  let startMonth = span.startMonth + deltaMonths;
  let endMonth = startMonth + width;
  if (startMonth < 1) {
    endMonth += 1 - startMonth;
    startMonth = 1;
  }
  if (endMonth > 12) {
    startMonth -= endMonth - 12;
    endMonth = 12;
  }
  startMonth = Math.max(1, Math.min(12, startMonth));
  endMonth = Math.max(startMonth, Math.min(12, endMonth));
  return { startMonth, endMonth };
}

export function resizeSpanStart(span: GanttSpan, newStartMonth: number): GanttSpan {
  const startMonth = Math.max(1, Math.min(span.endMonth, newStartMonth));
  return { startMonth, endMonth: span.endMonth };
}

export function resizeSpanEnd(span: GanttSpan, newEndMonth: number): GanttSpan {
  const endMonth = Math.max(span.startMonth, Math.min(12, newEndMonth));
  return { startMonth: span.startMonth, endMonth };
}

export type OverdueStepLike = {
  status: string;
  dueDate: Date | null | undefined;
};

/** Open step whose due date is before the start of today (local). */
export function isStepOverdue(step: OverdueStepLike, now = new Date()): boolean {
  if (step.status === "CONCLUIDO") return false;
  if (!step.dueDate) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return step.dueDate.getTime() < today.getTime();
}

export function defaultGanttYear(steps: Array<{ startDate?: Date | null; dueDate?: Date | null }>, fallback = new Date().getFullYear()): number {
  for (const step of steps) {
    const d = step.startDate ?? step.dueDate;
    if (d) return d.getFullYear();
  }
  return fallback;
}
