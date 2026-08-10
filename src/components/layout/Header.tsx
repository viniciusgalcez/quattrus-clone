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
    <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-white px-6">
      <div className="flex items-center">
        {children}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[14px] font-bold text-[var(--color-brand-700)] ring-1 ring-[var(--color-brand-200)]">
            {initials(user?.name, user?.username ?? "?")}
          </div>
          <span className="text-[14px] font-semibold text-[var(--color-ink-900)]">{displayName}</span>
        </div>
        <div className="h-6 w-px bg-[var(--color-border)] mx-1" />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            title="Sair"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] bg-white text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-red-50)] hover:text-[var(--color-red-600)] hover:border-[var(--color-red-200)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
