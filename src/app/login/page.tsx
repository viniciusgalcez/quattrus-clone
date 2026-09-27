import { redirect } from "next/navigation";
import Image from "next/image";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { CapricornioLogo } from "@/components/CapricornioLogo";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput";

async function login(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/inicio",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

// Faint grain gives the textile image a tactile finish without obscuring the
// original weave. The source is large enough for both responsive crops.
const GRAIN_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// The form side echoes a very subtle diagonal thread, tying the calm paper
// surface to the textile photograph without competing with the form.
const THREAD_BACKGROUND =
  "repeating-linear-gradient(115deg, var(--color-border) 0px, var(--color-border) 1px, transparent 1px, transparent 34px)";

function HeroGrain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
      style={{ backgroundImage: GRAIN_BACKGROUND }}
    />
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] lg:flex-row">
      {/* Mobile-only compact hero band — keeps the brand photo/tagline instead
          of leaving the screen blank above the form. Hidden on lg, where the
          full-height panel below takes over. */}
      <div className="relative flex h-[196px] shrink-0 flex-col justify-between overflow-hidden bg-[#272b2a] p-5 lg:hidden">
        <Image
          src="/login-textile-hero.png"
          alt=""
          fill
          sizes="100vw"
          priority
          quality={92}
          className="pointer-events-none object-cover object-[center_20%] contrast-[1.06] saturate-[0.92]"
        />
        <HeroGrain />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(22,24,23,0.38) 0%, rgba(22,24,23,0.12) 45%, rgba(22,24,23,0.82) 100%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <CapricornioLogo size={34} className="border border-white/20 shadow-sm" priority />
          <div>
            <p className="font-display text-[14px] font-bold leading-tight text-white">Capri Gestiona</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/55">Capricórnio Têxtil</p>
          </div>
        </div>
        <div className="relative border-l-2 border-[#a46b4d] pl-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4a482]">Gestão de performance</p>
          <p className="mt-1 font-display text-[15px] font-semibold leading-[1.2] text-white">
            Indicadores no alvo, causas claras, ações no prazo.
          </p>
        </div>
      </div>

      {/* Desktop hero panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#272b2a] p-12 lg:flex xl:p-14">
        <Image
          src="/login-textile-hero.png"
          alt=""
          fill
          sizes="46vw"
          priority
          quality={92}
          className="pointer-events-none object-cover object-center contrast-[1.06] saturate-[0.92]"
        />
        <HeroGrain />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(22,24,23,0.2) 0%, rgba(22,24,23,0.05) 42%, rgba(22,24,23,0.84) 100%), linear-gradient(90deg, rgba(22,24,23,0.22) 0%, transparent 72%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <CapricornioLogo size={44} className="border border-white/20 shadow-sm" priority />
          <div>
            <p className="font-display text-[17px] font-bold leading-tight text-white">Capri Gestiona</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Capricórnio Têxtil
            </p>
          </div>
        </div>

        <div className="relative max-w-[460px] border-l-2 border-[#a46b4d] pl-6">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-[#d4a482]">
            Gestão de performance
          </p>
          <p className="font-display text-[34px] font-semibold leading-[1.12] tracking-[-0.025em] text-white xl:text-[38px]">
            Indicadores no alvo, causas claras, ações no prazo.
          </p>
          <p className="mt-5 max-w-[390px] text-[13px] leading-relaxed text-white/68">
            Metas, resultados e planos de ação conectados em uma visão objetiva da operação.
          </p>
        </div>

        <div className="relative flex items-center justify-between border-t border-white/15 pt-4 text-[10px] uppercase tracking-[0.14em] text-white/45">
          <span>Capricórnio Têxtil S.A.</span>
          <span>Decisões orientadas por dados</span>
        </div>
      </div>

      <div
        className="relative flex flex-1 flex-col items-center justify-start px-4 py-7 sm:px-6 sm:py-10 lg:justify-center lg:px-10 lg:py-8"
        style={{ backgroundImage: THREAD_BACKGROUND }}
      >
        <div className="w-full max-w-[424px] rounded-[3px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-7 shadow-[0_22px_60px_var(--color-shadow-strong)] sm:px-9 sm:py-9 lg:px-10 lg:py-10">
          <div className="mb-7">
            <div className="flex items-center gap-3">
              <CapricornioLogo size={40} className="border border-[var(--color-border-strong)]" priority />
              <div>
                <p className="font-display text-sm font-bold text-[var(--color-ink-900)]">Capri Gestiona</p>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-500)]">
                  Capricórnio Têxtil
                </p>
              </div>
            </div>
          </div>

          <div className="mb-3 h-[2px] w-9 bg-[#a46b4d]" aria-hidden="true" />
          <h1 className="font-display text-[22px] font-bold text-[var(--color-ink-900)]">Entrar</h1>
          <p className="mt-1 text-[12.5px] text-[var(--color-ink-500)]">
            Acesse sua conta para ver o painel de indicadores.
          </p>

          <form noValidate action={login} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="field-label">Usuário</label>
              <input
                id="username"
                type="text"
                name="username"
                autoFocus
                required
                autoComplete="username"
                placeholder="ex: ana.diretora"
                className="input-field"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="field-label">Senha</label>
              <PasswordInput id="password" name="password" autoComplete="current-password" required />
            </div>

            {error === "inactive" && (
              <div role="alert" className="rounded-lg bg-[var(--color-red-100)] px-3 py-2 text-[12px] text-[var(--color-red-600)]">
                Sua conta foi desativada. Fale com um administrador.
              </div>
            )}
            {error && error !== "inactive" && (
              <div role="alert" className="rounded-lg bg-[var(--color-red-100)] px-3 py-2 text-[12px] text-[var(--color-red-600)]">
                Usuário ou senha inválidos.
              </div>
            )}

            <SubmitButton pendingText="Entrando…" className="btn btn-primary mt-1 w-full py-2.5">
              Entrar
            </SubmitButton>

            {process.env.NODE_ENV !== "production" && (
              <div className="mt-2 rounded-lg border border-dashed border-[var(--color-border-strong)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--color-ink-500)]">
                Usuários de demonstração (senha <span className="font-mono-num">demo123</span>):
                <br />
                ana.diretora, carlos.gestor, julia.colab, pedro.colab
              </div>
            )}
          </form>

          <p className="mt-6 text-center text-[11px] text-[var(--color-ink-400)]">
            Precisa de acesso? Fale com o administrador da sua área.
          </p>
        </div>
      </div>
    </div>
  );
}
