import { redirect } from "next/navigation";
import { Download, FileSpreadsheet } from "lucide-react";
import { auth } from "@/lib/auth";
import { currentPeriod, periodLabel } from "@/lib/kpi";
import { ImportCsvForm } from "@/components/ImportCsvForm";
import { importKpisCsv, importMeasurementsCsv } from "@/lib/import-actions";

export default async function ImportacaoExportacaoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const period = currentPeriod();

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
        <div className="border-t border-[var(--color-border)] pt-4">
          <ImportCsvForm
            action={importKpisCsv}
            fileFieldHint='Colunas: id (deixe em branco para criar), nome, descricao, dono, departamento, item_pai_id, unidade, direcao (MORE/LESS/EQUAL), tipo_calculo (MANUAL/SUM/AVERAGE/WEIGHTED), peso, faixa_amarela, faixa_vermelha, prioridade.'
          />
        </div>
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
        <div className="border-t border-[var(--color-border)] pt-4">
          <ImportCsvForm
            action={importMeasurementsCsv}
            fileFieldHint="Colunas: item_id, periodo (AAAA-MM), meta, realizado, justificativa. Respeita a trava de FCA pendente."
          />
        </div>
      </div>
    </div>
  );
}
