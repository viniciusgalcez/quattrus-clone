import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, LayoutGrid, Plus, Trash2, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule } from "@/lib/module-access";
import { exportableOwnerIds } from "@/lib/hierarchy";
import {
  buildMultigraficoData,
  kpiIdsFromMultiChartSlots,
  MAX_MULTICHART_SLOTS,
  normalizeMultiChartSlots,
} from "@/lib/multigraficos";
import {
  clearMultiChartSlotAction,
  createMultiChartTab,
  deleteMultiChartTab,
  saveMultiChartSlot,
} from "@/lib/multigraficos-actions";
import { KpiBandChart } from "@/components/KpiBandChart";
import { EmptyState } from "@/components/EmptyState";

function slotLabel(position: number) {
  return `Quadrante ${position + 1}`;
}

export default async function MultigraficosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "dashboard");

  const [{ tab: requestedTabId }, ownerIds] = await Promise.all([searchParams, exportableOwnerIds(session.user)]);
  const [tabs, candidates] = await Promise.all([
    prisma.multiChartTab.findMany({
      where: { userId: session.user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.kpi.findMany({
      where: { ownerId: { in: ownerIds }, archivedAt: null },
      select: { id: true, name: true, owner: { select: { name: true } } },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    }),
  ]);

  const activeTab = tabs.find((tab) => tab.id === requestedTabId) ?? tabs[0] ?? null;
  const visibleKpiIds = new Set(candidates.map((candidate) => candidate.id));
  const activeSlots = normalizeMultiChartSlots(activeTab?.slots).filter((slot) => visibleKpiIds.has(slot.kpiId));
  const year = new Date().getFullYear();
  const charts = await buildMultigraficoData(kpiIdsFromMultiChartSlots(activeSlots), year, ownerIds);
  const chartsById = new Map(charts.map((chart) => [chart.id, chart]));
  const positions = Array.from({ length: MAX_MULTICHART_SLOTS }, (_, position) => position);

  return (
    <div className="flex flex-col gap-5 p-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-700)]">
            <LayoutGrid className="h-3.5 w-3.5" />
            Análise comparativa
          </div>
          <h1 className="page-title">Multigráficos</h1>
          <p className="page-subtitle">
            Monte abas pessoais com até {MAX_MULTICHART_SLOTS} indicadores lado a lado em {year}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="card flex min-w-0 flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold text-[var(--color-ink-900)]">Abas salvas</p>
              <p className="text-[11px] text-[var(--color-ink-400)]">Visões pessoais de comparação.</p>
            </div>
            <BarChart3 className="h-4 w-4 text-[var(--color-brand-700)]" />
          </div>

          {tabs.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-[var(--color-border)] p-3 text-[12px] text-[var(--color-ink-500)]">
              Crie uma aba para salvar sua primeira composição 2x2.
            </div>
          ) : (
            <nav className="flex flex-col gap-2" aria-label="Abas de multigráficos">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab?.id;
                return (
                  <div key={tab.id} className="flex items-center gap-2">
                    <Link
                      href={`/multigraficos?tab=${tab.id}`}
                      className={`min-w-0 flex-1 rounded-[8px] border px-3 py-2 text-[12px] font-semibold transition ${
                        isActive
                          ? "border-[var(--color-brand-700)] bg-[var(--color-brand-50)] text-[var(--color-brand-900)]"
                          : "border-[var(--color-border)] text-[var(--color-ink-600)] hover:border-[var(--color-brand-300)]"
                      }`}
                    >
                      <span className="block truncate">{tab.name}</span>
                    </Link>
                    {isActive && tabs.length > 1 && (
                      <form action={deleteMultiChartTab} noValidate>
                        <input type="hidden" name="tabId" value={tab.id} />
                        <button type="submit" className="btn btn-ghost px-2" aria-label={`Excluir aba ${tab.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </nav>
          )}

          <form action={createMultiChartTab} noValidate className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
            <label className="field-label" htmlFor="multi-tab-name">
              Nova aba
            </label>
            <div className="flex gap-2">
              <input
                id="multi-tab-name"
                name="name"
                maxLength={40}
                required
                placeholder="Ex.: Qualidade"
                className="input-field min-w-0 flex-1"
              />
              <button type="submit" className="btn btn-primary px-2.5" aria-label="Adicionar aba">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>
        </aside>

        <section className="min-w-0">
          {!activeTab ? (
            <div className="card">
              <EmptyState
                icon={BarChart3}
                title="Nenhuma aba criada"
                description="Crie uma aba à esquerda para começar a montar seus multigráficos."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {positions.map((position) => {
                const slot = activeSlots.find((item) => item.position === position);
                const chart = slot ? chartsById.get(slot.kpiId) : null;
                return (
                  <div key={position} className="card flex h-[360px] min-w-0 flex-col p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
                          {slotLabel(position)}
                        </p>
                        <h2 className="truncate text-[14px] font-semibold text-[var(--color-ink-900)]">
                          {chart?.name ?? "Escolha um indicador"}
                        </h2>
                        {chart && (
                          <p className="truncate text-[11px] text-[var(--color-ink-400)]">
                            {chart.metricUnit} · {chart.ownerName}
                          </p>
                        )}
                      </div>
                      {slot && (
                        <form action={clearMultiChartSlotAction} noValidate>
                          <input type="hidden" name="tabId" value={activeTab.id} />
                          <input type="hidden" name="position" value={position} />
                          <button type="submit" className="btn btn-ghost px-2" aria-label={`Remover ${slotLabel(position)}`}>
                            <X className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                    </div>

                    <form action={saveMultiChartSlot} noValidate className="mb-3 flex gap-2">
                      <input type="hidden" name="tabId" value={activeTab.id} />
                      <input type="hidden" name="position" value={position} />
                      <select name="kpiId" defaultValue={slot?.kpiId ?? ""} className="input-field min-w-0 flex-1" required>
                        <option value="" disabled>
                          Selecionar indicador
                        </option>
                        {candidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.name} · {candidate.owner.name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn btn-primary">
                        Salvar
                      </button>
                    </form>

                    <div className="min-h-0 flex-1">
                      {chart ? (
                        <KpiBandChart data={chart.bandData} />
                      ) : (
                        <EmptyState
                          compact
                          icon={BarChart3}
                          title="Quadrante livre"
                          description="Selecione um indicador para comparar meta, realizado e faixa verde."
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
