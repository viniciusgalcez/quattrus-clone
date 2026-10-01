"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { markAllNotificationsRead } from "@/lib/actions";
import type { ActionResult } from "@/lib/action-result";

type State = ActionResult | null;

async function markAllAction(_prev: State, _formData: FormData): Promise<State> {
  return markAllNotificationsRead();
}

export function MarkAllNotificationsButton() {
  const [state, formAction, pending] = useActionState(markAllAction, null);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!state) return;
    const key = state.ok ? "ok" : `err:${state.error}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    if (state.ok) toast.success("Notificações marcadas como lidas.");
    else toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} noValidate className="flex flex-col items-end gap-1">
      {state && !state.ok && (
        <p className="text-[11px] font-medium text-[var(--color-red-700)]" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        <CheckCheck className="h-4 w-4" />
        {pending ? "Marcando..." : "Editar Todas"}
      </button>
    </form>
  );
}
