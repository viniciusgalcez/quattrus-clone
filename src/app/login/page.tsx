import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { SubmitButton } from "@/components/SubmitButton";

async function login(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-[var(--color-brand-900)] p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--color-brand-600), transparent 55%), radial-gradient(circle at 85% 75%, var(--color-accent-600), transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 font-display text-[15px] font-bold text-white backdrop-blur">
            G
          </div>
          <span className="font-display text-[17px] font-bold text-white">Gestiona</span>
        </div>
        <div className="relative">
          <p className="font-display text-[26px] font-semibold leading-snug text-white">
            Indicadores no alvo, causas claras, ações no prazo.
          </p>
          <p className="mt-3 max-w-[360px] text-[13px] text-white/60">
            Gestão de metas, planos de ação e hierarquia de equipe em um único painel.
          </p>
        </div>
        <p className="relative text-[11px] text-white/40">Capricórnio Têxtil S.A</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          <div className="mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-600)] font-display text-[15px] font-bold text-white">
              G
            </div>
          </div>

          <h1 className="font-display text-[22px] font-bold text-[var(--color-ink-900)]">Entrar</h1>
          <p className="mt-1 text-[12.5px] text-[var(--color-ink-500)]">
            Acesse sua conta para ver o painel de indicadores.
          </p>

          <form action={login} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Usuário</label>
              <input
                type="text"
                name="username"
                autoFocus
                required
                placeholder="ex: ana.diretora"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="field-label">Senha</label>
              <input type="password" name="password" required className="input-field" />
            </div>

            {error === "inactive" && (
              <div className="rounded-lg bg-[var(--color-red-100)] px-3 py-2 text-[12px] text-[var(--color-red-600)]">
                Sua conta foi desativada. Fale com um administrador.
              </div>
            )}
            {error && error !== "inactive" && (
              <div className="rounded-lg bg-[var(--color-red-100)] px-3 py-2 text-[12px] text-[var(--color-red-600)]">
                Usuário ou senha inválidos.
              </div>
            )}

            <SubmitButton pendingText="Entrando…" className="btn btn-primary mt-1 w-full py-2.5">
              Entrar
            </SubmitButton>

            <div className="mt-2 rounded-lg border border-dashed border-[var(--color-border-strong)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--color-ink-500)]">
              Usuários de demonstração (senha <span className="font-mono-num">demo123</span>):
              <br />
              ana.diretora, carlos.gestor, julia.colab, pedro.colab
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
