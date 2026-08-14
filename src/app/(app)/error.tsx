"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-red-100)]">
        <AlertTriangle className="h-5 w-5 text-[var(--color-red-600)]" />
      </div>
      <h1 className="font-display text-[17px] font-bold text-[var(--color-ink-900)]">
        Não foi possível concluir a ação
      </h1>
      <p className="max-w-[420px] text-[12.5px] text-[var(--color-ink-500)]">
        {error.message && error.message !== "Não autenticado."
          ? error.message
          : "Algo deu errado ao processar sua solicitação. Tente novamente."}
      </p>
      <div className="mt-2 flex gap-2">
        <button onClick={() => reset()} className="btn btn-primary">
          Tentar novamente
        </button>
        <Link href="/" className="btn">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
