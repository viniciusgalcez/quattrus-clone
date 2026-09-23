# Gestiona

Sistema de gestão de KPIs e metas da **Capricórnio Têxtil S.A.**

O Gestiona organiza os indicadores da empresa em uma árvore hierárquica (um KPI
pai desdobrado em KPIs filhos), registra as medições mensais de cada indicador,
calcula automaticamente o farol (verde / amarelo / vermelho) comparando o
realizado com a meta e abre planos de ação (FCA — Fato, Causa, Ação) para os
indicadores que fecharam o mês fora da meta.

O acesso é hierárquico: cada usuário enxerga os próprios indicadores e os de
quem está abaixo dele na cadeia de gestão (ADMIN → GESTOR → COLABORADOR).

## Funcionalidades

- Dashboard com KPIs, metas, medições e indicadores de desempenho.
- Desdobramento de KPIs em uma árvore de indicadores pai e filhos.
- Cálculo de farol conforme a direção da meta e as faixas configuradas.
- Controle de acesso por papel e hierarquia de gestores.
- Importação de dados por CSV.
- Planos de ação FCA para investigação de desvios.
- Fechamento e reabertura de períodos com trilha de auditoria.
- Health check da aplicação e do banco em `GET /api/health`.

## Stack

| Camada        | Tecnologia                              |
| ------------- | --------------------------------------- |
| Framework     | Next.js 16 (App Router, `standalone`)   |
| UI            | React 19, Tailwind CSS 4, Recharts      |
| Autenticação  | NextAuth v5 (credenciais + JWT)         |
| Banco / ORM   | PostgreSQL 16 + Prisma 6                |
| Testes        | Vitest                                  |
| Deploy        | Docker multi-stage + docker compose     |

## Estrutura do projeto

```text
src/app/          Páginas, layouts e rotas da aplicação
src/components/   Componentes reutilizáveis da interface
src/lib/          Regras de negócio, autenticação e ações do servidor
prisma/           Schema, migrations e seed do banco
public/           Arquivos estáticos
```

## Pré-requisitos

- **Node.js 22 LTS** (a imagem de produção usa `node:22-alpine`)
- **npm** 10+
- **Docker** e **Docker Compose** (para o PostgreSQL local e para o deploy)

## Setup local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e gere um `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Sem `AUTH_SECRET` o NextAuth lança `MissingSecret` e **todas** as requisições
retornam 500. As variáveis obrigatórias são `DATABASE_URL` e `AUTH_SECRET`;
veja o `.env.example` para a lista completa.

### 3. Subir o banco de dados

```bash
docker compose up -d postgres
```

O PostgreSQL fica exposto apenas em `127.0.0.1:5432` (não é acessível pela
rede). As credenciais vêm de `POSTGRES_USER` / `POSTGRES_PASSWORD` /
`POSTGRES_DB`, com o default local `quattrus/quattrus/quattrus`.

### 4. Aplicar as migrations

```bash
npx prisma migrate dev
```

Isso cria o schema e gera o Prisma Client.

### 5. Popular com dados de demonstração (opcional)

> **Atenção:** o seed é **destrutivo**. Ele apaga TODOS os planos de ação,
> medições, KPIs, usuários e departamentos antes de recriar as fixtures.
> Por isso ele só roda com a flag `ALLOW_DESTRUCTIVE_SEED=true` e nunca
> quando `NODE_ENV=production`.

```bash
# bash / zsh
ALLOW_DESTRUCTIVE_SEED=true npm run db:seed
```

```powershell
# PowerShell
$env:ALLOW_DESTRUCTIVE_SEED="true"; npm run db:seed
```

### 6. Rodar a aplicação

```bash
npm run dev
```

Acesse <http://localhost:3000>.

## Usuários de demonstração

Criados pelo seed. **Senha de todos: `demo123`** — são fixtures de
desenvolvimento e não devem existir em nenhum ambiente real.

| Usuário          | Papel        | Departamento     |
| ---------------- | ------------ | ---------------- |
| `ana.diretora`   | ADMIN        | Diretoria        |
| `carlos.gestor`  | GESTOR       | Comercial        |
| `julia.colab`    | COLABORADOR  | Recursos Humanos |
| `pedro.colab`    | COLABORADOR  | Produção         |

Árvore de KPIs criada pelo seed:

- Faturamento Bruto → Vendas B2B
- Índice de Qualidade → Taxa de Refugo
- Redução de Despesas
- Turnover

## Testes

```bash
npm test          # roda a suíte uma vez (vitest run)
npm run test:watch # modo watch
npm run lint       # ESLint
npm run build      # verifica se o build de produção compila
```

## Health check

`GET /api/health` faz um ping real no banco (`SELECT 1`):

- `200 {"status":"ok"}` — aplicação e banco saudáveis
- `503 {"status":"error"}` — banco inacessível

É a rota usada pelo `healthcheck` do serviço `web` no docker compose.

## Deploy em produção

### 1. Definir as variáveis no host

O `docker-compose.yml` lê as credenciais do ambiente do host. `AUTH_SECRET` é
obrigatório e **não tem default** — o compose falha imediatamente se ele não
estiver definido, em vez de deixar a aplicação quebrar em runtime.

```bash
export AUTH_SECRET="$(openssl rand -base64 32)"
export POSTGRES_USER="gestiona"
export POSTGRES_PASSWORD="<senha-forte>"
export POSTGRES_DB="gestiona"
```

### 2. Validar e subir

```bash
docker compose config      # valida a interpolação das variáveis
docker compose up -d --build
```

### 3. O que acontece no boot

1. O serviço `postgres` sobe e só é considerado pronto após o `pg_isready`.
2. O container `web` executa `prisma migrate deploy` no entrypoint, aplicando
   as migrations pendentes de forma não interativa.
   Nunca use `prisma migrate dev` em produção: ele é interativo e pode
   **resetar o banco**.
3. Em seguida o `node server.js` (build standalone do Next.js) inicia.
4. O healthcheck do compose passa a consultar `/api/health` a cada 30s.

### 4. Verificar

```bash
docker compose ps                      # o serviço web deve ficar "healthy"
docker compose logs -f web
curl -f http://localhost:3000/api/health
```

### Notas de operação

- Em produção, remova o mapeamento de porta do serviço `postgres` — a rede
  interna do compose já dá acesso ao banco para o serviço `web`.
- O volume `quattrus_postgres_data` persiste os dados entre deploys. Faça
  backup dele (`pg_dump`) antes de qualquer migration destrutiva.
- Nunca rode `npm run db:seed` nem `prisma migrate reset` contra a base de
  produção.
- O `.env` está no `.dockerignore`: segredos entram no container por variável
  de ambiente, nunca em uma camada da imagem.
