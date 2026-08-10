import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil, Plus, Target, AlertTriangle, TrendingUp, HelpCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getKpiStatus,
  currentPeriod,
  periodLabel,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  STATUS_RAIL_CLASS,
} from "@/lib/kpi";
import { upsertMeasurement } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { EmptyState } from "@/components/EmptyState";

export default async function MetasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const period = currentPeriod();

  const kpis = await prisma.kpi.findMany({
    where: { ownerId: session.user.id, archivedAt: null },
    include: { measurements: { where: { period } } },
    orderBy: { priority: "asc" },
  });

  const kpisWithStatus = kpis.map((kpi) => {
    const measurement = kpi.measurements[0] ?? null;
    const status = measurement
      ? getKpiStatus(
          measurement.goal,
          measurement.actual,
          kpi.direction,
          kpi.yellowRange,
          kpi.redRange
        )
      : "SEM_DADO";
    return { ...kpi, status, measurement };
  });

  const total = kpis.length;
  const countByStatus = {
    VERDE: 0,
    AMARELO: 0,
    VERMELHO: 0,
    CRITICO: 0,
    SEM_DADO: 0,
  };
  kpisWithStatus.forEach((k) => countByStatus[k.status]++);

  const hasForaDaMeta = countByStatus.VERMELHO > 0 || countByStatus.CRITICO > 0 || countByStatus.AMARELO > 0;

  return (
    <div className="flex flex-col gap-2 p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">Metas e indicadores</h1>
          <p className="page-subtitle">
            Ciclo de {periodLabel(period)} — acompanhe seus resultados e edite os valores.
          </p>
        </div>
        <Link href="/metas/novo" className="btn btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> Cadastrar meta
        </Link>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="card p-2 flex flex-col justify-between">
            <div className="flex items-center gap-1 mb-1">
              <Target className="h-4 w-4 text-[var(--color-ink-500)]" />
              <span className="field-label">Total de Indicadores</span>
            </div>
            <span className="stat-value stat-hero text-[var(--color-ink-900)]">{total}</span>
          </div>
          
          <div className={`card p-2 flex flex-col justify-between ${countByStatus.VERDE > 0 ? 'tile-calm' : ''}`}>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className={`h-4 w-4 ${countByStatus.VERDE > 0 ? 'text-[var(--color-brand-600)]' : 'text-[var(--color-ink-500)]'}`} />
              <span className="field-label">Na Meta (Verde)</span>
            </div>
            <span className={`stat-value stat-hero ${countByStatus.VERDE > 0 ? 'text-[var(--color-brand-700)]' : 'text-[var(--color-ink-900)]'}`}>
              {countByStatus.VERDE}
            </span>
          </div>

          <div className={`card p-2 flex flex-col justify-between ${hasForaDaMeta ? 'tile-urgent' : ''}`}>
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className={`h-4 w-4 ${hasForaDaMeta ? 'text-[var(--color-accent-600)]' : 'text-[var(--color-ink-500)]'}`} />
              <span className="field-label">Fora da Meta</span>
            </div>
            <span className={`stat-value stat-hero ${hasForaDaMeta ? 'text-[var(--color-accent-600)]' : 'text-[var(--color-ink-900)]'}`}>
              {countByStatus.AMARELO + countByStatus.VERMELHO + countByStatus.CRITICO}
            </span>
          </div>

          <div className="card p-2 flex flex-col justify-between">
             <div className="flex items-center gap-1 mb-1">
              <HelpCircle className="h-4 w-4 text-[var(--color-ink-500)]" />
              <span className="field-label">Sem Dado</span>
            </div>
            <span className="stat-value stat-hero text-[var(--color-ink-500)]">{countByStatus.SEM_DADO}</span>
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="card p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[var(--color-ink-900)]">Desempenho Geral do Ciclo</span>
            <span className="text-[13px] font-medium text-[var(--color-ink-500)]">
              {Math.round((countByStatus.VERDE / total) * 100) || 0}% dos indicadores atingiram a meta
            </span>
          </div>
          <div className="meter">
            {countByStatus.VERDE > 0 && <div className="meter-seg meter-seg-verde" style={{ width: `${(countByStatus.VERDE / total) * 100}%` }} title={`Verde: ${countByStatus.VERDE}`} />}
            {countByStatus.AMARELO > 0 && <div className="meter-seg meter-seg-amarelo" style={{ width: `${(countByStatus.AMARELO / total) * 100}%` }} title={`Amarelo: ${countByStatus.AMARELO}`} />}
            {countByStatus.VERMELHO > 0 && <div className="meter-seg meter-seg-vermelho" style={{ width: `${(countByStatus.VERMELHO / total) * 100}%` }} title={`Vermelho: ${countByStatus.VERMELHO}`} />}
            {countByStatus.CRITICO > 0 && <div className="meter-seg meter-seg-critico" style={{ width: `${(countByStatus.CRITICO / total) * 100}%` }} title={`Crítico: ${countByStatus.CRITICO}`} />}
            {countByStatus.SEM_DADO > 0 && <div className="meter-seg meter-seg-neutro" style={{ width: `${(countByStatus.SEM_DADO / total) * 100}%` }} title={`Sem dado: ${countByStatus.SEM_DADO}`} />}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {total > 0 && (
          <div className="card-header">
            <span>Lançamento do mês</span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-ink-400)]">
              <Pencil className="h-3 w-3" aria-hidden="true" />
              Altere os valores e clique em Salvar na linha
            </span>
          </div>
        )}

        <div className="table-scroll">
          <table className="table-modern">
            <caption className="sr-only">
              Indicadores do ciclo de {periodLabel(period)}, com previsto e realizado editáveis.
            </caption>
            <thead>
              <tr>
                <th scope="col">Indicador</th>
                <th scope="col" className="num">
                  Previsto
                </th>
                <th scope="col" className="num">
                  Realizado
                </th>
                <th scope="col">Parecer Mensal</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {total === 0 && (
                <tr>
                  <td colSpan={5} className="!p-0">
                    <EmptyState
                      icon={Target}
                      title="Nenhum indicador cadastrado"
                      description="Esta é a tela onde você lança o previsto e o realizado de cada indicador todo mês. Quando um valor fica fora da meta, o atalho para abrir o FCA aparece aqui na linha."
                      actions={[{ href: "/metas/novo", label: "Cadastrar primeira meta" }]}
                    />
                  </td>
                </tr>
              )}

              {kpisWithStatus.map((kpi) => {
                const measurement = kpi.measurement;
                const status = kpi.status;
                const formId = `measurement-form-${kpi.id}`;
                const foraDaMeta =
                  status === "AMARELO" || status === "VERMELHO" || status === "CRITICO";

                return (
                  <tr key={kpi.id} className="row-editable">
                    <th scope="row" className={STATUS_RAIL_CLASS[status]}>
                      <Link
                        href={`/metas/${kpi.id}`}
                        className="text-[13px] font-medium text-[var(--color-brand-700)] hover:underline"
                      >
                        {kpi.name}
                      </Link>
                      <div className="text-[11px] text-[var(--color-ink-400)]">{kpi.metricUnit}</div>
                    </th>

                    <td className="num">
                      <input
                        form={formId}
                        type="number"
                        step="0.01"
                        name="goal"
                        aria-label={`Previsto de ${kpi.name} (${kpi.metricUnit})`}
                        defaultValue={measurement?.goal ?? 0}
                        className="input-inline"
                      />
                    </td>

                    <td className="num">
                      <input
                        form={formId}
                        type="number"
                        step="0.01"
                        name="actual"
                        aria-label={`Realizado de ${kpi.name} (${kpi.metricUnit})`}
                        defaultValue={measurement?.actual ?? ""}
                        placeholder="—"
                        className="input-inline"
                      />
                    </td>

                    <td>
                      <input
                        form={formId}
                        type="text"
                        name="justification"
                        aria-label={`Parecer de ${kpi.name}`}
                        defaultValue={measurement?.justification ?? ""}
                        placeholder="Opcional..."
                        className="input-inline"
                        style={{ width: '120px' }}
                      />
                    </td>

                    <td>
                      <span className={STATUS_BADGE_CLASS[status]}>{STATUS_LABEL[status]}</span>
                    </td>

                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {foraDaMeta && measurement && (
                          <Link
                            href={`/fca/${measurement.id}`}
                            className="whitespace-nowrap text-[12px] font-semibold text-[var(--color-red-600)] hover:underline"
                          >
                            Abrir FCA
                          </Link>
                        )}
                        <form id={formId} action={upsertMeasurement}>
                          <input type="hidden" name="kpiId" value={kpi.id} />
                          <SubmitButton
                            className="btn text-[11px]"
                            pendingText="Salvando…"
                            aria-label={`Salvar medição de ${kpi.name}`}
                          >
                            Salvar
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && (
        <p className="text-[11.5px] text-[var(--color-ink-400)]">
          Exibindo {total} indicador(es) do ciclo de {periodLabel(period)}.
        </p>
      )}
    </div>
  );
}
