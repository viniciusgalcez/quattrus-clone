# Fase 1 — Faixa absoluta no cadastro

**Data:** 2026-10-01
**Branch:** `chore/checkpoint-paridade-quattrus`

## O que mudou

- Schema: `ThresholdMode` (PERCENT|ABSOLUTE), `AmplitudeReference`, campos
  `upperLimit` / `lowerLimit` / `clientMetaFrom` / `clientMetaTo` /
  `amplitudeMonth` / `amplitudeYear` em `Kpi` e `KpiThresholdValidity`.
- Migration: `20261001120000_add_absolute_threshold_mode` (aplicada no Supabase `quattrus-clone`).
- Aba Tipo: radio Faixa Verde (limites absolutos vs %), Meta do Cliente, amplitude mês/ano; editor `%` só no modo PERCENT.
- `getKpiStatus` / `thresholdsForPeriod` resolvem modo absoluto por vigência (ago. intacto se set. abre nova janela).
- Tooltip no nome do item no farol: Código, Indicador, Tipo, Vermelho Crônico, Descrição.

## Impacto no servidor

- Migration Prisma: **sim** (já aplicada no Supabase do projeto).
- Env nova: **não**.

## Como testar

1. Editar item → Tipo → Limite Superior/Inferior → salvar vigência a partir de um mês.
2. Conferir farol de mês anterior à nova vigência (não muda).
3. Hover no nome no `/farol` → tooltip com código/descrição.
