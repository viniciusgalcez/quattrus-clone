# Consertos — farol absoluto consistente + ActionResult

**Data:** 2026-10-01  
**Objetivo:** farol / detalhe / export / import / cascata usam a mesma regra
(PERCENT ou ABSOLUTE + vigência) e actions de formulário deixam de engolir erros.

## O que mudou

1. **`statusForKpiPeriod`** em `kpi.ts` — entrada única para classificar por período.
2. Call sites alinhados: `farol`, `kpi-tree`, `kpi-cascading`, `/metas`, detalhe,
   painel, equipe, departamentos, PDF reunião, `decideMeasurementWrite` + import.
3. Gráfico do detalhe do KPI usa `absoluteLimits` no `buildBandPoint` quando ABSOLUTE.
4. Actions que eram `Promise<void>` e descartavam `handleActionError` passam a
   retornar `ActionResult` (medição safe, plano/etapas, previsão, projeto, etc.).
5. Preferências/notificações (lote anterior) mantidas.

## Fora deste lote (não quebram o fluxo atual)

- Farol AZUL (enum só para leitura legada — decisão de schema)
- Gantt por dia / Playwright E2E / SMTP / .xls

## Testes

`npm test` + `npm run typecheck` após o lote.
