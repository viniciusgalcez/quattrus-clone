import { redirect } from "next/navigation";
import { ClipboardClock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule } from "@/lib/module-access";
import { exportableOwnerIds } from "@/lib/hierarchy";
import { periodLabel } from "@/lib/kpi";
import { reviewForecast } from "@/lib/actions";
import { EmptyState } from "@/components/EmptyState";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ForecastApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "approvals");
  if (session.user.role === "COLABORADOR") redirect("/");
  const ownerIds = (await exportableOwnerIds(session.user)).filter((id) => id !== session.user.id);
  const forecasts = ownerIds.length ? await prisma.forecastRequest.findMany({ where: { status: "PENDENTE", kpi: { ownerId: { in: ownerIds }, archivedAt: null } }, include: { kpi: { include: { owner: { select: { name: true } } } }, requestedBy: { select: { name: true } } }, orderBy: [{ period: "desc" }, { createdAt: "desc" }] }) : [];

  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="page-title">Aprovação de previsões</h1><p className="page-subtitle">Analise propostas de meta e resultado da sua equipe.</p></div>
      <nav className="flex gap-2 border-b border-[var(--color-border)]" aria-label="Tipos de aprovação"><a className="btn btn-ghost" href="/aprovacoes">Metas</a><a className="btn btn-primary" href="/aprovacoes/previsoes">Previsões</a></nav>
      <div className="card overflow-hidden">{forecasts.length === 0 ? <EmptyState icon={ClipboardClock} title="Nenhuma previsão pendente" description="Quando alguém solicitar uma previsão, ela aparecerá aqui para análise." /> : <div className="table-scroll"><table className="table-modern min-w-[900px]"><caption className="sr-only">Previsões aguardando aprovação.</caption><thead><tr><th>Item</th><th>Solicitante</th><th>Período</th><th>Proposta</th><th>Motivo</th><th className="text-right">Decisão</th></tr></thead><tbody>{forecasts.map((forecast) => { const action = reviewForecast.bind(null, forecast.id); return <tr key={forecast.id}><th scope="row">{forecast.kpi.name}<div className="text-[11px] font-normal text-[var(--color-ink-400)]">{forecast.kpi.owner.name}</div></th><td>{forecast.requestedBy.name}</td><td>{periodLabel(forecast.period)}</td><td className="num">{forecast.proposedGoal ?? "—"} / {forecast.proposedActual ?? "—"}</td><td className="max-w-[260px] text-[12px]">{forecast.reason}</td><td><form noValidate action={action} className="flex flex-col items-end gap-1"><select name="status" className="input-field text-[11px]"><option value="APROVADA">Aprovar</option><option value="REJEITADA">Rejeitar</option></select><input name="reviewNote" maxLength={1000} className="input-field text-[11px]" placeholder="Observação opcional" /><SubmitButton className="btn text-[11px]" pendingText="Salvando…">Registrar decisão</SubmitButton></form></td></tr>; })}</tbody></table></div>}</div>
    </div>
  );
}
