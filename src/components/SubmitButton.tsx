"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton({
  children,
  pendingText,
  className = "btn btn-primary",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  /** Needed where the visible text repeats across rows ("Salvar" in a table). */
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={ariaLabel}
      aria-busy={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      {pending ? (pendingText ?? "Salvando…") : children}
    </button>
  );
}
