# Fase 5 — Aprovações e notificações

**Data:** 2026-10-01
**Branch:** `feat/marco-m2-plano-aprovacoes`

## O que mudou

- `/aprovacoes`: meta **editável inline** (`InlineGoalApproveCell`) + aprovar
  com OK; lote “Aprovar todas” mantido.
- `/aprovacoes/previsoes`: colunas **Meses · Motivo · Solicitação · Concluído ·
  Status** (+ decisão).
- `/notificacoes`: rótulos **Delegadas** / **Pendentes**, busca e **Editar
  Todas**; `STEP_OVERDUE` entra em Pendentes.

## Impacto no servidor

- Migration: **não**
- `approveGoalWithValue` em `goal-approval.ts` (auditoria `via: inline`).

## Como testar

1. Como gestor, abrir `/aprovacoes`, alterar o valor da meta e confirmar OK.
2. Abrir `/aprovacoes/previsoes` e conferir colunas Motivo / Solicitação / Status.
3. Em `/notificacoes`, filtrar busca e usar Editar Todas com não lidas.
