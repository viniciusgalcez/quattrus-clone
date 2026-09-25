import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { periodLabel } from "@/lib/kpi";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { EmptyState } from "@/components/EmptyState";
import { ApproveGoalButton } from "@/components/ApproveGoalButton";
import { ApproveAllGoalsButton } from "@/components/ApproveAllGoalsButton";
import { assertPageModule } from "@/lib/module-access";

export default async function AprovacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "approvals");
  if (session.user.role === "COLABORADOR") redirect("/");

  const ownerIds = (await exportableOwnerIds(session.user)).filter((id) => id !== session.user.id);

  const pending = ownerIds.length
    ? await prisma.measurement.findMany({
        where: {
          goalApprovalStatus: "PENDENTE",
          kpi: { ownerId: { in: ownerIds }, archivedAt: null },
        },
        include: { kpi: { include: { owner: { select: { name: true } } } } },
        orderBy: [{ period: "desc" }],
      })
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
        <h1 className="page-title">Aprovação de metas</h1>
        <p className="page-subtitle">
          Metas definidas pela sua equipe que ainda precisam da sua aprovação.
        </p>
        </div>
        <ApproveAllGoalsButton count={pending.length} />
      </div>

      <nav className="flex gap-2 border-b border-[var(--color-border)]" aria-label="Tipos de aprovação">
        <a className="btn btn-primary" href="/aprovacoes">Metas</a>
        <a className="btn btn-ghost" href="/aprovacoes/previsoes">Previsões</a>
      </nav>

      <div className="card overflow-hidden">
        {pending.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nenhuma meta pendente"
            description="Quando alguém da sua equipe definir ou alterar uma meta, ela aparece aqui até você aprovar."
          />
        ) : (
          <div className="table-scroll">
            <table className="table-modern min-w-[680px]">
              <caption className="sr-only">Metas aguardando aprovação.</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Responsável</th>
                  <th scope="col">Período</th>
                  <th scope="col" className="num">
                    Meta
                  </th>
                  <th scope="col" className="text-right">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((m) => (
                  <tr key={m.id}>
                    <th scope="row">{m.kpi.name}</th>
                    <td>{m.kpi.owner.name}</td>
                    <td>{periodLabel(m.period)}</td>
                    <td className="num">
                      {m.goal} {m.kpi.metricUnit}
                    </td>
                    <td className="text-right">
                      <ApproveGoalButton measurementId={m.id} />
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
