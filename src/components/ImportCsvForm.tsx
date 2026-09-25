"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/FieldError";
import type { ImportState } from "@/lib/import-actions";

export function ImportCsvForm({
  action,
  fileFieldHint,
}: {
  action: (prevState: ImportState | null, formData: FormData) => Promise<ImportState>;
  fileFieldHint: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form noValidate action={formAction} className="flex flex-col gap-3">
      <FormError message={state?.error} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          accept=".csv,.txt,.xls,.xlsx,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="input-field max-w-[280px] text-[12px]"
        />
        <SubmitButton pendingText="Importando…">Importar</SubmitButton>
      </div>
      <p className="text-[11px] text-[var(--color-ink-400)]">{fileFieldHint}</p>

      {state?.report && (
        <div className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-[var(--color-ink-700)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-green-600)]" />
            {state.report.created} criado(s), {state.report.updated} atualizado(s)
            {state.report.errors.length > 0 && `, ${state.report.errors.length} com erro`}
          </div>
          {state.report.errors.length > 0 && (
            <ul className="flex flex-col gap-1 text-[11.5px] text-[var(--color-red-600)]">
              {state.report.errors.map((e, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
                  <span>
                    Linha {e.line}: {e.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
