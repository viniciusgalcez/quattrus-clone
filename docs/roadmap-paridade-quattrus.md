# Roadmap — Paridade funcional com o Quattrus

## Objetivo

Deixar o **Gestiona** (`quattrus-clone`) operacionalmente igual ao Quattrus
original (`quattrus.com`) para o dia a dia da Capricórnio: quem já usava o
Quattrus reconhece os mesmos fluxos e trabalha sem treinamento novo.

Criado em 2026-09-30. Fontes: [functional-mapping.md](./functional-mapping.md),
[naming-alignment.md](./naming-alignment.md), [roadmap-quattrus.md](./roadmap-quattrus.md).

> Não é cópia visual 1:1. Fidelidade funcional primeiro.

Espelho no Obsidian: `Projetos/Gestiona/Roadmap-Paridade-Quattrus.md`.

## Ponto de honestidade

**"Igual"** = paridade funcional essencial + corporativa. Não inclui chrome
decorativo nem multiempresa.

### Fora de escopo (decisão)

| Item | Motivo |
| --- | --- |
| Multiempresa / Empresa no login | Single-tenant Capricórnio |
| Importação `.xls` binário | Risco de segurança (SheetJS) |
| Quattrinha, Academy, cronômetro, idioma | Sem necessidade de negócio |
| Impersonation admin | Risco de autorização |
| E-mail automático da Reunião de Resultados | Sem SMTP no projeto |

### Divergências intencionais (manter)

| Gestiona | Quattrus | Por quê |
| --- | --- | --- |
| FCA (5 Porquês + Pareto) | Plano de Ação Gantt | Metodologia mais rica |
| Desdobramento, Period Lock, AuditLog | Sem equivalente exposto | Melhorias internas |

### Evidência conflitante

`phase-validation.md` (2026-09-12) marca quase tudo como validado. O estado
revisado em 2026-09-24/27 ainda lista gaps concretos. **Este roadmap segue o
estado mais recente.** Só marcar `[x]` o que for reconferido.

## Estado atual (resumo 2026-09-24/27)

| Área | Estado | Gap principal |
| --- | --- | --- |
| Segurança / auditoria / subordinação | Base ok | Revalidar na Fase 0 |
| Item de controle | Quase | Faixa absoluta (Limite Sup./Inf., Meta Cliente) |
| Dashboard | Parcial | Sub-abas + menu por célula + drawer |
| Medições | Parcial | Grade anual completa |
| FCA / Plano | Parcial | Gantt estilo Quattrus (sem remover FCA) |
| Aprovações | Parcial | Edição inline |
| Multigráficos / Agenda / Tarefas | Parcial | DnD, mini-calendário, filtros |
| Import / Export | Parcial | Tipos faltantes, fila assíncrona |
| Organização | Definida | Sem multiempresa |

## Decisões

| # | Decisão | Escolha |
| --- | --- | --- |
| D1 | Definição de "igual" | Fluxo e significado; UI Capricórnio |
| D2 | Plano de ação | Manter FCA; acrescentar Gantt como visão complementar |
| D3 | Faixa absoluta | Entra no escopo desta trilha |
| D4 | E-mail da Reunião | Fora até existir SMTP; PDF local basta |
| D5 | Ordem | Dashboard e medições antes de polish |

## Fases

### Fase 0 — Linha de base

- [x] Percorrer mapeamento Quattrus × código Gestiona — ver [fase-0-matriz-paridade.md](./fase-0-matriz-paridade.md)
- [x] Matriz: igual / parcial / ausente / fora de escopo (33 itens)
- [x] Produção confirmada: Vercel `https://quattrus-clone.vercel.app` + Supabase `quattrus-clone`
- [x] Nota em `phase-validation.md` / Obsidian: validação 12/09 não substitui a matriz
- [x] Capturas autenticadas no Vercel (inicio, farol, metas, medições, cadastro, aprovações, import/export)

**Pronto quando:** gap→fase com evidência. **Fase 0 concluída (2026-09-30).**

### Fase 1 — Cadastro do Item = Quattrus

- [x] Faixa absoluta: Limite Sup./Inf., Meta do Cliente, Referencial Amplitude
- [x] Conferir 7 abas vs. original
- [x] Tooltip Código / Indicador / Tipo / Vermelho Crônico / Descrição
- [x] Teste: mudar faixa em set. não altera farol de ago.

**Pronto quando:** mesmas opções de Tipo de Item do Quattrus (exceto exclusões escritas). **✅ Código 2026-10-01.**

### Fase 2 — Dashboard = Meus itens de controle

- [x] Sub-abas: Meus itens · Auxiliares · Delegados · Vermelhos da equipe
- [x] Menu por célula: Editar medição · Pareto · Barras
- [x] Drawer lateral de edição rápida
- [x] Coluna Valor (Realizado + Meta) + P / C
- [x] Performance: filtros por aba (virtualização adiada)

**Pronto quando:** usuário Quattrus lança medição sem treinamento novo. **✅ Código 2026-09-30 · merge checkpoint 2026-10-01.**

### Fase 3 — Medições anuais

- [x] Grade: Mês | Medido | Realizado | Previsto | Meta | Comentário | Benchmark
- [x] Navegação de ano e troca de item sem sair
- [x] Period lock em tela, URL e importação

**Pronto quando:** tela reconhecível por quem usava o Quattrus. **✅ Código 2026-10-01.**

### Fase 4 — Plano de ação (Gantt) sem matar o FCA

- [ ] Etapas + Gantt (visão Quattrus)
- [ ] Manter FCA automático fora da meta
- [ ] Anexos e impressão/exportação
- [ ] Atrasos em Tarefas / Notificações

**Pronto quando:** os dois modos existem e a UI explica quando usar cada um.

### Fase 5 — Aprovações e notificações

- [ ] Edição inline de meta
- [ ] Previsões: Motivo / Solicitação / Status
- [ ] Notificações: Delegadas · Pendentes · busca · Editar Todas

**Pronto quando:** gestor resolve a fila sem tela extra desnecessária.

### Fase 6 — Multigráficos, Agenda, Tarefas

- [ ] DnD nos quadrantes + gestão de abas
- [ ] Mini-calendário + "ir para hoje"
- [ ] Filtros/agrupamentos de tarefas
- [ ] Preferências compacto/expandido e toggles

**Pronto quando:** shell de apoio não força workaround.

### Fase 7 — Importação / Exportação

- [ ] Tipos faltantes (Periodicidade, Faixas, Item empresa, Plano…)
- [ ] Histórico com erros por linha
- [ ] Fila assíncrona para arquivos grandes
- [ ] Exportações com escopo de visibilidade (e-mail só se D4 mudar)

**Pronto quando:** import parcial inválido não corrompe dados.

### Fase 8 — Motor de cálculo e consistência

- [ ] Mesmo farol em dashboard / detalhe / multigráficos / export
- [ ] Regressão: quociente, totalizador, ponderado
- [ ] Denominador zero / mês futuro / sem dado — mensagem clara

**Pronto quando:** fixtures da Capricórnio passam e documentam cada cor.

### Fase 9 — Qualidade e entrega

- [ ] E2E: login → dashboard → medição → aprovação → PDF
- [ ] Revalidar mobile
- [ ] Validação de fases + CI + hardening (HTTPS/restore = infra)
- [ ] Atualizar este doc a cada marco

**Pronto quando:** marco M4 assinado com evidência.

## Marcos

| Marco | Inclui | Meta |
| --- | --- | --- |
| M1 — Sensação Quattrus | 0–3 | Dashboard + medições + cadastro |
| M2 — Operação completa | +4–5 | Desvio, FCA+Gantt, aprovações |
| M3 — Paridade corporativa | +6–8 | Shell, import/export, cálculo |
| M4 — Pronto para escala | 9 | E2E, mobile, validação formal |

## Riscos

| Risco | Efeito | Mitigação |
| --- | --- | --- |
| Validação "tudo ✅" antiga | Falso pronto | Fase 0 |
| Mexer no dashboard | Regressão | Isolar mudanças + testes |
| Dois escritores no worktree | Estado parcial | Um dono por branch |
| "Igual" = cópia visual | Desperdício | D1 |
| Gantt vs FCA | Confusão | D2 + texto na UI |

## Ordem

0 → 1 → 2 → 3 → 8 (leve paralelo) → 4 → 5 → 6 → 7 → 9.

## Status

Criado em 2026-09-30. **Marco M1 (Fases 0–3) implementado em 2026-10-01:**
Fase 2 mergeada no checkpoint; Fase 1 faixa absoluta + vigência; Fase 3 grade
colunar `/medicoes`. Smoke Vercel pós-deploy.

Produção: https://quattrus-clone.vercel.app · Supabase `quattrus-clone`.
