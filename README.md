# Purple Stock (Next.js)

Sistema multi-tenant de gestão de estoque com times, localizações, itens, movimentações e relatórios.

![Purple Stock - Tela de Itens](public/app.png)

## Stack

- Next.js 16 (App Router)
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- SQLite (`better-sqlite3`) + Drizzle ORM
- Jest para testes

## Arquitetura

O projeto segue separação explícita de camadas:

- `src/app/*`: páginas e API Routes (adapters HTTP/UI).
- `src/lib/services/*`: regras de negócio, autorização e contratos de saída.
- `src/lib/db/*`: acesso a dados (queries Drizzle/SQLite).
- `src/db/*`: schema, cliente e migrações.

Fluxo padrão de API:

1. Route handler valida params e body bruto.
2. Route delega para um serviço em `src/lib/services/*`.
3. Serviço valida payload, autoriza e chama `src/lib/db/*`.
4. Route responde usando helpers de `src/lib/api-route.ts`.

Guardrails automáticos (CI e hook) impedem violações arquiteturais.

## Funcionalidades principais

- Autenticação por cookie assinado (`ps_session`).
- Multi-tenancy por time e membership ativo.
- CRUD de times, usuários do time, itens e localizações.
- Movimentações de estoque (`stock_in`, `stock_out`, `adjust`, `move`, `count`) com atomicidade.
- Relatórios consolidados por time.
- PWA com `manifest.json` e service worker.
- i18n local (`pt-BR`, `en`, `fr`).

## Estrutura de pastas

```txt
src/
  app/
    (main)/, (auth)/              # páginas
    teams/[id]/*                  # features por time
    api/*                         # rotas HTTP
  components/
    ui/*                          # base UI
    shared/*                      # blocos reutilizáveis
  lib/
    services/*                    # casos de uso
    db/*                          # consultas por domínio
    contracts/schemas.ts          # parse/validação de payload
    permissions.ts                # autorização
  db/
    schema.ts                     # tabelas e relações
    migrations/*.sql              # migrações SQL
```

## Requisitos

- Node.js 20+ (alinhado com CI).
- npm.

## Variáveis de ambiente

- `DATABASE_URL` (opcional): caminho do SQLite. Padrão: `./src/db.sqlite`.
- `SESSION_SECRET` (obrigatório em produção): segredo para assinatura da sessão.

## Setup local

```bash
npm install
npm run db:migrate
npm run dev
```

Aplicação em `http://localhost:3000`.

## Scripts

- `npm run dev`: ambiente de desenvolvimento.
- `npm run build`: build de produção.
- `npm run start`: sobe build de produção.
- `npm run test`: suíte completa.
- `npm run test:watch`: watch mode.
- `npm run test:coverage`: cobertura.
- `npm run db:migrate`: aplica SQLs de `src/db/migrations`.
- `npm run db:rollback -- --steps=1`: faz rollback das últimas migrações aplicadas (requer arquivos `*.down.sql` correspondentes).
- `npm run verify:architecture`: checks arquiteturais + política de testes + lint de arquitetura + testes de arquitetura.
- `npm run hooks:install`: ativa `.githooks/pre-push`.
- `npm run hooks:uninstall`: remove hook local.

Observação: existe script `db:seed` no `package.json`, mas o arquivo `src/db/seed.ts` não está presente no repositório atual.

## Endpoints principais

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET|POST /api/teams`
- `GET|PUT|DELETE /api/teams/:id`
- `GET|POST /api/teams/:id/items`
- `GET|PUT|DELETE /api/teams/:id/items/:itemId`
- `GET|POST /api/teams/:id/locations`
- `GET|PUT|DELETE /api/teams/:id/locations/:locationId`
- `GET|POST /api/teams/:id/stock-transactions`
- `GET /api/teams/:id/reports`
- `GET /api/teams/:id/transactions`
- `DELETE /api/teams/:id/transactions/:transactionId`

## Qualidade e CI

- Hook de pre-push executa `npm run verify:architecture`.
- GitHub Actions:
  - job `architecture`: `npm ci` + `npm run verify:architecture`.
  - job `validate`: `npm ci` + `npm test -- --runInBand` + `npm run build`.
