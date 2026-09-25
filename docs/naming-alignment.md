# Alinhamento de nomenclatura com o Quattrus original

Objetivo: quem já usava o Quattrus deve reconhecer o Gestiona sem esforço.
Este documento registra o "de-para" de nomes entre os dois sistemas e o que
foi efetivamente renomeado no menu (`src/components/layout/Sidebar.tsx`).

Fonte da verdade sobre o sistema original: [`functional-mapping.md`](./functional-mapping.md).

## O que foi renomeado (já aplicado)

| Menu lateral — antes  | Menu lateral — agora     | Nome no Quattrus original          |
| ---------------------- | ------------------------- | ----------------------------------- |
| Dashboard               | **Página Inicial**        | Página inicial                      |
| Farol                   | **Meus Itens de Controle**| Meus itens de controle (Dashboard)  |
| Metas e Indicadores     | **Medições**              | Medições (menu do item de controle) |
| Importação/Exportação   | **Importar / Exportar**   | Importar · Exportar (itens separados) |
| Aprovação de Metas      | **Aprovações**            | Aprovações > Metas                  |

Rotas (URLs) **não** mudaram — só o texto visível no menu. `/farol` continua
sendo `/farol`, etc. Isso evita quebrar links/favoritos enquanto já resolve o
que o usuário lê na tela.

## Conceitos equivalentes, mas com nomes que ficaram como estão (e por quê)

| Tela no Gestiona    | Equivalente no Quattrus                  | Por que não foi renomeado                                                                 |
| -------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **FCA** (Fato-Causa-Ação) | Plano de Ação (Gantt de etapas)        | São conceitos parecidos mas não idênticos: o FCA daqui é uma metodologia de causa-raiz (5 porquês + Pareto), mais rica que o Gantt simples do Quattrus. Renomear para "Plano de Ação" esconderia essa diferença de comportamento. Ver §"O que é novo" abaixo. |
| **Desdobramento**    | (sem tela equivalente direta)              | É novo — ver abaixo.                                                                          |
| **Departamentos**    | (sem tela equivalente direta; mais perto de "Vermelhos da equipe") | É uma visão nova, consolidada por área.                                       |
| **Minha Equipe**     | "Vermelhos da equipe" (sub-aba do Dashboard) | Nome já é autoexplicativo e mais amplo (mostra todos os status, não só vermelhos).         |

## O que é novo no Gestiona (não existe no Quattrus)

Estas funcionalidades **não têm equivalente** no sistema antigo — são
melhorias adotadas nesta reconstrução. Vale explicar ao usuário o que ganham:

### 1. Desdobramento (`/desdobramento`)
Diagrama visual (árvore) mostrando como os indicadores operacionais sobem até
os indicadores estratégicos (ex.: "Refugo Tear 3" → "Taxa de Refugo" →
indicador do departamento). No Quattrus isso existia só implicitamente, dentro
da aba "Totalização" do cadastro do item — aqui é uma tela dedicada e visual.
**Como usar:** menu lateral → Desdobramento. Não precisa configurar nada, ele
é gerado automaticamente a partir da hierarquia pai/filho dos indicadores.

### 2. FCA — Fato, Causa, Ação (metodologia 5 Porquês + Pareto)
Quando um indicador fecha o mês fora da meta, o sistema **abre um FCA
automaticamente** (no Quattrus, o Plano de Ação tinha que ser criado
manualmente). O FCA guia o responsável por:
- **Fato**: o que aconteceu (preenchido automaticamente com o desvio).
- **5 Porquês**: cadeia de causas até a causa-raiz.
- **Pareto**: quantificar os fenômenos que mais contribuíram para o desvio.
- **5W2H** (O quê / Quem / Onde / Quando / Por quê / Como / Quanto): igual ao
  conceito do Quattrus, mas dentro do mesmo formulário do FCA, não como um
  Gantt separado.
**Como usar:** aparece um link "Abrir FCA" na linha do indicador (em Medições
ou no Dashboard) sempre que o mês fechar fora da meta. Preencher os 5 porquês
é obrigatório para concluir o plano.

### 3. Aprovação de metas com fluxo automático
No Quattrus, toda meta editada por um colaborador exigia aprovação manual.
Aqui a regra é: **meta definida por um Gestor/Admin já entra aprovada**; só a
meta que um Colaborador define para si mesmo fica `PENDENTE` até o gestor
aprovar em `/aprovacoes`. Isso reduz o volume de aprovações desnecessárias
sem abrir mão do controle.

### 4. Trava de período (Period Lock)
Funcionalidade que o Quattrus não tinha de forma explícita: um Admin pode
**fechar um mês/ciclo** (globalmente ou por departamento), impedindo edição
de medições retroativas depois do fechamento contábil. Cada fechamento e
reabertura fica registrado (quem, quando, por quê) — é uma trilha de
auditoria de governança.

### 5. Auditoria (`AuditLog`)
Toda alteração relevante (medição, plano de ação) grava um registro de
"quem mudou o quê" — o Quattrus não expõe isso ao usuário final.

### 6. Health check (`/api/health`)
Rota técnica (não é uma tela) usada pelo Docker para saber se a aplicação e o
banco estão de pé. Não existe conceito equivalente do lado do usuário no
Quattrus — é operacional.

## Módulos implementados em 2026-08-26

Estes cinco itens da lista de gaps já foram construídos e estão em produção
(`localhost:3020`), seguindo os mesmos padrões de código do resto do projeto
(server actions em `lib/actions.ts`, autorização em `lib/authz.ts`, schemas
Zod em `lib/schemas.ts`, testado com Vitest):

- **Tarefas** (`/tarefas`) — 5W2H avulso, sem precisar estar ligado a um
  indicador. Status (`Aberta/Em andamento/Concluída`) muda inline; uma tarefa
  com prazo vencido e não concluída aparece automaticamente como "Atrasada".
- **Agenda** (`/agenda`) — eventos agrupados por mês, com a mesma legenda de
  5 categorias do Quattrus original (Reunião de Resultado, PEMPB, Reunião de
  Time, Treinamento, Feedback). Lista cronológica em vez de grade de
  calendário completa — mais simples de usar em uma tela pequena, mesma
  informação.
- **Multigráficos** (`/multigraficos`) — compara até 4 indicadores lado a
  lado, reaproveitando o mesmo gráfico de faixa (realizado × meta × faixa
  verde) que já existia na página de detalhe do indicador. A seleção de
  indicadores respeita a mesma regra de visibilidade das exportações
  (`exportableOwnerIds`): colaborador vê os seus, gestor vê os da equipe,
  admin vê todos.
- **Delegação de item** — na página de detalhe de cada indicador
  (`/metas/[id]`), o dono (ou um admin) pode delegar a edição para outra
  pessoa específica, um indicador de cada vez. Equivale a "Configurar
  Delegação" no Quattrus.
- **Facilitador** — na edição de usuário (`/usuarios/[id]/editar`, só admin),
  é possível marcar que um usuário "facilita" outro: ganha direito de editar
  *todos* os indicadores que a pessoa facilitada possui, presentes e
  futuros. Equivale a "Cadastrar Facilitador" no Quattrus.

Autorização: `lib/authz.ts` (`assertKpiEditable`/`assertMeasurementEditable`/
`assertActionPlanEditable`) agora checa, nesta ordem, dono → admin →
delegação individual no item → facilitação do dono do item.

## Módulos implementados em 2026-09-12

Uma auditoria completa contra `functional-mapping.md` encontrou vários pontos
desta seção que já estavam desatualizados (marcados como pendentes quando já
existiam) e outros gaps reais, agora fechados:

- **Totalização (aba do modal "Edição do Item de Controle")** — antes era um
  texto estático; agora tem grid real (`KpiTotalizationPanel.tsx`) com
  Código/Item/Responsável/Coeficiente/Ranking, botão "Calcular agora" e um
  seletor de escopo (Diretos/Meus Pares/Todos) para adicionar subordinados.
- **Faixa Verde visual** — editor de arrastar (`KpiThresholdEditor.tsx`) com
  barra empilhada verde/amarela/vermelha, substituindo os campos numéricos
  crus na aba "Tipo de item".
- **Compartilhamento** — vira aba própria com rádio Compartilhar/Não
  compartilhar, em vez de redirecionar para "Dados Básicos".
- **Notificações estruturadas** (`/notificacoes`) — grid com colunas
  Tipo/Ação/CID/Quem/Até quando/Concluído/Origem, mais uma seção "Ações
  Delegadas" (lista ao vivo de `KpiDelegation`, não um log de notificação).
- **Desbloquear conta** (admin, em `/usuarios/[id]/editar`) — limpa o
  rate-limit de login com falha. A troca de senha por admin já existia no
  mesmo formulário (campo "Nova senha").
- **Reunião de Resultados em PDF com gráfico embutido** — a exportação em PDF
  já existia (esta seção estava desatualizada dizendo que faltava); o que
  realmente faltava era o gráfico: agora um raster de barras (meta ×
  realizado, colorido pelo farol) é renderizado sem nenhuma dependência nova
  (RGB cru + `node:zlib`, embutido como `/XObject` no PDF) quando "Incluir
  gráficos" está marcado.
- **Limite de importação subiu de 5MB para 15MB**, alinhado ao spec original.
- **Subordinação multi-gestor** — `User.managerId` (um gestor só) virou uma
  tabela `Subordination` (N gestores, um marcado Principal), com UI própria
  ("Configurar Subordinação" em `/usuarios/[id]/editar`). `managerId`
  continua existindo como cache sincronizado do gestor principal, para não
  quebrar nada que ainda lê o campo direto.

## O que ainda falta implementar (do Quattrus original)

Ver `functional-mapping.md` para o detalhe de cada um.

- **Multiempresa** (login com campo "Empresa") — **decisão de escopo, não
  gap**: o próprio roadmap (`roadmap-quattrus.md`, Fase 10) define
  explicitamente que este deployment é single-tenant para a Capricórnio
  Têxtil S/A e que não haverá troca de empresa no login. Não está planejado.
- **Modo de faixa absoluta** (Limite Superior/Inferior, Meta do Cliente,
  Referencial de Amplitude Mês/Ano) — o editor de faixa verde novo continua
  no modelo percentual (`yellowRange`/`redRange` por vigência); o modo
  absoluto do original exigiria um modelo de dados novo, fora do escopo desta
  rodada.
- **Importação de `.xls` binário legado** (Excel 97-2003, pré-2007) — decisão
  deliberada de **não** adicionar: a única biblioteca JS mantida para esse
  formato (`xlsx`/SheetJS, via npm) carrega vulnerabilidades conhecidas de
  prototype pollution e ReDoS sem correção publicada no registro do npm — a
  SheetJS só distribui as versões corrigidas pelo próprio CDN deles. Como
  este endpoint processa uploads não confiáveis, o risco não compensa para um
  formato em desuso; `.xlsx`/`.csv`/`.txt` continuam suportados normalmente.
- **Processamento assíncrono de importação/exportação + notificação por
  e-mail ao concluir** — não há fila de jobs nem infraestrutura de e-mail
  (SMTP) no projeto hoje; ambos ficam para uma fase dedicada.
- **"Acessar Dashboard" (impersonation de admin)** — avaliado e **não
  implementado** nesta rodada: fazer isso de forma segura exigiria trocar
  `auth()` por um wrapper "usuário efetivo" em todos os pontos de leitura de
  sessão do app (dezenas de arquivos), risco de introduzir um bug de
  autorização desproporcional ao valor desta rodada. Recomenda-se tratar como
  sua própria etapa, com revisão dedicada.
- **Chrome de UI do original** sem paralelo hoje: assistente "Quattrinha"
  (IA), painel "Quattrus Academy", cronômetro de sessão, seletor de idioma
  PT/EN/ES. Nenhum tem uma necessidade de negócio identificada até agora.
