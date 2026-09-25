"use client";

import { useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { upsertAnnualMeasurement } from "@/lib/actions";

type MeasurementInput = {
  goal: number;
  actual: number | null;
  measured: boolean;
  forecast: number | null;
  justification: string | null;
  benchmark: string | null;
  benchmarkValue: number | null;
};

export function AnnualMeasurementEditor({
  kpiId,
  kpiName,
  period,
  measurement,
  disabled,
}: {
  kpiId: string;
  kpiName: string;
  period: string;
  measurement: MeasurementInput | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertAnnualMeasurement(formData);
        setOpen(false);
        router.refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Não foi possível salvar a medição.");
      }
    });
  }

  return <>
    <button type="button" disabled={disabled} onClick={() => setOpen(true)} className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--color-ink-500)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Editar ${kpiName} em ${period}`} title={disabled ? "Mês futuro" : "Editar medição"}><Pencil className="h-3 w-3" /></button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={`Medição de ${kpiName}`} onMouseDown={() => setOpen(false)}>
      <form noValidate action={save} onMouseDown={(event) => event.stopPropagation()} className="card max-h-[90vh] w-full max-w-[560px] overflow-y-auto p-5">
        <input type="hidden" name="kpiId" value={kpiId} /><input type="hidden" name="period" value={period} />
        <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-[16px] font-semibold text-[var(--color-ink-900)]">Lançamento anual</h2><p className="mt-1 text-[12px] text-[var(--color-ink-500)]">{kpiName} · {period}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="btn-icon"><X className="h-4 w-4" /></button></div>
        <div className="grid gap-4 sm:grid-cols-3"><label className="flex flex-col gap-1.5"><span className="field-label">Meta</span><input name="goal" required type="number" step="0.01" defaultValue={measurement?.goal ?? 0} className="input-field" /></label><label className="flex flex-col gap-1.5"><span className="field-label">Previsto</span><input name="forecast" type="number" step="0.01" defaultValue={measurement?.forecast ?? ""} className="input-field" /></label><label className="flex flex-col gap-1.5"><span className="field-label">Realizado</span><input name="actual" type="number" step="0.01" defaultValue={measurement?.actual ?? ""} className="input-field" /></label></div>
        <label className="mt-4 flex items-center gap-2 text-[12px] font-medium text-[var(--color-ink-700)]"><input name="measured" type="checkbox" defaultChecked={measurement?.measured ?? false} /> Medido neste ciclo</label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-1.5"><span className="field-label">Benchmark</span><input name="benchmark" maxLength={200} defaultValue={measurement?.benchmark ?? ""} className="input-field" /></label><label className="flex flex-col gap-1.5"><span className="field-label">Valor benchmark</span><input name="benchmarkValue" type="number" step="0.01" defaultValue={measurement?.benchmarkValue ?? ""} className="input-field" /></label></div>
        <label className="mt-4 flex flex-col gap-1.5"><span className="field-label">Comentário</span><textarea name="justification" rows={3} maxLength={2000} defaultValue={measurement?.justification ?? ""} className="input-field resize-y resize-none" /></label>
        {error && <p className="mt-4 rounded-md bg-[var(--color-red-100)] p-3 text-[12px] text-[var(--color-red-700)]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">{pending ? "Salvando..." : "Salvar medição"}</button></div>
      </form>
    </div>}
  </>;
}
