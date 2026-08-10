import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";

type HeaderUser = {
  name?: string | null;
  username?: string;
} | undefined;

function initials(name: string | null | undefined, fallback: string): string {
  const source = name ?? fallback;
  return source
    .split(/[.\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Header({ user, children }: { user: HeaderUser, children?: React.ReactNode }) {
  const displayName = user?.name ?? user?.username ?? "Visitante";

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
      <div className="flex items-center">
        {children}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[11px] font-bold text-[var(--color-brand-700)]">
            {initials(user?.name, user?.username ?? "?")}
          </div>
          <span className="text-[13px] font-medium text-[var(--color-ink-700)]">{displayName}</span>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            title="Sair"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-ink-400)] transition-colors hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-red-600)]"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
