# Correções de mobile, tema escuro e erro cru em período fechado

**Data:** 2026-09-27
**Branch:** `chore/checkpoint-paridade-quattrus`

## Contexto importante

Este commit inclui, junto das 4 correções abaixo (que eu implementei e
verifiquei nesta sessão), um conjunto de mudanças que já estava no disco
por um processo/sessão em paralelo (`src/lib/auth.ts`, `src/proxy.ts`,
`src/components/layout/Sidebar.tsx`, `src/app/api/health/route.ts`,
`vercel.json`, `docs/obsidian/`, entre outros) — por decisão explícita do
responsável do projeto, comitado junto em vez de separado, já que o
trabalho estava evoluindo ao vivo e separar exigiria coordenação que não
era prioridade no momento. Eu não fiz code review dessas partes; a garantia
que tenho é que o pipeline completo (lint/typecheck/testes/build) passa com
tudo junto.

## O que mudou (as 4 correções desta sessão)

1. **Header sumindo no mobile** — `src/app/(app)/layout.tsx`: `fixed
   inset-0` → `fixed inset-0 h-dvh`. O shell raiz não acompanhava o
   viewport *visual* do navegador mobile (só o viewport de *layout*, que
   fica maior que o visível enquanto a barra de endereço está mostrando),
   empurrando o header (68px) pra fora da dobra visível — o usuário ficava
   sem hambúrguer/navegação nenhuma.
2. **Overlay do menu mobile sem stacking correto** —
   `src/components/layout/MobileSidebarToggle.tsx`: o overlay/drawer virou
   portal (`createPortal`) pra `document.body`. Antes ele era filho do
   `<Header>` (porque `Header` recebe `MobileSidebarToggle` como
   `children`), então os próprios controles do header podiam pintar por
   cima do overlay escurecido em vez de ficarem por baixo dele.
3. **Gráfico do dashboard ilegível no tema escuro** —
   `src/components/DashboardCharts.tsx`: cores trocadas de hex fixo (só
   funcionava no tema claro) para os tokens `var(--chart-previsto)`
   /`var(--chart-realizado)`/`var(--chart-grid)` que já existiam em
   `globals.css` mas não eram usados, e `var(--color-surface-muted)` para
   o destaque de hover (antes um bege quase branco, brilhante demais no
   escuro).
4. **Erro cru do React ao editar medição em período fechado** —
   `src/lib/actions.ts`: `upsertAnnualMeasurement` virou wrapper seguro
   (`{ok,error}` em vez de lançar exceção), no mesmo padrão já usado por
   `upsertMeasurementQuick`. Next.js, em produção, mascara a mensagem de
   exceções não tratadas de Server Actions — daí o usuário ver "Minified
   React error #441" em vez de "Este período está fechado." Os dois
   `throw new Error(...)` de validação viraram `MeasurementInputError`
   (classe já reconhecida como segura pelo wrapper).
   `AnnualMeasurementEditor.tsx` atualizado para checar `result.ok`.

## Por que

4 bugs reportados pelo usuário em produção (Vercel), com prints de tela,
mais a preparação geral do banco/deploy discutida na mesma sessão.

## Impacto no servidor

- Nenhuma migration nova nestas 4 correções.
- Nenhuma variável de ambiente nova.
- Mudança de CSS (tokens de tema) e de comportamento de erro — sem efeito
  em dados existentes.
- Não sei o impacto das mudanças paralelas em `auth.ts`/`proxy.ts`/health
  check — não as revisei linha a linha.

## Como testar

- `npm run lint && npx tsc --noEmit && npm test && npm run build` — verdes
  (358/358 testes) no momento do commit.
- Bug 1 e 3: confirmados por leitura de código e pelo build passando;
  recomendo confirmação visual em mobile real após deploy.
- Bug 2: **não confirmado visualmente** nesta sessão — havia um servidor de
  dev de outro processo já rodando no mesmo diretório (Next.js impede uma
  segunda instância), e evitei tentar login repetido nele por risco de
  rate-limit na conta de demonstração. Confirmar visualmente após deploy.
- Bug 4: coberto por teste automatizado novo em `actions.test.ts`
  ("returns an actionable cycle error instead of throwing a production
  React 441").

## Riscos / rollback

- `git revert` deste commit desfaz as 4 correções, mas também desfaz o que
  quer que a sessão paralela tenha feito nos mesmos arquivos — se só uma
  das duas partes precisar reverter depois, vai exigir edição manual, não
  um revert simples.
