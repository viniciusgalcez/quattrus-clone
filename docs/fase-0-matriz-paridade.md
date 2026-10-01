# Fase 0 — Matriz de paridade Quattrus × Gestiona

**Data:** 2026-09-30  
**Método:** inspeção do código do `quattrus-clone` contra
[functional-mapping.md](./functional-mapping.md) + smoke autenticado no Vercel.  
**Produção:** Vercel `https://quattrus-clone.vercel.app` (health 200) +
Supabase projeto `quattrus-clone` (`tbtqvhqntrwgaxjrtyao`, sa-east-1,
ACTIVE_HEALTHY).  
**Não feito:** login no `quattrus.com`. Capturas UI em Obsidian
`Projetos/Gestiona/capturas/fase0-*.png`.

Legenda: **Igual** · **Parcial** · **Ausente** · **Fora** · **Extra**

Espelho Obsidian: `Projetos/Gestiona/Fase-0-Matriz-Paridade.md`.

## Matriz gap → fase

| # | Capacidade (Quattrus) | Status | Evidência Gestiona | Fase |
| --- | --- | --- | --- | --- |
| G01 | Login usuário/senha | Igual* | NextAuth Credentials; *sem Empresa | — / Fora multiempresa |
| G02 | Multiempresa no login | Fora | Single-tenant Capricórnio | — |
| G03 | Shell módulos principais | Parcial | Rotas em `src/app/(app)/` | 6 |
| G04 | Quattrinha / Academy / cronômetro / idioma | Fora | Sem necessidade de negócio | — |
| G05 | Notificações Delegadas / Pendentes | Parcial | `/notificacoes` | 5 |
| G06 | Grid Meus itens (P, C, 12 meses, Valor, hierarquia) | Igual* | `FarolTreeGrid` P/C/Valor; *smoke deploy | — / 9 |
| G07 | Sub-abas Auxiliares / Delegados / Vermelhos | Igual* | `/farol?aba=` + `farol-tabs.ts` | — / 9 |
| G08 | Menu célula: Editar / Pareto / Barras | Igual* | `KpiCellMenu` | — / 9 |
| G09 | Drawer edição rápida completo | Igual* | Drawer + Medido/Realizado/Previsto/Meta/Comentário | — / 9 |
| G10 | Menu linha ⋮ | Igual* | `KpiRowMenu.tsx` | — |
| G11 | Cadastro 7 abas | Parcial* | Editar + `KpiConfigurationTabs` (Dados + 6 config); faixa absoluta na aba Tipo | 1 |
| G12 | Faixa absoluta (Limite Sup./Inf., Meta Cliente) | Igual* | `thresholdMode` PERCENT\|ABSOLUTE + limites/amplitude | — / 9 |
| G13 | Limite das cores visual (%) | Igual | `KpiThresholdEditor.tsx` | — |
| G14 | Fórmula / quociente / totalizador / vigências | Igual* | Schema + abas | 8 |
| G15 | Medições anuais grade completa | Igual* | `/medicoes` grade colunar item×ano + period lock | — / 9 |
| G16 | Period lock | Extra | Existe | — |
| G17 | Gantt arrastável | Parcial | `ActionPlanGantt` barras mensais sem drag | 4 |
| G18 | FCA 5 Porquês | Extra | Manter (D2) | — |
| G19 | Aprovação metas inline + lote | Parcial | Lote+botão; sem inline | 5 |
| G20 | Aprovação previsões | Parcial | `/aprovacoes/previsoes` | 5 |
| G21 | Multigráficos + DnD | Parcial | Abas/slots por form; sem DnD | 6 |
| G22 | Agenda mini-calendário + hoje | Parcial | Dia/semana/mês | 6 |
| G23 | Tarefas filtros/agrupamentos | Parcial | `/tarefas` | 6 |
| G24 | Preferências dashboard | Parcial | `/preferencias` | 6 |
| G25 | Import 6 tipos | Igual* | `import-actions.ts`; síncrono | 7 |
| G26 | Import `.xls` binário | Fora | Segurança | — |
| G27 | Import assíncrono | Ausente | Job na mesma request | 7 |
| G28 | Export CSV/XLSX/PDF | Igual* | Sem e-mail (Fora SMTP) | — |
| G29 | Farol AZUL | Ausente* | Enum existe; app não grava | 2/8 |
| G30 | Admin / subordinação / perfis | Igual* | Rotas admin | — |
| G31 | Impersonation | Fora | Risco | — |
| G32 | Desdobramento / AuditLog / Health | Extra | Manter | — |
| G33 | Segurança escopo | Igual* | Revalidar Fase 9 | 9 |

## Contagem

| Status | Qtd |
| --- | --- |
| Igual / Igual* | 12 |
| Parcial | 12 |
| Ausente | 2 |
| Fora | 5 |
| Extra | 3 |

## Prioridade após Fase 0

1. Fase 1 — G12 (faixa absoluta)  
2. Fase 3 — G15  
3. Fase 5 — G19, G20, G05  
4. Fase 4 — G17  
5. Fases 6–8  
6. Fase 9 (inclui smoke deploy da Fase 2)  

## Capturas (Vercel — 2026-09-30)

Smoke autenticado concluído (conta temporária desativada ao fim). Espelho
Obsidian: `Projetos/Gestiona/capturas/`.

| Alvo | Status |
| --- | --- |
| `/inicio` | ✅ |
| `/farol` (grid + KPI) | ✅ |
| `/metas` | ✅ |
| `/medicoes` | ✅ |
| `/metas/[id]/editar` | ✅ |
| `/aprovacoes` | ✅ |
| `/importacao-exportacao` | ✅ |

## Limitações

Sem portal Quattrus original aberto. Gestiona em produção no Vercel está
saudável e as capturas autenticadas da Fase 0 estão feitas. Smoke amplo /
E2E fica na Fase 9. Docker local é opcional — não é o ambiente de produção.
