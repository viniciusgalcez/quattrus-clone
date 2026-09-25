import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUserPreferences } from "@/lib/actions";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ThemePreference } from "@/components/ThemePreference";
import { DensityPreference } from "@/components/DensityPreference";
import { StartPagePreference } from "@/components/StartPagePreference";
import { PreferencesSaveStatus } from "@/components/PreferencesSaveStatus";
import { BellRing, Check, Home, LayoutPanelTop, SlidersHorizontal, UserRound } from "lucide-react";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [preference, account] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId: session.user.id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUpdatedAt: true, name: true, username: true },
    }),
  ]);
  const displayName = account?.name ?? session.user.name ?? account?.username ?? session.user.username;
  const avatarUrl = account?.avatarUpdatedAt
    ? `/api/profile/avatar?userId=${encodeURIComponent(session.user.id)}&v=${account.avatarUpdatedAt.getTime()}`
    : null;
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-700)]">
            <UserRound className="h-3.5 w-3.5" /> Minha conta
          </div>
          <h1 className="page-title text-[25px]">Preferências pessoais</h1>
          <p className="page-subtitle mt-1">Deixe o Capri Gestiona com o seu ritmo de trabalho.</p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 shadow-sm">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-xs font-bold text-[var(--color-brand-700)]">{displayName.slice(0, 2).toUpperCase()}</span>
          <div className="pr-1"><p className="text-[12px] font-semibold text-[var(--color-ink-900)]">{displayName}</p><p className="text-[10px] text-[var(--color-ink-500)]">Perfil ativo</p></div>
        </div>
      </header>

      <form noValidate action={saveUserPreferences} className="card overflow-hidden">
        <div className="grid lg:grid-cols-[220px_1fr]">
          <aside className="border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5 lg:border-b-0 lg:border-r">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-brand-900)] text-white shadow-sm"><SlidersHorizontal className="h-5 w-5" /></div>
            <h2 className="mt-4 font-display text-[16px] font-bold text-[var(--color-ink-900)]">Como você trabalha</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ink-500)]">Essas escolhas afetam apenas a sua experiência. O conteúdo dos indicadores continua compartilhado com a equipe.</p>
          </aside>
          <div className="divide-y divide-[var(--color-border)]">
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-start gap-3"><span className="settings-icon"><UserRound className="h-4 w-4" /></span><div><h3 className="text-[14px] font-bold text-[var(--color-ink-900)]">Dados pessoais</h3><p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">Atualize a imagem usada no topo do sistema.</p></div></div>
              <AvatarUpload avatarUrl={avatarUrl} displayName={displayName} />
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-start gap-3"><span className="settings-icon"><LayoutPanelTop className="h-4 w-4" /></span><div><h3 className="text-[14px] font-bold text-[var(--color-ink-900)]">Visualização</h3><p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">Escolha a quantidade de informação por tela.</p></div></div>
              <DensityPreference key={preference?.density ?? "comfortable"} value={preference?.density ?? "comfortable"} />
              <ThemePreference key={preference?.theme ?? "dark"} value={preference?.theme ?? "dark"} />
              <div className="grid gap-3 sm:grid-cols-2"><label className="flex flex-col gap-1.5"><span className="field-label">Meses no dashboard</span><select name="dashboardMonths" defaultValue={preference?.dashboardMonths ?? 12} className="input-field"><option value="3">3 meses</option><option value="6">6 meses</option><option value="9">9 meses</option><option value="12">12 meses</option></select></label><label className="flex flex-col gap-1.5"><span className="field-label">Meses em branco</span><select name="blankMonths" defaultValue={preference?.blankMonths ?? 0} className="input-field"><option value="0">Ocultar</option><option value="3">Até 3 meses</option><option value="6">Até 6 meses</option><option value="12">Todos</option></select></label></div>
              <label className="flex max-w-xs flex-col gap-1.5"><span className="field-label">Data base</span><input name="basePeriod" type="month" defaultValue={preference?.basePeriod ?? ""} className="input-field" /></label>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-start gap-3"><span className="settings-icon settings-icon-cyan"><Home className="h-4 w-4" /></span><div><h3 className="text-[14px] font-bold text-[var(--color-ink-900)]">Acesso rápido</h3><p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">Defina a primeira tela ao entrar no sistema.</p></div></div>
              <StartPagePreference key={preference?.startPage ?? "/"} value={preference?.startPage ?? "/"} />
              <div className="flex flex-col gap-2"><label className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-700)]"><input type="checkbox" name="showDelegated" defaultChecked={preference?.showDelegated ?? true} className="h-4 w-4 accent-[var(--color-brand-600)]" /> Mostrar itens delegados</label><label className="flex items-center gap-2 text-[12.5px] text-[var(--color-ink-700)]"><input type="checkbox" name="showTeamReds" defaultChecked={preference?.showTeamReds ?? true} className="h-4 w-4 accent-[var(--color-brand-600)]" /> Mostrar vermelhos da equipe</label></div>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-start gap-3"><span className="settings-icon settings-icon-coral"><BellRing className="h-4 w-4" /></span><div><h3 className="text-[14px] font-bold text-[var(--color-ink-900)]">Avisos importantes</h3><p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">Receba lembretes sobre o que precisa de decisão.</p></div></div>
              <label className="flex max-w-md cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 transition-colors hover:border-[var(--color-brand-500)] hover:bg-[var(--color-brand-50)]"><input type="checkbox" name="emailNotifications" defaultChecked={preference?.emailNotifications ?? true} className="mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]" /><span><span className="block text-[12.5px] font-semibold text-[var(--color-ink-900)]">Receber notificações de aprovações e pendências</span><span className="mt-0.5 block text-[11px] text-[var(--color-ink-500)]">Você poderá revisar tudo na Central de notificações.</span></span></label>
            </div>
            <div className="flex flex-col gap-3 bg-[var(--color-surface-muted)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><PreferencesSaveStatus /><button className="btn btn-primary w-full sm:w-auto" type="submit"><Check className="h-4 w-4" /> Salvar preferências</button></div>
          </div>
        </div>
      </form>
    </section>
  );
}
