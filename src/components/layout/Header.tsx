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
    <div className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[#d4d0c8] px-2">
      <div className="flex items-center">
        {children}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <div className="flex h-5 w-5 items-center justify-center bg-[var(--color-brand-100)] text-[9px] font-bold text-[var(--color-brand-700)]">
            {initials(user?.name, user?.username ?? "?")}
          </div>
          <span className="text-[11px] font-bold text-[var(--color-ink-900)]">{displayName}</span>
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
            className="flex h-5 w-5 items-center justify-center border border-[var(--color-border-strong)] bg-white text-[var(--color-ink-700)] hover:bg-[#e5e5e5] hover:text-[var(--color-red-600)]"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
