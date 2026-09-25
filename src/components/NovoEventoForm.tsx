"use client";

import { useActionState } from "react";
import { createEvent } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";
import { EVENT_CATEGORY_LABEL, EVENT_CATEGORY_ORDER } from "@/lib/event";

export function NovoEventoForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState(createEvent, null);

  return (
    <form noValidate action={formAction} className="card flex flex-col gap-4 p-5">
      <FormError message={state?.error} />

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Título</label>
        <input type="text" name="title" required className="input-field" />
        <FieldError message={state?.fieldErrors?.title} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Categoria</label>
        <select name="category" className="input-field" defaultValue="REUNIAO_RESULTADO">
          {EVENT_CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {EVENT_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Início</label>
          <input type="datetime-local" name="startAt" required className="input-field" />
          <FieldError message={state?.fieldErrors?.startAt} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="field-label">Término</label>
          <input type="datetime-local" name="endAt" required className="input-field" />
          <FieldError message={state?.fieldErrors?.endAt} />
        </div>
      </div>
      <label className="flex flex-col gap-1.5"><span className="field-label">Participantes</span><select name="participantIds" multiple className="input-field min-h-24">{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <SubmitButton>Cadastrar evento</SubmitButton>
      </div>
    </form>
  );
}
