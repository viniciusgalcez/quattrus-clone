import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule } from "@/lib/module-access";
import { periodLabel } from "@/lib/kpi";
import { canView } from "@/lib/hierarchy";
import { EmptyState } from "@/components/EmptyState";

const STATUS_LABEL: Record<string, string> = {
  ABERTO: "Aberto",
  CONCLUIDO: "Concluído",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  ABERTO: "badge badge-amarelo",
  CONCLUIDO: "badge badge-verde",
};

export default async function KpiActionPlansPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Plano de ação (FCA) lives under the "tasks" module in the profile matrix,
  // same as /fca/[measurementId] — not "measurements", which only covers the
  // item/measurement views themselves.
  assertPageModule(session.user, "tasks");

  const { id } = await params;

  const kpi = await prisma.kpi.findUnique({ where: { id }, select: { id: true, name: true, ownerId: true, archivedAt: true } });
  if (!kpi) notFound();

  const allowed = await canView(session.user.id, session.user.role, kpi.ownerId);
  if (!allowed) notFound();
  if (kpi.archivedAt && session.user.role !== "ADMIN") notFound();

  const plans = await prisma.actionPlan.findMany({
    where: { kpiId: kpi.id },
    include: { measurement: { select: { period: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={`/metas/${kpi.id}`}
          className="mb-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--color-brand-700)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> {kpi.name}
        </Link>
        <h1 className="page-title">Planos de ação — {kpi.name}</h1>
        <p className="page-subtitle">Todo FCA aberto ou concluído registrado para este indicador.</p>
      </div>

      <div className="card overflow-hidden">
        {plans.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhum plano de ação"
            description="Um FCA aparece aqui assim que for aberto a partir de uma medição fora da meta deste indicador."
          />
        ) : (
          <div className="table-scroll">
            <table className="table-modern">
              <caption className="sr-only">Planos de ação de {kpi.name}.</caption>
              <thead>
                <tr>
                  <th scope="col">Período</th>
                  <th scope="col">Fato</th>
                  <th scope="col" className="text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id}>
                    <th scope="row">
                      <Link href={`/fca/${plan.measurementId}`} className="text-[var(--color-brand-700)] hover:underline">
                        {periodLabel(plan.measurement.period)}
                      </Link>
                    </th>
                    <td className="max-w-[420px] truncate" title={plan.fact}>
                      {plan.fact}
                    </td>
                    <td className="text-right">
                      <span className={STATUS_BADGE_CLASS[plan.status]}>{STATUS_LABEL[plan.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
