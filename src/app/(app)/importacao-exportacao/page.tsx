import { redirect } from "next/navigation";
import { Download, FileSpreadsheet, UsersRound } from "lucide-react";
import { auth } from "@/lib/auth";
import { currentPeriod, periodLabel } from "@/lib/kpi";
import { ImportCsvForm } from "@/components/ImportCsvForm";
import {
  importActionPlansCsv,
  importCompanyItemsCsv,
  importKpisCsv,
  importMeasurementsCsv,
  importPeriodicitiesCsv,
  importThresholdsCsv,
} from "@/lib/import-actions";
import { assertPageModule } from "@/lib/module-access";
import { prisma } from "@/lib/prisma";
import { exportableOwnerIds } from "@/lib/hierarchy";

export default async function ImportacaoExportacaoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "imports");

  const period = currentPeriod();
  const ownerIds = await exportableOwnerIds(session.user);
  const reportUsers = await prisma.user.findMany({
    where: { id: { in: ownerIds }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const imports = await prisma.importJob.findMany({
    where: session.user.role === "ADMIN" ? {} : { requestedById: session.user.id },
    include: { requestedBy: { select: { name: true } } }, orderBy: { startedAt: "desc" }, take: 20,
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Importação e exportação</h1>
        <p className="page-subtitle">
          Baixe uma planilha para editar em massa, ou importe de volta para aplicar as mudanças.
        </p>
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand-600)]" />
          <h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">Itens (indicadores)</h2>
        </div>
        <a href="/api/export/kpis" className="btn w-fit">
          <Download className="h-3.5 w-3.5" />
          Exportar itens (.csv)
        </a>
        <a href="/api/export/kpis/xlsx" className="btn w-fit"><Download className="h-3.5 w-3.5" /> Exportar itens (.xlsx)</a>
        <div className="border-t border-[var(--color-border)] pt-4">
          <ImportCsvForm
            action={importKpisCsv}
            fileFieldHint="CSV, TXT, XLS tabulado ou XLSX. Colunas: id (deixe em branco para criar), nome, descricao, dono, departamento, item_pai_id, unidade, direcao (MORE/LESS/EQUAL), tipo_calculo (MANUAL/SUM/AVERAGE/WEIGHTED), peso, faixa_amarela, faixa_vermelha, prioridade."
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[var(--color-border)] px-5 py-4"><h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">Histórico de importações</h2></div>
        <div className="table-scroll"><table className="table-modern"><thead><tr><th>Arquivo</th><th>Tipo</th><th>Solicitado por</th><th>Status</th><th>Resultado</th><th>Concluído</th></tr></thead><tbody>{imports.length ? imports.map((job) => <tr key={job.id}><th scope="row">{job.fileName}</th><td>{job.type}</td><td>{job.requestedBy.name}</td><td>{job.status.replaceAll("_", " ")}</td><td>{job.created} criado(s), {job.updated} atualizado(s), {Array.isArray(job.errors) ? job.errors.length : 0} erro(s)</td><td>{job.completedAt?.toLocaleString("pt-BR") ?? "Em andamento"}</td></tr>) : <tr><td colSpan={6} className="py-8 text-center text-[var(--color-ink-500)]">Nenhuma importação registrada.</td></tr>}</tbody></table></div>
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand-600)]" />
          <h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">
            Periodicidade
          </h2>
        </div>
        <ImportCsvForm
          action={importPeriodicitiesCsv}
          fileFieldHint="CSV, TXT, XLS tabulado ou XLSX. Colunas: item_id, vigencia_inicio, vigencia_fim."
        />
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand-600)]" />
          <h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">
            Faixas de controle
          </h2>
        </div>
        <ImportCsvForm
          action={importThresholdsCsv}
          fileFieldHint="CSV, TXT, XLS tabulado ou XLSX. Colunas: item_id, vigencia_inicio, vigencia_fim, faixa_amarela, faixa_vermelha."
        />
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand-600)]" />
          <h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">
            Item empresa
          </h2>
        </div>
        <ImportCsvForm
          action={importCompanyItemsCsv}
          fileFieldHint="CSV, TXT, XLS tabulado ou XLSX. Colunas: nome_empresa, meses_exibidos, meses_em_branco, vermelho_cronico, data_base_fixa, exibir_meta, amarelo_bom, vermelho_bom, automacoes_desativadas."
        />
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand-600)]" />
          <h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">
            Medições — {periodLabel(period)}
          </h2>
        </div>
        <a href={`/api/export/measurements?period=${period}`} className="btn w-fit">
          <Download className="h-3.5 w-3.5" />
          Exportar medições (.csv)
        </a>
        <a href="/api/export/measurements/pdf" className="btn w-fit"><Download className="h-3.5 w-3.5" /> Exportar medições (.pdf)</a>
        <div className="border-t border-[var(--color-border)] pt-4">
          <ImportCsvForm
            action={importMeasurementsCsv}
            fileFieldHint="CSV, TXT, XLS tabulado ou XLSX. Colunas: item_id, periodo (AAAA-MM), meta, realizado, justificativa. Respeita a trava de FCA pendente."
          />
        </div>
      </div>

      <form noValidate action="/api/export/results-meeting/pdf" className="card flex flex-col gap-4 p-5" method="get">
        <input type="hidden" name="submitted" value="1" />
        <div className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-[var(--color-brand-600)]" />
          <h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">
            Reunião de resultados
          </h2>
        </div>
        <p className="max-w-2xl text-[12.5px] text-[var(--color-ink-500)]">
          PDF auditável com indicadores do seu escopo, farol do período, desvios, participantes e regras da reunião.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Líder da reunião</span>
            <select name="leaderId" defaultValue={session.user.id} className="input-field">
              {reportUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Data base</span>
            <input type="month" name="period" defaultValue={period} className="input-field" />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-3">
            <span className="field-label">Descrição da reunião</span>
            <input name="description" maxLength={200} defaultValue="Reunião mensal de resultados" className="input-field" />
          </label>
        </div>
        <fieldset className="grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
          <legend className="field-label mb-2">Participantes selecionados</legend>
          {reportUsers.map((user) => (
            <label key={user.id} className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-700)]">
              <input type="checkbox" name="participantIds" value={user.id} defaultChecked={user.id === session.user.id} className="h-4 w-4 accent-[var(--color-brand-600)]" />
              {user.name}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <legend className="field-label mb-2">Regras do relatório</legend>
          {[
            ["includeMain", "Itens principais"],
            ["includeAuxiliary", "Itens auxiliares"],
            ["includeDelegated", "Itens delegados"],
            ["includeTeamReds", "Vermelhos dos subordinados"],
            ["includeCharts", "Gráficos"],
            ["includeMulticharts", "Multigráficos"],
          ].map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-700)]">
              <input type="checkbox" name={name} defaultChecked className="h-4 w-4 accent-[var(--color-brand-600)]" />
              {label}
            </label>
          ))}
        </fieldset>
        <button type="submit" className="btn w-fit">
          <Download className="h-3.5 w-3.5" />
          Gerar PDF da reunião
        </button>
      </form>

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-[var(--color-brand-600)]" />
          <h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">
            Planos de ação
          </h2>
        </div>
        <ImportCsvForm
          action={importActionPlansCsv}
          fileFieldHint="CSV, TXT, XLS tabulado ou XLSX. Colunas: medicao_id, fato, porque1..porque5, causa_raiz, o_que, quem, onde, quando, por_que, como, quanto, status."
        />
      </div>
    </div>
  );
}
