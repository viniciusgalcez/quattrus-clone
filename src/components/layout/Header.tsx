import { LogOut, Settings2 } from "lucide-react";
import { signOut } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import Image from "next/image";
import Link from "next/link";

type HeaderUser = {
  id?: string;
  name?: string | null;
  username?: string;
  avatarUpdatedAt?: Date | string | null;
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
  const avatarTimestamp = user?.avatarUpdatedAt ? new Date(user.avatarUpdatedAt).getTime() : null;
  const avatarUrl = user?.id && avatarTimestamp
    ? `/api/profile/avatar?userId=${encodeURIComponent(user.id)}&v=${avatarTimestamp}`
    : null;

  return (
    <header className="shell-header flex h-[68px] shrink-0 items-center justify-between gap-2 px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {children}
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-ink-500)] sm:inline">Gestão de desempenho</span>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
        <NotificationBell />
        <Link href="/preferencias" title="Preferências" aria-label="Preferências" className="shell-header-action gap-2 px-2">
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          <span className="hidden text-[12px] font-medium lg:inline">Preferências</span>
        </Link>
        <div className="ml-1 flex min-w-0 items-center gap-2 border-l border-[var(--color-border)] pl-3">
          <div className="relative flex h-8 w-8 overflow-hidden rounded-full bg-[var(--color-neutral-100)] text-[10.5px] font-bold text-[var(--color-ink-700)] ring-1 ring-[var(--color-border-strong)]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill sizes="28px" className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                {initials(user?.name, user?.username ?? "?")}
              </span>
            )}
          </div>
          <span className="hidden max-w-[150px] truncate text-[12.5px] font-semibold text-[var(--color-ink-900)] md:inline">{displayName}</span>
        </div>
        <form noValidate
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            title="Sair"
            aria-label="Sair"
            className="shell-header-action"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
