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
    <div
      className="flex h-12 shrink-0 items-center justify-between px-4 text-white"
      style={{ background: "linear-gradient(to right, var(--color-brand-700), var(--color-brand-600))" }}
    >
      <div className="flex items-center">
        {children}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[10.5px] font-bold text-white ring-1 ring-white/30">
            {initials(user?.name, user?.username ?? "?")}
          </div>
          <span className="hidden text-[12.5px] font-semibold sm:inline">{displayName}</span>
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
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
