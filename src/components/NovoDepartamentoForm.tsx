"use client";

import { useActionState } from "react";
import { createDepartment } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";

export function NovoDepartamentoForm() {
  const [state, formAction] = useActionState(createDepartment, null);

  return (
    <form noValidate action={formAction} className="card flex flex-wrap items-end gap-3 p-4">
      <FormError message={state?.error} />
      <div className="flex flex-1 min-w-[200px] flex-col gap-1.5">
        <label className="field-label">Novo departamento</label>
        <input type="text" name="name" required placeholder="ex: Logística" className="input-field" />
        <FieldError message={state?.fieldErrors?.name} />
      </div>
      <SubmitButton pendingText="Cadastrando…">Cadastrar</SubmitButton>
    </form>
  );
}
