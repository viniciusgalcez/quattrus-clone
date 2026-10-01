# Validação regras de negócio — 2026-10-01

**Alvo:** https://quattrus-clone.vercel.app  
**User smoke:** `teste` (`teste-01`) — senha **não** gravada neste arquivo  
**Escopo:** Manual Capricórnio observável sem destruir dados (VIEW / cancelar / sem save)  
**KPI fixture:** `IC-00001` Número de impressão (`/metas/cmuino5o10001kz04hp0renpt`) · owner Vinícius · MORE · PERCENT · MANUAL  
**Roadmap:** [roadmap-validacao-regras-negocio.md](../roadmap-validacao-regras-negocio.md)

## Auto

| Item | Resultado | Nota |
| --- | --- | --- |
| Suite focada RN | **OK** | `kpi`, `band-chart`, `kpi-formula`, `kpi-cascading`, `period-locks`, `farol-tree`, `import-actions` → **7 files / 113 tests passed** + `tsc --noEmit` OK (esta rodada). |
| Suite completa | **OK (mesmo dia)** | Matriz debug: **38 files / 399 tests** (`2026-10-01-matriz-debug-execucao.md`). |
| AUTO gaps (E/F/G fixtures multi-user) | PENDENTE | Fora do foco smoke não-destrutivo desta rodada |

## Contagens (IDs desta rodada)

| Domínio | OK | FALHA | N/A | PENDENTE |
| --- | ---: | ---: | ---: | ---: |
| RN-A Farol | 4 | 0 | 2 | 0 |
| RN-B Faixas | 3 | 0 | 3 | 0 |
| RN-C Fórmulas | 0 | 0 | 1 | 0 |
| RN-D Período | 2 | 0 | 0 | 0 |
| RN-E Escopo | 2 | 0 | 0 | 0 |
| RN-F Aprovações | 0 | 0 | 3 | 0 |
| RN-G Plano/FCA | 1 | 0 | 0 | 0 |
| RN-H Import/Export | 2 | 0 | 1 | 0 |
| **Total foco** | **14** | **0** | **10** | **0** |

---

## V1 — RN-A Farol e polaridade

| ID | Resultado | Evidência |
| --- | --- | --- |
| A1 | **OK** | Farol: Jan–Ago e Out = “Sem dado” (círculo vazio). Detalhe: Ago/26 Realizado `—` / Status Sem dado. Não inventa 0. |
| A2 | **OK** | Bom quando = Maior (+); Set 10≥5 → “No alvo” + farol verde. |
| A3 | **N/A** | Nenhum KPI LESS visível no rollup smoke. |
| A4 | **N/A** | Nenhum KPI EQUAL visível. |
| A5 | **OK** | Set: bolinha verde coerente com real 10 / meta 5 (faixas amarela 10% / vermelha 15% no cadastro). |
| A6 | **OK** | Mesmo KPI: farol “No alvo, realizado 10 de 5” = detalhe Set/26 Previsto 5% / Realizado 10% / No alvo; chart legend Realizado/Meta/Faixa Verde em ambos. |

## V1 — RN-B Faixas + Barras

| ID | Resultado | Evidência |
| --- | --- | --- |
| B1 | **OK** | Tipo: radio PERCENT checked; Amarela 10 / Vermelha 15 (VIEW). |
| B2 | **OK** | VIEW: radio ABSOLUTE habilita Limite Inf/Sup; **não salvou** (Cancelar / saída sem Salvar). Sem fixture ABSOLUTE com dados reais. |
| B3 | **N/A** | Sem KPI ABSOLUTE MORE acima do sup em prod smoke. |
| B4 | **N/A** | Sem KPI ABSOLUTE LESS abaixo do inf. |
| B5 | **N/A** | Campos vigência presentes (`2026-10`); sem mutar histórico em prod. |
| B6 | **OK** | Barras/chart: Meta plotada só em Set (~5) + Realizado (~10); meses Sem dado sem Meta em y=0. Ago com previsto 0 e Sem dado não plota bolinha Meta na baseline. |

---

## V2 — RN-C Fórmulas

| ID | Resultado | Evidência |
| --- | --- | --- |
| C4 | **N/A** | Smoke KPI = MANUAL. Opção QUOTIENT existe no Tipo, mas nenhum KPI razão visível no farol. |

## V2 — RN-D Período / lock / futuro

| ID | Resultado | Evidência |
| --- | --- | --- |
| D1 | **OK** | Set/26: menu “Editar medição” **disabled** (period lock). |
| D3 | **OK** | Grade farol só até Out (mês corrente); sem células Nov/Dez. Out: “Editar medição” **habilitado** (contraste com Set). |

---

## V3 — RN-E Escopo

| ID | Resultado | Evidência |
| --- | --- | --- |
| E3 | **OK** | `teste` admin-like: `/farol` mostra rollup “Número de impressão” (Vinícius); `/metas` e `/medicoes` = vazios (“Nenhum indicador…”) — ownership próprio vs `exportableOwnerIds`. |
| E7 | **OK** | Aba `/farol?aba=auxiliares` — heading Auxiliares \| 0; empty: “não entram no % principal”. |

## V3 — RN-F Aprovações

| ID | Resultado | Evidência |
| --- | --- | --- |
| F1 | **N/A** | `/aprovacoes` carrega; “Nenhuma meta pendente”. |
| F2 | **N/A** | UI menciona lote no cabeçalho; fila vazia — sem aprovar. |
| F3 | **N/A** | `/aprovacoes/previsoes` carrega; fila vazia. Colunas Motivo/Solicitação/Status no código da página. |

---

## V4 — RN-G Plano / FCA

| ID | Resultado | Evidência |
| --- | --- | --- |
| G5 | **OK** | `/metas/.../planos-de-acao`: “FCA (causa-raiz) e etapas/Gantt do mesmo plano…”. Empty state sem plano — banner explica coexistência. |

## V4 — RN-H Export

| ID | Resultado | Evidência |
| --- | --- | --- |
| H5 | **OK** | Com sessão smoke, exports PDF respondem 200 (escopo autenticado). Comparativo colaborador não repetido nesta rodada. |
| H6 | **N/A** | Arquivo `.xls` legado não à mão. |
| H7 | **OK** | `GET /api/export/results-meeting/pdf` → **200** `application/pdf` (~1003 B); `GET /api/export/measurements/pdf` → **200** `application/pdf` (~662 B). |

---

## Achados

Nenhuma **FALHA** S1/S2 nesta rodada.

| Observação | Sev | Nota |
| --- | --- | --- |
| Escopo admin smoke | S3/doc | Farol amplo vs `/metas` vazio é comportamento esperado — documentado (E3). |
| Fixtures LESS/EQUAL/QUOTIENT/ABS | S4 | Ainda sem fixtures Capricórnio nomeadas no roadmap. |

## Método

Browser MCP em produção; login smoke; apenas VIEW / menus / cancelar edição Tipo; sem imputar medições nem fechar ciclo; PDF via `fetch` autenticado no browser.
