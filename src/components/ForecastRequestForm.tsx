"use client";

import { useState, useTransition } from "react";
import { createForecastRequest } from "@/lib/actions";

export function ForecastRequestForm({ kpiId, period }: { kpiId: string; period: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await createForecastRequest(new FormData(form));
        setMessage("Previsão enviada para aprovação.");
        form.reset();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível enviar a previsão.");
      }
    });
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div><h2 className="text-[14px] font-semibold text-[var(--color-ink-900)]">Solicitar aprovação de previsão</h2><p className="mt-0.5 text-[12px] text-[var(--color-ink-500)]">Proponha uma meta ou resultado diferente para um período.</p></div>
      <form noValidate onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input type="hidden" name="kpiId" value={kpiId} />
        <label className="flex flex-col gap-1"><span className="field-label">Período</span><input name="period" type="month" defaultValue={period} required className="input-field" /></label>
        <label className="flex flex-col gap-1"><span className="field-label">Meta proposta</span><input name="proposedGoal" type="number" step="0.01" className="input-field" placeholder="Opcional" /></label>
        <label className="flex flex-col gap-1"><span className="field-label">Realizado previsto</span><input name="proposedActual" type="number" step="0.01" className="input-field" placeholder="Opcional" /></label>
        <label className="flex flex-col gap-1 sm:col-span-4"><span className="field-label">Motivo</span><textarea name="reason" required maxLength={1000} rows={2} className="input-field resize-none" placeholder="Explique por que a previsão precisa ser analisada." /></label>
        <div className="sm:col-span-4 flex items-center justify-end gap-3">{message && <span className="text-[12px] text-[var(--color-brand-700)]" role="status">{message}</span>}{error && <span className="text-[12px] text-[var(--color-red-600)]" role="alert">{error}</span>}<button type="submit" disabled={pending} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Enviando…" : "Enviar para aprovação"}</button></div>
      </form>
    </section>
  );
}
