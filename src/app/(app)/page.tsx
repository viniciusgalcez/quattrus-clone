import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Target,
  TriangleAlert,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getDeviationPct,
  getKpiStatus,
  currentPeriod,
  periodLabel,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  STATUS_RAIL_CLASS,
  type KpiStatus,
} from "@/lib/kpi";
import { canView, exportableOwnerIds } from "@/lib/hierarchy";
import { DashboardCharts, type ChartPoint } from "@/components/DashboardCharts";
import { StatusMeter } from "@/components/StatusMeter";
import { EmptyState } from "@/components/EmptyState";
import { JumpToSection } from "@/components/JumpToSection";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { userId: queryUserId } = await searchParams;

  let viewedUserId = session.user.id;
  if (queryUserId && queryUserId !== session.user.id) {
    const allowed = await canView(session.user.id, session.user.role, queryUserId);
    if (!allowed) notFound();
    viewedUserId = queryUserId;
  }

  const viewedUser = await prisma.user.findUnique({ where: { id: viewedUserId } });
  if (!viewedUser || !viewedUser.active) notFound();
  const period = currentPeriod();
  const isOwnPanel = viewedUserId === session.user.id;
  const preference = await prisma.userPreference.findUnique({
    where: { userId: session.user.id },
    select: { showTeamReds: true },
  });

  const kpis = await prisma.kpi.findMany({
    where: { ownerId: viewedUserId, archivedAt: null },
    include: { measurements: { orderBy: { period: "desc" }, take: 6 } },
    orderBy: { priority: "asc" },
  });

  let green = 0;
  let yellow = 0;
  let red = 0;
  let critical = 0;

  for (const kpi of kpis) {
    const current = kpi.measurements.find((m) => m.period === period) ?? null;
    const status = current
      ? getKpiStatus(current.goal, current.actual, kpi.direction, kpi.yellowRange, kpi.redRange)
      : "SEM_DADO";

    if (status === "VERDE") green++;
    else if (status === "AMARELO") yellow++;
    else if (status === "VERMELHO") red++;
    else if (status === "CRITICO") critical++;
  }

  const totalComMedicao = green + yellow + red + critical;
  const metasAtingidasPct = totalComMedicao > 0 ? Math.round((green / totalComMedicao) * 100) : 0;
  const score = totalComMedicao > 0
    ? ((green * 10 + yellow * 5) / totalComMedicao).toFixed(1)
    : "0.0";

  const showTeamReds = isOwnPanel && (preference?.showTeamReds ?? true);
  const fcaOwnerIds = showTeamReds ? await exportableOwnerIds(session.user) : [viewedUserId];

  const [planosConcluidos, fcaAbertos] = await Promise.all([
    prisma.actionPlan.count({ where: { kpi: { ownerId: viewedUserId }, status: "CONCLUIDO" } }),
    prisma.actionPlan.findMany({
      where: { kpi: { ownerId: { in: fcaOwnerIds } }, status: "ABERTO" },
      include: { measurement: true, kpi: { include: { owner: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const fcaPendentes = fcaAbertos.length;

  const periodSet = new Set<string>();
  kpis.forEach((k) => k.measurements.forEach((m) => periodSet.add(m.period)));
  const periods = Array.from(periodSet).sort().slice(-6);

  const chartData: ChartPoint[] = periods.map((p) => {
    let goalSum = 0;
    let actualSum = 0;
    kpis.forEach((k) => {
      const m = k.measurements.find((mm) => mm.period === p);
      if (m) {
        goalSum += m.goal;
        if (m.actual !== null) actualSum += m.actual;
      }
    });
    return { name: periodLabel(p), Previsto: goalSum, Realizado: actualSum };
  });

  // Presentation-only derivations from the data already fetched above.
  const statusCounts: Record<KpiStatus, number> = {
    VERDE: green,
    AMARELO: yellow,
    VERMELHO: red,
    CRITICO: critical,
    SEM_DADO: kpis.length - totalComMedicao,
  };
  // "Precisa de atenção" mirrors the "FCA pendentes" count above it, so it
  // lists every open action plan — not just this month's deviations. An FCA
  // opened last month stays listed here (and counted there) until someone
  // resolves it, even if the KPI happens to be back on target this month.
  const desviosParaAtencao = fcaAbertos.map((plan) => ({
    kpiId: plan.kpiId,
    measurementId: plan.measurementId,
    name: plan.kpi.name,
    ownerName: plan.kpi.owner.name,
    deviation: getDeviationPct(plan.measurement.goal, plan.measurement.actual, plan.kpi.direction),
    status: getKpiStatus(
      plan.measurement.goal,
      plan.measurement.actual,
      plan.kpi.direction,
      plan.kpi.yellowRange,
      plan.kpi.redRange
    ),
  }));
  // Worst first: deviation is negative for a miss, so ascending puts the
  // indicator that needs attention today at the top of the list.
  const desviosOrdenados = [...desviosParaAtencao].sort(
    (a, b) => (a.deviation ?? 0) - (b.deviation ?? 0)
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="dashboard-hero flex flex-wrap items-end justify-between gap-5 px-5 py-5 sm:px-7 sm:py-6">
        <div className="relative z-[1]">
          <div className="dashboard-kicker">Capri Gestiona · cockpit de performance</div>
          <h1 className="mt-1 font-display text-[25px] font-bold tracking-[-0.02em] text-[var(--color-ink-900)]">
            {isOwnPanel ? "Seu painel" : `Painel de ${viewedUser?.name ?? "usuário"}`}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--color-ink-500)]">
            Acompanhamento de indicadores — {periodLabel(period)}
          </p>
        </div>
        {!isOwnPanel && (
          <Link
            href="/"
            className="dashboard-back-link btn relative z-[1] border-[#b8cbe5] bg-white/70 text-[var(--color-brand-700)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao meu painel
          </Link>
        )}
      </div>

      {/* "Como estou" — one hero figure, then the distribution that explains it. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <section className="card metric-card min-w-0 flex flex-col gap-4 p-5 lg:col-span-2" style={{ "--metric-color": "var(--color-brand-600)" } as React.CSSProperties}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="field-label">Score do ciclo</h2>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="stat-value stat-hero text-[var(--color-brand-700)]">{score}</span>
                <span className="font-mono-num text-[15px] font-semibold text-[var(--color-ink-400)]">
                  /10
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-[var(--color-ink-500)]">
                Média ponderada dos indicadores medidos neste mês.
              </p>
            </div>
            <div className="text-right">
              <h2 className="field-label">Metas atingidas</h2>
              <div className="stat-value mt-1 text-[32px] text-[var(--color-ink-900)]">
                {metasAtingidasPct}%
              </div>
              <p className="mt-1 text-[11.5px] text-[var(--color-ink-500)]">
                <span className="font-mono-num font-semibold text-[var(--color-ink-700)]">
                  {green}
                </span>{" "}
                de{" "}
                <span className="font-mono-num font-semibold text-[var(--color-ink-700)]">
                  {totalComMedicao}
                </span>{" "}
                no alvo
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <StatusMeter counts={statusCounts} />
          </div>
        </section>

        {/* "O que está quebrado" — the only place on the screen allowed to be loud. */}
        <div className="flex flex-col gap-3">
          {fcaPendentes > 0 ? (
            <JumpToSection
              targetId="desvios"
              aria-label={`${fcaPendentes} plano(s) de ação em aberto. Ver indicadores fora da meta.`}
              className="card tile-urgent group flex flex-1 flex-col justify-between p-5 transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="field-label text-[var(--color-accent-600)]">FCA pendentes</div>
                  <div className="stat-value mt-1.5 text-[34px] text-[var(--color-accent-600)]">
                    {fcaPendentes}
                  </div>
                </div>
                <TriangleAlert
                  className="h-5 w-5 shrink-0 text-[var(--color-accent-600)]"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 text-[12px] leading-snug text-[var(--color-ink-700)]">
                Plano(s) de ação em aberto aguardando conclusão.
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-accent-600)]">
                Ver indicadores fora da meta
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </JumpToSection>
          ) : (
            <div className="card tile-calm status-live flex flex-1 flex-col justify-between p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="field-label text-[var(--color-green-600)]">FCA pendentes</div>
                  <div className="stat-value mt-1.5 text-[34px] text-[var(--color-green-600)]">
                    0
                  </div>
                </div>
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-[var(--color-green-600)]"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 text-[12px] leading-snug text-[var(--color-ink-700)]">
                Nenhum plano de ação em aberto. Nada exige sua atenção agora.
              </p>
            </div>
          )}

          <div className="card flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-green-100)]">
              <ClipboardCheck className="h-4 w-4 text-[var(--color-green-600)]" aria-hidden="true" />
            </div>
            <div>
              <div className="field-label">Planos concluídos</div>
              <div className="stat-value text-[18px] text-[var(--color-ink-900)]">
                {planosConcluidos}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <section id="desvios" className="card min-w-0 flex flex-col lg:col-span-2">
          <div className="card-header">
            <span>Precisa de atenção</span>
            {desviosOrdenados.length > 0 && (
              <span className="font-mono-num text-[11px] font-bold text-[var(--color-ink-400)]">
                {desviosOrdenados.length}
              </span>
            )}
          </div>

          {desviosOrdenados.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nenhum desvio neste ciclo"
              description="Todos os indicadores com medição lançada estão no alvo. Se algum ficar fora da meta, ele aparece aqui com atalho para abrir o FCA."
              actions={[{ href: "/metas", label: "Ver indicadores", variant: "ghost" }]}
              compact
            />
          ) : (
            <ul className="flex flex-col">
              {desviosOrdenados.map((item) => (
                <li key={item.kpiId} className="border-b border-[var(--color-border)] last:border-0">
                  <Link
                    href={`/fca/${item.measurementId}`}
                    className={`${STATUS_RAIL_CLASS[item.status]} flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-brand-50)]`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-[var(--color-ink-900)]">
                        {item.name}
                      </div>
                      {showTeamReds && item.ownerName !== viewedUser.name && (
                        <div className="truncate text-[10.5px] text-[var(--color-ink-400)]">
                          Responsável: {item.ownerName}
                        </div>
                      )}
                      <span className={`${STATUS_BADGE_CLASS[item.status]} mt-1`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-right">
                      <div>
                        <div className="stat-value text-[15px] text-[var(--color-ink-900)]">
                          {item.deviation !== null ? `${item.deviation.toFixed(1)}%` : "—"}
                        </div>
                        <div className="text-[10.5px] text-[var(--color-ink-400)]">vs. meta</div>
                      </div>
                      <ArrowRight
                        className="h-3.5 w-3.5 text-[var(--color-ink-400)]"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card min-w-0 flex flex-col lg:col-span-3">
          <div className="card-header">
            <span>Acompanhamento mensal</span>
            <span className="text-[11px] font-medium text-[var(--color-ink-400)]">
              Soma de todos os indicadores
            </span>
          </div>
          <div className="h-[280px] p-4">
            <DashboardCharts data={chartData} />
          </div>
        </section>
      </div>

      {kpis.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Target}
            title="Nenhum indicador cadastrado"
            description={
              isOwnPanel
                ? "Este painel resume seus indicadores do mês: score, metas no alvo e desvios que precisam de FCA. Cadastre a primeira meta para começar a acompanhar."
                : "Este colaborador ainda não tem indicadores cadastrados para o ciclo."
            }
            actions={isOwnPanel ? [{ href: "/metas/novo", label: "Cadastrar meta" }] : []}
          />
        </div>
      )}
    </div>
  );
}
