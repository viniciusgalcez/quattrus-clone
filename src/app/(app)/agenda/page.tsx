import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  EVENT_CATEGORY_LABEL,
  EVENT_CATEGORY_ORDER,
  EVENT_CATEGORY_DOT_CLASS,
  agendaRange,
  normalizeEventCategoryFilters,
  parseAgendaAnchor,
} from "@/lib/event";
import { NovoEventoForm } from "@/components/NovoEventoForm";
import { AgendaViews } from "@/components/AgendaViews";
import { assertPageModule } from "@/lib/module-access";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; category?: string | string[] }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "agenda");

  const params = await searchParams;
  const requestedView = params.view === "day" || params.view === "week" ? params.view : "month";
  const anchor = parseAgendaAnchor(params.date);
  const selectedCategories = normalizeEventCategoryFilters(params.category);
  const categoryWhere = selectedCategories.length ? { category: { in: selectedCategories } } : {};
  const range = agendaRange(requestedView, anchor);

  const events = await prisma.calendarEvent.findMany({
    where: {
      ...(session.user.role === "ADMIN" ? {} : { OR: [{ createdById: session.user.id }, { participants: { some: { userId: session.user.id } } }] }),
      ...categoryWhere,
      startAt: { lt: range.end },
      endAt: { gte: range.start },
    },
    orderBy: { startAt: "asc" },
    include: { createdBy: { select: { name: true } }, participants: { include: { user: { select: { name: true } } } } },
  });
  const users = await prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const allCategoriesVisible = selectedCategories.length === 0;

  return (
    <div className="flex flex-col gap-4 p-2">
      <div>
        <h1 className="page-title">Agenda</h1>
        <p className="page-subtitle">Eventos organizados por categoria — reuniões, treinamentos e feedbacks.</p>
      </div>

      <form noValidate method="get" className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
        <input type="hidden" name="view" value={requestedView} />
        <input type="hidden" name="date" value={params.date ?? ""} />
        <fieldset className="min-w-0 flex-1">
          <legend className="mb-2 text-[12px] font-semibold text-[var(--color-ink-900)]">Categorias visíveis</legend>
          <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORY_ORDER.map((c) => (
          <label key={c} className="flex min-w-0 items-center gap-1.5 rounded-[8px] border border-[var(--color-border)] px-2.5 py-2 text-[12px] text-[var(--color-ink-500)]">
            <input
              type="checkbox"
              name="category"
              value={c}
              defaultChecked={allCategoriesVisible || selectedCategories.includes(c)}
              className="h-3.5 w-3.5 accent-[var(--color-brand-600)]"
            />
            <span className={`h-2.5 w-2.5 rounded-full ${EVENT_CATEGORY_DOT_CLASS[c]}`} aria-hidden="true" />
            <span className="truncate">{EVENT_CATEGORY_LABEL[c]}</span>
          </label>
        ))}
          </div>
        </fieldset>
        <button type="submit" className="btn btn-primary w-full whitespace-nowrap sm:w-auto sm:min-w-[136px]">Aplicar filtros</button>
      </form>

      <NovoEventoForm users={users} />

      <AgendaViews events={events} view={requestedView} anchor={anchor} categories={selectedCategories} />
    </div>
  );
}
