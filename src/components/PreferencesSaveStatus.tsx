"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

export function PreferencesSaveStatus() {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      toast.success("Preferências salvas.");
    }
  }, [pending]);

  return (
    <p className="text-[11px] text-[var(--color-ink-500)]" aria-live="polite">
      {pending ? "Salvando suas preferências..." : "Tema e densidade são aplicados agora. A página inicial vale no próximo acesso."}
    </p>
  );
}
