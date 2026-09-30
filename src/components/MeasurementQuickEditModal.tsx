"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";
import { upsertAnnualMeasurement } from "@/lib/actions";

/**
 * Right-side drawer for quick measurement edit from the farol grid.
 * Quattrus fields: Medido · Realizado · Previsto · Meta · Comentário.
 * Meta stays locked (hidden input preserves the approved goal); first launch
 * without a goal still allows typing Meta once.
 */
export function MeasurementQuickEditModal({
  kpiId,
  name,
  metricUnit,
  monthLabel,
  period,
  year,
  goal,
  actual,
  forecast,
  measured,
  justification,
  onClose,
}: {
  kpiId: string;
  name: string;
  metricUnit: string;
  monthLabel: string;
  /** YYYY-MM — always the editable cycle from the server. */
  period: string;
  year: number;
  goal: number | null;
  actual: number | null;
  forecast: number | null;
  measured: boolean;
  justification: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isMeasured, setIsMeasured] = useState(measured || actual !== null);
  const hasExistingGoal = goal !== null && goal !== undefined;
  const [yearLabel] = period.split("-");
  const titleMonth = `${monthLabel}/${yearLabel.slice(2)}`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(formData: FormData) {
    setError(null);
    if (isMeasured) formData.set("measured", "on");
    else formData.delete("measured");
    startTransition(async () => {
      try {
        const result = await upsertAnnualMeasurement(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
        onClose();
      } catch {
        setError("Não foi possível concluir o envio. Verifique sua conexão e tente novamente.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={`Edição ${titleMonth} — ${name}`}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-[400px] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-500)]">
              Edição {titleMonth} — {year}
            </div>
            <div className="truncate font-semibold text-[14px] text-[var(--color-ink-900)]">{name}</div>
            <div className="text-[11px] text-[var(--color-ink-500)]">{metricUnit}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-ink-900)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form noValidate action={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <input type="hidden" name="kpiId" value={kpiId} />
          <input type="hidden" name="period" value={period} />

          <label className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--color-ink-700)]">
            <input
              type="checkbox"
              name="measured"
              checked={isMeasured}
              onChange={(e) => setIsMeasured(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand-600)]"
            />
            Medido
          </label>

          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="quick-actual">
              Realizado
            </label>
            <input
              id="quick-actual"
              type="number"
              step="0.01"
              name="actual"
              autoFocus
              disabled={!isMeasured}
              defaultValue={actual ?? ""}
              placeholder="—"
              className="input-field disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="quick-forecast">
              <span className="inline-flex items-center gap-1">
                Previsto
              </span>
            </label>
            <input
              id="quick-forecast"
              type="number"
              step="0.01"
              name="forecast"
              defaultValue={forecast ?? ""}
              placeholder="—"
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="quick-goal">
              <span className="inline-flex items-center gap-1">
                Meta
                {hasExistingGoal ? <Lock className="h-3 w-3 text-[var(--color-ink-400)]" aria-hidden="true" /> : null}
              </span>
            </label>
            {hasExistingGoal ? (
              <>
                <input type="hidden" name="goal" value={goal ?? 0} />
                <input
                  id="quick-goal"
                  type="number"
                  step="0.01"
                  readOnly
                  value={goal ?? 0}
                  className="input-field bg-[var(--color-neutral-50)] text-[var(--color-ink-500)]"
                  aria-readonly="true"
                />
              </>
            ) : (
              <input
                id="quick-goal"
                type="number"
                step="0.01"
                name="goal"
                required
                defaultValue={0}
                className="input-field"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="quick-comment">
              Comentário
            </label>
            <textarea
              id="quick-comment"
              name="justification"
              rows={4}
              maxLength={2000}
              defaultValue={justification ?? ""}
              className="input-field resize-y"
              placeholder="Observações do ciclo"
            />
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg bg-[var(--color-red-100)] px-3 py-2 text-[12px] text-[var(--color-red-600)]"
            >
              {error}
            </div>
          )}

          <div className="mt-auto flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
            <button type="button" onClick={onClose} className="btn">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
