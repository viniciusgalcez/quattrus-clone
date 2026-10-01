import { dateKey } from "@/lib/event";

function agendaHref(view: "day" | "week" | "month", anchor: Date, categories: string[]) {
  const params = new URLSearchParams({ view, date: dateKey(anchor) });
  for (const category of categories) params.append("category", category);
  return `/agenda?${params.toString()}`;
}

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"] as const;
const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

/**
 * Compact month navigator beside the main agenda views — pick a day or jump
 * to today without leaving the page shell.
 */
export function AgendaMiniCalendar({
  anchor,
  view,
  categories = [],
  eventDates = [],
}: {
  anchor: Date;
  view: "day" | "week" | "month";
  categories?: string[];
  /** YYYY-MM-DD keys that have at least one event in the loaded range. */
  eventDates?: string[];
}) {
  const today = new Date();
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
    index < firstWeekday ? null : new Date(anchor.getFullYear(), anchor.getMonth(), index - firstWeekday + 1)
  );
  const prevMonth = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
  const nextMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const marked = new Set(eventDates);
  const title = monthTitle.format(anchor);

  return (
    <aside className="card flex flex-col gap-3 p-4" aria-label="Mini calendário">
      <div className="flex items-center justify-between gap-2">
        <a className="btn px-2 text-[11px]" href={agendaHref(view, prevMonth, categories)} aria-label="Mês anterior">
          ‹
        </a>
        <p className="text-center text-[12px] font-semibold capitalize text-[var(--color-ink-900)]">{title}</p>
        <a className="btn px-2 text-[11px]" href={agendaHref(view, nextMonth, categories)} aria-label="Próximo mês">
          ›
        </a>
      </div>

      <a className="btn btn-primary w-full text-[12px]" href={agendaHref(view, today, categories)}>
        Ir para hoje
      </a>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((day, index) => (
          <div key={`${day}-${index}`} className="py-1 text-[10px] font-bold uppercase text-[var(--color-ink-400)]">
            {day}
          </div>
        ))}
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;
          const key = dateKey(date);
          const isToday = key === dateKey(today);
          const isSelected = key === dateKey(anchor);
          const hasEvent = marked.has(key);
          return (
            <a
              key={key}
              href={agendaHref(view === "month" ? "day" : view, date, categories)}
              className={`relative rounded-md py-1.5 text-[11px] font-medium transition ${
                isSelected
                  ? "bg-[var(--color-brand-700)] text-white"
                  : isToday
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-900)]"
                    : "text-[var(--color-ink-700)] hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              {date.getDate()}
              {hasEvent && (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                    isSelected ? "bg-white" : "bg-[var(--color-brand-600)]"
                  }`}
                />
              )}
            </a>
          );
        })}
      </div>
    </aside>
  );
}
