# AGENTS.md

Guia operacional para agentes e contribuidores no diretório `next/`.

## Objetivo

Preservar a arquitetura em camadas do Purple Stock:

- `app` adapta HTTP/UI.
- `services` concentra regra de negócio.
- `lib/db` executa acesso a dados.
- `db` define schema/migrações.

## Regras obrigatórias

1. Não acessar `@/lib/db/*` diretamente em `src/app/*` (incluindo API routes).
2. Toda API route deve delegar regra de negócio para `@/lib/services/*`.
3. API routes devem usar helpers de `@/lib/api-route` para resposta.
4. Validação/parsing de payload fica na camada de serviço.
5. Rotas dinâmicas devem parsear IDs com `parseRouteParamId` ou `parseRouteParamIds`.
6. Se usar `await request.json()`, o arquivo da rota precisa de `try/catch`.
7. Evitar `any` explícito em `src/lib/services/*` e `src/app/api/*`.

Essas regras são verificadas por `scripts/check-architecture.mjs`.

## Fluxo padrão para novas features

1. Criar ou estender funções de leitura/escrita em `src/lib/db/<dominio>.ts`.
2. Implementar caso de uso em `src/lib/services/<dominio>.ts`:
   - parse de payload;
   - autorização;
   - chamada de DB;
   - retorno `ServiceResult`.
3. Adaptar rota em `src/app/api/.../route.ts`:
   - parse de params;
   - chamada do service;
   - `successResponse` ou `serviceErrorResponse`.
4. Em páginas, manter `page.tsx` como Server Component e interatividade em `/_components/*Client.tsx`.
5. Adicionar testes dedicados do service e da rota.

## Autorização e multi-tenant

- Leitura de sessão: `getUserIdFromRequest` (`src/lib/permissions.ts`).
- Acesso a time: `authorizeTeamAccess`.
- Permissões por operação: `authorizeTeamPermission` ou `authorizePermission`.
- Nunca retornar dados de um time sem membership ativo.

## Banco e migrações

- Schema Drizzle: `src/db/schema.ts`.
- Migrações SQL: `src/db/migrations/*.sql`.
- Runner: `npm run db:migrate`.
- Inicialização automática do banco ocorre em `src/db/client.ts` via `ensureDatabase()`.

## Qualidade mínima antes de concluir trabalho

Execute:

```bash
npm run verify:architecture
npm test -- --runInBand
```

Se houver alteração de build/configuração relevante, execute também:

```bash
npm run build
```

## Política de testes

- Cada módulo em `src/lib/services/*.ts` precisa de suíte dedicada:
  - `src/__tests__/lib/services/<nome>.service.test.ts`
- Cobrir cenários de:
  - sucesso;
  - falha de validação;
  - falha de autorização;
  - falha inesperada.

A regra é validada por `scripts/check-test-policy.mjs`.

## Convenções úteis

- IDs em rotas são numéricos.
- Erros devem carregar `errorCode` consistente (`src/lib/errors.ts`).
- Preferir composição via `src/lib/services/mappers.ts` para DTOs.
- Revalidar rotas (`revalidatePath`) quando escrita impactar páginas cacheadas.

## Não fazer

- Não mover regra de negócio para route handler.
- Não usar `NextResponse.json` direto em API route.
- Não criar resposta manual com `new Response(...)` em API route.
- Não criar bypass de autorização para operações de time.
