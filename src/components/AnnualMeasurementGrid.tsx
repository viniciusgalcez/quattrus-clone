"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Pencil, X } from "lucide-react";
import { upsertAnnualMeasurement } from "@/lib/actions";
import { STATUS_BADGE_CLASS, STATUS_COLOR, STATUS_LABEL, type KpiStatus } from "@/lib/kpi";

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export type AnnualGridRow = {
  period: string;
  month: number;
  locked: boolean;
  future: boolean;
  status: KpiStatus;
  measurement: {
    goal: number;
    actual: number | null;
    measured: boolean;
    forecast: number | null;
    justification: string | null;
    benchmark: string | null;
    benchmarkValue: number | null;
  } | null;
};

function fmt(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

export function AnnualMeasurementGrid({
  kpiId,
  kpiName,
  rows,
}: {
  kpiId: string;
  kpiName: string;
  rows: AnnualGridRow[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const row = rows.find((item) => item.period === editing) ?? null;

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await upsertAnnualMeasurement(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setEditing(null);
        router.refresh();
      } catch {
        setError("Não foi possível salvar. Verifique a conexão e tente novamente.");
      }
    });
  }

  return (
    <>
      <div className="table-scroll">
        <table className="table-modern min-w-[920px]">
          <caption className="sr-only">Grade anual de {kpiName}</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col" className="text-center">Medido</th>
              <th scope="col" className="text-right">Realizado</th>
              <th scope="col" className="text-right">Previsto</th>
              <th scope="col" className="text-right">Meta</th>
              <th scope="col">Comentário</th>
              <th scope="col">Benchmark</th>
              <th scope="col" className="text-center">Farol</th>
              <th scope="col" className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const disabled = item.future || item.locked;
              return (
                <tr key={item.period} className={item.locked ? "bg-[var(--color-surface-muted)]/60" : undefined}>
                  <th scope="row" className="whitespace-nowrap">
                    <span className="font-medium text-[var(--color-ink-900)]">{MONTH_LABELS[item.month - 1]}</span>
                    {item.locked && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded bg-[var(--color-amber-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-amber-600)]">
                        <Lock className="h-3 w-3" aria-hidden="true" /> Fechado
                      </span>
                    )}
                    {item.future && (
                      <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-400)]">Futuro</span>
                    )}
                  </th>
                  <td className="text-center">{item.measurement?.measured ? "Sim" : "Não"}</td>
                  <td className="num text-right">{fmt(item.measurement?.actual)}</td>
                  <td className="num text-right">{fmt(item.measurement?.forecast)}</td>
                  <td className="num text-right">{fmt(item.measurement?.goal)}</td>
                  <td className="max-w-[220px] truncate text-[12px] text-[var(--color-ink-600)]" title={item.measurement?.justification ?? undefined}>
                    {item.measurement?.justification || "—"}
                  </td>
                  <td className="text-[12px] text-[var(--color-ink-600)]">
                    {item.measurement?.benchmark
                      ? `${item.measurement.benchmark}${item.measurement.benchmarkValue != null ? ` (${fmt(item.measurement.benchmarkValue)})` : ""}`
                      : "—"}
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--color-border)]"
                        style={{ backgroundColor: item.measurement ? STATUS_COLOR[item.status] : "transparent" }}
                        aria-hidden="true"
                      />
                      <span className={STATUS_BADGE_CLASS[item.status]}>{STATUS_LABEL[item.status]}</span>
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => { setError(null); setEditing(item.period); }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-ink-500)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Editar ${MONTH_LABELS[item.month - 1]}`}
                      title={item.locked ? "Ciclo fechado" : item.future ? "Mês futuro" : "Editar medição"}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {row && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={`Medição de ${kpiName}`} onMouseDown={() => setEditing(null)}>
          <form noValidate action={save} onMouseDown={(event) => event.stopPropagation()} className="card max-h-[90vh] w-full max-w-[560px] overflow-y-auto p-5">
            <input type="hidden" name="kpiId" value={kpiId} />
            <input type="hidden" name="period" value={row.period} />
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--color-ink-900)]">Lançamento anual</h2>
                <p className="mt-1 text-[12px] text-[var(--color-ink-500)]">{kpiName} · {row.period}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Fechar" className="btn-icon"><X className="h-4 w-4" /></button>
            </div>
            {row.locked && (
              <p className="mb-4 rounded-md border border-[var(--color-amber-600)]/30 bg-[var(--color-amber-100)] px-3 py-2 text-[12px] text-[var(--color-amber-600)]">
                Este ciclo está fechado. O salvamento será bloqueado no servidor.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5"><span className="field-label">Meta</span><input name="goal" required type="number" step="0.01" defaultValue={row.measurement?.goal ?? 0} className="input-field" disabled={row.locked} /></label>
              <label className="flex flex-col gap-1.5"><span className="field-label">Previsto</span><input name="forecast" type="number" step="0.01" defaultValue={row.measurement?.forecast ?? ""} className="input-field" disabled={row.locked} /></label>
              <label className="flex flex-col gap-1.5"><span className="field-label">Realizado</span><input name="actual" type="number" step="0.01" defaultValue={row.measurement?.actual ?? ""} className="input-field" disabled={row.locked} /></label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-[12px] font-medium text-[var(--color-ink-700)]">
              <input name="measured" type="checkbox" defaultChecked={row.measurement?.measured ?? false} disabled={row.locked} /> Medido neste ciclo
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5"><span className="field-label">Benchmark</span><input name="benchmark" maxLength={200} defaultValue={row.measurement?.benchmark ?? ""} className="input-field" disabled={row.locked} /></label>
              <label className="flex flex-col gap-1.5"><span className="field-label">Valor benchmark</span><input name="benchmarkValue" type="number" step="0.01" defaultValue={row.measurement?.benchmarkValue ?? ""} className="input-field" disabled={row.locked} /></label>
            </div>
            <label className="mt-4 flex flex-col gap-1.5"><span className="field-label">Comentário</span><textarea name="justification" rows={3} maxLength={2000} defaultValue={row.measurement?.justification ?? ""} className="input-field resize-y" disabled={row.locked} /></label>
            {error && <p className="mt-4 rounded-md bg-[var(--color-red-100)] p-3 text-[12px] text-[var(--color-red-700)]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setEditing(null)}>Cancelar</button>
              <button type="submit" disabled={pending || row.locked} className="btn btn-primary disabled:opacity-60">{pending ? "Salvando..." : "Salvar medição"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
