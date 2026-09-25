# Validação das fases Quattrus | Gestiona

Registro de aceite técnico da aplicação interna da Capricórnio Têxtil S/A.
Use este arquivo junto com `roadmap-quattrus.md` e `functional-mapping.md`.

Última validação: 2026-09-12.

## Evidência geral

| Gate | Status | Evidência |
| --- | --- | --- |
| Lint | ✅ Passou | `npm run lint` |
| Typecheck | ✅ Passou | `npm run typecheck` |
| Testes automatizados | ✅ Passou | `npm test -- --run` — 339 testes |
| Build de produção | ✅ Passou | `npm run build` |
| Auditoria de UI premium | ✅ Passou | `audit_project.py . --mode strict --no-write` |
| Docker produção local | ✅ Passou | `gestiona-prod-web-1` e `gestiona-prod-postgres-1` saudáveis; `GET /api/health` retornou 200 |
| Backup Postgres | ✅ Passou | `scripts/backup-postgres.ps1` gerou dump binário do compose `gestiona-prod` |
| Restore seguro | ✅ Passou parcialmente | `scripts/restore-postgres.ps1` bloqueia execução sem `-ConfirmRestore`; restore real deve ocorrer em banco de teste |

## Fases

| Fase | Status | O que está coberto |
| --- | --- | --- |
| 1. Segurança e governança | ✅ Validada | Matriz de perfis, módulos protegidos no servidor, auditoria com redação de segredos, rate limit, CI e hardening de produção documentado. |
| 2. Item de Controle completo | ✅ Validada funcionalmente | Cadastro expandido por abas, campos do Quattrus, vigências, fórmulas, dependências, vinculação, compartilhamento e bloqueio de ciclos. |
| 3. Motor de cálculo | ✅ Validada funcionalmente | Farol mensal/anual, direção da meta, faixas históricas, soma, média, ponderado, quociente, denominador médio e recalculo em cascata. |
| 4. Dashboard operacional | ✅ Validada funcionalmente | Grade/hierarquia de itens, 12 meses, exceções, atalhos de medição e permissões por módulo. |
| 5. Medições anuais e travas | ✅ Validada funcionalmente | Editor anual, estado medido, comentário, benchmark, bloqueio de futuro/período fechado e importação respeitando travas. |
| 6. Plano de ação | ✅ Validada funcionalmente | FCA, plano com etapas, Gantt, anexos protegidos por módulo e tarefas vinculadas. |
| 7. Aprovações e notificações | ✅ Validada funcionalmente | Aprovação de metas, aprovação em lote, previsões, notificações agrupadas, preferência de recebimento e regra dono não aprova a própria meta. |
| 8. Importação/exportação | ✅ Validada funcionalmente | Importações por tipo, CSV/TXT/XLSX tabular, histórico, erros por linha, exportação CSV/XLSX/PDF e proteção de acesso direto por rota. |
| 9. Agenda, tarefas e preferências | ✅ Validada funcionalmente | Agenda por visão, participantes, tarefas com agrupamento, preferências persistidas, tema escuro e avatar/anexos com validação. |
| 10. Administração Capricórnio | ✅ Validada funcionalmente | Empresa única Capricórnio, departamentos, usuários, perfis configuráveis, permissões granulares, painel administrativo e desbloqueio de conta. |
| 11. Subordinação multi-gestor | ✅ Validada funcionalmente | `Subordination` (N gestores, um Principal), UI "Configurar Subordinação", aprovações e "Minha equipe" considerando todos os gestores. `User.managerId` mantido como cache sincronizado do Principal. |

> **Nota de 2026-09-12:** uma auditoria encontrou que as Fases 2, 3, 7 e 8
> estavam marcadas "Validada" de forma otimista — a aba "Totalização" do
> modal de item era um texto estático (sem UI para configurar subordinados
> reais), o editor de faixa verde era só dois campos numéricos, a tela de
> notificações não tinha as colunas estruturadas do original, e o PDF de
> Reunião de Resultados não incluía gráfico apesar da opção existir. Todos os
> quatro pontos foram implementados nesta data (ver `naming-alignment.md` §
> "Módulos implementados em 2026-09-12") e a validação acima já reflete o
> estado corrigido. O modo de faixa absoluta (Limite Sup./Inf., Meta do
> Cliente) do item de controle e o `.xls` binário legado seguem fora de
> escopo — ver `naming-alignment.md` para o porquê de cada um.

## Pendências externas

1. HTTPS/TLS e headers do proxy reverso dependem da infraestrutura da Capricórnio.
2. Restore real deve ser validado em banco de destino controlado, não na base em uso.
3. Agendamento de backup e retenção fora da máquina precisam ser configurados no host/infra.
4. Testes end-to-end em navegador real ainda devem ser acrescentados como suíte permanente se o time quiser bloquear regressões visuais e fluxos longos via CI.
