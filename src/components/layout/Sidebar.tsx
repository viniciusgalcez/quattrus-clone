"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CapricornioLogo } from "@/components/CapricornioLogo";
import {
  LayoutDashboard, Target, Users, UserCog, ShieldCheck, Network, Building2,
  FileSpreadsheet, ClipboardCheck, LayoutGrid, ListChecks, Calendar, BarChart3,
  CalendarRange, BriefcaseBusiness,
} from "lucide-react";

function NavItem({ href, icon: Icon, children, active = false }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={`shell-nav-link ${active ? "is-active" : ""}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="shell-nav-group">{children}</div>;
}

export function Sidebar({ isManager = false, isAdmin = false, permissions = [], className = "hidden md:flex" }: {
  isManager?: boolean;
  isAdmin?: boolean;
  permissions?: string[];
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const can = (permission: string) => permissions.includes(permission);
  return (
    <aside className={`${className} shell-sidebar h-full max-h-full w-[min(86vw,304px)] shrink-0 self-stretch flex-col md:sticky md:top-0 md:w-[248px]`}>
      <Link href="/" className="shell-brand" aria-label="Capri Gestiona, página inicial">
        <CapricornioLogo size={40} priority />
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold tracking-[-0.02em] text-white">Capri Gestiona</span>
          <span className="block text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--color-shell-muted)]">Capricórnio Têxtil</span>
        </span>
      </Link>

      <nav aria-label="Navegação principal" className="min-h-0 flex-1 overflow-y-auto px-3 pb-5">
        <NavGroupLabel>Painel</NavGroupLabel>
        <NavItem href="/" icon={LayoutDashboard} active={isActive("/")}>Página Inicial</NavItem>
        {can("dashboard") && <NavItem href="/farol" icon={LayoutGrid} active={isActive("/farol")}>Meus Itens de Controle</NavItem>}

        <NavGroupLabel>Gestão Estratégica</NavGroupLabel>
        {can("measurements") && <NavItem href="/metas" icon={Target} active={isActive("/metas")}>Medições</NavItem>}
        {can("measurements") && <NavItem href="/medicoes" icon={CalendarRange} active={isActive("/medicoes")}>Visão anual</NavItem>}
        <NavItem href="/desdobramento" icon={Network} active={isActive("/desdobramento")}>Desdobramento</NavItem>
        <NavItem href="/multigraficos" icon={BarChart3} active={isActive("/multigraficos")}>Multigráficos</NavItem>
        {can("imports") && <NavItem href="/importacao-exportacao" icon={FileSpreadsheet} active={isActive("/importacao-exportacao")}>Importar / Exportar</NavItem>}
        {can("tasks") && <NavItem href="/tarefas" icon={ListChecks} active={isActive("/tarefas")}>Tarefas</NavItem>}
        {can("agenda") && <NavItem href="/agenda" icon={Calendar} active={isActive("/agenda")}>Agenda</NavItem>}
        {isManager && <NavItem href="/projetos" icon={BriefcaseBusiness} active={isActive("/projetos")}>Projetos estratégicos</NavItem>}

        {isManager && <>
          <NavGroupLabel>Organização</NavGroupLabel>
          <NavItem href="/equipe" icon={Users} active={isActive("/equipe")}>Minha Equipe</NavItem>
          {can("approvals") && <NavItem href="/aprovacoes" icon={ClipboardCheck} active={isActive("/aprovacoes")}>Aprovações</NavItem>}
          <NavItem href="/departamentos" icon={Building2} active={isActive("/departamentos")}>Departamentos</NavItem>
          {isAdmin && <>
            {can("users") && <NavItem href="/usuarios" icon={UserCog} active={isActive("/usuarios")}>Usuários</NavItem>}
            {can("profiles") && <NavItem href="/perfis" icon={ShieldCheck} active={isActive("/perfis")}>Perfis de acesso</NavItem>}
            {can("profiles") && <NavItem href="/empresa" icon={Building2} active={isActive("/empresa")}>Configurações da empresa</NavItem>}
          </>}
        </>}
      </nav>
      <div className="shell-sidebar-footer" aria-hidden="true">Gestão de indicadores <span>·</span> Capricórnio</div>
    </aside>
  );
}
