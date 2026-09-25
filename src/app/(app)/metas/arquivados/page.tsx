import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Archive } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule } from "@/lib/module-access";
import { purgeExpiredArchivedKpis, purgeEligibleAt, ARCHIVE_RETENTION_DAYS } from "@/lib/archive";
import { EmptyState } from "@/components/EmptyState";
import { ArchivedKpiRowActions } from "@/components/ArchivedKpiRowActions";

const df = new Intl.DateTimeFormat("pt-BR");

export default async function IndicadoresArquivadosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "measurements");
  // Archived indicators are admin-only — not even the original owner sees
  // this screen once one of theirs lands here.
  if (session.user.role !== "ADMIN") notFound();

  // Runs the retention rule on every visit rather than needing a separate
  // worker process: whoever opens this screen also sweeps anything that
  // crossed the 1-year mark since the last visit. Also exposed at
  // /api/cron/purge-archived for an external schedule.
  const purged = await purgeExpiredArchivedKpis(session.user.id);

  const kpis = await prisma.kpi.findMany({
    where: { archivedAt: { not: null } },
    orderBy: { archivedAt: "desc" },
    include: { owner: { select: { name: true } }, department: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-4 p-2">
      <div>
        <Link
          href="/metas"
          className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Metas e indicadores
        </Link>
        <h1 className="page-title">Indicadores arquivados</h1>
        <p className="page-subtitle">
          Visível só para administradores. Um indicador arquivado é excluído para sempre depois de{" "}
          {ARCHIVE_RETENTION_DAYS} dias sem ser restaurado.
        </p>
      </div>

      {purged > 0 && (
        <div className="rounded-lg bg-[var(--color-amber-100)] px-3 py-2 text-[12px] text-[var(--color-ink-700)]">
          {purged} indicador(es) que já passavam de {ARCHIVE_RETENTION_DAYS} dias arquivados foram excluídos
          definitivamente agora.
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="table-modern">
            <caption className="sr-only">Indicadores arquivados, com prazo de exclusão definitiva.</caption>
            <thead>
              <tr>
                <th scope="col">Indicador</th>
                <th scope="col">Responsável</th>
                <th scope="col">Arquivado em</th>
                <th scope="col">Exclusão definitiva em</th>
                <th scope="col" className="text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {kpis.length === 0 && (
                <tr>
                  <td colSpan={5} className="!p-0">
                    <EmptyState
                      icon={Archive}
                      title="Nenhum indicador arquivado"
                      description="Indicadores arquivados na tela de edição aparecem aqui, visíveis só para administradores, até serem restaurados ou excluídos automaticamente após um ano."
                    />
                  </td>
                </tr>
              )}
              {kpis.map((kpi) => (
                <tr key={kpi.id}>
                  <th scope="row">
                    <div className="text-[13px] font-medium text-[var(--color-ink-900)]">{kpi.name}</div>
                    <div className="text-[11px] text-[var(--color-ink-400)]">
                      {kpi.metricUnit}
                      {kpi.department && ` · ${kpi.department.name}`}
                    </div>
                  </th>
                  <td className="text-[12.5px]">{kpi.owner.name}</td>
                  <td className="text-[12.5px]">{kpi.archivedAt ? df.format(kpi.archivedAt) : "—"}</td>
                  <td className="text-[12.5px]">
                    {kpi.archivedAt ? df.format(purgeEligibleAt(kpi.archivedAt)) : "—"}
                  </td>
                  <td>
                    <ArchivedKpiRowActions kpiId={kpi.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
