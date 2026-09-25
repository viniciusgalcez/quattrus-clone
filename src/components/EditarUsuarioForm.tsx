"use client";

import { useActionState } from "react";
import Link from "next/link";
import { unlockUserAccount, updateUser } from "@/lib/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FieldError, FormError } from "@/components/FieldError";

type Option = { id: string; name: string };
type AccessProfileOption = Option & { type: string };
type UserInfo = {
  id: string;
  name: string;
  role: string;
  managerId: string | null;
  departmentId: string | null;
  accessProfileId: string | null;
};

export function EditarUsuarioForm({
  user,
  managers,
  departments,
  profiles,
}: {
  user: UserInfo;
  managers: Option[];
  departments: Option[];
  profiles: AccessProfileOption[];
}) {
  const updateUserWithId = updateUser.bind(null, user.id);
  const [state, formAction] = useActionState(updateUserWithId, null);

  return (
    <div className="flex flex-col gap-4">
    <form noValidate action={formAction} className="card flex flex-col gap-4 p-5">
      <FormError message={state?.error} />

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Nome</label>
        <input type="text" name="name" required defaultValue={user.name} className="input-field" />
        <FieldError message={state?.fieldErrors?.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Perfil</label>
        <select name="role" defaultValue={user.role} className="input-field">
          <option value="COLABORADOR">Colaborador</option>
          <option value="GESTOR">Gestor</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Perfil de acesso</label>
        <select name="accessProfileId" defaultValue={user.accessProfileId ?? ""} className="input-field">
          <option value="">— usar apenas o papel institucional —</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.name} ({profile.type.toLowerCase()})</option>
          ))}
        </select>
        <FieldError message={state?.fieldErrors?.accessProfileId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Gestor</label>
        <select name="managerId" defaultValue={user.managerId ?? ""} className="input-field">
          <option value="">— sem gestor —</option>
          {managers
            .filter((m) => m.id !== user.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
        <FieldError message={state?.fieldErrors?.managerId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Departamento</label>
        <select name="departmentId" defaultValue={user.departmentId ?? ""} className="input-field">
          <option value="">— sem departamento —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="field-label">Nova senha (opcional)</label>
        <input type="password" name="password" placeholder="Deixe em branco para manter" className="input-field" />
        <FieldError message={state?.fieldErrors?.password} />
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
        <Link href="/usuarios" className="btn">
          Cancelar
        </Link>
        <SubmitButton>Salvar alterações</SubmitButton>
      </div>
    </form>
    <UnlockAccountButton userId={user.id} />
    </div>
  );
}

/** Clears failed-login lockout — separate action so it can't be triggered by accident when saving the rest of the form. */
function UnlockAccountButton({ userId }: { userId: string }) {
  return (
    <form
      noValidate
      action={async () => {
        await unlockUserAccount(userId);
      }}
      className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
    >
      <p className="text-[11.5px] text-[var(--color-ink-500)]">
        Limpa o limite de tentativas de login com falha para este usuário.
      </p>
      <button type="submit" className="btn shrink-0">
        Desbloquear conta
      </button>
    </form>
  );
}
