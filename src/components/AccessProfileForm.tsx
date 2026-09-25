"use client";

import { useActionState } from "react";
import { createAccessProfile, updateAccessProfile } from "@/lib/actions";
import { PROFILE_MODULES, type ProfileModule } from "@/lib/profile-permissions";
import { FieldError, FormError } from "@/components/FieldError";
import { SubmitButton } from "@/components/SubmitButton";

const moduleLabels: Record<ProfileModule, string> = {
  dashboard: "Painel e itens de controle",
  measurements: "Medições e metas",
  approvals: "Aprovações",
  imports: "Importação e exportação",
  agenda: "Agenda",
  tasks: "Tarefas e planos de ação",
  users: "Usuários",
  departments: "Departamentos",
  profiles: "Perfis de acesso",
};

type Profile = { id: string; name: string; type: string; permissions: unknown };

export function AccessProfileForm({ profile }: { profile?: Profile }) {
  const action = profile ? updateAccessProfile.bind(null, profile.id) : createAccessProfile;
  const [state, formAction] = useActionState(action, null);
  const selected = new Set(Array.isArray(profile?.permissions) ? profile.permissions.filter((item): item is ProfileModule => typeof item === "string") : []);

  return (
    <form noValidate action={formAction} className="flex flex-col gap-4 p-5">
      <FormError message={state?.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5"><span className="field-label">Nome</span><input name="name" required defaultValue={profile?.name} className="input-field" /><FieldError message={state?.fieldErrors?.name} /></label>
        <label className="flex flex-col gap-1.5"><span className="field-label">Papel permitido</span><select name="type" defaultValue={profile?.type ?? "COLABORADOR"} className="input-field"><option value="COLABORADOR">Colaborador</option><option value="GESTOR">Gestor</option><option value="ADMIN">Administrador</option></select></label>
      </div>
      <fieldset className="grid gap-2 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
        <legend className="mb-2 text-[13px] font-semibold text-[var(--color-ink-900)]">Módulos liberados</legend>
        {PROFILE_MODULES.map((module) => (
          <label key={module} className="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-[12px] text-[var(--color-ink-700)]">
            <input type="checkbox" name="permissions" value={module} defaultChecked={selected.has(module)} className="h-4 w-4 accent-[var(--color-brand-600)]" />
            {moduleLabels[module]}
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end"><SubmitButton>{profile ? "Salvar perfil" : "Criar perfil"}</SubmitButton></div>
    </form>
  );
}
