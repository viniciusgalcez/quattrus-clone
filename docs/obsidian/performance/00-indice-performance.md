---
tags:
  - capri-gestiona
  - performance
  - engenharia
status: ativo
---

# Performance — Capri Gestiona

Base de trabalho para investigar e corrigir lentidão sem introduzir otimizações especulativas.

## Arquivos

- [[01-prompt-agente-diagnostico-lentidao]] — prompt pronto para executar com um agente programador.
- [[02-registro-de-experimentos-performance]] — histórico de medições, tentativas, ganhos e reversões.

## Regra central

> Medir → identificar → corrigir uma causa → medir novamente → manter ou reverter → criar proteção contra regressão.

Não aceitar como conclusão “parece mais rápido”. Toda melhoria mantida deve apresentar números comparáveis de antes e depois, com os testes do produto ainda verdes.
