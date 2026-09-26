# Conexão com Supabase (pooling) + melhorias na tela de login

**Data:** 2026-09-26
**Branch:** `chore/checkpoint-paridade-quattrus`

## O que mudou

- **Prisma pronto para Supabase**: `datasource db` agora separa `url`
  (conexão *pooled*, ex. porta 6543/pgbouncer) de `directUrl` (conexão
  direta, porta 5432, usada só por `migrate deploy`/`db push`). Local
  (Docker) usa o mesmo valor para os dois, já que não há pooler na frente.
- **`vercel-build`**: novo script que roda `prisma migrate deploy` antes do
  `next build` — a Vercel reconhece esse nome automaticamente no lugar do
  `build` padrão, então as migrations passam a aplicar sozinhas a cada
  deploy de produção.
- **Tela de login**:
  - Corrigido o mobile: até agora o painel de marca sumia inteiro
    (`lg:flex`) e o formulário ficava flutuando sozinho num vazio enorme.
    Agora existe uma faixa compacta de marca (foto + tagline) no topo do
    mobile, e o formulário não força mais centralização vertical em tela
    pequena.
  - Adicionado toggle de mostrar/ocultar senha (`PasswordInput.tsx`).
  - Painel do formulário (desktop) ganhou uma textura sutil de "fio"
    (linhas diagonais quase invisíveis, ~var(--color-border)) e uma régua
    de cobre acima de "Entrar", pra não ficar tão vazio, e uma linha de
    rodapé ("Precisa de acesso? Fale com o administrador da sua área.").
  - Mitigação de qualidade da foto do painel (`login-textile-hero.png`,
    1024×1536 — mais baixa do que o ideal pra um hero full-bleed): grão sutil
    (`mix-blend-overlay`) + contraste/saturação ajustados, pra disfarçar o
    borrão do upscale. **Não resolve de fato** — a solução real é substituir
    a foto por uma em resolução maior quando houver uma disponível.

## Por que

Pedido do usuário: preparar o banco pra rodar no Supabase (hoje só roda em
Docker local/`gestiona-prod`) e deixar a tela de login mais completa — ela
é a primeira impressão de quem usa o sistema.

## Impacto no servidor

- **Migration de schema**: nenhuma — só adiciona `directUrl` ao datasource,
  não muda nenhuma tabela. `npx prisma generate` já rodou localmente sem
  erro.
- **Variáveis de ambiente novas**: `DIRECT_URL`, obrigatória a partir de
  agora (o schema referencia `env("DIRECT_URL")` — sem ela, `prisma
  generate`/`migrate` falha alto e visível, não silenciosamente). Já
  adicionada em `.env`, `.env.example` e nos serviços `migrate`/`web` do
  `docker-compose.yml` (mesmo valor do `DATABASE_URL` local).
- **Vercel**: precisa ter `DATABASE_URL` (pooled) e `DIRECT_URL` (direta)
  configuradas nas Environment Variables do projeto — sem isso o
  `vercel-build` novo falha no primeiro deploy após este merge. Isso é
  intencional (falhar visível é melhor que rodar sem migration).
- **Docker local**: nenhuma ação manual — `docker compose up -d --build`
  já aplica a env var nova nos serviços que precisam.

## Como testar

- `npm run lint && npx tsc --noEmit && npm test && npm run build` — todos
  verdes (352/352 testes).
- `/login` local: desktop e mobile (viewport 375×812) — painel de marca
  visível nos dois, toggle de senha funcionando, sem erro no console.
- Confirmar que `docker compose up -d --build web migrate` sobe sem
  reclamar de env var faltando.

## Riscos / rollback

- Se o Supabase ainda não tiver `DIRECT_URL`/`DATABASE_URL` configuradas na
  Vercel no momento do próximo deploy, o build da Vercel falha — configurar
  as env vars lá é pré-requisito, não pós-requisito, deste merge.
- Rollback: `git revert` deste commit; a mudança de schema é só um campo a
  mais no datasource, sem migration, então reverter não deixa o banco em
  estado inconsistente.

## Nota sobre este PR

Este commit foi separado de um commit anterior no mesmo PR
(`feat: rebranding institucional e ajustes de UX/auth`) que consolidou
trabalho de rebranding já pendente no disco, mas que não foi feito nesta
sessão de trabalho — mantido em commit próprio para não misturar autoria e
motivação de mudanças diferentes.
