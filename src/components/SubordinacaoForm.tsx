"use client";

import { useActionState } from "react";
import { addSubordination, removeSubordination, setPrincipalSubordination } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/FieldError";

type Option = { id: string; name: string };
type SubordinationRow = { id: string; principal: boolean; manager: { id: string; name: string } };

/**
 * "Configurar Subordinação" — a user can answer to more than one manager,
 * with exactly one flagged Principal (the one `User.managerId` mirrors for
 * every other part of the app that still reads a single manager).
 */
export function SubordinacaoForm({
  userId,
  candidates,
  subordinations,
}: {
  userId: string;
  candidates: Option[];
  subordinations: SubordinationRow[];
}) {
  const boundAction = addSubordination.bind(null, userId);
  const [state, formAction] = useActionState(boundAction, null);

  return (
    <div className="card">
      <div className="card-header">Configurar subordinação</div>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-[12px] text-[var(--color-ink-500)]">
          &ldquo;Responde para&rdquo; — este usuário pode ter mais de um gestor; exatamente um fica
          marcado Principal.
        </p>

        {subordinations.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {subordinations.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-bg)] px-3 py-1.5 text-[12.5px]"
              >
                <span className="flex items-center gap-2">
                  {row.manager.name}
                  {row.principal && <span className="badge badge-azul">Principal</span>}
                </span>
                <span className="flex items-center gap-3">
                  {!row.principal && (
                    <form
                      noValidate
                      action={async () => {
                        await setPrincipalSubordination(row.id);
                      }}
                    >
                      <button type="submit" className="text-[11.5px] font-medium text-[var(--color-brand-700)] hover:underline">
                        Tornar principal
                      </button>
                    </form>
                  )}
                  <form
                    noValidate
                    action={async () => {
                      await removeSubordination(row.id);
                    }}
                  >
                    <button type="submit" className="text-[11.5px] font-medium text-[var(--color-red-600)] hover:underline">
                      Remover
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form noValidate action={formAction} className="flex flex-wrap items-end gap-2">
          <FormError message={state?.error} />
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="field-label">Adicionar gestor</label>
            <select name="managerId" className="input-field" required defaultValue="">
              <option value="" disabled>
                Escolha um usuário
              </option>
              {candidates
                .filter((c) => !subordinations.some((row) => row.manager.id === c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <SubmitButton className="btn">Adicionar</SubmitButton>
        </form>
      </div>
    </div>
  );
}
