"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { upsertMeasurement } from "@/lib/actions";

export function MeasurementQuickEditModal({
  kpiId,
  name,
  metricUnit,
  monthLabel,
  goal,
  actual,
  onClose,
}: {
  kpiId: string;
  name: string;
  metricUnit: string;
  monthLabel: string;
  goal: number | null;
  actual: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await upsertMeasurement(formData);
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Lançamento de ${name}`}
      onClick={onClose}
    >
      <div className="card w-full max-w-[380px]" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <div className="font-semibold text-[13.5px]">{name}</div>
            <div className="text-[11px] font-normal text-[var(--color-ink-500)]">
              {monthLabel} · {metricUnit}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-ink-500)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-ink-900)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form noValidate action={handleSubmit} className="flex flex-col gap-4 p-4">
          <input type="hidden" name="kpiId" value={kpiId} />

          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="quick-goal">
              Previsto
            </label>
            <input
              id="quick-goal"
              type="number"
              step="0.01"
              name="goal"
              autoFocus
              defaultValue={goal ?? 0}
              className="input-field"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="field-label" htmlFor="quick-actual">
              Realizado
            </label>
            <input
              id="quick-actual"
              type="number"
              step="0.01"
              name="actual"
              defaultValue={actual ?? ""}
              placeholder="—"
              className="input-field"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-[var(--color-red-100)] px-3 py-2 text-[12px] text-[var(--color-red-600)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60">
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
