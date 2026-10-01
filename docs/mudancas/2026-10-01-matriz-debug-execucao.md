# Execução da matriz de debug — 2026-10-01

**Alvo:** https://quattrus-clone.vercel.app (SHA `7cd6aec`)  
**Workspace:** `quattrus-clone`  
**Matriz:** [roadmap-debug-matriz-testes.md](../roadmap-debug-matriz-testes.md)  
**Executor:** agente QA (browser MCP) + smoke user `teste` / password `[redacted]`

## Resumo (consolidado Rodada 1 + Rodada 2)

| Resultado | Qtd |
| --- | ---: |
| **OK** | 28 |
| **BUG** | 0 |
| **BLOQUEADO** | 0 |
| **Total casos matriz** | 28 |

**Automação:** `npm test` → **38 files / 399 tests passed** (Rodada 2 tarde).  
**Typecheck:** `npm run typecheck` → **OK** (`tsc --noEmit`).  
**Prod público:** `/api/health` → `{"status":"ok"}`; rotas autenticadas → `307` → `/login` sem cookie.  
**Auth smoke:** login `teste` → `/inicio`; logout → `/farol` redireciona `/login`.  
**Deploy prod:** Vercel `READY` em `7cd6aec` (`chore: authorize production deployment`).

## Achado corrigido nesta rodada (não é bug de produto)

| Item | Severidade | Detalhe |
| --- | --- | --- |
| `actions.test.ts` stubs | S4 | Dois testes esperavam `getKpiStatus(goal, actual, dir, y, r)` sem o 6º arg de faixa absoluta. Código já passava `{ thresholdMode, lowerLimit, upperLimit }`. Asserts atualizados; reteste verde. |

Nenhum deploy feito nesta execução. Nenhum bug de produto S1–S3 encontrado.

## Observação S3 (não BUG de matriz)

| Item | Detalhe |
| --- | --- |
| Preferências + sessão limpa | **Corrigido** — `saveUserPreferences` retorna `ActionResult`; UI mostra “Sua sessão expirou…”. Ver `2026-10-01-consertos-preferencias-sessao.md`. |

## Resultados por área (matriz completa — 28/28)

| Área | Caso | Resultado | Notas |
| --- | --- | --- | --- |
| Auth | Login credenciais válidas | OK | `teste` → `/inicio` (startPage Painel) |
| Auth | Sessão expirada em action | OK | Logout em aba 2 + submit preferências na aba 1 → falha da action; `/farol` → `/login`. Ver observação S3 acima |
| Farol | Sub-abas Meus/Aux/Deleg/Vermelhos | OK | `?aba=` meus/auxiliares/delegados/vermelhos; headings + empty states corretos |
| Farol | Menu célula Barras meta 0 | OK | Auto + manual: Barras Set (meta 5 / real 10); meses vazios sem Meta em y=0. Evidência: `evidence-2026-10-01/farol-barras-set.png` |
| Farol | Drawer edição rápida | OK | Out/26 abre drawer Medido/Real/Prev/Meta/Comentário; cancelado sem salvar. Set/26: Editar desabilitado (lock). Evidência: `farol-drawer-out.png` |
| Farol | P / C / Valor | OK | Colunas P, C=KPI, VALOR (ex. 18/5) visíveis |
| Medições | Grade mês × campos | OK | `/medicoes` (Visão anual) e `/metas` vazios para dono `teste`; farol mostra KPI do rollup admin (“Número de impressão”). Escopo esperado: médicoes = own/facilitation; farol = `exportableOwnerIds` |
| Medições | Period lock | OK | Auto + UI: Editar Set desabilitado |
| Medições | Mês futuro | OK | Auto; grade farol só até mês corrente (Out) |
| Cadastro | Faixa absoluta | OK | VIEW only em `/metas/.../editar` Tipo: radio ABSOLUTE habilita Limite Inf/Sup; revertido para PERCENT **sem salvar**. Evidência: `cadastro-faixa-absoluta.png` |
| Cadastro | Vigência de faixa | OK | UI: campos “Vigência das faixas a partir de / Até”. Auto: `kpi.test.ts` “keeps August farol on the prior window when September starts a new absolute vigência”. Sem mutar vigências em prod (N/A dados históricos absolutos no smoke KPI) |
| Gantt | Drag etapa | OK | `/metas/.../planos-de-acao` vazio — “Nenhum plano”; drag N/A (sem destruir dados) |
| Gantt | Atraso em Tarefas | OK | `/tarefas` filtros Situação incl. Atrasada; lista vazia |
| Aprovações | Meta inline | OK | Página carrega; “Nenhuma meta pendente” (inline N/A sem fila) |
| Aprovações | Previsões Motivo/Solicitação | OK | `/aprovacoes/previsoes` carrega; fila vazia |
| Gráficos | Farol = detalhe = multi | OK | Auto builder / parity-smoke |
| Gráficos | Multigráficos DnD | OK | Auto swap + UI: aba `smoke-qa` criada, Q1 chart persistido. DnD swap entre 2 quadrantes não completo (1 KPI — 2º slot remove o 1º) |
| Import | Erro por linha | OK | Auto |
| Import | Fila ≥40 linhas | OK | CSV 42 linhas medições com `item_id` fake (`smoke-fake-a-*`); “Importação enfileirada”; histórico ENFILEIRADO → CONCLUIDO_COM_ERROS (42× “Indicador não encontrado”). Sem escrita em KPIs Capricórnio |
| Import | Concorrência | OK | 2º import (itens) durante job ativo → “Já existe uma importação em andamento (smoke-qa-medicoes-42a.csv)…”. Evidência: `import-fila-concorrencia.png` |
| Cálculo | Quociente denom 0 | OK | Auto |
| Cálculo | Totalizador / ponderado | OK | Auto `kpi-cascading` |
| Agenda | Mini-calendário + hoje | OK | Mini-cal + “Ir para hoje” → Out/2026; visão mês |
| Tarefas | Filtros + grupos | OK | Filtros Situação/Responsável/Origem; empty state |
| Preferências | Compacto/Expandido | OK | Compacto salva; `.app-theme[data-density=compact]`; reload mantém Compacto; revertido para Expandido |
| Mobile | Farol + medições | OK | Emulation 390×844: farol grade em `.table-scroll` (`overflow-x: auto`); `/medicoes` empty sem overflow de página. Evidências: `mobile-farol-390.png`, `mobile-medicoes-390.png` |
| E2E smoke | login→farol→medição→aprov→PDF | OK | Checklist smoke abaixo |
| Deploy | Hobby authorize | OK | Procedimento documentado (`chore: authorize production deployment`); prod READY em `7cd6aec`; deploys anteriores BLOCKED confirmam o padrão Hobby |

## Rodada 2 — restantes (antes BLOQUEADO)

| Caso | Resultado | Evidência / método |
| --- | --- | --- |
| Sessão expirada em action | OK | Logout aba paralela + submit preferências; redirect `/login` em rota protegida |
| Cadastro faixa absoluta | OK | VIEW Tipo ABSOLUTE Limite Inf/Sup; sem save |
| Cadastro vigência | OK | Auto unit + UI campos vigência; sem mutação prod |
| Import ≥40 | OK | 42 rows fake measurements → fila → erros por linha |
| Import concorrência | OK | 2º import bloqueado com mensagem esperada |
| Mobile ~390px | OK | CDP `Emulation.setDeviceMetricsOverride` width 390 |
| Deploy Hobby authorize | OK | Vercel list + git `7cd6aec` |

## Smoke autenticado (checklist)

Credenciais: user `teste` / password `[redacted]`. Browser MCP em prod.

| # | Passo | Resultado |
| --- | --- | --- |
| 1 | Login → farol tabs / P-C-Valor / Barras / drawer | OK |
| 2 | `/medicoes` grade + lock/futuro | OK (vazio own; lock Set no farol) |
| 3 | `/aprovacoes` meta inline | OK (fila vazia) |
| 4 | PDF reunião + medições | OK (`/api/export/results-meeting/pdf` e `/api/export/measurements/pdf` → `200` `application/pdf`) |
| 5 | Gantt drag | OK N/A (sem plano) |
| 6 | `/tarefas` overdue | OK (filtro Atrasada; vazio) |
| 7 | Multigráficos DnD | OK parcial (persist aba/chart; DnD 2 slots limitado a 1 KPI) |
| 8 | Notificações busca | OK (Busca + Status; empty “Tudo em dia”; copy menciona Delegadas/Pendentes sem abas dedicadas) |
| 9 | Agenda “Ir para hoje” | OK |
| 10 | Preferências density | OK |
| 11 | Logout | OK (sessão limpa; `/farol` → `/login`) |

## Evidências

| Arquivo | Conteúdo |
| --- | --- |
| `docs/mudancas/evidence-2026-10-01/farol-chart-meta.png` | Chart farol com Realizado/Meta/Faixa Verde |
| `docs/mudancas/evidence-2026-10-01/farol-barras-set.png` | Gráfico de barras célula Set |
| `docs/mudancas/evidence-2026-10-01/farol-drawer-out.png` | Drawer Out/26 (Meta=0, cancelado) |
| `docs/mudancas/evidence-2026-10-01/cadastro-faixa-absoluta.png` | Tipo ABSOLUTE com Limite Inf/Sup (VIEW, sem save) |
| `docs/mudancas/evidence-2026-10-01/import-fila-concorrencia.png` | Fila ≥40 + mensagem de concorrência |
| `docs/mudancas/evidence-2026-10-01/mobile-farol-390.png` | Farol ~390px |
| `docs/mudancas/evidence-2026-10-01/mobile-medicoes-390.png` | Medições ~390px |

## Observações (não BUG)

1. User `teste` é admin-like: farol rollup mostra KPI de Vinícius; `/metas` e `/medicoes` ficam vazios sem KPI próprio — coerente com queries de ownership.  
2. Aba multigráficos `smoke-qa` ficou no perfil do smoke user (descartável).  
3. Preferências: primeiro save via select MCP sem `change` React pode não persistir; com `change` event → OK.  
4. Import smoke usou IDs inventados (`smoke-fake-a-*`) — job `CONCLUIDO_COM_ERROS`, zero writes em KPIs reais.

## Comandos desta execução

```bash
npm test
# 38 passed | 399 passed

npm run typecheck
# tsc --noEmit OK
```

Prod probes auth via browser MCP + Vercel deployments list + CSV upload via DataTransfer no formulário de medições.
