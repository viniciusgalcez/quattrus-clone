<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agente Full-stack Capricórnio

Este repositório deve ser tratado como um produto interno da Capricórnio Têxtil, não como um template genérico de SaaS ou um portfólio de IA. Antes de implementar uma mudança relevante, leia `docs/agents/fullstack-capricornio.md`.

## Direção de produto e interface

- O conjunto institucional canônico fornecido pelo usuário está em `assets/brand/capricornio/originals/`. Leia `assets/brand/capricornio/README.md` antes de criar ou alterar qualquer uso da marca.
- A aplicação usa a variante azul-marinho por meio de `src/components/CapricornioLogo.tsx`; o arquivo público permanece byte a byte igual ao original. `public/capricornio-logo.png` é legado. Preserve os originais, proporção, área de respiro e cores; não redesenhe, distorça, recolora nem invente variações da marca.
- `public/login-brand.png` é uma peça da campanha de 80 anos e não substitui o logotipo institucional. Use-a somente em contextos explicitamente ligados à campanha.
- Evite a estética genérica de produtos de IA: gradientes azul/índigo, glow, glassmorphism, grandes áreas decorativas, excesso de cards arredondados, sombras flutuantes e texto promocional vazio.
- O azul da marca pode aparecer no logotipo e em poucos pontos institucionais. Azul de domínio continua válido quando tem significado funcional no Quattrus. Não transforme azul/índigo na decoração padrão de toda a interface.
- Prefira uma linguagem visual industrial e têxtil: superfícies claras ou grafite, neutros quentes, hierarquia tipográfica forte, linhas precisas, densidade confortável e cor reservada para estado, risco e ação.
- Não troque o clichê azul/índigo por outro clichê monocromático. Toda escolha visual deve servir leitura, operação ou identidade.
- Preserve acessibilidade, responsividade, navegação por teclado, contraste e estados de foco. Não sacrifique legibilidade para parecer “premium”.

## Engenharia de backend

- Trate autenticação e autorização como controles distintos. Toda leitura e mutação sensível deve validar sessão, papel, escopo organizacional e propriedade no servidor.
- Valide entradas nas fronteiras, use transações nas mutações compostas e torne operações repetíveis idempotentes quando houver retry, cron, importação ou integração externa.
- Consulte apenas os campos e registros necessários; evite N+1, loops com I/O, carregamentos sem limite e pools de conexão incompatíveis com serverless.
- Alterações de schema exigem migration revisável, índices coerentes com as consultas e verificação contra um banco real. Nunca use reset ou seed destrutivo em produção.
- Segredos nunca entram no cliente, no Git, em logs, mensagens de erro ou artefatos de build. Credenciais privilegiadas devem ter o menor escopo possível.
- Em Supabase, tabelas expostas precisam de RLS e políticas explícitas. Em Vercel, não use o filesystem efêmero como armazenamento persistente.
- Preserve auditoria, rate limits e mensagens de erro seguras nas operações sensíveis. Falhas internas devem ser observáveis sem revelar dados privados ao usuário.

## Forma de trabalhar

1. Inspecione o fluxo atual, as regras de negócio e os documentos do repositório antes de editar.
2. Declare o resultado esperado e os riscos relevantes; escolha a menor mudança que resolve o problema inteiro.
3. Implemente por fronteiras claras entre UI, regra de negócio, acesso a dados e infraestrutura.
4. Verifique com evidência independente do relato do agente: lint, typecheck, testes, build e, quando aplicável, consulta real, healthcheck ou teste no navegador.
5. Só considere concluído quando o comportamento, a segurança e os estados de erro estiverem cobertos. Liste limitações reais sem mascará-las como trabalho concluído.

## Gates mínimos

- Mudança de frontend: inspeção visual em desktop e mobile, acessibilidade básica e ausência dos anti-padrões visuais acima.
- Mudança de backend: teste positivo, teste de negação/autorização e análise de concorrência ou retry quando aplicável.
- Mudança de banco: migration aplicada em ambiente controlado, advisors revisados e rollback ou estratégia de recuperação documentada.
- Deploy: build limpo, variáveis verificadas, healthcheck saudável e logs sem erros após publicação.
