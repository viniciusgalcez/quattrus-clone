# Fase 2 — Dashboard farol com paridade Quattrus

**Data:** 2026-09-30
**Branch:** `feat/fase-2-dashboard-farol`

## O que mudou

- Sub-abas no farol: **Meus itens**, **Auxiliares**, **Delegados**, **Vermelhos da equipe** (`/farol?aba=…`). Preferências `showDelegated` / `showTeamReds` controlam se as abas extras aparecem.
- Menu por célula do mês: **Editar medição**, **Gráfico de pareto** (abre FCA), **Gráfico de barras**.
- Edição rápida virou **drawer lateral** com Medido, Realizado, Previsto, Meta (travada se já existir) e Comentário.
- Colunas **P** (prioridade), **C** (KPI/PMB) e **Valor** (realizado grande + meta pequena).

## Por que

Fechar o maior gap de sensação “é o Quattrus” (Fase 2 do roadmap de paridade): quem já usava o original reconhece as mesmas abas e o fluxo de lançar medição a partir da bolinha.

## Impacto no servidor

- Precisa rebuild da imagem Docker? **Não** (deploy Vercel; rebuild automático no push/merge)
- Tem migration de banco (`prisma/migrations`)? **Não**
- Precisa de variável de ambiente nova ou alterada? **Não**
- Precisa reiniciar algum serviço/container além do `web`? **Não**
- Algum passo manual antes ou depois do deploy (seed, script, backup)? **Não** — só smoke visual em `/farol` após o deploy

## Como testar

1. Abrir `https://quattrus-clone.vercel.app/farol` (após deploy) e trocar as abas.
2. Clicar numa bolinha do mês atual → menu → Editar → salvar no drawer.
3. Conferir colunas P, C e Valor na grade.
4. Preferências: desligar “Delegados” / “Vermelhos da equipe” e ver as abas sumirem.

## Riscos / rollback

- Escopo das abas (ex.: item auxiliar vs principal) pode precisar de ajuste fino com dados reais.
- Rollback: `git revert` do merge do PR — sem migration, sem env.
