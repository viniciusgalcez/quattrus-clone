import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKpiStatus, periodLabel, STATUS_BADGE_CLASS, STATUS_LABEL, STATUS_RAIL_CLASS } from "@/lib/kpi";
import { canView } from "@/lib/hierarchy";
import { KpiBandChart } from "@/components/KpiBandChart";
import type { BandPoint } from "@/lib/farol-tree";
import { EmptyState } from "@/components/EmptyState";
import { DuplicateKpiForm } from "@/components/DuplicateKpiForm";

const DIRECTION_LABEL: Record<string, string> = {
  MORE: "Maior",
  LESS: "Menor",
  EQUAL: "Igual",
};

export default async function KpiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const kpi = await prisma.kpi.findUnique({
    where: { id },
    include: {
      owner: true,
      measurements: { orderBy: { period: "asc" } },
    },
  });

  if (!kpi) notFound();

  const allowed = await canView(session.user.id, session.user.role, kpi.ownerId);
  if (!allowed) notFound();

  const bandData: BandPoint[] = kpi.measurements.slice(-12).map((m) => {
    const tolerance = (m.goal * kpi.yellowRange) / 100;
    return {
      name: periodLabel(m.period),
      meta: m.goal,
      realizado: m.actual,
      faixaBase: m.goal - tolerance,
      faixaAltura: tolerance * 2,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/metas"
            className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Metas e indicadores
          </Link>
          <h1 className="page-title">{kpi.name}</h1>
        </div>
        {(session.user.id === kpi.ownerId || session.user.role === "ADMIN") && (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/metas/${kpi.id}/editar`} className="btn">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Link>
            <DuplicateKpiForm kpiId={kpi.id} isAdmin={session.user.role === "ADMIN"} />
          </div>
        )}
      </div>

      <div className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <div>
          <div className="field-label">Responsável</div>
          <div className="mt-1 text-[13px] text-[var(--color-ink-900)]">{kpi.owner.name}</div>
        </div>
        <div>
          <div className="field-label">Unidade</div>
          <div className="mt-1 text-[13px] text-[var(--color-ink-900)]">{kpi.metricUnit}</div>
        </div>
        <div>
          <div className="field-label">Peso</div>
          <div className="font-mono-num mt-1 text-[13px] text-[var(--color-ink-900)]">{kpi.weight}%</div>
        </div>
        <div>
          <div className="field-label">Bom quando</div>
          <div className="mt-1 text-[13px] text-[var(--color-ink-900)]">{DIRECTION_LABEL[kpi.direction]}</div>
        </div>
        {kpi.description && (
          <p className="col-span-2 sm:col-span-4 text-[12.5px] text-[var(--color-ink-500)]">
            {kpi.description}
          </p>
        )}
      </div>

      <div className="card flex flex-col">
        <div className="card-header">Histórico</div>
        <div className="h-[280px] p-4">
          <KpiBandChart data={bandData} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">Medições</div>
        <div className="table-scroll">
          <table className="table-modern">
            <caption className="sr-only">Histórico de medições de {kpi.name}.</caption>
            <thead>
              <tr>
                <th scope="col">Período</th>
                <th scope="col" className="num">
                  Previsto
                </th>
                <th scope="col" className="num">
                  Realizado
                </th>
                <th scope="col" className="text-right">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {kpi.measurements.length === 0 && (
                <tr>
                  <td colSpan={4} className="!p-0">
                    <EmptyState
                      icon={CalendarClock}
                      title="Nenhuma medição lançada"
                      description="O histórico deste indicador começa no primeiro lançamento. Informe previsto e realizado do mês na tela de metas para que o gráfico e o farol passem a funcionar."
                      actions={[{ href: "/metas", label: "Lançar medição" }]}
                    />
                  </td>
                </tr>
              )}
              {[...kpi.measurements].reverse().map((m) => {
                const status = getKpiStatus(m.goal, m.actual, kpi.direction, kpi.yellowRange, kpi.redRange);
                return (
                  <tr key={m.id}>
                    <th scope="row" className={STATUS_RAIL_CLASS[status]}>
                      {periodLabel(m.period)}
                    </th>
                    <td className="num">
                      {m.goal} {kpi.metricUnit}
                    </td>
                    <td className="num">
                      {m.actual !== null ? `${m.actual} ${kpi.metricUnit}` : "—"}
                    </td>
                    <td className="text-right">
                      <span className={STATUS_BADGE_CLASS[status]}>{STATUS_LABEL[status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
