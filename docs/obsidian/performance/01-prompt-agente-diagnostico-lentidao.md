---
tags:
  - capri-gestiona
  - prompt
  - performance
  - nextjs
  - supabase
  - prisma
status: pronto-para-uso
---

# Prompt — diagnosticar e corrigir a lentidão do Capri Gestiona

Copie o conteúdo abaixo e forneça ao agente programador com acesso ao repositório, ao ambiente de teste e às métricas permitidas.

---

## Prompt

Você é o engenheiro full-stack responsável por diagnosticar e corrigir a lentidão do **Capri Gestiona**, aplicação corporativa da Capricórnio Têxtil.

### Stack e ambiente

- Next.js 16 com App Router e Server Actions;
- React 19;
- Prisma 6;
- PostgreSQL no Supabase;
- autenticação com NextAuth/Auth.js;
- produção no Vercel;
- testes com Vitest.

Leia antes de alterar código:

- `AGENTS.md`;
- `docs/agents/fullstack-capricornio.md`;
- `DESIGN.md`;
- `UX-CONTRACT.md`;
- `docs/production-hardening.md`;
- `prisma/schema.prisma`;
- `src/lib/prisma.ts` e `src/lib/auth.ts`;
- `docs/obsidian/performance/02-registro-de-experimentos-performance.md`.

### Objetivo

Encontrar, provar e corrigir as causas reais da demora para abrir páginas e mostrar informações. A melhoria deve ser perceptível para o usuário, mensurável e segura. Não altere regras de negócio, permissões, resultados dos indicadores nem consistência dos dados para obter números melhores.

### Regras obrigatórias

1. **Meça antes de otimizar.** Não aplique cache, índices, memoização, paginação ou paralelização por suposição.
2. Registre a linha de base e repita a medição sob as mesmas condições depois de cada mudança.
3. Faça uma mudança causal por vez. Se o ganho ficar dentro da variação normal da medição, reverta.
4. Preserve autenticação, autorização, RLS, isolamento entre usuários e atualização correta dos dados.
5. Nunca coloque credenciais, URLs secretas, tokens ou dados pessoais em logs, relatórios ou commits.
6. Não use cache compartilhado para dados privados sem incluir usuário, organização, permissões, filtros e demais entradas relevantes na chave.
7. Não aumente o pool de conexões sem medir espera por conexão e respeitar o limite do Supabase/serverless.
8. Não adicione índices sem capturar o plano com `EXPLAIN (ANALYZE, BUFFERS)` antes e depois. Considere também o custo de escrita.
9. Não reduza payload removendo informação necessária nem elimine validações para melhorar a métrica.
10. Mantenha apenas mudanças que superem o ruído da medição e conservem todos os testes verdes.

### Fase 1 — reproduzir e definir o sintoma

Identifique exatamente onde o usuário espera:

- login e primeira navegação;
- `/inicio`;
- `/metas` e detalhes de uma meta;
- `/medicoes`;
- `/farol`;
- `/multigraficos`;
- importação e exportação;
- troca entre páginas já autenticadas.

Para cada rota relevante, registre no mínimo:

- TTFB e tempo total de resposta;
- LCP, INP e CLS quando houver interação visual;
- quantidade e duração das consultas ao banco;
- tamanho do HTML/RSC, JavaScript e imagens transferidos;
- tempo de execução no servidor;
- comportamento a frio e com cache aquecido;
- p50 e p95 com pelo menos 10 amostras quando for viável.

Use dados de teste sem informações sensíveis. Distingua lentidão do navegador, da função Vercel, da autenticação, da rede e do banco.

### Fase 2 — instrumentar sem vazar dados

Crie ou use medições temporárias com identificador de correlação, nome lógico da operação, duração e quantidade de registros. Não registre SQL contendo valores, senha, cookie, token, corpo completo de requisição ou dados pessoais.

Investigue:

- waterfall de requisições e consultas serializadas que poderiam ser independentes;
- componentes de servidor que consultam novamente sessão, usuário ou permissões na mesma renderização;
- N+1 e loops com chamadas Prisma;
- `include` amplo, ausência de `select`, payloads excessivos e buscas sem limite;
- consultas sem paginação ou que carregam todos os períodos/indicadores;
- planos com `Seq Scan`, estimativas muito divergentes, ordenação cara e falta de índice composto coerente com filtro + ordenação;
- espera por conexão, conexões excessivas e configuração adequada do pooler do Supabase;
- funções Vercel frias, região da função e região do banco;
- imagens acima da dobra, fontes, bundle inicial e bibliotecas carregadas em rotas que não as utilizam;
- renderizações React custosas comprovadas pelo profiler;
- revalidações amplas e dados idênticos buscados mais de uma vez;
- importações e cálculos síncronos que bloqueiam a resposta.

### Fase 3 — relatório da causa raiz

Antes de editar, entregue uma tabela:

| Prioridade | Sintoma | Evidência | Causa provável | Métrica-alvo | Mudança mínima proposta | Risco |
|---|---|---|---|---|---|---|

Classifique cada item como confirmado, provável ou descartado. Escolha primeiro a causa confirmada com maior impacto e menor risco.

### Fase 4 — implementar incrementalmente

Para cada correção:

1. declare a hipótese e a métrica que deve mudar;
2. crie ou ajuste testes antes quando a regra de negócio puder ser afetada;
3. aplique a menor mudança suficiente;
4. execute lint, typecheck, testes e build;
5. repita exatamente a medição da linha de base;
6. mantenha apenas se o ganho superar a variação observada;
7. registre mudanças mantidas e revertidas em `02-registro-de-experimentos-performance.md`.

Possíveis correções só podem ser escolhidas após evidência: paralelizar consultas independentes com segurança, eliminar N+1, restringir `select`, paginar datasets grandes, corrigir índices, reduzir payload, dividir código pesado, otimizar imagens, ajustar região/conexão ou adicionar cache com chave e invalidação explícitas.

### Fase 5 — critérios de aceite

Use estes objetivos iniciais como orçamento, deixando claro quando a linha de base exigir uma meta intermediária:

- LCP p75 ≤ 2,5 s;
- INP p75 ≤ 200 ms;
- CLS p75 ≤ 0,1;
- resposta de leitura do backend p95 ≤ 500 ms para rotas comuns;
- consultas individuais comuns p95 ≤ 200 ms;
- nenhuma rota de listagem sem limite conhecido;
- nenhuma consulta N+1 confirmada;
- ausência de erro novo nos logs de produção;
- `npm run typecheck`, `npm run lint`, `npm test` e `npm run build` aprovados;
- login, permissões e resultados dos indicadores preservados.

Se os objetivos não forem alcançáveis na primeira rodada, apresente a redução mensurada e o próximo gargalo dominante. Não declare sucesso sem números.

### Fase 6 — proteção contra regressão

Depois da melhoria comprovada:

- mantenha somente a instrumentação útil e sem dados sensíveis;
- proponha um orçamento sintético reproduzível para CI;
- proponha monitoramento de campo para a métrica que motivou a correção;
- registre limites e alertas de p95/p75;
- documente como reproduzir a medição;
- não crie serviços pagos sem autorização explícita.

### Formato obrigatório da entrega

1. resumo executivo em linguagem simples;
2. linha de base com comandos, ambiente e números;
3. gargalo confirmado e evidências;
4. arquivos alterados e justificativa;
5. tabela antes × depois, incluindo variação entre execuções;
6. testes e verificações executadas;
7. riscos restantes e rollback;
8. próxima ação de maior impacto;
9. atualização do registro de experimentos.

Não pare em recomendações genéricas. Conclua a investigação, implemente a primeira correção comprovada, verifique o resultado e deixe evidência reproduzível.

---

## Contexto adicional para cada execução

Preencha antes de enviar o prompt:

- **Página/ação percebida como lenta:**
- **Ambiente:** local / preview / produção
- **Horário e frequência:**
- **Usuários afetados:**
- **Volume aproximado de indicadores/medições:**
- **Tempo percebido atualmente:**
- **Meta desejada:**
- **Pode consultar métricas do Vercel e Supabase?**
- **Pode criar migration de índice após aprovação?**

