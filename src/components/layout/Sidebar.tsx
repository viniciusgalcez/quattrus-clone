"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Users,
  UserCog,
  ShieldCheck,
  Network,
  Building2,
  FileSpreadsheet,
  ClipboardCheck,
  LayoutGrid,
  ListChecks,
  Calendar,
  BarChart3,
  CalendarRange,
  BriefcaseBusiness,
} from "lucide-react";

function NavItem({
  href,
  icon: Icon,
  children,
  active = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-colors ${active ? "bg-white/12 text-white shadow-[inset_3px_0_0_var(--color-brand-500)]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[var(--color-brand-500)]" : "text-white/50 group-hover:text-white"}`} />
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
  permissions = [],
  className = "hidden md:flex",
}: {
  isManager?: boolean;
  isAdmin?: boolean;
  permissions?: string[];
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const can = (permission: string) => permissions.includes(permission);
  return (
    <div
      className={`${className} h-full w-[min(82vw,280px)] shrink-0 flex-col md:w-[212px]`}
      style={{ backgroundColor: "var(--color-navy-900)" }}
    >
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-500)] font-display text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(75,130,232,0.35)]">
          C
        </div>
        <div className="font-display text-[14px] font-bold leading-tight text-white">
          Capri Gestiona
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <NavGroupLabel>Painel</NavGroupLabel>
        <NavItem href="/" icon={LayoutDashboard} active={isActive("/")}>
          Página Inicial
        </NavItem>
        {can("dashboard") && <NavItem href="/farol" icon={LayoutGrid} active={isActive("/farol")}>Meus Itens de Controle</NavItem>}

        <NavGroupLabel>Gestão Estratégica</NavGroupLabel>
        {can("measurements") && <NavItem href="/metas" icon={Target} active={isActive("/metas")}>
          Medições
        </NavItem>}
        {can("measurements") && <NavItem href="/medicoes" icon={CalendarRange} active={isActive("/medicoes")}>
          Visão anual
        </NavItem>}
        <NavItem href="/desdobramento" icon={Network} active={isActive("/desdobramento")}>
          Desdobramento
        </NavItem>
        <NavItem href="/multigraficos" icon={BarChart3} active={isActive("/multigraficos")}>
          Multigráficos
        </NavItem>
        {can("imports") && <NavItem href="/importacao-exportacao" icon={FileSpreadsheet} active={isActive("/importacao-exportacao")}>
          Importar / Exportar
        </NavItem>}
        {can("tasks") && <NavItem href="/tarefas" icon={ListChecks} active={isActive("/tarefas")}>
          Tarefas
        </NavItem>}
        {can("agenda") && <NavItem href="/agenda" icon={Calendar} active={isActive("/agenda")}>
          Agenda
        </NavItem>}
        {isManager && (
          <NavItem href="/projetos" icon={BriefcaseBusiness} active={isActive("/projetos")}>
            Projetos estratégicos
          </NavItem>
        )}

        {isManager && (
          <>
            <NavGroupLabel>Organização</NavGroupLabel>
            <NavItem href="/equipe" icon={Users} active={isActive("/equipe")}>
              Minha Equipe
            </NavItem>
            {can("approvals") && <NavItem href="/aprovacoes" icon={ClipboardCheck} active={isActive("/aprovacoes")}>
              Aprovações
            </NavItem>}
            <NavItem href="/departamentos" icon={Building2} active={isActive("/departamentos")}>
              Departamentos
            </NavItem>
            {isAdmin && (
              <>
                {can("users") && <NavItem href="/usuarios" icon={UserCog} active={isActive("/usuarios")}>Usuários</NavItem>}
                {can("profiles") && <NavItem href="/perfis" icon={ShieldCheck} active={isActive("/perfis")}>Perfis de acesso</NavItem>}
                {can("profiles") && <NavItem href="/empresa" icon={Building2} active={isActive("/empresa")}>Configurações da empresa</NavItem>}
              </>
            )}
          </>
        )}
      </nav>
    </div>
  );
}
