import type { EventCategory } from "@prisma/client";
import { dateKey, EVENT_CATEGORY_LABEL, EVENT_CATEGORY_DOT_CLASS } from "@/lib/event";

type AgendaEvent = {
  id: string;
  title: string;
  category: EventCategory;
  startAt: Date;
  endAt: Date;
  createdBy: { name: string };
  participants?: { user: { name: string } }[];
};
const dayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function daysFrom(anchor: Date, count: number) { return Array.from({ length: count }, (_, index) => { const date = new Date(anchor); date.setDate(anchor.getDate() + index); return date; }); }
function eventItems(events: AgendaEvent[], date: Date) { return events.filter((event) => dateKey(event.startAt) === dateKey(date)); }
function moveAnchor(anchor: Date, view: "day" | "week" | "month", direction: -1 | 1) {
  const next = new Date(anchor);
  if (view === "month") next.setMonth(anchor.getMonth() + direction);
  else next.setDate(anchor.getDate() + (view === "week" ? 7 : 1) * direction);
  return next;
}
function agendaHref(view: "day" | "week" | "month", anchor: Date, categories: EventCategory[]) {
  const params = new URLSearchParams({ view, date: dateKey(anchor) });
  for (const category of categories) params.append("category", category);
  return `/agenda?${params.toString()}`;
}

function EventItem({ event }: { event: AgendaEvent }) {
  const participants = event.participants?.map((item) => item.user.name).join(", ");
  return <li className="flex items-start gap-2 border-b border-[var(--color-border)] px-2 py-2 last:border-0"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EVENT_CATEGORY_DOT_CLASS[event.category]}`} aria-hidden="true" /><div className="min-w-0"><div className="truncate text-[12px] font-medium text-[var(--color-ink-900)]">{event.title}</div><div className="text-[10px] text-[var(--color-ink-400)]">{timeFormatter.format(event.startAt)}–{timeFormatter.format(event.endAt)} · {EVENT_CATEGORY_LABEL[event.category]}</div>{participants && <div className="truncate text-[10px] text-[var(--color-ink-400)]">Participantes: {participants}</div>}</div></li>;
}

export function AgendaViews({ events, view, anchor, categories = [] }: { events: AgendaEvent[]; view: "day" | "week" | "month"; anchor: Date; categories?: EventCategory[] }) {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => index < firstWeekday ? null : new Date(anchor.getFullYear(), anchor.getMonth(), index - firstWeekday + 1));
  const monday = new Date(anchor); monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  const visibleDays = view === "day" ? [anchor] : view === "week" ? daysFrom(monday, 7) : [];

  return <section className="card overflow-hidden">
    <div className="card-header flex-wrap gap-3"><div><span>{view === "month" ? `Visão mensal — ${monthFormatter.format(anchor)}` : view === "week" ? "Visão semanal" : `Visão diária — ${dayFormatter.format(anchor)}`}</span><p className="mt-0.5 text-[11px] font-normal text-[var(--color-ink-400)]">{events.length} evento(s) no período selecionado.</p></div><div className="flex flex-wrap items-center justify-end gap-1"><a className="btn px-2 text-[11px]" href={agendaHref(view, moveAnchor(anchor, view, -1), categories)}>Anterior</a><a className="btn px-2 text-[11px]" href={agendaHref(view, new Date(), categories)}>Hoje</a><a className="btn px-2 text-[11px]" href={agendaHref(view, moveAnchor(anchor, view, 1), categories)}>Próximo</a><nav className="ml-1 flex shrink-0 items-center gap-1" aria-label="Visão da agenda"><a className={`btn px-2 text-[11px] ${view === "day" ? "btn-primary" : ""}`} href={agendaHref("day", anchor, categories)}>Dia</a><a className={`btn px-2 text-[11px] ${view === "week" ? "btn-primary" : ""}`} href={agendaHref("week", anchor, categories)}>Semana</a><a className={`btn px-2 text-[11px] ${view === "month" ? "btn-primary" : ""}`} href={agendaHref("month", anchor, categories)}>Mês</a></nav></div></div>
    {view === "month" ? <div className="table-scroll"><div className="grid min-w-[700px] grid-cols-7"><div className="contents">{["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <div key={day} className="border-b border-r border-[var(--color-border)] p-2 text-center text-[10px] font-bold uppercase text-[var(--color-ink-400)]">{day}</div>)}</div>{monthDays.map((date, index) => <div key={index} className="min-h-[96px] border-b border-r border-[var(--color-border)] p-1.5">{date && <><div className={`mb-1 text-[11px] font-semibold ${dateKey(date) === dateKey(new Date()) ? "text-[var(--color-brand-700)]" : "text-[var(--color-ink-500)]"}`}>{date.getDate()}</div><ul>{eventItems(events, date).slice(0, 3).map((event) => <EventItem key={event.id} event={event} />)}</ul>{eventItems(events, date).length > 3 && <div className="px-2 text-[10px] text-[var(--color-ink-400)]">+{eventItems(events, date).length - 3} evento(s)</div>}</>}</div>)}</div></div> : <div className="grid grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-7">{visibleDays.map((date) => <div key={dateKey(date)} className="min-h-[140px] p-3"><div className="mb-2 text-[12px] font-semibold text-[var(--color-ink-800)]">{dayFormatter.format(date)}</div><ul>{eventItems(events, date).map((event) => <EventItem key={event.id} event={event} />)}</ul>{eventItems(events, date).length === 0 && <p className="text-[11px] text-[var(--color-ink-400)]">Sem eventos</p>}</div>)}</div>}
  </section>;
}
