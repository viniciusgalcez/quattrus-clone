import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccessProfileForm } from "@/components/AccessProfileForm";
import { assertPageModule } from "@/lib/module-access";

export default async function PerfisPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  assertPageModule(session.user, "profiles");
  if (session.user.role !== "ADMIN") notFound();
  const profiles = await prisma.accessProfile.findMany({ include: { _count: { select: { users: true } } }, orderBy: { name: "asc" } });

  return <div className="mx-auto flex max-w-4xl flex-col gap-5">
    <div><h1 className="page-title">Perfis de acesso</h1><p className="page-subtitle">Defina os módulos disponíveis para cada perfil, sem ampliar o papel institucional do usuário.</p></div>
    <div className="card"><div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-4 font-display text-[14px] font-bold text-[var(--color-ink-900)]"><ShieldCheck className="h-4 w-4 text-[var(--color-brand-600)]" /> Novo perfil</div><AccessProfileForm /></div>
    {profiles.map((profile) => <section key={profile.id} className="card overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3"><div><h2 className="font-display text-[14px] font-bold text-[var(--color-ink-900)]">{profile.name}</h2><p className="text-[12px] text-[var(--color-ink-500)]">{profile.type} · {profile._count.users} usuário(s)</p></div></div><AccessProfileForm profile={profile} /></section>)}
  </div>;
}
