import Link from "next/link";
import { SearchX } from "lucide-react";

export default function AppNotFound() {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-neutral-100)]">
        <SearchX className="h-5 w-5 text-[var(--color-ink-400)]" />
      </div>
      <h1 className="font-display text-[17px] font-bold text-[var(--color-ink-900)]">
        Não encontramos essa página
      </h1>
      <p className="max-w-[420px] text-[12.5px] text-[var(--color-ink-500)]">
        O registro pode ter sido removido, ou você não tem acesso a ele.
      </p>
      <Link href="/" className="btn btn-primary mt-2">
        Voltar ao início
      </Link>
    </div>
  );
}
