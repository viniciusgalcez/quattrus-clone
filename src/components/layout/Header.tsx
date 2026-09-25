import { LogOut } from "lucide-react";
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
    <div
      className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 text-white shadow-sm sm:px-5"
      style={{ background: "var(--color-header)" }}
    >
      <div className="flex min-w-0 items-center">
        {children}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        <NotificationBell />
        <Link href="/preferencias" title="Preferências" className="hidden rounded-md px-2 py-1 text-xs text-white/75 transition-colors hover:bg-white/10 hover:text-white md:inline">Preferências</Link>
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative flex h-7 w-7 overflow-hidden rounded-full bg-white/15 text-[10.5px] font-bold text-white ring-1 ring-white/30">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill sizes="28px" className="object-cover" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                {initials(user?.name, user?.username ?? "?")}
              </span>
            )}
          </div>
          <span className="hidden max-w-[150px] truncate text-[12.5px] font-semibold lg:inline">{displayName}</span>
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
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
