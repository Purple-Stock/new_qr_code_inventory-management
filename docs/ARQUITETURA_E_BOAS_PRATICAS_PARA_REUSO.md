# Arquitetura e Boas Práticas para Reuso em Outro Projeto

Este documento é um playbook prático para replicar a arquitetura do Purple Stock em outros projetos Next.js com foco em escalabilidade, manutenção e segurança.

## 1. Objetivo

Padronizar uma arquitetura em camadas onde:

- `app` adapta HTTP/UI.
- `services` concentra regras de negócio.
- `lib/db` executa acesso a dados.
- `db` define schema/migrações.

Resultado esperado:

- Menos acoplamento entre API e banco.
- Regras de autorização centralizadas.
- Mais testabilidade e previsibilidade.

## 2. Regras inegociáveis

1. Não acessar `@/lib/db/*` diretamente em `src/app/*` (incluindo API routes).
2. Toda API route deve delegar regra de negócio para `@/lib/services/*`.
3. API routes devem usar helpers de resposta (`successResponse`, `serviceErrorResponse`).
4. Parsing/validação de payload acontece na camada de serviço.
5. Rotas dinâmicas devem parsear IDs com `parseRouteParamId`/`parseRouteParamIds`.
6. Se usar `await request.json()`, envolver em `try/catch` na rota.
7. Evitar `any` explícito em `src/lib/services/*` e `src/app/api/*`.

## 3. Estrutura-base recomendada

```txt
src/
  app/
    api/
      <dominio>/route.ts
      <dominio>/[id]/route.ts
    (main)/
    (auth)/
  lib/
    api-route.ts
    errors.ts
    permissions.ts
    services/
      <dominio>.ts
      types.ts
      mappers.ts
    db/
      <dominio>.ts
  db/
    schema.ts
    migrations/*.sql
```

## 4. Fluxo padrão por feature

1. Criar/estender funções de leitura/escrita em `src/lib/db/<dominio>.ts`.
2. Implementar caso de uso em `src/lib/services/<dominio>.ts` com:
- parse/validação;
- autorização;
- chamada ao DB;
- retorno com contrato consistente (`ServiceResult`).
3. Adaptar rota em `src/app/api/.../route.ts` com:
- parse de params;
- chamada do service;
- `successResponse` ou `serviceErrorResponse`.
4. Em páginas, manter `page.tsx` como Server Component e interatividade em `/_components/*Client.tsx`.
5. Adicionar testes dedicados de service e route.

## 5. Contrato de serviço (ServiceResult)

Use um contrato previsível para sucesso/erro.

```ts
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string; status: number };
```

Benefícios:

- Rotas HTTP ficam finas e consistentes.
- Erros de negócio não vazam detalhes internos.
- Testes ficam diretos (assert por `ok`, `errorCode`, `status`).

## 6. Template de service

```ts
import { authorizeTeamAccess } from '@/lib/permissions';
import { createItemDb } from '@/lib/db/items';
import { serviceOk, serviceError } from '@/lib/services/types';

export async function createItemService(input: {
  userId: number;
  teamId: number;
  payload: unknown;
}) {
  // 1) parse/validação
  const parsed = parseCreateItemPayload(input.payload);
  if (!parsed.ok) {
    return serviceError('VALIDATION_ERROR', 400, parsed.message);
  }

  // 2) autorização
  const auth = await authorizeTeamAccess({ userId: input.userId, teamId: input.teamId });
  if (!auth.ok) {
    return serviceError('FORBIDDEN', 403, 'Acesso negado ao time.');
  }

  // 3) persistência
  const created = await createItemDb({ teamId: input.teamId, ...parsed.data });

  // 4) retorno de contrato
  return serviceOk(created);
}
```

## 7. Template de API route

```ts
import { successResponse, serviceErrorResponse, parseRouteParamId } from '@/lib/api-route';
import { getUserIdFromRequest } from '@/lib/permissions';
import { createItemService } from '@/lib/services/items';

export async function POST(request: Request, context: { params: { id: string } }) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return serviceErrorResponse({ ok: false, errorCode: 'UNAUTHORIZED', message: 'Não autenticado', status: 401 });

  const teamId = parseRouteParamId(context.params.id);
  if (!teamId.ok) return serviceErrorResponse(teamId.error);

  try {
    const payload = await request.json();
    const result = await createItemService({ userId, teamId: teamId.value, payload });
    return result.ok ? successResponse(result.data, 201) : serviceErrorResponse(result);
  } catch {
    return serviceErrorResponse({ ok: false, errorCode: 'INVALID_JSON', message: 'JSON inválido.', status: 400 });
  }
}
```

## 8. Autorização e multi-tenant

Diretrizes para evitar vazamento entre times:

- Extrair usuário de sessão/token (`getUserIdFromRequest`).
- Validar membership ativo antes de qualquer leitura/escrita (`authorizeTeamAccess`).
- Validar permissão por operação (`authorizeTeamPermission`/`authorizePermission`).
- Nunca retornar dados de time sem vínculo ativo do usuário.

## 9. Banco e migrações

- Centralizar schema em `src/db/schema.ts`.
- Manter migrações SQL versionadas em `src/db/migrations/*.sql`.
- Aplicar com `npm run db:migrate`.
- Garantir inicialização segura do banco em `src/db/client.ts`.

## 10. Política mínima de testes

Para cada arquivo de service, criar suíte dedicada:

- `src/__tests__/lib/services/<nome>.service.test.ts`

Cobertura mínima por caso de uso:

- sucesso;
- falha de validação;
- falha de autorização;
- falha inesperada.

Para rotas:

- status code correto;
- contrato de erro consistente;
- roteamento/param parsing.

## 11. Guardrails automatizados

Adote checks para impedir regressão arquitetural.

Scripts recomendados no `package.json`:

```json
{
  "scripts": {
    "verify:architecture": "node scripts/check-architecture.mjs && node scripts/check-test-policy.mjs",
    "test": "jest",
    "build": "next build"
  }
}
```

Validação mínima antes de merge:

```bash
npm run verify:architecture
npm test -- --runInBand
```

Se houve mudança relevante de build/config:

```bash
npm run build
```

## 12. Checklist de adoção em outro projeto

1. Criar estrutura de pastas (`app`, `lib/services`, `lib/db`, `db`).
2. Definir contrato único de erro (`errorCode`, `message`, `status`).
3. Implementar helpers HTTP (`successResponse`, `serviceErrorResponse`).
4. Implementar parser de IDs de rota (`parseRouteParamId`, `parseRouteParamIds`).
5. Centralizar autenticação/autorização em `permissions.ts`.
6. Migrar regra de negócio das rotas para services.
7. Criar testes de service e route por domínio.
8. Adicionar script de verificação arquitetural no CI.

## 13. Anti-patterns para bloquear

- Regra de negócio dentro de route handler.
- Query SQL/ORM direto em `src/app/api/*`.
- Resposta manual com `NextResponse.json` espalhada sem padronização.
- Uso de `any` para “passar rápido”.
- Bypass de autorização para operações de time.

## 14. Definição de pronto (DoD)

Uma feature só está pronta quando:

- respeita as regras inegociáveis;
- possui testes de service e route;
- passa em `verify:architecture` e testes;
- mantém contrato de erro consistente;
- não introduz acoplamento de camadas.
