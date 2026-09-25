"use client";

import { useActionState } from "react";
import { createFacilitation, removeFacilitation } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/FieldError";

type Option = { id: string; name: string };
type FacilitationRow = { id: string; facilitated: { id: string; name: string } };

/**
 * Manages who this user (the facilitator) has blanket edit rights over —
 * "Cadastrar Facilitador" in the original Quattrus. Every KPI the facilitated
 * user owns becomes editable by this user too, present and future.
 */
export function FacilitacaoForm({
  userId,
  candidates,
  facilitating,
}: {
  userId: string;
  candidates: Option[];
  facilitating: FacilitationRow[];
}) {
  const boundAction = createFacilitation.bind(null, userId);
  const [state, formAction] = useActionState(boundAction, null);

  return (
    <div className="card">
      <div className="card-header">Facilitador de</div>
      <div className="flex flex-col gap-3 p-4">
        <p className="text-[12px] text-[var(--color-ink-500)]">
          Este usuário pode editar todos os indicadores das pessoas listadas abaixo, sem precisar
          de delegação item a item.
        </p>

        {facilitating.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {facilitating.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-3 py-1.5 text-[12.5px]"
              >
                {f.facilitated.name}
                <form noValidate
                  action={async () => {
                    await removeFacilitation(f.id);
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
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="field-label">Facilitar</label>
            <select name="facilitatedId" className="input-field" required defaultValue="">
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
          <SubmitButton className="btn">Adicionar</SubmitButton>
        </form>
      </div>
    </div>
  );
}
