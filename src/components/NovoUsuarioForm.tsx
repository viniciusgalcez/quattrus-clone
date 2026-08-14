"use client";

import { useActionState } from "react";
import { createUser } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";

type Option = { id: string; name: string };

export function NovoUsuarioForm({
  managers,
  departments,
}: {
  managers: Option[];
  departments: Option[];
}) {
  const [state, formAction] = useActionState(createUser, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state?.error} />

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Nome</label>
        <input type="text" name="name" required className="input-field" />
        <FieldError message={state?.fieldErrors?.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="field-label">Usuário</label>
        <input type="text" name="username" required className="input-field" />
        <FieldError message={state?.fieldErrors?.username} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="field-label">Senha</label>
        <input type="password" name="password" required className="input-field" />
        <FieldError message={state?.fieldErrors?.password} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="field-label">Perfil</label>
        <select name="role" className="input-field">
          <option value="COLABORADOR">Colaborador</option>
          <option value="GESTOR">Gestor</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="field-label">Gestor</label>
        <select name="managerId" className="input-field">
          <option value="">— sem gestor —</option>
          {managers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="field-label">Departamento</label>
        <select name="departmentId" className="input-field">
          <option value="">— sem departamento —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end pt-1">
        <SubmitButton>Cadastrar</SubmitButton>
      </div>
    </form>
  );
}
