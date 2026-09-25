"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { duplicateKpi } from "@/lib/duplicate-kpi";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";

export function DuplicateKpiForm({ kpiId, isAdmin }: { kpiId: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(duplicateKpi, null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn">
        <Copy className="h-3.5 w-3.5" /> Duplicar
      </button>
    );
  }

  return (
    <form noValidate action={formAction} className="card flex flex-col gap-3 p-4">
      <input type="hidden" name="kpiId" value={kpiId} />
      <FormError message={state?.error} />

      {isAdmin && (
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Duplicar para (usuário)</label>
          <input
            type="text"
            name="targetUsername"
            placeholder="deixe em branco para duplicar para você mesmo"
            className="input-field max-w-[280px]"
          />
          <FieldError message={state?.fieldErrors?.targetUsername} />
        </div>
      )}

      <label className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-700)]">
        <input type="checkbox" name="copyMeasurements" />
        Copiar também o histórico de medições
      </label>

      <div className="flex gap-2">
        <SubmitButton pendingText="Duplicando…">Confirmar</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
