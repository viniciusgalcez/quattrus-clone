import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowRight, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule } from "@/lib/module-access";
import { getKpiStatus, currentPeriod, periodLabel, STATUS_BADGE_CLASS, STATUS_LABEL } from "@/lib/kpi";
import { EmptyState } from "@/components/EmptyState";

export default async function EquipePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "dashboard");
  if (session.user.role !== "GESTOR" && session.user.role !== "ADMIN") notFound();

  const period = currentPeriod();

  const reports = await prisma.user.findMany({
    where: { subordinationsAsUser: { some: { managerId: session.user.id } } },
    include: {
      kpis: { where: { archivedAt: null }, include: { measurements: { where: { period } } } },
      _count: { select: { reports: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Minha equipe</h1>
        <p className="page-subtitle">
          Acompanhe os indicadores de cada colaborador vinculado a você — ciclo de{" "}
          {periodLabel(period)}.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="table-scroll"><table className="table-modern">
          <caption className="sr-only">
            Colaboradores liderados por você e o status dos indicadores de cada um.
          </caption>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Perfil</th>
              <th scope="col">Indicadores</th>
              <th scope="col" className="text-right">Painel</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 && (
              <tr>
                <td colSpan={4} className="!p-0">
                  <EmptyState
                    icon={Users}
                    title="Nenhum colaborador vinculado"
                    description="Esta tela lista quem responde a você e mostra, de relance, o status dos indicadores de cada pessoa — com atalho para abrir o painel dela. Um administrador precisa definir você como gestor dos colaboradores para eles aparecerem aqui."
                  />
                </td>
              </tr>
            )}
            {reports.map((user) => (
              <tr key={user.id}>
                <th scope="row">
                  <span className="font-medium text-[var(--color-ink-900)]">{user.name}</span>
                  {user._count.reports > 0 && (
                    <span className="ml-1.5 text-[11px] text-[var(--color-ink-400)]">
                      ({user._count.reports} liderados)
                    </span>
                  )}
                </th>
                <td className="text-[var(--color-ink-500)]">{user.role}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {user.kpis.map((kpi) => {
                      const m = kpi.measurements[0];
                      const status = m
                        ? getKpiStatus(m.goal, m.actual, kpi.direction, kpi.yellowRange, kpi.redRange)
                        : "SEM_DADO";
                      return (
                        // Name + label, so a row of chips says which indicator is
                        // off, not just how many colors are showing.
                        <span
                          key={kpi.id}
                          title={`${kpi.name}: ${STATUS_LABEL[status]}`}
                          className={`${STATUS_BADGE_CLASS[status]} max-w-[190px]`}
                        >
                          <span className="min-w-0 truncate">{kpi.name}</span>
                          <span className="opacity-70">· {STATUS_LABEL[status]}</span>
                        </span>
                      );
                    })}
                    {user.kpis.length === 0 && (
                      <span className="text-[12px] text-[var(--color-ink-400)]">
                        Sem indicadores no ciclo
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right">
                  <Link
                    href={`/?userId=${user.id}`}
                    aria-label={`Abrir painel de ${user.name}`}
                    className="inline-flex items-center gap-1 py-1.5 text-[12px] font-semibold text-[var(--color-brand-700)] hover:underline"
                  >
                    Abrir <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
