"use client";

import { useActionState } from "react";
import { createDelegation, removeDelegation } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/FieldError";

type Option = { id: string; name: string };
type Delegation = { id: string; delegate: { id: string; name: string } };

export function DelegacaoItemForm({
  kpiId,
  candidates,
  delegations,
}: {
  kpiId: string;
  candidates: Option[];
  delegations: Delegation[];
}) {
  const [state, formAction] = useActionState(createDelegation, null);
  const selectId = `delegate-${kpiId}`;

  return (
    <div className="card">
      <div className="card-header">Delegação de edição</div>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <p className="max-w-2xl text-[12px] leading-relaxed text-[var(--color-ink-500)]">
          Além de você, estas pessoas também podem lançar medições e editar este indicador.
        </p>

        {delegations.length > 0 && (
          <ul className="flex max-w-2xl flex-col gap-1.5">
            {delegations.map((d) => (
              <li
                key={d.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md bg-[var(--color-bg)] px-3 py-2 text-[12.5px]"
              >
                {d.delegate.name}
                <form noValidate
                  action={async () => {
                    await removeDelegation(d.id);
                  }}
                >
                  <button type="submit" className="text-[11.5px] font-medium text-[var(--color-red-600)] hover:underline">
                    Remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form noValidate action={formAction} className="grid max-w-2xl gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          {state?.error && (
            <div className="sm:col-span-2">
              <FormError message={state.error} />
            </div>
          )}
          <input type="hidden" name="kpiId" value={kpiId} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={selectId} className="field-label">Delegar para</label>
            <select id={selectId} name="delegateId" className="input-field min-w-0" required defaultValue="">
              <option value="" disabled>
                Escolha um usuário
              </option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <SubmitButton className="btn w-full sm:w-auto" pendingText="Delegando…">Delegar</SubmitButton>
        </form>
      </div>
    </div>
  );
}
