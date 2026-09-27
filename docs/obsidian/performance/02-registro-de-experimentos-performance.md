---
tags:
  - capri-gestiona
  - performance
  - registro
status: ativo
---

# Registro de experimentos de performance

Este arquivo evita que a equipe repita hipóteses descartadas e preserva as evidências das melhorias mantidas.

## Ambiente de referência

- **Aplicação:** Capri Gestiona
- **Stack:** Next.js 16, React 19, Prisma 6, Supabase/PostgreSQL e Vercel
- **URL/ambiente medido:**
- **Região Vercel:**
- **Região Supabase:**
- **Data:**
- **Versão/commit:**
- **Volume de dados usado:**
- **Condição de rede/dispositivo:**

## Linha de base

| Fluxo | Métrica | Amostras | p50 | p75 | p95 | Observações |
|---|---:|---:|---:|---:|---:|---|
| Login → início | TTFB |  |  |  |  |  |
| Página inicial | LCP |  |  |  |  |  |
| Página inicial | consultas/duração total |  |  |  |  |  |
| Metas | resposta total |  |  |  |  |  |
| Medições | resposta total |  |  |  |  |  |

## Experimentos

| Data | Hipótese | Alteração | Antes → depois | Variação/ruído | Veredito | Motivo | Referência |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  | mantido/revertido |  | commit/PR |

## Modelo de registro detalhado

### Experimento — título

- **Sintoma:**
- **Hipótese causal:**
- **Evidência inicial:**
- **Métrica primária:**
- **Métricas de segurança:** erros, correção dos dados, autorização, consumo de conexões e tamanho do bundle
- **Comando/procedimento da medição:**
- **Condições da linha de base:**
- **Mudança aplicada:**
- **Resultado antes:**
- **Resultado depois:**
- **Variação entre execuções:**
- **Testes executados:**
- **Veredito:** manter / reverter
- **Justificativa:**
- **Rollback:**
- **Próximo gargalo observado:**

## Consultas e índices

Para cada índice proposto, anexar o plano antes e depois sem valores sensíveis.

| Consulta lógica | Plano anterior | Índice/mudança | Plano posterior | Ganho | Custo de escrita | Veredito |
|---|---|---|---|---:|---|---|
|  |  |  |  |  |  |  |

## Orçamentos vigentes

| Indicador | Limite | Local da verificação | Ação ao exceder |
|---|---:|---|---|
| LCP p75 | 2,5 s | RUM/produção | abrir investigação |
| INP p75 | 200 ms | RUM/produção | capturar interação atribuída |
| CLS p75 | 0,1 | RUM/produção | localizar elemento causador |
| Leitura backend p95 | 500 ms | logs/APM | rastrear função e consultas |
| Consulta comum p95 | 200 ms | telemetria do banco | analisar plano |

## Ideias descartadas

Registre aqui mudanças revertidas para que não sejam sugeridas novamente sem evidência nova.

| Ideia | Resultado | Por que foi descartada | Quando reavaliar |
|---|---|---|---|
|  |  |  |  |
