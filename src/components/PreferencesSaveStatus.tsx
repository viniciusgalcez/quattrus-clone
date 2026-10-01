"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

export function PreferencesSaveStatus({ result }: { result: ActionResult | null }) {
  const { pending } = useFormStatus();
  const lastToastKey = useRef<string | null>(null);

  useEffect(() => {
    if (pending || !result) return;
    const key = result.ok ? "ok" : `err:${result.error}`;
    if (lastToastKey.current === key) return;
    lastToastKey.current = key;
    if (result.ok) {
      toast.success("Preferências salvas.");
    } else {
      toast.error(result.error);
    }
  }, [pending, result]);

  if (result && !result.ok) {
    return (
      <p className="text-[12px] font-medium text-[var(--color-red-700)]" role="alert" aria-live="assertive">
        {result.error}
      </p>
    );
  }

  return (
    <p className="text-[11px] text-[var(--color-ink-500)]" aria-live="polite">
      {pending
        ? "Salvando suas preferências..."
        : "Tema e densidade são aplicados agora. A página inicial vale no próximo acesso."}
    </p>
  );
}
