# Roadmap tecnico para aderencia ao Quattrus

Este documento transforma o mapeamento funcional do Quattrus em uma trilha de
desenvolvimento para o `quattrus-clone`. A meta e reproduzir os fluxos,
conceitos e comportamentos operacionais do Quattrus dentro da ferramenta
interna, mantendo implementacao propria, segura e sustentavel.

Fonte principal: [functional-mapping.md](./functional-mapping.md).

## Principios do produto

1. **Fidelidade funcional antes de fidelidade visual**
   - O usuario deve reconhecer os mesmos processos: itens de controle,
     medicoes, farol, plano de acao, aprovacao, delegacao, facilitacao,
     importacao e exportacao.
   - A UI pode ser mais moderna, mas nao deve mudar o significado das acoes.

2. **Regra critica sempre no servidor**
   - Permissoes, calculos, travas de periodo, aprovacao, importacao e
     arquivamento devem ser validados no backend/server actions.
   - A interface pode esconder botoes, mas nunca deve ser a unica protecao.

3. **Modelo preparado para historico**
   - Indicadores mudam ao longo do tempo: faixa verde, formula, vigencia,
     totalizacao e responsaveis precisam preservar historico.
   - Excluir deve ser excecao; arquivar e auditar deve ser o fluxo padrao.

4. **Gestao por excecao**
   - O sistema deve destacar pendencias: vermelho, critico, FCA aberto,
     aprovacao pendente, tarefa atrasada e importacao com erro.

5. **Seguranca e auditoria como requisito de produto**
   - Toda operacao sensivel deve registrar quem fez, quando fez e qual objeto
     foi afetado.
   - Permissoes devem ser testadas contra acesso direto por URL, formulario e
     importacao.

## Estado atual resumido

| Area | Estado | Observacao |
| --- | --- | --- |
| Login | Parcial | Login por usuario/senha existe; ainda falta campo Empresa/multiempresa. |
| Usuarios | Parcial | Admin gerencia usuarios, hierarquia e departamentos. |
| Itens de controle | Quase concluida | Confirmado em 2026-09-24 contra o schema Prisma real: `Kpi` ja tem codigo (`sequenceNumber`), categoria PMB/KPI, cliente, bom-para, vermelho cronico, casas decimais, coeficiente, auxiliar, compartilhamento; `KpiValidity`/`KpiMeasurementPeriod`/`KpiThresholdValidity`/`KpiFormula`/`KpiDependency`/`KpiLinkedItem` existem; as 6 abas do cadastro (Tipo/Totalizacao/Vinculacao/Compartilhamento/Periodo/Dependencias) ja estao implementadas em `KpiConfigurationTabs`. Falta so o modo de faixa absoluta (Limite Sup./Inf., Meta do Cliente) do original — a Fase 2 abaixo estava desatualizada nesse ponto. |
| Medicoes | Parcial | Lancamento mensal existe; falta grade anual estilo Quattrus com medido/previsto/meta/comentario por mes. |
| Farol | Parcial | Existe visao anual; precisa aproximar interacoes, filtros e painel lateral. |
| Dashboard | Parcial | Grid "Meus itens de controle" (`FarolTreeGrid`) tem hierarquia, 12 meses, bolinhas de status e coluna Meta. Desde 2026-09-24 tem tambem menu por linha (Ver item/Editar item/Plano de acao/Anexos, via `KpiRowMenu`) com paginas dedicadas `/metas/[id]/planos-de-acao` e `/metas/[id]/anexos`. Falta ainda: menu por celula (Pareto/grafico de barras nas celulas ja medidas) e as sub-abas Meus itens auxiliares/Itens delegados/Vermelhos da equipe (hoje tudo aparece numa arvore so). |
| FCA / Plano de acao | Parcial | FCA existe; falta Gantt/etapas/anexos e paridade com Plano de Acao (divergencia de metodologia intencional, ver naming-alignment.md). |
| Aprovacoes | Parcial | Metas e previsoes existem, com aprovacao em lote. Falta edicao inline na grid. |
| Multigraficos | Parcial | Compara ate 4 com abas salvas por usuario (`MultiChartTab`), layout 2x2 persistente. Falta drag-and-drop e tela dedicada de gerenciamento de abas. |
| Agenda | Parcial | Views dia/semana/mes existem; falta mini-calendario e "ir para hoje". |
| Tarefas | Parcial | 5W2H avulso existe; falta filtros e agrupamentos equivalentes. |
| Importacao | Parcial | CSV/XLSX ate 15MB; XLS binario legado deliberadamente fora de escopo (risco de seguranca, ver naming-alignment.md). Falta processamento assincrono. |
| Exportacao | Parcial | CSV/XLSX/PDF existem; Reuniao de Resultados em PDF ja inclui grafico embutido. Falta envio por e-mail (sem infraestrutura de SMTP no projeto). |
| Auditoria | Parcial | Ha conceito no schema/docs; deve cobrir todas as acoes criticas. |
| Organizacao | Definida | Escopo fixo para Capricornio Textil S/A; nao havera troca de empresa no login (multiempresa fora de escopo). |
| Subordinacao | Concluida | Multi-gestor com um Principal (`Subordination`), UI em "Configurar Subordinacao". |

## Fase 1 - Fundacao de seguranca e governanca

Objetivo: deixar a base pronta para evoluir sem reabrir brechas de acesso.

### Entregaveis

- Matriz unica de permissoes por perfil: `ADMIN`, `GESTOR`, `COLABORADOR`,
  facilitador e delegado.
- Helper central para leitura escopada, equivalente ao que ja existe para
  escrita.
- Auditoria padronizada para:
  - login/logout falho ou sucesso, quando aplicavel;
  - criacao/edicao/arquivamento/restauracao de item;
  - lancamento de medicao;
  - aprovacao de meta/previsao;
  - delegacao/facilitacao;
  - importacao/exportacao;
  - exclusao definitiva.
- Rate limit para login, importacao e endpoints sensiveis.
- Checklist de hardening de producao:
  - `AUTH_SECRET` obrigatorio;
  - senha forte de banco;
  - HTTPS no proxy;
  - cookies seguros;
  - backups;
  - logs sem senha/token/dados sensiveis.

### Criterios de aceite

- Usuario nao consegue acessar dados de outro usuario alterando URL ou payload.
- Toda permissao critica tem teste automatizado.
- Importacao nao consegue contornar as mesmas regras da tela.
- Lint, testes e typecheck rodam no CI.

## Fase 2 - Modelo completo de Item de Controle

Objetivo: aproximar o cadastro do item ao Quattrus real.

### Entregaveis

- Expandir `Kpi` para conceitos do Quattrus:
  - codigo;
  - categoria `PMB`/`KPI`;
  - cliente;
  - bom para;
  - vermelho cronico;
  - casas decimais;
  - coeficiente;
  - auxiliar;
  - compartilhamento;
  - vigencia do item;
  - vigencia das medicoes.
- Criar entidades para configuracoes historicas:
  - `KpiValidity`;
  - `KpiMeasurementPeriod`;
  - `KpiThresholdValidity`;
  - `KpiFormula`;
  - `KpiDependency`;
  - `KpiLinkedItem`.
- Implementar abas do cadastro:
  - Dados Basicos;
  - Tipo de Item;
  - Totalizacao;
  - Vinculacao;
  - Compartilhamento;
  - Periodo;
  - Dependencias.

### Criterios de aceite

- Alterar uma faixa ou formula em setembro nao muda o calculo historico de agosto.
- Um item usado por outro aparece em Dependencias antes de arquivar/excluir.
- Ciclos de dependencia continuam bloqueados.
- Testes cobrem formula, totalizacao e vigencia.

## Fase 3 - Motor de calculo do Quattrus

Objetivo: calcular status, meta, previsto e realizado com regras equivalentes
ao Quattrus.

### Entregaveis

- Motor unico para status mensal e anual.
- Suporte a:
  - meta por soma de periodos;
  - meta por media de periodos;
  - comparacao mes a mes;
  - KPI manual;
  - KPI por soma;
  - KPI por media;
  - KPI ponderado;
  - quociente numerador/denominador;
  - denominador com media;
  - totalizador de itens subordinados.
- Recalculo em cascata com fila ou transacao controlada.
- Tratamento claro para ausencia de dado, denominador zero e mes futuro.

### Criterios de aceite

- Mesmo conjunto de medicoes gera o mesmo farol em dashboard, detalhe,
  multigraficos e exportacao.
- Recalculo de filho atualiza pai sem duplicar medicoes.
- Erros de formula aparecem de forma amigavel, sem quebrar a tela.

## Fase 4 - Dashboard principal fiel ao Quattrus

Objetivo: transformar a primeira tela operacional em uma grade de controle
parecida com o Quattrus.

### Entregaveis

- Grid "Meus Itens de Controle" com:
  - prioridade;
  - categoria;
  - nome/unidade;
  - 12 meses;
  - status por bolinha;
  - valor realizado/meta;
  - hierarquia expansivel.
- Sub-abas:
  - Meus itens de controle;
  - Meus itens auxiliares;
  - Itens delegados;
  - Vermelhos da equipe.
- Menu por celula:
  - Editar medicao;
  - Grafico de pareto;
  - Grafico de barras.
- Menu por linha:
  - Editar item;
  - Medicoes;
  - Grafico do item;
  - Plano de acao;
  - Anexos.
- Drawer lateral para edicao rapida de medicao.

### Criterios de aceite

- Um usuario Quattrus consegue lancar uma medicao sem treinamento novo.
- A grade continua performatica com centenas de itens.
- Botoes e menus respeitam permissoes reais do servidor.

## Fase 5 - Medicoes anuais e travas de periodo

Objetivo: aproximar o fluxo de medicoes do Quattrus e garantir governanca.

### Entregaveis

- Tela anual de medicoes por item:
  - mes;
  - medido;
  - realizado;
  - previsto;
  - meta;
  - comentario;
  - benchmark;
  - valor benchmark.
- Navegacao de ano.
- Seletor de item sem sair da tela.
- Period lock por empresa/departamento/item, conforme decisao de produto.

### Criterios de aceite

- Periodo fechado nao aceita edicao por tela, URL ou importacao.
- Comentario e estado medido sao preservados por mes.
- Mudancas relevantes entram em auditoria.

## Fase 6 - Plano de acao completo

Objetivo: alinhar FCA atual com o modulo de Plano de Acao/Gantt do Quattrus.

### Entregaveis

- Plano com etapas hierarquicas.
- Campos 5W2H por etapa ou plano, conforme regra escolhida.
- Responsavel, inicio, fim, status e valor.
- Visual Gantt.
- Anexos por item e por plano.
- Impressao/exportacao do plano.

### Criterios de aceite

- Item fora da meta abre ou sugere plano conforme regra configurada.
- Plano concluido remove pendencia de excecao.
- Etapas atrasadas aparecem em tarefas/notificacoes.

## Fase 7 - Aprovacoes e notificacoes

Objetivo: reproduzir filas pendentes do Quattrus.

### Entregaveis

- Aprovacao de metas:
  - edicao inline da meta proposta;
  - aprovacao individual;
  - aprovacao em lote.
- Aprovacao de previsoes:
  - meses;
  - motivo;
  - solicitacao;
  - status.
- Painel de notificacoes:
  - acoes delegadas;
  - acoes pendentes;
  - busca;
  - editar todas.

### Criterios de aceite

- Gestor ve somente pendencias da sua equipe.
- Admin pode auditar todas.
- Colaborador nao aprova a propria meta.

## Fase 8 - Importacao e exportacao em nivel Quattrus

Objetivo: tornar entrada e saida de dados robustas para uso real.

### Entregaveis

- Importacao com tipos:
  - Medicao;
  - Periodicidade;
  - Item de controle novo;
  - Faixas de controle;
  - Item empresa;
  - Plano de acao.
- Suporte a CSV, TXT, XLS e XLSX.
- Historico de importacoes:
  - arquivo;
  - tipo;
  - inicio;
  - conclusao;
  - status;
  - erros por linha.
- Processamento assincrono para arquivos maiores.
- Exportacoes:
  - Medicoes em XLSX;
  - Itens de controle em XLSX;
  - Reuniao de resultados em PDF.

### Criterios de aceite

- Uma importacao parcialmente invalida mostra relatorio claro sem corromper dados.
- Exportacao respeita escopo de visibilidade.
- Exportacao de reuniao gera artefato reprodutivel e auditavel.

## Fase 9 - Agenda, tarefas e preferencias pessoais

Objetivo: completar funcionalidades de apoio do shell Gestiona.

### Entregaveis

- Agenda mensal/semanal/diaria.
- Filtros por categoria.
- Participantes em eventos.
- Tarefas com filtros, agrupamento e relacao com planos.
- Configuracoes pessoais:
  - dados pessoais;
  - modo expandido/compacto;
  - numero de meses;
  - meses em branco;
  - data base;
  - delegados;
  - vermelhos da equipe.
- Avatar/foto de perfil com limite de tamanho e tipo.

### Criterios de aceite

- Preferencias alteram a grade sem mudar dados de negocio.
- Upload valida tipo, tamanho e permissao.
- Eventos e tarefas respeitam dono/responsavel/participante.

## Fase 10 - Administracao da Capricornio Textil S/A e perfis avancados

Objetivo: consolidar a administracao e as regras de acesso da Capricornio
Textil S/A sem introduzir multiempresa.

### Entregaveis

- Identidade e configuracoes institucionais da Capricornio Textil S/A.
- Login somente com usuario e senha.
- Departamentos e setores da empresa.
- Itens, medicoes, planos, agenda e tarefas vinculados ao contexto interno da empresa.
- Perfis configuraveis:
  - nome;
  - tipo;
  - permissoes granulares.
- Tela administrativa da empresa.

### Criterios de aceite

- Um usuario somente acessa dados permitidos dentro da Capricornio Textil S/A.
- Administradores gerenciam usuarios, departamentos e configuracoes internas.
- Todas as queries sensiveis respeitam o perfil, a hierarquia e o departamento.

## Ordem sugerida de execucao

1. Fundacao de seguranca e auditoria.
2. Modelo completo de Item de Controle.
3. Motor de calculo.
4. Dashboard principal.
5. Medicoes anuais e travas de periodo.
6. Plano de acao completo.
7. Aprovacoes e notificacoes.
8. Importacao/exportacao avancada.
9. Agenda, tarefas e preferencias.
10. Administracao da Capricornio Textil S/A e perfis avancados.

## Backlog tecnico transversal

- CI com `npm test`, `npx tsc --noEmit` e `npm run lint`.
- Corrigir pendencias atuais de lint antes de exigir lint bloqueante.
- Seeds separados:
  - desenvolvimento com dados demo;
  - producao apenas com admin inicial;
  - massa de teste para performance.
- Testes end-to-end dos fluxos principais.
- Observabilidade:
  - healthcheck;
  - logs estruturados;
  - metricas de erro;
  - tempo de importacao/exportacao;
  - tempo de renderizacao do dashboard.
- Backups e restore testado.
- Politica de retencao para anexos, logs e auditoria.

## Marcos de entrega sugeridos

### MVP Operacional

Inclui Fases 1, 4 parcialmente, 5 parcialmente e 7 parcialmente.

Meta: usuarios conseguem acompanhar itens, lancar medicoes, ver farol, tratar
desvios e aprovar metas com seguranca.

### Paridade Funcional Essencial

Inclui Fases 2, 3, 6 e 8 parcialmente.

Meta: o sistema passa a representar o modelo real do Quattrus, incluindo
formulas, totalizadores, historico e exportacoes principais.

### Paridade Corporativa

Inclui Fases 8 completa, 9 e 10.

Meta: uso por multiplas areas da Capricornio Textil S/A, com administracao avancada,
importacoes/exportacoes completas, preferencias pessoais e operacao em escala.
