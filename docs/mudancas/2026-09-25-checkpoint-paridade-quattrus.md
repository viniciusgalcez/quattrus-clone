# Checkpoint: consolidação do trabalho de paridade com o Quattrus

**Data:** 2026-09-25
**Branch:** `chore/checkpoint-paridade-quattrus`

## Contexto importante

Este não é um commit de uma feature só — é a consolidação de tudo que estava
acumulado sem commit neste clone local (69 arquivos modificados, ~70 arquivos
novos, 28 migrations do Prisma). O histórico local (`master`, 2 commits) e o
histórico que já estava no GitHub (`origin/main`, 9 commits, terminando em
"feat: implementar bolinha azul, amarela e verde igual ao Quattrus") são
**históricos não relacionados** — divergiram em algum momento e nunca foram
sincronizados. Por decisão explícita do responsável pelo projeto, este PR
substitui `main` pelo conteúdo deste checkpoint; os 9 commits antigos
continuam recuperáveis no histórico do Git (nada é apagado), só deixam de ser
a ponta de `main` depois do merge.

## O que mudou

Cobre a maior parte das Fases 1–9 do roadmap (`docs/roadmap-quattrus.md`):

- **Modelo de dados**: schema do `Kpi` expandido (código, categoria PMB/KPI,
  cliente, bom-para, vermelho crônico, coeficiente, auxiliar,
  compartilhamento), motor de fórmula (soma/média/ponderada/quociente/
  totalizador), vigências históricas, dependências e itens vinculados —
  28 migrations novas.
- **Cadastro de item**: as 6 abas do Quattrus (Tipo/Totalização/Vinculação/
  Compartilhamento/Período/Dependências).
- **Farol / "Meus itens de controle"**: grid hierárquico com 12 meses,
  bolinhas de status, e — adicionado nesta sessão — menu por linha (Ver
  item, Editar item, Plano de ação, Anexos), com as páginas
  `/metas/[id]/planos-de-acao` e `/metas/[id]/anexos`.
- **Governança**: `PeriodLock` (trava de período), `AuditLog` padronizado,
  matriz de permissões por perfil (`AccessProfile`), delegação e
  facilitação, rate limit em login/importação/anexos.
- **Módulos de apoio**: Agenda, Tarefas (5W2H), Multigráficos (abas salvas
  por usuário), Projetos estratégicos, Notificações, Aprovações de
  metas/previsões, Importação/Exportação (CSV/XLSX/PDF).
- **Infraestrutura**: `Dockerfile` com estágio `migrator` separado do `web`
  (a app não carrega mais a CLI do Prisma em produção), healthcheck em
  `/api/health`, `AUTH_SECRET` obrigatório no compose.
- **Limpeza**: removidos 11 arquivos de 0 bytes (`typeof`, `returns`,
  `{console.log(u)` etc.) — sobras de comandos de shell quebrados em sessões
  anteriores, sem relação com o código.
- Correção de 2 erros de lint pré-existentes (`react/no-children-prop` em
  `KpiTotalizationPanel`, aspas não escapadas em `SubordinacaoForm`) para
  poder tornar o lint bloqueante nesta e nas próximas entregas.

Detalhe completo por área: `docs/roadmap-quattrus.md` (tabela "Estado atual
resumido", atualizada em 2026-09-24) e `docs/production-hardening.md`.

## Por que

Consolidar meses de trabalho de paridade funcional com o Quattrus original
(ver `docs/functional-mapping.md`) que estava só no disco local, sem nenhum
registro em controle de versão — risco real de perda de trabalho.

## Impacto no servidor

- **Rebuild da imagem Docker: sim, obrigatório.** O `Dockerfile` mudou de
  estrutura (novo estágio `migrator`, entrypoint removido da imagem `web`).
  Use `docker compose up -d --build web migrate` (ou `--build` em todos os
  serviços), não só um restart do container existente.
- **Migrations de banco: sim, 28 migrations pendentes** em produção (todas
  já testadas em dev, nenhuma é destrutiva — são todas `ADD COLUMN`/
  `CREATE TABLE`/backfill). Rodam automaticamente pelo serviço `migrate` no
  `docker compose up`, antes do `web` subir (`depends_on: condition:
  service_completed_successfully`). Não é necessário rodar nada manualmente.
- **Variáveis de ambiente novas** (ver `.env.example`):
  - `CRON_SECRET` — opcional; deixe vazio se não for usar a rota agendada de
    purga de itens arquivados (`/api/cron/purge-archived`). Sem ela, a rota
    simplesmente recusa execução, não quebra nada.
  - `UPLOAD_DIR` — já tem default (`/app/uploads`) coerente com o volume do
    compose; não precisa setar manualmente a menos que queira mudar o
    caminho.
- **Nenhum serviço além de `web`/`migrate` precisa reiniciar.**
- **Sem passo manual de seed** — o seed de produção (`db:seed:admin`) já
  existia e não muda aqui.

## Como testar

1. `npm run lint && npx tsc --noEmit && npm test && npm run build` — todos
   verdes (rodado nesta sessão: 339/339 testes, build ok).
2. Local: `docker compose up -d --build web` no diretório do projeto,
   confirmar `docker compose ps` mostrando `web` como `healthy`.
3. Login com usuário demo (`ana.diretora` / `demo123`) e navegar em "Meus
   Itens de Controle" — confirmar que o menu "⋮" por linha abre e que
   "Plano de ação"/"Anexos" carregam.

## Riscos / rollback

- Como `main` está sendo substituído (histórico não relacionado), o
  `git revert` de um único commit não desfaz isso de forma limpa — o
  rollback real é reabrir/recriar `main` a partir do commit antigo
  (`de51238`, ainda existente no repo local e remoto) se algo crítico for
  detectado depois do merge.
- Migrations são aditivas (sem `DROP COLUMN`/`DROP TABLE`), então um
  rollback de código sem rollback de schema não quebra o banco.
- Antes de mergear, confirme com quem administra o deploy de produção
  (`gestiona-prod`, porta 3030) que ninguém está no meio de um deploy
  manual — ver `docs/production-hardening.md`.
