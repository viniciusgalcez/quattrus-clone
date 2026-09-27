# Blindagem de server actions contra crash de frontend

**Data:** 2026-09-27
**Branch:** chore/checkpoint-paridade-quattrus

## O que mudou

- **`upsertMeasurementSafe`** (actions.ts) — novo wrapper void que captura exceções de `upsertMeasurement`, usado como `<form action>` na tela de metas em vez do `upsertMeasurement` direto que jogava erros não tratados
- **`createDelegation`** (actions.ts) — `requireUser()` agora dentro de try/catch, retorna `FormActionState` com mensagem de erro em vez de estourar
- **`createFacilitation`** (actions.ts) — mesmo tratamento de `requireUser()`
- **`duplicateKpi`** (duplicate-kpi.ts) — `requireUser()` e `assertKpiEditable()` dentro de try/catch
- **4 funções de multigráficos** (multigraficos-actions.ts) — try/catch com redirect fora do bloco
- **6 funções de importação** (import-actions.ts) — helper `safeRequireImportUser()` centralizado
- **`ForecastRequestForm`** — agora verifica `ActionResult.ok` antes de mostrar sucesso
- **`DelegacaoItemForm`** — resultado de `removeDelegation` exibido como feedback visual
- **Novo agente** `browser-test.md` — automação E2E usando browser tools do Claude Code

## Por que

Usuários reportavam que o frontend "bugava tudo" ao clicar em indicadores ou salvar medições. A causa raiz: server actions jogavam exceções (`requireUser`, `assertKpiEditable`, validações) que o React em produção transformava em "Minified React error #441", ativando o error boundary e travando a tela inteira.

## Impacto no servidor

- Precisa rebuild da imagem Docker? Sim (código alterado)
- Tem migration de banco? Não
- Precisa de variável de ambiente nova? Não
- Precisa reiniciar serviço além do web? Não
- Passo manual antes/depois do deploy? Nenhum

## Como testar

1. Fazer login no Gestiona
2. Ir em Metas > clicar em qualquer indicador — a tela deve carregar normalmente
3. Na tela de Metas, salvar uma medição com ciclo fechado — deve mostrar mensagem no error boundary (não "Minified React error")
4. Na tela de Medições anuais, clicar no lápis de edição — modal deve abrir sem crash
5. Testar delegação: adicionar e remover delegado — feedback visual correto

## Riscos / rollback

Risco baixo. As funções internas mantêm o mesmo comportamento (throws), apenas os pontos de entrada de form action agora capturam as exceções. Rollback: `git revert` do commit de merge, sem passo extra.
