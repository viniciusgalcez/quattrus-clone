"use client";

import { useActionState, type ReactNode } from "react";
import { saveUserPreferences } from "@/lib/actions";
import type { ActionResult } from "@/lib/action-result";
import { PreferencesSaveStatus } from "@/components/PreferencesSaveStatus";
import { Check } from "lucide-react";

type PrefState = ActionResult | null;

async function savePreferencesAction(_prev: PrefState, formData: FormData): Promise<PrefState> {
  return saveUserPreferences(formData);
}

export function PreferencesForm({ children }: { children: ReactNode }) {
  const [state, formAction] = useActionState(savePreferencesAction, null);

  return (
    <form noValidate action={formAction} className="card overflow-hidden">
      {children}
      <div className="flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <PreferencesSaveStatus result={state} />
        <button className="btn btn-primary w-full sm:w-auto" type="submit">
          <Check className="h-4 w-4" /> Salvar preferências
        </button>
      </div>
    </form>
  );
}
