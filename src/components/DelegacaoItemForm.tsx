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

  return (
    <div className="card">
      <div className="card-header">Delegação de edição</div>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-[12px] text-[var(--color-ink-500)]">
          Além de você, estas pessoas também podem lançar medições e editar este indicador.
        </p>

        {delegations.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {delegations.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-3 py-1.5 text-[12.5px]"
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

        <form noValidate action={formAction} className="flex flex-wrap items-end gap-2">
          <FormError message={state?.error} />
          <input type="hidden" name="kpiId" value={kpiId} />
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="field-label">Delegar para</label>
            <select name="delegateId" className="input-field" required defaultValue="">
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
          <SubmitButton className="btn">Delegar</SubmitButton>
        </form>
      </div>
    </div>
  );
}
