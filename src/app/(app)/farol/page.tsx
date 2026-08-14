import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { availableYears } from "@/lib/farol";
import { buildFarolTree } from "@/lib/farol-tree";
import { FarolTreeGrid } from "@/components/FarolTreeGrid";
import { EmptyState } from "@/components/EmptyState";

export default async function FarolPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

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

  const [tree, allPeriods] = await Promise.all([
    buildFarolTree(ownerIds, year),
    prisma.measurement.findMany({
      where: { kpi: { ownerId: { in: ownerIds } } },
      select: { period: true },
      distinct: ["period"],
    }),
  ]);

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
          <FarolTreeGrid rows={tree} year={year} />
        </div>
      )}
    </div>
  );
}
