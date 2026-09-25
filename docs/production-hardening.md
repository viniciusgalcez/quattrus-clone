# Checklist de hardening de produção

Verificado em 2026-08-31 contra o ambiente `gestiona-prod` (porta 3030) e
`docker-compose.yml`/`.env.production`. Reexecute esta checagem depois de
qualquer mudança em compose, `.env.production` ou no proxy externo.

| Item | Status | Nota |
| --- | --- | --- |
| `AUTH_SECRET` obrigatório | ✅ Feito | `docker-compose.yml` usa `${AUTH_SECRET:?...}` — o compose falha ao subir se não estiver setado, não deixa cair num default fraco. |
| Senha forte de banco | ✅ Feito | `.env.production` tem `POSTGRES_PASSWORD` de 32 caracteres, não o default `quattrus` do compose. |
| Postgres não exposto à rede | ✅ Feito | `127.0.0.1:${POSTGRES_PORT}:5432` — bind só em loopback, não em `0.0.0.0`. |
| Rate limit no login | ✅ Feito | `src/lib/rate-limit.ts`, 10 tentativas/5min por usuário (Fase 1, 2026-08-31). Importação, exportação e upload de anexos também têm limites próprios por usuário. |
| Auditoria das ações sensíveis | ✅ Feito | Ver `docs/permissions-matrix.md` e `src/lib/audit.ts` — cobre autenticação, CRUD de item, medição, aprovação, delegação/facilitação, importação, exportação, anexos, exclusão definitiva e usuários. |
| Rebuild aponta pro projeto Docker certo | ⚠️ Processo, não código | Produção roda como projeto `gestiona-prod`, não `quattrus-prod` — ver nota em `docker compose ls` antes de qualquer rebuild. Risco recorrente após restart do host; não há como o compose "avisar" sozinho. |
| HTTPS no proxy | ❌ Pendente | Este compose não termina TLS — depende de um proxy reverso (nginx/Caddy/Traefik) na frente da porta 3030, fora deste repositório. Confirmar com quem administra a rede da Capricórnio se já existe. |
| Cookies seguros (`secure`, `httpOnly`, `sameSite`) | ⚠️ Depende do item acima | NextAuth v5 já marca cookies `httpOnly`/`sameSite=lax` por padrão; o atributo `secure` só é aplicado quando a app percebe HTTPS — depende do proxy citado acima repassar `X-Forwarded-Proto` corretamente (`AUTH_TRUST_HOST=true` já está setado, o que faz o NextAuth confiar nesse header). |
| Backups do Postgres | ✅ Procedimento testado | `scripts/backup-postgres.ps1` gera um dump binário (`pg_dump -Fc`) do Postgres do compose em `backups/`, pasta ignorada pelo Git. Testado contra `gestiona-prod` em 2026-09-12; em produção real, agendar no host e copiar para armazenamento fora da máquina. |
| Restore testado | ⚠️ Procedimento criado, restore real pendente | `scripts/restore-postgres.ps1` restaura com `pg_restore --clean --if-exists --no-owner` e cancela por padrão sem `-ConfirmRestore`. A trava segura foi testada; o restore real deve ser validado em banco de destino controlado, não na base em uso. |
| Retenção de itens arquivados | ✅ Feito | `src/lib/archive.ts` purga itens arquivados após a retenção configurada, preservando snapshot em auditoria antes da exclusão definitiva. A rota protegida `src/app/api/cron/purge-archived/route.ts` exige `CRON_SECRET`. |
| Logs sem dado sensível | ✅ Feito por construção | `recordAuditLog` remove recursivamente senha, token, cookie, segredo e autorização antes de persistir. Next.js não loga corpo de request por padrão. Não auditado logs do proxy externo (fora deste repo). |
| CI com lint/typecheck/test/build | ✅ Feito | `.github/workflows/ci.yml` roda `npm run lint`, `tsc --noEmit`, `npm test` e `npm run build` em PR e push pra `main`/`master`. |
| Healthcheck do container | ✅ Feito | `GET /api/health` no compose, com `start_period` generoso pra cobrir a migration na subida. |

## Pendências reais (não cobertas por código deste repo)

1. **HTTPS/TLS** — decisão de infraestrutura de rede, não de aplicação. Sem
   isso, `cookies secure` não tem efeito prático e credenciais trafegam em
   texto claro na rede interna.
2. **Agendamento e restore real de backup** — o repo já tem scripts mínimos e
   o backup foi testado, mas a produção ainda precisa de agendamento diário no
   host, retenção por N dias, cópia para fora da máquina e um restore de
   verdade em banco de teste.
3. **Retenção externa de artefatos** — a aplicação já protege anexos por
   permissão e possui rotina de purga para itens arquivados, mas a política
   corporativa de retenção para backups, dumps baixados e logs do proxy externo
   ainda depende da infraestrutura da Capricórnio.
