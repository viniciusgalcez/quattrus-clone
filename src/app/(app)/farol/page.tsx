import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canView } from "@/lib/hierarchy";
import { availableYears, buildFarolRows, periodsOfYear } from "@/lib/farol";
import { FarolGrid } from "@/components/FarolGrid";
import { EmptyState } from "@/components/EmptyState";

export default async function FarolPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; userId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { ano, userId: queryUserId } = await searchParams;

  // Same fallback the dashboard uses: an unauthorized userId silently reverts
  // to your own panel rather than erroring.
  let viewedUserId = session.user.id;
  if (queryUserId && queryUserId !== session.user.id) {
    if (await canView(session.user.id, session.user.role, queryUserId)) {
      viewedUserId = queryUserId;
    }
  }

  const currentYear = new Date().getFullYear();
  const parsedYear = Number(ano);
  const year =
    Number.isInteger(parsedYear) && parsedYear >= 1900 && parsedYear <= currentYear + 1
      ? parsedYear
      : currentYear;

  const periods = periodsOfYear(year);
  const [viewedUser, kpis, allPeriods] = await Promise.all([
    prisma.user.findUnique({ where: { id: viewedUserId }, select: { name: true } }),
    prisma.kpi.findMany({
      where: { ownerId: viewedUserId, archivedAt: null },
      include: {
        owner: { select: { name: true } },
        measurements: {
          where: { period: { gte: periods[0], lte: periods[11] } },
          select: { id: true, period: true, goal: true, actual: true },
        },
      },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    }),
    prisma.measurement.findMany({
      where: { kpi: { ownerId: viewedUserId } },
      select: { period: true },
      distinct: ["period"],
    }),
  ]);

  const rows = buildFarolRows(kpis, year);
  const years = availableYears(
    allPeriods.map((p) => p.period),
    currentYear
  );
  const isOwnPanel = viewedUserId === session.user.id;

  const yearHref = (y: number) =>
    isOwnPanel ? `/farol?ano=${y}` : `/farol?ano=${y}&userId=${viewedUserId}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">
            {isOwnPanel ? "Farol" : `Farol de ${viewedUser?.name ?? "usuário"}`}
          </h1>
          <p className="page-subtitle">
            Gestão à vista — o ano inteiro de cada indicador em uma tela.
          </p>
        </div>

        <nav aria-label="Selecionar ano" className="flex flex-wrap items-center gap-1">
          {years.map((y) => (
            <Link
              key={y}
              href={yearHref(y)}
              aria-current={y === year ? "page" : undefined}
              className={y === year ? "btn btn-primary" : "btn"}
            >
              {y}
            </Link>
          ))}
        </nav>
      </div>

      {rows.length === 0 ? (
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
          <FarolGrid rows={rows} year={year} />
        </div>
      )}
    </div>
  );
}
