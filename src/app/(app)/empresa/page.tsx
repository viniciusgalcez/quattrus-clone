import { notFound, redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertPageModule } from "@/lib/module-access";
import { CompanySettingsForm } from "@/components/CompanySettingsForm";
export default async function EmpresaPage() { const session = await auth(); if (!session?.user) redirect("/login"); assertPageModule(session.user, "profiles"); if (session.user.role !== "ADMIN") notFound(); const settings = await prisma.companySettings.upsert({ where: { id: "capricornio" }, create: { id: "capricornio" }, update: {} }); return <div className="mx-auto flex max-w-4xl flex-col gap-5"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-700)]"><Building2 className="h-3.5 w-3.5"/> Administração</div><h1 className="page-title">Configurações da empresa</h1><p className="page-subtitle">Parâmetros internos da Capricórnio Têxtil S/A.</p></div><CompanySettingsForm settings={settings}/></div>; }
