# AGENTS.md — Purple Stock Next (app)

Dense rules for coding agents in `purple-stock/next-qr-code-invetory-management/`.

## Architecture (enforced)

- Layers: `app` (HTTP/UI) → `services` (business) → `lib/db` (data) → `db` (schema/migrations).
- **Never** import `@/lib/db/*` from `src/app/*` (including API routes).
- API routes: parse params → call service → `successResponse` / `serviceErrorResponse` (`@/lib/api-route`).
- Payload parse/validation lives in the service (or `lib/contracts/schemas`), not the route.
- Dynamic IDs: `parseRouteParamId` / `parseRouteParamIds`.
- `await request.json()` requires `try/catch` on the route.
- No explicit `any` in `src/lib/services/*` or `src/app/api/*`.
- Guard: `npm run verify:architecture` (`scripts/check-architecture.mjs`).

## Clean code for agents

- Functions: prefer 4–20 lines. Files: under **500** lines (target 200–300).
- One responsibility per module. Prefer `services/billing/*` splits over growing god files.
- Names: greppable and unique. Avoid `data`, `handler`, `Manager`, `util`.
- Types explicit. No `any` on public boundaries.
- Early returns; max ~2 control-flow indent levels.
- Errors must include context (what failed + relevant ids/values).
- Comments: **WHY** / provenance only. Keep intent comments on refactor.
- No unjustified duplication; extract shared helpers.
- Formatter: Prettier project defaults. Do not bikeshed style.

## Billing / Stripe (domain map)

| Concern | Path |
|---|---|
| Facade (stable imports) | `src/lib/services/billing.ts` |
| Manual trial / PIX-style activation | `src/lib/services/billing/manual-billing.ts` |
| Checkout + portal | `src/lib/services/billing/stripe-checkout.ts` |
| Provider sync | `src/lib/services/billing/stripe-subscription-sync.ts` |
| Webhooks | `src/lib/services/billing/stripe-webhook.ts` |
| Shared Stripe mapping helpers | `src/lib/services/billing/stripe-shared.ts` |
| Env + trial constant | `src/lib/stripe.ts` (`STRIPE_CHECKOUT_TRIAL_DAYS`) |
| Access gate | `src/lib/services/subscription-access.ts` |

Rules:

- Checkout trial is **session-level** (`trial_period_days`), not a new Product/Price.
- Do not invent a second `STRIPE_PRICE_ID` for trial.
- `payment_method_collection: "always"` is required so card is collected when amount is R$0.
- Amplify app env holds live Stripe keys; staging may share live keys — do not complete accidental live payments in tests.

## Auth / multi-tenant

- Session user: `getUserIdFromRequest` (`src/lib/permissions.ts`).
- Team access: `authorizeTeamAccess` / `authorizeTeamPermission`.
- Never return another team's data without active membership.

## Feature flow

1. DB helpers in `src/lib/db/<domain>.ts`.
2. Service in `src/lib/services/<domain>.ts` (or `services/<domain>/*` + facade): parse → auth → db → `ServiceResult`.
3. Route in `src/app/api/.../route.ts` as thin adapter.
4. Pages: Server Component + `/_components/*Client.tsx` for interactivity.
5. Tests: service suite + route suite.

## Commands (one-shot)

```bash
npm run verify:architecture
npm test -- --runInBand
npm run check:dependencies   # npm audit gate used by CI
npm run build                # when build/config/billing surfaces change
```

Local app:

```bash
npm run dev -- --port 3001
# or: npm run dev:local-default
```

## Tests

- Each top-level `src/lib/services/*.ts` needs `src/__tests__/lib/services/<name>.service.test.ts`.
- Submodules under `services/<domain>/` are covered via the facade suite (e.g. `billing.service.test.ts`).
- Cover success, validation fail, auth fail, unexpected fail.
- Mock Stripe/DB with named fakes/mocks; keep suites headless (no interactive secrets).
- Policy: `scripts/check-test-policy.mjs`.

## DB

- Schema: `src/db/schema.ts`
- Migrations: `src/db/migrations/*.sql` + `npm run db:migrate`
- Client init: `src/db/client.ts` (`ensureDatabase()`)

## Env (billing)

- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`
- `APP_URL` / `NEXT_PUBLIC_APP_URL` for Checkout/Portal return URLs
- `SESSION_SECRET` required in production

## Do not

- Business rules in route handlers
- `NextResponse.json` / raw `new Response(...)` in API routes
- Auth bypass for team operations
- Grow `billing.ts` / `items.ts` / `admin.ts` past 500 lines without a split plan
- Delete WHY/provenance comments “for cleanliness”
- Create Stripe Product/Price just to change trial length

## Deploy notes (Amplify)

- App id: `d1c0tcuisic1or` (`new_qr_code_inventory-management`)
- `develop` → `staging.purplestock.com.br`
- `main` → `app.purplestock.com.br`
- Stripe env is app-level; trial needs **code deploy only**, not env changes
