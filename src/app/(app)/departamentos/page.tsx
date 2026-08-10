import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentPeriod, getKpiStatus, periodLabel, STATUS_BADGE_CLASS, STATUS_LABEL, type KpiStatus } from "@/lib/kpi";
import { getSubordinateIds } from "@/lib/hierarchy";
import { EmptyState } from "@/components/EmptyState";
import { Bolinha } from "@/components/Bolinha";

export default async function DepartamentosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "GESTOR" && session.user.role !== "ADMIN") notFound();

  const period = currentPeriod();
  const isAdmin = session.user.role === "ADMIN";

  // A GESTOR may only see their own hierarchy — the role check alone would
  // hand every manager the whole company's numbers, including their own
  // manager's, which `canView` explicitly denies everywhere else.
  const visibleOwnerIds = isAdmin
    ? null
    : [session.user.id, ...(await getSubordinateIds(session.user.id))];

  const departments = await prisma.department.findMany({
    where: visibleOwnerIds ? { users: { some: { id: { in: visibleOwnerIds } } } } : {},
    orderBy: { name: "asc" },
    include: {
      users: visibleOwnerIds
        ? { where: { id: { in: visibleOwnerIds } }, select: { id: true } }
        : { select: { id: true } },
      kpis: {
        where: {
          archivedAt: null,
          ...(visibleOwnerIds ? { ownerId: { in: visibleOwnerIds } } : {}),
        },
        include: { measurements: { where: { period } } },
      },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Departamentos</h1>
        <p className="page-subtitle">
          Desempenho consolidado por área — {periodLabel(period)}.
        </p>
      </div>

      {departments.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Building2}
            title="Nenhum departamento a exibir"
            description={
              isAdmin
                ? "Esta tela agrupa os indicadores por área e mostra quantos estão no alvo em cada uma. Cadastre departamentos e vincule os colaboradores a eles para ver o consolidado."
                : "Esta tela agrupa por área os indicadores da sua equipe. Assim que houver colaboradores vinculados a um departamento sob sua gestão, o consolidado aparece aqui."
            }
            actions={isAdmin ? [{ href: "/usuarios", label: "Administrar usuários" }] : []}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => {
          const counts: Record<string, number> = {};
          for (const kpi of dept.kpis) {
            const m = kpi.measurements[0];
            // Recomputed from current thresholds, not the stored column, so
            // this agrees with the dashboard after a KPI's ranges are edited.
            const status: KpiStatus = m
              ? getKpiStatus(m.goal, m.actual, kpi.direction, kpi.yellowRange, kpi.redRange)
              : "SEM_DADO";
            counts[status] = (counts[status] ?? 0) + 1;
          }
          const total = dept.kpis.length;
          const green = counts["VERDE"] ?? 0;
          // Same denominator as the dashboard: only KPIs with a measurement
          // this period count, so an unreported indicator doesn't read as a miss.
          const measured = total - (counts["SEM_DADO"] ?? 0);
          const pct = measured > 0 ? Math.round((green / measured) * 100) : 0;

          return (
            <div key={dept.id} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-[15px] font-bold text-[var(--color-ink-900)]">
                    {dept.name}
                  </h2>
                  <p className="text-[11.5px] text-[var(--color-ink-400)]">
                    {dept.users.length} pessoa(s) · {total} indicador(es)
                  </p>
                </div>
                {/* No measurement this cycle means "unknown", not "zero percent". */}
                <div className="text-right">
                  <div className="font-mono-num text-[22px] font-semibold text-[var(--color-brand-700)]">
                    {measured > 0 ? `${pct}%` : "—"}
                  </div>
                  <div className="text-[10.5px] text-[var(--color-ink-400)]">no alvo</div>
                </div>
              </div>

              {total === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] px-3 py-2.5">
                  <p className="text-[12px] font-medium text-[var(--color-ink-700)]">
                    Sem indicadores vinculados
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--color-ink-500)]">
                    Ninguém desta área tem metas cadastradas para o ciclo, então não há o que
                    consolidar aqui ainda.
                  </p>
                  <Link
                    href="/equipe"
                    className="mt-1.5 inline-block text-[11.5px] font-semibold text-[var(--color-brand-700)] hover:underline"
                  >
                    Ver equipe
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(["AZUL", "VERDE", "AMARELO", "VERMELHO", "CRITICO", "SEM_DADO"] as KpiStatus[])
                    .filter((s) => counts[s])
                    .map((s) => (
                      <div key={s} className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-2 py-1 text-[11px] font-medium text-[var(--color-ink-700)]">
                        <Bolinha status={s} showLabel={false} />
                        {counts[s]} {STATUS_LABEL[s]}
                      </div>
                    ))}
                </div>
              )}

              {dept.kpis.length > 0 && (
                <ul className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-2">
                  {dept.kpis.slice(0, 4).map((kpi) => (
                    <li key={kpi.id}>
                      <Link
                        href={`/metas/${kpi.id}`}
                        className="text-[12px] text-[var(--color-brand-700)] hover:underline"
                      >
                        {kpi.name}
                      </Link>
                    </li>
                  ))}
                  {dept.kpis.length > 4 && (
                    <li className="text-[11.5px] text-[var(--color-ink-400)]">
                      + {dept.kpis.length - 4} outro(s) indicador(es)
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
