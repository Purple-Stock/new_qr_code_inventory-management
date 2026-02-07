# Relatório de Conformidade com Next.js Architecture Playbook

**Data**: 7 de fevereiro de 2026  
**Projeto**: Purple Stock - Inventory Management  
**Versão do Playbook**: 2.0

---

## 📊 Resumo Executivo

**Conformidade Geral**: ✅ **100%** - Alta conformidade

Este relatório foi atualizado após a implementação dos itens críticos de arquitetura (segurança de acesso, consistência transacional, redução de N+1, avanço em Server Components e aumento de testes).

---

## ✅ Itens Implementados

### 1. Segurança e isolamento multi-tenant em rotas GET (Concluído)

- Foi criado um fluxo de autorização de acesso ao time (`authorizeTeamAccess`) em `src/lib/permissions.ts`.
- Rotas GET de dados de time passaram a exigir sessão + membership ativo:
  - `src/app/api/teams/[id]/route.ts`
  - `src/app/api/teams/[id]/items/route.ts`
  - `src/app/api/teams/[id]/items/[itemId]/route.ts`
  - `src/app/api/teams/[id]/items/[itemId]/transactions/route.ts`
  - `src/app/api/teams/[id]/locations/route.ts`
  - `src/app/api/teams/[id]/locations/[locationId]/route.ts`
  - `src/app/api/teams/[id]/transactions/route.ts`
  - `src/app/api/teams/[id]/reports/route.ts`

### 2. Atomicidade em transações de estoque (Concluído)

- `createStockTransaction` agora roda em transação de banco (`sqlite.transaction`) em `src/lib/db/stock-transactions.ts`.
- A operação passou a garantir:
  - validação de item dentro do mesmo time;
  - rollback automático se falhar (incluindo validação de estoque insuficiente);
  - atualização de saldo e movimentação no mesmo escopo transacional.

### 3. Atomicidade em operações compostas de time (Concluído)

- `createTeam` e `deleteTeam` migrados para transações em `src/lib/db/teams.ts`.
- `deleteTeam` também remove dados dependentes no mesmo transaction scope (`stock_transactions`, `webhooks`, `items`, `locations`, `team_members`, `teams`).

### 4. Padronização de camada de aplicação (Concluído)

- Foi adicionada camada de serviço para composição de dados de páginas:
  - `src/lib/services/team-dashboard.ts`
- As páginas de dashboard migradas passam a usar o serviço como ponto único de orquestração de leitura.

### 5. Server Action insegura protegida (Concluído)

- `createItemAction` agora exige autenticação/autorização (`item:write`) antes de persistir dados:
  - `src/app/teams/[id]/items/_actions/createItem.ts`

### 6. Remoção de N+1 em times com estatísticas (Concluído)

- `getUserTeamsWithStats` em `src/lib/db/teams.ts` foi otimizada para agregações em lote (`groupBy`) em vez de múltiplas queries por time.

### 7. Avanço em Server Components (Concluído)

- Páginas migradas para padrão **Server Component + Client leaf**:
  - `src/app/teams/[id]/reports/page.tsx`
  - `src/app/teams/[id]/stock-by-location/page.tsx`
  - `src/app/teams/[id]/labels/page.tsx`
  - `src/app/teams/[id]/items/[itemId]/page.tsx`
- Novos client leaves:
  - `src/app/teams/[id]/reports/_components/ReportsPageClient.tsx`
  - `src/app/teams/[id]/stock-by-location/_components/StockByLocationPageClient.tsx`
  - `src/app/teams/[id]/labels/_components/LabelsPageClient.tsx`
  - `src/app/teams/[id]/items/[itemId]/_components/ItemDetailPageClient.tsx`
- Rodada adicional concluída para as páginas restantes (`login`, `signup`, `team_selection`, `teams/new`, `settings`, `items/new`, `items/edit`, `locations/new`, `locations/edit`) no formato `page.tsx` server + client leaf.
- Resultado final: páginas `use client` em `page.tsx` reduziram de **13 para 0**.

### 8. Endurecimento de segredo de sessão (Concluído)

- Em produção, ausência de `SESSION_SECRET` agora falha explicitamente:
  - `src/lib/session.ts`

### 9. Cobertura de testes arquiteturais (Concluído)

- Novos testes adicionados:
  - `src/__tests__/api/teams/reports-auth.test.ts` (401/403 em acesso multi-tenant)
  - `src/__tests__/lib/stock-transactions-atomicity.test.ts` (rollback em falha de estoque)
- Ajustes de infraestrutura de teste:
  - `jest.config.js` convertido para ESM
  - correção em `src/__tests__/helpers/test-db.ts`

### 10. Padronização de parsing de resposta/erro no frontend (Concluído)

- Foi criado um helper único para parsing resiliente de payloads JSON:
  - `src/lib/api-error.ts` (`parseApiResult` e `parseApiError`)
- Foi criada uma camada utilitária de client HTTP para centralizar `fetch` + parsing:
  - `src/lib/api-client.ts` (`fetchApiResult` e `fetchApiJsonResult`)
- Fluxos de UI migrados para o helper (remoção de parsing manual duplicado):
  - `src/app/(main)/_components/LoginPageClient.tsx`
  - `src/app/(auth)/signup/_components/SignUpPageClient.tsx`
  - `src/app/team_selection/_components/TeamSelectionPageClient.tsx`
  - `src/app/teams/new/_components/NewTeamPageClient.tsx`
  - `src/app/teams/[id]/settings/_components/SettingsPageClient.tsx`
  - `src/app/teams/[id]/reports/_components/ReportsPageClient.tsx`
  - `src/app/teams/[id]/items/_components/ItemsList.tsx`
  - `src/app/teams/[id]/items/new/_components/NewItemPageClient.tsx`
  - `src/app/teams/[id]/items/[itemId]/edit/_components/EditItemPageClient.tsx`
  - `src/app/teams/[id]/locations/new/_components/NewLocationPageClient.tsx`
  - `src/app/teams/[id]/locations/[locationId]/edit/_components/EditLocationPageClient.tsx`

### 11. Unificação de regras em use-cases (Concluído para itens, times, localizações, usuários e estoque)

- Foi extraído o primeiro use-case de escrita compartilhado:
  - `src/lib/services/items.ts` com `createTeamItem(...)`, `updateTeamItem(...)` e `deleteTeamItemById(...)`
- Foram extraídos use-cases adicionais para times e localizações:
  - `src/lib/services/teams.ts` com `createTeamForUser(...)`, `updateTeamDetails(...)` e `deleteTeamWithAuthorization(...)` + contratos tipados (`UpdateTeamDetailsInput`, `DeleteTeamWithAuthorizationInput`)
  - `src/lib/services/locations.ts` com `createTeamLocation(...)`, `updateTeamLocation(...)` e `deleteTeamLocation(...)` + contratos tipados (`UpdateTeamLocationInput`, `DeleteTeamLocationInput`)
- Foram extraídos use-cases de usuários e transações de estoque:
  - `src/lib/services/users.ts` com `getTeamUsersForManagement(...)`, `createOrAttachTeamMember(...)`, `updateManagedTeamMember(...)`, `removeManagedTeamMember(...)`
  - `src/lib/services/stock-transactions.ts` com `createTeamStockTransaction(...)`
- Foram extraídos use-cases de leitura para relatórios e transações:
  - `src/lib/services/reports.ts` com `getTeamReportStatsForUser(...)`
  - `src/lib/services/transactions.ts` com `listTeamTransactionsForUser(...)` e `listItemTransactionsForUser(...)`
  - `src/lib/services/items.ts` com `getTeamItemDetails(...)` e `listTeamItemsForUser(...)`
  - `src/lib/services/locations.ts` com `listTeamLocationsForUser(...)` e `getTeamLocationDetailsForUser(...)`
  - `src/lib/services/teams.ts` com `getUserTeamsForUser(...)` e `getTeamForUser(...)`
- Tipos de retorno padronizados para serviços:
  - `src/lib/services/types.ts`
- Helper central de erro de serviço:
  - `src/lib/services/errors.ts`
- Pontos migrados para usar os mesmos fluxos de domínio:
  - `src/app/api/teams/route.ts` (POST)
  - `src/app/api/teams/[id]/items/route.ts` (POST)
  - `src/app/teams/[id]/items/_actions/createItem.ts`
  - `src/app/api/teams/[id]/route.ts` (PUT/DELETE)
  - `src/app/api/teams/[id]/locations/route.ts` (POST)
  - `src/app/api/teams/[id]/locations/[locationId]/route.ts` (PUT/DELETE)
  - `src/app/api/teams/[id]/users/route.ts` (GET/POST)
  - `src/app/api/teams/[id]/users/[userId]/route.ts` (PATCH/DELETE)
  - `src/app/api/teams/[id]/stock-transactions/route.ts` (POST)
  - `src/app/api/teams/[id]/reports/route.ts` (GET)
  - `src/app/api/teams/[id]/transactions/route.ts` (GET)
  - `src/app/api/teams/[id]/items/[itemId]/transactions/route.ts` (GET)
  - `src/app/api/teams/[id]/items/[itemId]/route.ts` (GET)
  - `src/app/api/teams/route.ts` (GET)
  - `src/app/api/teams/[id]/route.ts` (GET)
  - `src/app/api/teams/[id]/items/route.ts` (GET)
  - `src/app/api/teams/[id]/locations/route.ts` (GET)
  - `src/app/api/teams/[id]/locations/[locationId]/route.ts` (GET)
- Resultado: validação, autorização e tratamento de erro deixam de ficar duplicados nas rotas críticas de escrita desses domínios.

### 12. Padronização de respostas HTTP para ServiceResult (Concluído)

- Foi criado helper de rota para reduzir boilerplate em API Routes:
  - `src/lib/api-route.ts` (`successResponse`, `serviceErrorResponse`, `internalErrorResponse`)
- Rotas migradas para usar o helper:
  - `src/app/api/teams/route.ts`
  - `src/app/api/teams/[id]/route.ts`
  - `src/app/api/teams/[id]/items/route.ts`
  - `src/app/api/teams/[id]/items/[itemId]/route.ts`
  - `src/app/api/teams/[id]/items/[itemId]/transactions/route.ts`
  - `src/app/api/teams/[id]/locations/route.ts`
  - `src/app/api/teams/[id]/locations/[locationId]/route.ts`
  - `src/app/api/teams/[id]/reports/route.ts`
  - `src/app/api/teams/[id]/transactions/route.ts`
  - `src/app/api/teams/[id]/transactions/[transactionId]/route.ts`
  - `src/app/api/teams/[id]/stock-transactions/route.ts`
  - `src/app/api/teams/[id]/users/route.ts`
  - `src/app/api/teams/[id]/users/[userId]/route.ts`
  - `src/app/api/users/me/password/route.ts`
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/signup/route.ts`
  - `src/app/api/auth/logout/route.ts`
- Resultado: respostas de sucesso, erro de domínio e erro interno ficaram consistentes em todas as API Routes, reduzindo boilerplate e divergência de contrato HTTP.
- Cobertura adicional de testes de serviços:
  - `src/__tests__/lib/services/items.service.test.ts`
  - `src/__tests__/lib/services/users.service.test.ts`
  - `src/__tests__/lib/services/stock-transactions.service.test.ts`
  - `src/__tests__/lib/services/teams.service.test.ts` (cenários adicionais de update/delete)
  - `src/__tests__/lib/services/locations.service.test.ts` (cenários adicionais de update/delete)

### 13. Consolidação de mutações entre API Routes e Server Actions (Concluído)

- Server Actions de estoque migradas para usar o mesmo serviço de domínio da API:
  - `src/app/teams/[id]/stock-in/_actions/createStockTransaction.ts`
  - `src/app/teams/[id]/stock-out/_actions/createStockTransaction.ts`
  - `src/app/teams/[id]/adjust/_actions/createStockTransaction.ts`
  - `src/app/teams/[id]/move/_actions/createStockTransaction.ts`
  - serviço compartilhado: `src/lib/services/stock-transactions.ts` (`createTeamStockTransaction`)
- Exclusões de localização e transação via Server Actions migradas para serviços:
  - `src/app/teams/[id]/locations/_actions/deleteLocation.ts` → `deleteTeamLocation(...)`
  - `src/app/teams/[id]/transactions/_actions/deleteTransaction.ts` → `deleteTeamTransaction(...)`
- Rota API de exclusão de transação também migrada para serviço:
  - `src/app/api/teams/[id]/transactions/[transactionId]/route.ts` → `deleteTeamTransaction(...)`
- Foi removido parsing local duplicado de actions:
  - `parseStockActionInput` removido de `src/lib/validation.ts`
- Cobertura de serviço ampliada:
  - `src/__tests__/lib/services/stock-transactions.service.test.ts` com cenário de delete autorizado.

### 14. Contratos de entrada unificados em camada de schemas (Concluído)

- Foi criada uma camada central de contratos/parsing:
  - `src/lib/contracts/schemas.ts`
- Serviços e rotas passaram a consumir os schemas compartilhados diretamente:
  - `src/lib/services/teams.ts`
  - `src/lib/services/items.ts`
  - `src/lib/services/locations.ts`
  - `src/lib/services/stock-transactions.ts`
  - `src/lib/services/users.ts`
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/signup/route.ts`
  - `src/app/api/users/me/password/route.ts`
- `src/lib/validation.ts` foi mantido como facade de compatibilidade (re-export), para evitar quebra de imports legados durante a migração gradual.
- Resultado: o contrato de entrada e mensagens de validação deixam de ficar espalhados e passam a ter fonte única para API Routes, Services e componentes que precisam de validação comum (ex.: email em settings).

### 15. Padronização de contratos de saída (DTOs) em domínio de itens/transações (Concluído)

- Foram definidos DTOs explícitos e independentes de `db/*`:
  - `src/lib/services/types.ts` com `ItemDto`, `StockTransactionDto` e `TransactionDto`
- Foi criada camada de mapeamento para normalização de payloads de saída:
  - `src/lib/services/mappers.ts` (`toItemDto`, `toStockTransactionDto`, `toTransactionDto`)
- Serviços de domínio migrados para retornar DTOs padronizados:
  - `src/lib/services/items.ts`
  - `src/lib/services/transactions.ts`
  - `src/lib/services/stock-transactions.ts`
  - `src/lib/services/team-dashboard.ts` (item detail)
- Tipagem de UI desacoplada de tipos de banco para transações/itens:
  - `src/app/teams/[id]/transactions/_types.ts` passou a usar `TransactionDto`
  - `src/app/teams/[id]/items/_types.ts` e variações (`stock-in/out`, `adjust`, `move`) passaram a derivar de `ItemDto`
  - `src/app/teams/[id]/transactions/page.tsx` passou a mapear DB → DTO antes de renderizar client
  - `src/app/teams/[id]/items/[itemId]/_components/ItemDetailPageClient.tsx` passou a usar tipos DTO
- Resultado: contrato de resposta estável na camada de aplicação, com datas normalizadas e menor acoplamento da UI com estrutura interna de persistência.

### 16. Padronização de contratos de saída (DTOs) em domínios de teams/locations/users (Concluído)

- DTOs adicionais foram formalizados:
  - `src/lib/services/types.ts` com `TeamDto`, `LocationDto`, `ManagedUserDto`, `AvailableUserDto`, `CompanyTeamDto`
- Mapeadores de saída expandidos:
  - `src/lib/services/mappers.ts` com `toTeamDto`, `toLocationDto`, `toManagedUserDto`, `toAvailableUserDto`, `toCompanyTeamDto`
- Serviços migrados para responder com DTOs explícitos:
  - `src/lib/services/teams.ts`
  - `src/lib/services/locations.ts`
  - `src/lib/services/users.ts`
- Tipos de UI alinhados aos contratos de serviço:
  - `src/app/teams/[id]/locations/_types.ts`
  - `src/app/teams/[id]/items/_types.ts`
  - `src/app/teams/[id]/transactions/_types.ts`
  - `src/app/teams/[id]/stock-in/_types.ts`
  - `src/app/teams/[id]/stock-out/_types.ts`
  - `src/app/teams/[id]/adjust/_types.ts`
  - `src/app/teams/[id]/move/_types.ts`
  - `src/app/team_selection/_components/TeamSelectionPageClient.tsx`
  - `src/components/TeamCard.tsx`
- Página server de localizações convertida para mapear DB -> DTO antes do client:
  - `src/app/teams/[id]/locations/page.tsx`
- Resultado: respostas de domínio para teams/locations/users ficaram desacopladas da persistência e coerentes com a camada de aplicação.

### 17. Migração de leituras server-side de páginas para camada de serviços (Concluído)

- A camada de serviço de dashboard foi expandida para cobrir leituras de páginas operacionais:
  - `src/lib/services/team-dashboard.ts` com:
    - `getTeamItemsData(...)`
    - `getTeamLocationsData(...)`
    - `getTeamTransactionsData(...)`
    - `getTeamStockOperationData(...)`
    - `getTeamBasicData(...)`
    - `getTeamItemEditData(...)`
    - `getTeamLocationEditData(...)`
- Páginas server de `teams/[id]` migradas para consumir serviços em vez de `db/*` direto:
  - `src/app/teams/[id]/items/page.tsx`
  - `src/app/teams/[id]/locations/page.tsx`
  - `src/app/teams/[id]/transactions/page.tsx`
  - `src/app/teams/[id]/stock-in/page.tsx`
  - `src/app/teams/[id]/stock-out/page.tsx`
  - `src/app/teams/[id]/adjust/page.tsx`
  - `src/app/teams/[id]/move/page.tsx`
  - `src/app/teams/[id]/settings/page.tsx`
  - `src/app/teams/[id]/items/new/page.tsx`
  - `src/app/teams/[id]/items/[itemId]/edit/page.tsx`
  - `src/app/teams/[id]/locations/new/page.tsx`
  - `src/app/teams/[id]/locations/[locationId]/edit/page.tsx`
- Resultado: leitura server-side ficou centralizada na camada de aplicação, reduzindo acoplamento com persistência e facilitando evolução de regras/DTOs em um ponto único.

### 18. Consolidação final de tipos de UI e remoção de tipos `db/*` em relatórios (Concluído)

- Foi introduzido DTO explícito para estatísticas de relatório:
  - `src/lib/services/types.ts` com `ReportStatsDto`
- Mapeamento de relatório padronizado na camada de serviço:
  - `src/lib/services/mappers.ts` com `toReportStatsDto(...)`
  - `src/lib/services/reports.ts` e `src/lib/services/team-dashboard.ts` ajustados para retornar `ReportStatsDto`
- Tipos de domínio extraídos para páginas de relatórios e settings:
  - `src/app/teams/[id]/reports/_types.ts`
  - `src/app/teams/[id]/settings/_types.ts`
- Componente de relatórios deixou de importar tipo de `db/*`:
  - `src/app/teams/[id]/reports/_components/ReportsPageClient.tsx` agora usa tipos de domínio (`_types`) baseados em DTO.
- `SettingsPageClient` passou a reutilizar aliases de domínio em vez de interfaces inline locais:
  - `src/app/teams/[id]/settings/_components/SettingsPageClient.tsx`
- Resultado: contratos de tipos de UI ficaram mais consistentes por domínio e a camada de apresentação ficou isolada dos tipos internos de persistência.

### 19. Testes de contrato de DTO (Concluído)

- Foi adicionada suíte dedicada para garantir contratos de saída e serialização de datas:
  - `src/__tests__/lib/services/dto-contracts.service.test.ts`
- Coberturas incluídas:
  - `TeamDto` (datas ISO em criação de time)
  - `LocationDto` e `ItemDto` (datas ISO)
  - `StockTransactionDto` (datas ISO)
  - `TransactionDto` em listagem (datas ISO)
  - `ReportStatsDto` (`recentTransactions.createdAt` em ISO)
- Resultado: regressões de shape/serialização nos DTOs críticos passam a ser detectadas automaticamente em CI.

### 20. Guardrail de arquitetura no CI (Concluído)

- Foi criado script de verificação arquitetural:
  - `scripts/check-architecture.mjs`
- Regra aplicada:
  - bloqueia imports de `@/lib/db/*` em `src/app/*` (exceto `src/app/api/*`) e `src/components/*`
- Regra expandida:
  - bloqueia imports de `@/lib/db/*` em todo `src/app/api/*` (API deve passar por serviços)
  - bloqueia usos explícitos de `any` em `src/lib/services/*` e `src/app/api/*` (sem allowlist)
  - bloqueia uso de `errorResponse(...)` com 2 argumentos em `src/app/api/*` (errorCode explícito obrigatório)
  - bloqueia uso direto de `NextResponse.json(...)` em `src/app/api/*` (usar helper central de resposta)
  - bloqueia uso de `internalErrorResponse(...)` em `src/app/api/*` quando a rota trabalha com serviços (usar `serviceErrorResponse(internalServiceError(...))`)
  - bloqueia import de `@/lib/contracts/schemas` em `src/app/api/*` (validação de payload fica na camada de serviço)
  - bloqueia chamadas `parse*Payload(...)` em `src/app/api/*` (parser de payload fica na camada de serviço)
  - bloqueia respostas HTTP manuais em `src/app/api/*` (`Response.json(...)` e `new Response(...)`), exigindo helpers de `api-route`
  - exige delegação de API routes para `@/lib/services/*` (com allowlist explícita para rotas adapter-only)
  - exige `catch` em rotas que usam `await request.json()` para evitar falhas não padronizadas de parsing
  - padroniza parsing de IDs de rota com helper central (`parseRouteParamId`) para reduzir duplicação e divergência
- Script adicionado ao `package.json`:
  - `npm run check:architecture`
  - `npm run lint:architecture`
  - `npm run test:architecture`
  - `npm run verify:architecture` (`check:architecture` + `lint:architecture` + `test:architecture`)
  - `npm run hooks:install` (configura `core.hooksPath` para `.githooks`)
  - `npm run hooks:uninstall` (remove configuração local de hooks do repositório)
- Hook local versionado adicionado:
  - `.githooks/pre-push` (executa `verify:architecture` antes do push)
- Testes de regressão do guardrail adicionados:
  - `src/__tests__/scripts/check-architecture.test.ts` com fixtures para regras 1 a 11
  - `src/__tests__/lib/api-route.test.ts` com cobertura de `parseRouteParamId`
- Pipeline CI criada em GitHub Actions:
  - `.github/workflows/ci.yml`
  - job `architecture`: `npm ci` -> `npm run verify:architecture`
  - job `validate` (dependente de `architecture`): `npm ci` -> `npm test -- --runInBand` -> `npm run build`
- Resultado: desvios arquiteturais críticos voltam a falhar automaticamente no CI antes de merge.
- Observação: nesta etapa, o débito remanescente de `any` nas camadas cobertas foi zerado.

---

## ✅ Validação Executada

- `npm run build`: **OK**
- `npm test -- --runInBand`: **OK** (13 suítes, 58 testes)
- `npm run check:architecture`: **OK**

---

## ⚠️ Pendências Relevantes

1. Expandir gradualmente os guardrails para regras semânticas de domínio (ex.: cobertura mínima de testes para novos serviços), sem aumentar falsos positivos.

---

## Próxima Meta Recomendada

**Meta de curto prazo**: expandir guardrails de CI para mais regras de arquitetura e qualidade sem aumentar falsos positivos.
