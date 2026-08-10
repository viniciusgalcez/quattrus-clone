import Link from "next/link";
import { SearchX } from "lucide-react";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--color-bg)] text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-neutral-100)]">
        <SearchX className="h-5 w-5 text-[var(--color-ink-400)]" />
      </div>
      <h1 className="font-display text-[17px] font-bold text-[var(--color-ink-900)]">
        Página não encontrada
      </h1>
      <Link href="/" className="btn btn-primary mt-2">
        Ir para o início
      </Link>
    </div>
  );
}
