# Fase 3 — Grade anual de medições

**Data:** 2026-10-01
**Branch:** `chore/checkpoint-paridade-quattrus`

## O que mudou

- `/medicoes` reescrito: seletor de item + ano (`?ano=&kpi=`), grade
  **Mês | Medido | Realizado | Previsto | Meta | Comentário | Benchmark | Farol**.
- Banner e badge de **period lock**; meses futuros e fechados bloqueados na UI
  (save continua validado por `assertPeriodWritable`).
- Reuso de `upsertAnnualMeasurement`.

## Impacto no servidor

- Migration: **não** (reusa campos anuais já existentes).
- Env nova: **não**.

## Como testar

1. Abrir `/medicoes`, trocar item e ano sem sair da rota.
2. Editar um mês aberto; tentar mês futuro (disabled) e mês fechado (bloqueio).
