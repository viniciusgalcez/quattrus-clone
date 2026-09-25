# Mapeamento Funcional — Quattrus | Gestiona

> Levantamento feito por navegação manual (login do usuário) + inspeção de DOM em
> `https://quattrus.com` (sessão da empresa Capricórnio). Objetivo: servir de blueprint
> funcional para o clone interno (`quattrus-clone`). Nenhum dado pessoal (nomes, e-mails,
> usernames reais de colaboradores) foi incluído aqui — apenas estrutura de telas, campos e
> comportamento.

## Stack observada (sistema original)
- Frontend: ExtJS/Sencha (classes `x6-*`), renderizado dentro de um `<iframe>` (`indexICG.aspx?tipo=USR`) embutido em um shell "moderno" (o app novo "Gestiona" é uma casca React/HTML por cima do legado ExtJS "ICG").
- Duas UIs coexistem:
  1. **Gestiona** (novo, ícones à esquerda, mobile-friendly, teal `#0F9E8E`-ish) — operação do dia a dia.
  2. **ICG / Administrador** (clássico, denso, acessado via avatar → "Administrador") — configuração/cadastro.
- Versão observada: `2.0.0.445`.
- Multiempresa / multiusuário, com perfis de acesso (RBAC) e delegação hierárquica.

## Conceito central do produto
Sistema de **gestão de metas e indicadores (KPI/PMB)** por período mensal, com:
- Item de Controle = uma métrica (KPI ou "PMB") com Realizado / Previsto / Meta por mês, cor de status (verde/amarelo/vermelho/azul = editado manualmente) tipo "farol".
- Hierarquia de aprovação de metas e previsões.
- Planos de ação (estilo 5W2H) vinculados a cada item, com Gantt.
- Delegação e subordinação de usuários (quem responde para quem, quem pode editar o quê).

---

## 1. Tela de Login (`/login.aspx`)
Campos: `Empresa` (text), `Usuário` (text), `Senha` (password), botão `Entrar`.
Links: `Esqueceu a senha?`, `Política de Privacidade`, seletor de idioma (PT-BR / EN / ES).
Painel lateral com conteúdo de blog/suporte (cards linkando para `suporte.quattrus.com`).

## 2. Shell / Navegação principal (Gestiona)
Header fixo (teal): logo, título "Quattrus | Gestiona", ícones à direita:
- 🤖 Chat IA "**Quattrinha**" — assistente virtual (chatbot com histórico e campo de pergunta).
- 🎓 "Quattrus Academy" — abre o mesmo painel de chat/central de ajuda.
- ⏱️ **Cronômetro** — inicia um timer (00:00) visível no header (provável rastreio de tempo em tela/sessão).
- 🔔 **Notificações** — painel com duas seções: "Ações Delegadas" e "Ações Pendentes" (grids: Tipo, Ação, CID, Quem, Até quando, Concluído, Origem; busca por texto; "Editar Todas").
- Avatar → menu dropdown: cartão com Usuário / Usuário selecionado / Perfil / Empresa / Último login, e itens **Administrador**, **Configurações**, **Alterar Senha**, **Logout**.

Sidebar retrátil (ícone `»`/`«` no topo) com itens (ícone + label ao expandir):
| Item | Submenu | Observação |
|---|---|---|
| Página inicial | — | tela padrão (redireciona para "Meus itens de controle") |
| Dashboard | Meus itens de controle · Meus itens auxiliares · Itens delegados · Vermelhos da equipe | grade principal de KPIs |
| Multigráficos | — | grade 2x2 de gráficos comparativos |
| Aprovações 🔴(badge) | Metas · Previsões | fila de aprovação |
| Agenda | — | calendário de eventos |
| Importar | — | upload de planilhas |
| Exportar | Medições · Itens de controle · Reunião de resultados | exportação de dados |
| Tarefas | — | lista de tarefas 5W |
| Idioma | PT-BR / EN / ES | troca idioma |
| Guia | — | help/onboarding |

Rodapé do card de usuário no topo do conteúdo: foto, nome, setor/unidade (ex. "TECELAGEM - BP"), **anel de progresso %** (cumprimento de metas) + sigla (ex. "EGU").

---

## 3. Dashboard → "Meus itens de controle" (tela padrão / home)
Grid principal, colunas:
- `P` (prioridade/ordem, numérica)
- `C` (categoria: **PMB** ou **KPI**)
- `Item` (nome da métrica, quebra em 2 linhas: nome + unidade `%`, `R$`, `m`, etc.)
- 12 colunas de mês (`Jan`...`Dez`) com **bolinha de status**:
  - Verde = meta batida
  - Amarelo = próximo/alerta
  - Vermelho = não bateu
  - Azul = valor editado manualmente / farol customizado
  - Contorno vazio = mês futuro/sem dado
  - Linha pontilhada vertical = mês atual
- Coluna `Valor` (extremo direito, quando expandida a largura): badge colorido com Realizado (grande) e Meta (pequeno) abaixo, ex. `2.117.700 / 2.156.646`.
- Linhas hierárquicas: itens "pai" (com seta `>` para expandir) revelam sub-itens (ex. KPIs compostos por múltiplos indicadores).
- Header do grid: título "Meus itens de controle | N", ícones de ação: pin/fixar coluna, filtro (funil), export/list layout, menu "⋮" (mais opções), colapsar (`^`).

### Interações por célula de mês
Clique numa bolinha abre menu de contexto:
- **Editar medição** → painel lateral (drawer) "Edição {mês} - {ano}":
  - toggle `Medido` (liga/desliga)
  - campo `Realizado` (editável)
  - campo `Previsto` (readonly/cadeado)
  - campo `Meta` (readonly/cadeado)
  - `Comentário` (textarea)
  - botões `Cancelar` / `Salvar`
- **Gráfico de pareto**
- **Gráfico de barras**

### Ações por linha (menu "⋮" no fim da linha)
- **Editar item** — abre modal **"Edição do Item de Controle"** com 7 abas (ver §3.1 abaixo).
- **Medições** — tela cheia com tabela do ano inteiro: `Mês | Medido(toggle) | Realizado | Previsto | Meta | Comentário`, navegação de ano (`< 2025/2026 >`), seletor de "Item de controle" (trocar o item sem sair da tela), badge com valor atual/meta no topo, Benchmark/Valor Benchmark/Calendário no rodapé, `Cancelar`/`Salvar`.
- **Gráfico do item** — visualização gráfica isolada (linha/barra) da série histórica.
- **Plano de ação** — módulo de Gantt:
  - Toolbar: `Novo Plano`, `Nova Etapa`, `Editar`, `Excluir`, `Gráfico de Gantt`, `Anexar`, `Imprimir`, seletor do item de controle, busca.
  - Grid esquerdo: `Etapa | Quem` (hierárquico: Plano → Etapas).
  - Painel direito: Gantt por mês (barras arrastáveis, cor por status).
- **Anexos do item** — upload/lista de arquivos vinculados ao KPI.

Tooltip ao passar o mouse no nome do item mostra: `Código`, `Item de Controle`, `Indicador`, `Tipo` (ex. SB), `Vermelho Crônico: N`, `Descrição`.

### 3.1 Modal "Edição do Item de Controle" (cadastro completo do KPI)
Abre por cima da grade (overlay), com `Código` (readonly, gerado), botão de lock/vigência, `Novo`, `Desabilitar`, `Cancelar`, `Salvar`. 7 abas:

1. **Dados Básicos** — `Item` (nome), `Cliente` (dropdown, ex. "Outro..."), `Bom para` (tag/seletor, ex. "PMB"), `Vermelho Crônico` (N meses seguidos vermelho para virar crônico), `Prioridade` (ordem de exibição), `Casas Decimais`, `Coeficiente`, `Auxiliar` (checkbox — marca como item auxiliar, não conta na % de cumprimento principal), seção colapsável **Vigência do Item de Controle**, `Indicador` (unidade curta: `%`, `R$`, `m`), `Descrição` (textarea, máx. 2000 caracteres).
2. **Tipo de Item** — define a *fórmula* e as *faixas de cor* do KPI:
   - **Faixa Verde**: radio `Informar Limite Superior e Inferior` vs `Informar Previsão e % de Tolerância`; `Meta do Cliente` (De/Até); `Vigências` (dropdown de período efetivo, com `+` para nova vigência).
   - **Referencial de Amplitude no Mês** e **no Ano**: radio `Variável - Previsto` / `Variável - Mínimo` / `Fixo`.
   - **Limite das Cores**: editor visual (barras empilhadas azul/verde/amarelo) com valores numéricos `Mês %` / `Ano %` — define os limiares que pintam a bolinha de verde/amarelo/vermelho.
   - **Meta** (lado direito): radio `Somatório de Períodos (A)` / `Média de Períodos (B)` / `Comparação com Fx controle mês a mês (C)`; quando o KPI é uma razão: `Quociente`, `Numerador` (dropdown de outro item + `Excluir`), `Denominador` (dropdown de outro item + `Excluir` + checkbox `Média`) — ou seja, um KPI pode ser calculado como razão entre dois outros itens.
3. **Totalização** — permite que este item seja o **totalizador** de outros: `Função` (dropdown, ex. soma/média) + botão `Calcular`; grid `Código | Itens de controle | Responsável | Coef. | Ranking`. Do lado direito, **Itens Subordinados**: radio `Diretos`/`Meus Pares`/`Todos`, dropdowns `Item de controle` e `Prioridade`, grid de seleção — define quais itens "somam" para este.
4. **Vinculação** — **Itens Vinculados** (dropdown item + responsável) e **Itens Subordinados** (mesmo padrão da aba anterior) — vínculo não-hierárquico entre KPIs (ex. para gráficos comparativos).
5. **Compartilhamento** — radio `Compartilhar este item para Todos os usuários` / `Não Compartilhar este item`.
6. **Período** — **Vigência das Medições**: botões `Novo Período` / `Excluir Período`, grid `De | Até` — permite reconfigurar o item ao longo do tempo sem perder histórico.
7. **Dependências** — somente leitura: "O item de controle está sendo utilizado em:" grid `ID Item Controle | Item Controle | Tipo Item | Status | Proprietário | Função | Tipo` — mostra onde este item é referenciado (útil antes de excluir/desabilitar).

> Implicação de modelagem: um `ItemDeControle` não é só uma métrica simples — é potencialmente uma **fórmula composta** (razão numerador/denominador), um **totalizador** de itens filhos, ou um item **vinculado** a outros para comparação. O clone precisa de um motor de cálculo, não só uma tabela de valores.

### Sub-abas do Dashboard
- **Meus itens auxiliares** — provavelmente KPIs de apoio, não hierárquicos.
- **Itens delegados** — itens que outros usuários delegaram para o usuário atual editar.
- **Vermelhos da equipe** — visão consolidada de itens em vermelho de toda a equipe/subordinados (gestão por exceção).

---

## 4. Multigráficos
Layout fixo em 4 quadrantes ("1", "2", "3", "4"), cada um "Adicionar gráfico" (placeholder até selecionar item).
Toolbar: dropdown `Item`, botões `Adicionar item`, `Remover item`, `Adicionar gráfico`.
Painel lateral direito replica a lista de itens (mesmos badges coloridos de valor) — provável drag-and-drop de item para dentro de um quadrante.
Em tela cheia aparece toolbar adicional: dropdown `Aba` + `Adicionar aba` + `Gerenciar abas` + `Gerenciar gráficos` — ou seja, o usuário pode ter **múltiplas abas**, cada uma com sua própria grade 2x2 de gráficos salvos.

## 5. Aprovações
### 5.1 Metas
"Aqui você pode realizar a aprovação clicando no campo meta ou optar por aprovar em lote a partir do ícone no cabeçalho."
Grid: `Item | Responsável (avatar) | Meta (campo editável inline) | ⋮`. Ícone de aprovação em lote no cabeçalho.

### 5.2 Previsões
"Aqui você pode realizar a filtro das previsões a partir do ícone no cabeçalho."
Grid: `Item | Meses | Motivo | Solicitação | Concluído | Status`. Filtro (funil) no cabeçalho. Estado vazio: "Nenhuma solicitação pendente."

## 6. Agenda
Calendário mensal completo (estilo Google Calendar):
- Header: navegação `< Agosto 2026 >`, botão "Ir para hoje", "Data agendada", contador "3 Amostras", seletor de visão (`Dia | Semana | Mês`), botão "+ Novo evento".
- Mini-calendário lateral (mês compacto) + **legenda de categorias** com cor: `Reunião de Resultado`, `PEMPB`, `Reunião de Time`, `Treinamento`, `Feedback` (checkboxes para filtrar por categoria).
- Células de dia mostram eventos coloridos por categoria; dia atual destacado.
- Faixa inferior com "bolinhas" de status (mesma paleta verde/amarelo/vermelho/azul) — resumo do mês.

## 7. Importar
- Seleção de **tipo de arquivo** (radio buttons): Medição · Periodicidade de... · Item de controle novo · Faixas de controle · Item empresa · Autoequipe(?) · Plano de ação.
- Dropzone: "Clique ou arraste aqui para inserir arquivos" — limite 15MB, formatos `XLS, XLSX, TXT, CSV`.
- Aviso: processamento assíncrono, notificação por e-mail ao concluir.
- Histórico de importações: `Arquivo | Tipo | Início | Concluído | Status`.

## 8. Exportar
Submenu com 3 tipos de exportação, cada um com fluxo próprio:

- **Medições** — painel lateral "Exportar Medições": 3 filtros checkbox (`Meus itens de controle`, `Itens auxiliares`, `Itens delegados`, todos marcados por padrão), campo de busca, checklist de itens individuais, seção `Período` (`De`/`Até`, seletor mês+ano), botão `Exportar` (gera XLS).
- **Itens de controle** — exportação direta e simples: clique já dispara geração e mostra popup "Exportar lista de itens" com "Arquivo pronto para download... você também pode baixar o arquivo para impressão" + botão `Download`.
- **Reunião de resultados** — modal **"Relatório para Reunião de Resultados"** com 2 abas:
  - **Reunião**: `Líder Reunião` (dropdown, default usuário logado), `Descrição Reunião` (texto), `Data Base` (mês/ano), botões `Remover Participante(s)` / `Adicionar Participante`, lista `Participantes Selecionados` (checkboxes de usuários da empresa).
  - **Regras**: "Incluir itens de Controle" — checkboxes: `Sobre item`, `Principais`, `Auxiliares`, `Delegados`, `Vermelhos dos Subordinados`, `Gráficos`, `Multigráficos`.
  - Rodapé: aviso "gera um PDF e envia por e-mail" + botão `Gerar Relatório`. É basicamente um **gerador de apresentação/ata de reunião de resultados** a partir do estado atual dos KPIs.

## 9. Tarefas
Lista de tarefas estilo 5W2H:
Colunas: `O quê | Por quê? | Como/Onde | Quem (avatar) | Data início | Data final | Valor | Status (badge)`.
Agrupamento "Tarefas adicionais | N". Botão `+` (nova tarefa), filtro (funil), menu `⋮` por linha.

## 10. Guia
Clicado (via DOM) — não produziu nenhuma mudança visível de tela nem nova aba. Hipóteses: (a) é um tour "primeira vez" controlado por flag/cookie que já foi visto por este usuário; (b) abre um link externo bloqueado neste ambiente de teste; (c) depende de permissão de perfil. Não decodificado — tratar como TODO.

## 10.1 Menu do avatar → Configurações
Modal **"Configurações"** (preferências pessoais, distinto do "Administrador"):
- **Dados pessoais** (readonly): Nome, Usuário, E-mail, Setor.
- **Exibição no dashboard**:
  - *Modo expandido*: `Número de meses`, `Meses em branco`, checkbox `Fixo de janeiro a dezembro`.
  - *Modo compacto*: `Número de Meses`, `Meses em Branco`.
  - `Data base` (mês/ano — referência para "mês atual" na grade).
  - Toggles `Delegados` / `Vermelhos da equipe` — provavelmente controlam se essas sub-abas aparecem por padrão no Dashboard do usuário.
- Rodapé `Cancelar` / `Salvar`.
No topo do dropdown do avatar também há **upload de foto de perfil** (ícone de lápis sobre o avatar).

---

## 11. Administrador (ICG legado — via Avatar → Administrador)
Abre em um layout clássico com **árvore de navegação** à esquerda ("Navegação") e painel de conteúdo à direita. Toolbar superior com ~8 ícones de atalho (não decodificados individualmente) + seletor de idioma (bandeiras BR/EN/ES) + info da sessão (`Logado`, `Usuário`, `Perfil`, `Cliente`) + link `Meus Itens de Controle` (volta para o Gestiona) + `Logout`.

Árvore: `{Empresa raiz}` (ex. "Capricornio")
- **Empresas**
  - `{Nome da empresa}` → tela **"Empresa"** (configurações gerais):
    - Dados Gerais: `Nome`
    - Configurações Padrão: `Meses em Branco`, `Número de Meses`, `Listagem...`, `Exibir Meta` (checkbox), `Amarelo Bom` (checkbox), `Vermelho Bom` (checkbox)
    - Inativo Automação: `Inativo automação para todos usuários da empresa` (checkbox)
    - Controle de Rotina: `Exibir Controle da Rotina`, `Vermelho Agudo` (N), `Vermelho Crônico` (N), `Faixa Verde...`
    - Data Base Fixa: checkbox + campo de data
    - Calendário Padrão: dropdown de calendário
    - Comitê Empresa: `Exibir Comitê Empresa` (checkbox), `Usuário Comitê` (dropdown, ex. "Comitê de Implantação")
    - Relatório do Comitê: campo de data-base + botão `Gerar`
    - **Usuarios** (sub-nó) → **tela "Pesquisa de Usuários"**:
      - Toolbar: `Novo`, `Exportar`, `Excluir`, checkbox "Usuário replicado por gerentes"
      - Busca por `Nome` / `Username` / (mais campos à direita, ex. Setor)
      - Grid: checkbox | ícone | `Nome | Username | Perfil | Setor` (paginado)
      - **Duplo clique em um usuário → tela "Usuário" (cadastro/edição)**, com ações no topo (`Desbloquear Senha`, `Alterar Senha`, `Proteção de Dados`, `Acessar Dashboard` — impersonar/ver como o usuário) e 4 abas:
        1. **Cadastro Geral**: Nome, Usuário(login), E-mail, E-mail Alternativo, Perfil (dropdown), Cargo (readonly), Setor (readonly), Telefone, `Inativo` / `Inativo Automação` (checkboxes), Configurações (`Meses em Branco`, `Número de Meses`), Acesso (`Acesso aos Ítens de Controle (Empresa)` dropdown), rodapé `Cancelar`/`Salvar`.
        2. **Configurar Subordinação**: seção "Responde para" (dropdown de Usuário + botão `Criar`), grid `Principal (checkbox) | Usuário` — define hierarquia de quem esse usuário reporta.
        3. **Configurar Delegação**: `Item de Controle` (dropdown), `Delegar Para` (dropdown), escopo radio `Diretos | Meus Pares | Todos`, botão `Delegar`, grid `Delegado Para | Item de Controle`.
        4. **Cadastrar Facilitador** ("Cadastro de Facilitador"): dropdown `Selecione um Facilitador` + botão `Adicionar`; grid `Facilitador | Empresa | Cliente` — define quais usuários atuam como **facilitadores** (podem preencher/editar em nome) *deste* usuário. É a relação inversa da tela "Meus Facilitados" (§Sidebar → avatar → Administrador → Meus Facilitados), que mostra, do ponto de vista do facilitador, quem ele facilita.
        - Painel "Avatar do Usuário" (ao lado do Cadastro Geral): upload de foto (`Escolher Foto`, formatos JPG/PNG, máx. 2MB).
- **Meus Facilitados** — busca (`Nome`, `Username`, `Empresa`, `Email`) + grid `Nome | Username | Empresa | E-mail` (usuários que o usuário atual "facilita").
- **Perfis** — **tela "Pesquisa de Perfis"**:
  - Botões `Novo`, `Editar`; busca por nome do perfil.
  - Grid: `Perfil | Tipo ICS (Master/Qualitin) | Quantidade de Usuários`.
  - Perfis observados: `ADM Bônus`, `ADMIN`, `Data Provider`, `Facilitador`, `Qualitin`, `Usuário`, `Usuário Bônus`.
- **Proteger Dados** — acesso restrito por perfil (retornou "Acesso Negado" para o perfil testado); provável tela de LGPD/anonimização.

---

## 12. Modelo de dados inferido (para o clone)

```
Empresa (Company)
├─ id, nome, configurações (meses_em_branco, numero_meses, exibir_meta,
│  amarelo_bom, vermelho_bom, controle_rotina{vermelho_agudo, vermelho_cronico,
│  faixa_verde}, data_base_fixa, calendario_padrao_id, comite{exibir, usuario_comite_id})
├─ Usuarios (Users)
│  ├─ id, nome, username, email, email_alternativo, perfil_id, cargo, setor,
│  │  telefone, inativo, inativo_automacao, meses_em_branco, numero_meses,
│  │  acesso_empresa_id
│  ├─ Subordinacao (self-referencing: responde_para_usuario_id, principal:boolean)
│  ├─ Delegacao (item_controle_id, delegado_para_usuario_id, escopo[diretos|pares|todos])
│  ├─ Facilitacao (self-referencing: facilitador_usuario_id, facilitado_usuario_id, empresa_id)
│  └─ avatar_url
├─ Perfis (Roles) — id, nome, tipo_ics[master|qualitin], permissões
└─ ItensDeControle (ControlItems / KPIs)
   ├─ id, codigo, nome, categoria[PMB|KPI], indicador(unidade curta), cliente,
   │  bom_para(tag), descricao(<=2000c), prioridade(P), casas_decimais, coeficiente,
   │  auxiliar:boolean, parent_item_id (hierarquia/sub-itens), compartilhado[todos|nao]
   ├─ Formula / Tipo (aba "Tipo de Item"):
   │  ├─ faixa_verde{modo[limite_sup_inf|previsao_tolerancia], de, ate}
   │  ├─ meta_cliente{de, ate}, vigencias[{inicio, fim}]
   │  ├─ amplitude_mes[variavel_previsto|variavel_minimo|fixo]
   │  ├─ amplitude_ano[variavel_previsto|variavel_minimo|fixo]
   │  ├─ limite_cores{mes_pct[], ano_pct[]} (thresholds azul/verde/amarelo/vermelho)
   │  └─ meta_tipo[soma_periodos(A)|media_periodos(B)|comparacao_fx_mes_a_mes(C)]
   │     └─ se razão: numerador_item_id, denominador_item_id, denominador_media:boolean
   ├─ Totalizacao: funcao_agregacao, ItensSubordinados[{item_id, escopo[diretos|pares|todos], prioridade}]
   ├─ Vinculacao: ItensVinculados[{item_id, responsavel_usuario_id}]
   ├─ VigenciaMedicoes[{de, ate}] (aba "Período" — reconfiguração sem perder histórico)
   ├─ faixas de cor legadas (vermelho_cronico:N_meses, vermelho_agudo, faixa_verde, amarelo_bom, vermelho_bom)
   ├─ dono/responsavel_usuario_id, setor
   ├─ Medicoes (Measurements) — 1 por (item_id, mes, ano):
   │  ├─ medido:boolean, realizado, previsto, meta, comentario, benchmark, valor_benchmark
   │  └─ status_cor derivada (verde/amarelo/vermelho/azul-editado) — calculada pelo motor de fórmula acima
   ├─ PlanoDeAcao (ActionPlan)
   │  └─ Etapas (Steps) — nome, quem_usuario_id, data_inicio, data_fim (Gantt), status
   └─ Anexos (Attachments) — arquivo, tipo, uploaded_by, data

Aprovacoes
├─ AprovacaoMeta — item_id, meta_proposta, status[pendente|aprovado|rejeitado]
└─ AprovacaoPrevisao — item_id, meses, motivo, solicitacao, status

Tarefas (Tasks) — o_que, por_que, como_onde, quem_usuario_id, data_inicio, data_final,
  valor, status

Agenda (CalendarEvent) — titulo, categoria[reuniao_resultado|pempb|reuniao_time|
  treinamento|feedback], data_inicio, data_fim, participantes

Importacao (ImportJob) — tipo[medicao|periodicidade|item_novo|faixas_controle|
  item_empresa|plano_acao], arquivo, status, iniciado_em, concluido_em

ReuniaoDeResultados (ResultsMeetingReport) — lider_usuario_id, descricao, data_base,
  participantes[usuario_id], regras{incluir_principais, incluir_auxiliares,
  incluir_delegados, incluir_vermelhos_subordinados, incluir_graficos,
  incluir_multigraficos} → gera PDF + envio por e-mail (job assíncrono)

Notificacoes — tipo, acao, cid, usuario_alvo, prazo, concluido, origem
```

## 13. Paleta / UX a replicar
- Cor primária: teal/verde-água (`#0F9E8E` aprox., header e botões principais).
- Semáforo de status: **verde** (bateu meta) · **amarelo** (alerta/próximo) · **vermelho** (não bateu) · **azul** (editado manualmente / fora do fluxo automático).
- Anel de progresso circular (%) no card de perfil do usuário — visão rápida de cumprimento de metas.
- Badges arredondados coloridos para valores (Realizado grande + Meta pequena).
- Padrão de navegação: sidebar retrátil com ícones + submenus in-place (não modais), breadcrumb no topo do conteúdo (`< Meus Itens de Controle / Aprovações`).
- Drawer lateral (painel deslizante da direita) para edições rápidas (ex. "Editar medição"), sem sair da tela.
- Assistente de IA acessível globalmente (ícone no header) — chat simples com histórico e campo de texto.

## 14. Gaps / próximos passos para aprofundar o mapeamento
Já explorados nesta rodada (ver seções acima): modal completo de **Editar Item** (7 abas), as 3 telas de **Exportar**, **Cadastrar Facilitador**, **Configurações** do avatar, upload de avatar, toolbar de abas do **Multigráficos**.

Ainda em aberto:
- **Guia** — clique não produziu efeito visível nesta sessão (ver §10). Testar com outro perfil/usuário "novo" para ver se é um tour de onboarding.
- **Proteger Dados** — retornou "Acesso Negado" para o perfil testado (provável exclusivo de ADMIN/Data Provider); não foi possível ver o conteúdo.
- Fluxo de **criação de um Item de Controle do zero** (só foi visto o botão `Novo` dentro do modal de edição, não percorrido).
- Botão **`Novo`** na tela "Pesquisa de Usuários" apareceu desabilitado para o perfil testado — criação de usuário não verificada.
- Conteúdo real gerado pelos exports (XLS/PDF) não foi baixado nem inspecionado (política interna: não baixar arquivos sem autorização explícita do usuário a cada vez).
- Não foi verificado o comportamento mobile/responsivo.
- O "Cronômetro" no header (ícone de relógio) não teve sua função além de iniciar uma contagem 00:00 — possivelmente rastreio de tempo em tela por sessão/tarefa; não explorado a fundo.
- Recomenda-se, antes de codar o clone, decidir stack alvo (o pedido foi só "reproduzir no nosso sistema interno" — falta confirmar framework: Next.js? .NET? etc.) e desenhar o schema definitivo a partir da seção 12.
