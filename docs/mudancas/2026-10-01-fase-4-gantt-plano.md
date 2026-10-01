# Fase 4 — Plano de ação (Gantt) sem matar o FCA

**Data:** 2026-10-01
**Branch:** `feat/marco-m2-plano-aprovacoes`

## O que mudou

- `ActionPlanGantt` virou cliente com barras **arrastáveis** (mover / resize
  mensal) e seletor de ano; cores por status e atraso.
- Banner no `/fca/[measurementId]` explica **quando usar FCA vs Gantt** (D2).
- Anexos + Imprimir mantidos; CSS `@media print` para o bloco do plano.
- Etapas atrasadas: notificação `STEP_OVERDUE`, seção em `/tarefas`, contagem
  em `/metas/[id]/planos-de-acao`.

## Impacto no servidor

- Migration: **não**
- Env nova: **não**
- Actions: `updateActionPlanStepDates`; create/update de etapa notificam atraso
  e revalidam FCA / tarefas / notificações.

## Como testar

1. Abrir um FCA com plano, adicionar etapa com início/fim e arrastar a barra.
2. Confirmar que o formulário FCA (5 Porquês) continua editável acima.
3. Colocar `dueDate` no passado → badge em Tarefas e notificação Pendentes.
