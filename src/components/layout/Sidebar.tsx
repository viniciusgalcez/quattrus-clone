import Link from "next/link";
import { LayoutDashboard, Target, Users, UserCog, Network, Building2 } from "lucide-react";

function NavItem({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[#e6f0ff] hover:text-[var(--color-brand-700)]"
    >
      <Icon className="h-3 w-3 text-[var(--color-ink-400)] group-hover:text-[var(--color-brand-600)]" />
      <span>{children}</span>
    </Link>
  );
}

function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-3 pb-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-400)]">
      {children}
    </div>
  );
}

export function Sidebar({
  isManager = false,
  isAdmin = false,
  className = "hidden md:flex",
}: {
  isManager?: boolean;
  isAdmin?: boolean;
  className?: string;
}) {
  return (
    <div className={`${className} h-full w-[180px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]`}>
      <div className="flex items-center gap-1 px-2 py-2 border-b border-[var(--color-border)] bg-[#d4d0c8]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-600)] font-display text-[13px] font-bold text-white">
          G
        </div>
        <div className="font-display text-[15px] font-bold text-[var(--color-ink-900)]">
          Gestiona
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pb-2">
        <NavGroupLabel>Painel</NavGroupLabel>
        <NavItem href="/" icon={LayoutDashboard}>
          Dashboard
        </NavItem>

        <NavGroupLabel>Gestão Estratégica</NavGroupLabel>
        <NavItem href="/metas" icon={Target}>
          Metas e Indicadores
        </NavItem>
        <NavItem href="/desdobramento" icon={Network}>
          Desdobramento
        </NavItem>

        {isManager && (
          <>
            <NavGroupLabel>Organização</NavGroupLabel>
            <NavItem href="/equipe" icon={Users}>
              Minha Equipe
            </NavItem>
            <NavItem href="/departamentos" icon={Building2}>
              Departamentos
            </NavItem>
            {isAdmin && (
              <NavItem href="/usuarios" icon={UserCog}>
                Usuários
              </NavItem>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
