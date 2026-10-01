# Roadmap de debug + matriz de testes (Gestiona)

**Objetivo:** caçar erros e bugs de forma sistemática depois da paridade M3/M4.  
**Criado:** 2026-10-01 · aponta a partir de [roadmap-paridade-quattrus.md](./roadmap-paridade-quattrus.md).

## Como usar

1. Escolha uma **área** da matriz.
2. Execute os casos **Manual** na ordem (smoke → regressão → borda).
3. Preencha Resultado: `OK` / `BUG` / `BLOQUEADO`.
4. Se BUG: copie a linha para a tabela de achados (severidade + esperado × atual + owner).
5. Rode o pacote automático: `npm test` (inclui `parity-smoke`, band-chart, import, farol).

Severidade: **S1** bloqueia operação · **S2** distorce farol/cálculo · **S3** UX · **S4** cosmético.

## Classes de bug conhecidas

| Classe | Sintoma | Onde olhar | Status |
| --- | --- | --- | --- |
| Meta 0 no gráfico | Linha Meta em y=0 sem realizado | `band-chart.ts`, Barras, multigráficos | Corrigido F8 |
| Period lock | Import/edição em ciclo fechado | `period-locks`, medições, import | Guardas existem |
| Denominador zero | Quociente inventa número | `kpi-formula` ZERO_DENOMINATOR | Sem dado + label |
| Mês futuro | Lançamento adiante | `comparePeriods` / grade anual | Bloqueado |
| Hobby deploy e-mail | Vercel pede authorize commit | `chore: authorize production deployment` | Procedimento conhecido |
| .xls binário | Upload legado | import-actions OLE magic | Fora de escopo (mensagem clara) |
| SMTP reunião | E-mail automático | — | Fora de escopo (PDF local) |

## Matriz

| Área | Caso | Severidade | Como reproduzir | Esperado | Auto / Manual | Owner | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | Login credenciais válidas | S1 | `/login` usuário ativo | Entra no startPage | Manual | — | |
| Auth | Sessão expirada em action | S2 | Action sem cookie | Mensagem de sessão | Manual | — | |
| Farol | Sub-abas Meus/Aux/Deleg/Vermelhos | S2 | `/farol?aba=` | Filtros corretos | Manual | — | |
| Farol | Menu célula Barras meta 0 | S2 | Item com goal 0 sem actual → Barras | Sem Meta em zero | Auto (`band-chart`) + Manual | — | |
| Farol | Drawer edição rápida | S2 | Editar medição no drawer | Persiste Medido/Real/Prev/Meta | Manual | — | |
| Farol | P / C / Valor | S3 | Grade anual | Colunas coerentes | Manual | — | |
| Medições | Grade mês × campos | S2 | `/medicoes` trocar ano/item | Colunas Quattrus | Manual | — | |
| Medições | Period lock | S1 | Ciclo fechado → editar | Bloqueio + mensagem | Auto (import) + Manual | — | |
| Medições | Mês futuro | S2 | Período > atual | Botão desabilitado / erro | Auto + Manual | — | |
| Cadastro | Faixa absoluta | S2 | Editar Tipo → Limite Sup/Inf | Farol ABSOLUTE | Manual | — | |
| Cadastro | Vigência de faixa | S2 | Mudar faixa em set.; checar ago. | Ago. inalterado | Manual | — | |
| Gantt | Drag etapa | S2 | `/fca/[id]` Gantt | Datas atualizam | Manual | — | |
| Gantt | Atraso em Tarefas | S2 | Etapa vencida | Aparece em `/tarefas` | Manual | — | |
| Aprovações | Meta inline | S2 | `/aprovacoes` editar + OK | Status aprovado | Manual | — | |
| Aprovações | Previsões Motivo/Solicitação | S3 | `/aprovacoes/previsoes` | Colunas preenchidas | Manual | — | |
| Gráficos | Farol = detalhe = multi | S2 | Mesmo KPI nos 3 | Mesma série Meta/Real/Faixa | Manual + Auto builder | — | |
| Gráficos | Multigráficos DnD | S3 | Arrastar quadrante | Swap persistido | Auto (swap) + Manual | — | |
| Import | Erro por linha | S2 | CSV com 1 linha ruim | Demais ok; erro no histórico | Auto + Manual | — | |
| Import | Fila ≥40 linhas | S3 | Lote grande | ENFILEIRADO → CONCLUIDO | Manual | — | |
| Import | Concorrência | S3 | 2 imports simultâneos | Segunda bloqueada | Manual | — | |
| Cálculo | Quociente denom 0 | S2 | Formula QUOTIENT denom=0 | Sem dado + mensagem | Auto | — | |
| Cálculo | Totalizador / ponderado | S2 | Pais SUM/WEIGHTED | Cascata correta | Auto `kpi-cascading` | — | |
| Agenda | Mini-calendário + hoje | S3 | `/agenda` | Navega e “Ir para hoje” | Manual | — | |
| Tarefas | Filtros + grupos | S3 | `/tarefas` status/origem | Agrupamento ATRASADAS… | Manual | — | |
| Preferências | Compacto/Expandido | S3 | `/preferencias` density | `data-density` muda | Manual | — | |
| Mobile | Farol + medições | S3 | Viewport ~390px | Sem overflow crítico | Manual | — | |
| E2E smoke | login→farol→medição→aprov→PDF | S1 | Conta de teste | Fluxo completo | Manual (checklist) | — | |
| Deploy | Hobby authorize | S2 | `vercel --prod` bloqueia | Commit authorize + redeploy | Manual | — | |

## Achados (preencher durante a caçada)

| Data | Área | Caso | Sev | Esperado | Atual | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | |

## Smoke E2E manual (Fase 9)

1. Login → tela inicial preferida.  
2. `/farol` → abrir Barras (meta real e meta 0).  
3. Lançar/editar medição no drawer.  
4. `/medicoes` — conferir grade e lock.  
5. `/aprovacoes` — aprovar meta inline.  
6. Export PDF reunião / medições.  
7. Logout.

## Automação existente

| Pacote | Comando | Cobre |
| --- | --- | --- |
| Unit | `npm test` | farol, band-chart, import, fórmula, multigráfico, smoke paridade |
| Typecheck | `npm run typecheck` | TS |
| Build | `npm run build` | Next prod |

Playwright E2E completo: adiado (sem suíte no repo); use a checklist acima até existir pipeline CI browser.
