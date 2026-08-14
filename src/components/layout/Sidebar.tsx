import Link from "next/link";
import {
  LayoutDashboard,
  Target,
  Users,
  UserCog,
  Network,
  Building2,
  FileSpreadsheet,
  ClipboardCheck,
  LayoutGrid,
} from "lucide-react";

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
      className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Icon className="h-4 w-4 shrink-0 text-white/50 group-hover:text-white" />
      <span>{children}</span>
    </Link>
  );
}

function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">
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
    <div
      className={`${className} h-full w-[212px] shrink-0 flex-col`}
      style={{ backgroundColor: "var(--color-navy-900)" }}
    >
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-500)] font-display text-[15px] font-bold text-white">
          G
        </div>
        <div className="font-display text-[16px] font-bold text-white">
          Gestiona
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <NavGroupLabel>Painel</NavGroupLabel>
        <NavItem href="/" icon={LayoutDashboard}>
          Dashboard
        </NavItem>
        <NavItem href="/farol" icon={LayoutGrid}>
          Farol
        </NavItem>

        <NavGroupLabel>Gestão Estratégica</NavGroupLabel>
        <NavItem href="/metas" icon={Target}>
          Metas e Indicadores
        </NavItem>
        <NavItem href="/desdobramento" icon={Network}>
          Desdobramento
        </NavItem>
        <NavItem href="/importacao-exportacao" icon={FileSpreadsheet}>
          Importação/Exportação
        </NavItem>

        {isManager && (
          <>
            <NavGroupLabel>Organização</NavGroupLabel>
            <NavItem href="/equipe" icon={Users}>
              Minha Equipe
            </NavItem>
            <NavItem href="/aprovacoes" icon={ClipboardCheck}>
              Aprovação de Metas
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
