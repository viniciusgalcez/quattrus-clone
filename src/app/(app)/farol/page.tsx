import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { availableYears, visibleMonthIndexes } from "@/lib/farol";
import { currentPeriod } from "@/lib/kpi";
import { buildFarolTree } from "@/lib/farol-tree";
import { FarolTreeGrid } from "@/components/FarolTreeGrid";
import { EmptyState } from "@/components/EmptyState";
import { assertPageModule } from "@/lib/module-access";

export default async function FarolPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "dashboard");

  const { ano } = await searchParams;

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
      select: { dashboardMonths: true, blankMonths: true, basePeriod: true, showDelegated: true },
    }),
  ]);
  const delegatedKpiIds = (preference?.showDelegated ?? true) ? delegations.map((delegation) => delegation.kpiId) : [];
  const facilitatedOwnerIds = facilitated.map((relation) => relation.facilitatedId);
  const editableKpiIds = session.user.role === "ADMIN"
    ? (await prisma.kpi.findMany({ where: { archivedAt: null }, select: { id: true } })).map((kpi) => kpi.id)
    : [
        ...(await prisma.kpi.findMany({ where: { archivedAt: null, ownerId: { in: [session.user.id, ...facilitatedOwnerIds] } }, select: { id: true } })).map((kpi) => kpi.id),
        ...delegatedKpiIds,
      ];
  const monthIndexes = visibleMonthIndexes({
    year,
    dashboardMonths: preference?.dashboardMonths ?? 12,
    blankMonths: preference?.blankMonths ?? 0,
    basePeriod: preference?.basePeriod,
    fallbackPeriod: currentPeriod(),
  });
  const tree = await buildFarolTree([...ownerIds, ...facilitatedOwnerIds], year, delegatedKpiIds);

  const years = availableYears(
    allPeriods.map((p) => p.period),
    currentYear
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Meus itens de controle</h1>
          <p className="page-subtitle">
            Gestão à vista — o ano inteiro de cada indicador, com sua equipe aninhada por baixo.
          </p>
        </div>

        <nav aria-label="Selecionar ano" className="flex flex-wrap items-center gap-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/farol?ano=${y}`}
              aria-current={y === year ? "page" : undefined}
              className={y === year ? "btn btn-primary" : "btn"}
            >
              {y}
            </Link>
          ))}
        </nav>
      </div>

      {tree.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={LayoutGrid}
            title="Nenhum indicador para exibir"
            description="O farol mostra os 12 meses de cada indicador lado a lado, com o semáforo de cada mês. Cadastre um indicador para começar a acompanhar."
            actions={[{ href: "/metas/novo", label: "Cadastrar meta" }]}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <FarolTreeGrid
            rows={tree}
            year={year}
            currentPeriod={currentPeriod()}
            editableKpiIds={[...new Set(editableKpiIds)]}
            visibleMonthIndexes={monthIndexes}
          />
        </div>
      )}
    </div>
  );
}
