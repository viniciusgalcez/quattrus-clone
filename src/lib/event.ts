import type { EventCategory } from "@prisma/client";

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  REUNIAO_RESULTADO: "Reunião de Resultado",
  PEMPB: "PEMPB",
  REUNIAO_TIME: "Reunião de Time",
  TREINAMENTO: "Treinamento",
  FEEDBACK: "Feedback",
};

/** Same five categories as the original Quattrus Agenda legend. */
export const EVENT_CATEGORY_ORDER: EventCategory[] = [
  "REUNIAO_RESULTADO",
  "PEMPB",
  "REUNIAO_TIME",
  "TREINAMENTO",
  "FEEDBACK",
];

const EVENT_CATEGORY_SET = new Set<string>(EVENT_CATEGORY_ORDER);

export function isEventCategory(value: unknown): value is EventCategory {
  return typeof value === "string" && EVENT_CATEGORY_SET.has(value);
}

export function normalizeEventCategoryFilters(value: string | string[] | undefined): EventCategory[] {
  const values = value ? (Array.isArray(value) ? value : [value]) : [];
  const categories = values.filter(isEventCategory);
  return [...new Set(categories)];
}

export function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseAgendaAnchor(value: string | undefined, fallback = new Date()) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function agendaRange(view: "day" | "week" | "month", anchor: Date) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);

  if (view === "month") {
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    return { start, end };
  }

  if (view === "week") {
    start.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

export const EVENT_CATEGORY_DOT_CLASS: Record<EventCategory, string> = {
  REUNIAO_RESULTADO: "bg-[var(--color-brand-500)]",
  PEMPB: "bg-[var(--color-amber-600)]",
  REUNIAO_TIME: "bg-blue-500",
  TREINAMENTO: "bg-purple-500",
  FEEDBACK: "bg-pink-500",
};
