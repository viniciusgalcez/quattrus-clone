import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { availableYears, visibleMonthIndexes } from "@/lib/farol";
import { currentPeriod } from "@/lib/kpi";
import { buildFarolTree } from "@/lib/farol-tree";
import {
  countFarolTabMatches,
  FAROL_TAB_LABEL,
  filterFarolTreeByTab,
  parseFarolTab,
  type FarolTab,
} from "@/lib/farol-tabs";
import { FarolTreeGrid } from "@/components/FarolTreeGrid";
import { EmptyState } from "@/components/EmptyState";
import { assertPageModule } from "@/lib/module-access";

export default async function FarolPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; aba?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "dashboard");

  const { ano, aba } = await searchParams;
  const activeTab = parseFarolTab(aba);

  const currentYear = new Date().getFullYear();
  const parsedYear = Number(ano);
  const year =
    Number.isInteger(parsedYear) && parsedYear >= 1900 && parsedYear <= currentYear + 1
      ? parsedYear
      : currentYear;

  // Self plus everyone below in the hierarchy (all of it for an admin) — the
  // same rollup /desdobramento uses, so a manager's farol reads as one tree
  // instead of switching between separate per-person panels.
  const ownerIds = await exportableOwnerIds(session.user);
  const period = currentPeriod();

  const [delegations, facilitated, allPeriods, preference] = await Promise.all([
    prisma.kpiDelegation.findMany({ where: { delegateId: session.user.id }, select: { kpiId: true } }),
    prisma.facilitation.findMany({ where: { facilitatorId: session.user.id }, select: { facilitatedId: true } }),
    prisma.measurement.findMany({
      where: { kpi: { ownerId: { in: ownerIds } } },
      select: { period: true },
      distinct: ["period"],
    }),
    prisma.userPreference.findUnique({
      where: { userId: session.user.id },
      select: {
        dashboardMonths: true,
        blankMonths: true,
        basePeriod: true,
        showDelegated: true,
        showTeamReds: true,
      },
    }),
  ]);

  const showDelegated = preference?.showDelegated ?? true;
  const showTeamReds = preference?.showTeamReds ?? true;
  const delegatedKpiIds = showDelegated ? delegations.map((delegation) => delegation.kpiId) : [];
  const facilitatedOwnerIds = facilitated.map((relation) => relation.facilitatedId);
  const rollupOwnerIds = [...new Set([...ownerIds, ...facilitatedOwnerIds])];

  // Preferências controlam se as abas extras aparecem — não misturam tudo na
  // árvore principal (paridade Quattrus: sub-abas Meus / Auxiliares / …).
  if (activeTab === "delegados" && !showDelegated) {
    redirect(`/farol?ano=${year}&aba=meus`);
  }
  if (activeTab === "vermelhos" && !showTeamReds) {
    redirect(`/farol?ano=${year}&aba=meus`);
  }

  const editableKpiIds =
    session.user.role === "ADMIN"
      ? (await prisma.kpi.findMany({ where: { archivedAt: null }, select: { id: true } })).map((kpi) => kpi.id)
      : [
          ...(
            await prisma.kpi.findMany({
              where: { archivedAt: null, ownerId: { in: [session.user.id, ...facilitatedOwnerIds] } },
              select: { id: true },
            })
          ).map((kpi) => kpi.id),
          ...delegatedKpiIds,
        ];

  const monthIndexes = visibleMonthIndexes({
    year,
    dashboardMonths: preference?.dashboardMonths ?? 12,
    blankMonths: preference?.blankMonths ?? 0,
    basePeriod: preference?.basePeriod,
    fallbackPeriod: period,
  });

  const fullTree = await buildFarolTree(rollupOwnerIds, year, delegatedKpiIds);
  const tabOpts = {
    userId: session.user.id,
    ownerIds: new Set(rollupOwnerIds),
    delegatedKpiIds: new Set(delegatedKpiIds),
    currentPeriod: period,
  };

  const visibleTabs: FarolTab[] = [
    "meus",
    "auxiliares",
    ...(showDelegated ? (["delegados"] as const) : []),
    ...(showTeamReds ? (["vermelhos"] as const) : []),
  ];

  const tabCounts = Object.fromEntries(
    visibleTabs.map((tab) => [tab, countFarolTabMatches(fullTree, tab, tabOpts)])
  ) as Record<FarolTab, number>;

  const tree = filterFarolTreeByTab(fullTree, activeTab, tabOpts);
  const years = availableYears(
    allPeriods.map((p) => p.period),
    currentYear
  );

  const emptyCopy: Record<FarolTab, { title: string; description: string }> = {
    meus: {
      title: "Nenhum item de controle",
      description:
        "O farol mostra os 12 meses de cada indicador lado a lado. Cadastre um indicador (não auxiliar) para começar.",
    },
    auxiliares: {
      title: "Nenhum item auxiliar",
      description: "Itens marcados como auxiliar no cadastro aparecem nesta aba e não entram no % principal.",
    },
    delegados: {
      title: "Nenhum item delegado",
      description: "Quando alguém delegar um indicador para você, ele aparece aqui para lançamento.",
    },
    vermelhos: {
      title: "Nenhum vermelho na equipe",
      description: "Indicadores da equipe fora da meta (vermelho/crítico) neste ciclo aparecem nesta aba.",
    },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">
            {FAROL_TAB_LABEL[activeTab]}
            <span className="ml-2 text-[14px] font-medium text-[var(--color-ink-400)]">
              | {tabCounts[activeTab] ?? 0}
            </span>
          </h1>
          <p className="page-subtitle">
            Gestão à vista — o ano inteiro de cada indicador, com sua equipe aninhada por baixo.
          </p>
        </div>

        <nav aria-label="Selecionar ano" className="flex flex-wrap items-center gap-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/farol?ano=${y}&aba=${activeTab}`}
              aria-current={y === year ? "page" : undefined}
              className={y === year ? "btn btn-primary" : "btn"}
            >
              {y}
            </Link>
          ))}
        </nav>
      </div>

      <nav
        aria-label="Visões do farol"
        className="flex flex-wrap gap-1 border-b border-[var(--color-border)] pb-px"
      >
        {visibleTabs.map((tab) => {
          const href = `/farol?ano=${year}&aba=${tab}`;
          const current = tab === activeTab;
          return (
            <Link
              key={tab}
              href={href}
              aria-current={current ? "page" : undefined}
              className={
                current
                  ? "-mb-px border-b-2 border-[var(--color-brand-600)] px-3 py-2 text-[12.5px] font-semibold text-[var(--color-brand-700)]"
                  : "px-3 py-2 text-[12.5px] font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
              }
            >
              {FAROL_TAB_LABEL[tab]}
              <span className="ml-1.5 tabular-nums text-[11px] text-[var(--color-ink-400)]">
                {tabCounts[tab] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      {tree.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={LayoutGrid}
            title={emptyCopy[activeTab].title}
            description={emptyCopy[activeTab].description}
            actions={
              activeTab === "meus" || activeTab === "auxiliares"
                ? [{ href: "/metas/novo", label: "Cadastrar meta" }]
                : []
            }
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <FarolTreeGrid
            rows={tree}
            year={year}
            currentPeriod={period}
            editableKpiIds={[...new Set(editableKpiIds)]}
            visibleMonthIndexes={monthIndexes}
          />
        </div>
      )}
    </div>
  );
}
