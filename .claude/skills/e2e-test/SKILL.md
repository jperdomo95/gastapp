---
name: e2e-test
description: Write and run Playwright end-to-end tests for GastApp. Covers full user journeys through the web UI (login → features → assertions). Tests live in apps/web/e2e/. Requires the full stack running (web :5173, API :3001, Postgres). Use when testing feature flows that span frontend and backend.
disable-model-invocation: true
---

# Playwright e2e tests for GastApp

Tests live in `apps/web/e2e/`. They drive the real browser against the running
stack — no mocks, no DOM shortcuts.

## Prerequisites

### 1 — Playwright is installed (since 2026-07-04)

`playwright` + `@playwright/test` are exact-pinned in `apps/web`, headless
Chromium is downloaded, and `apps/web/playwright.config.ts` exists. The config's
`webServer` block starts the whole stack (`pnpm dev` at the repo root) if
nothing is on :5173, and reuses a running server otherwise. Headless Chromium
works on this WSL2 host without extra system packages — the old `libasound2`
blocker only affects the full headed browser.

On a fresh machine, re-run:

```bash
pnpm install
pnpm --filter @gastapp/web exec playwright install chromium
```

If a new Chromium build downloads and tests fail to launch, check missing libs
with `pnpm --filter @gastapp/web exec playwright install-deps chromium --dry-run`.

### 2 — Database must be up and migrated

```bash
docker compose up -d postgres
pnpm --filter @gastapp/api prisma:deploy   # or prisma:migrate
pnpm --filter @gastapp/api prisma:seed     # system categories
```

(API runs on :3001; the web dev server proxies nothing — the browser calls the
API directly via `VITE_API_URL`.)

### 3 — Test user strategy

The seed script only creates system categories, not users. Each e2e test file
should register a fresh user via `POST /auth/register` in `beforeAll` and store
the credentials for the session. Alternatively, create `apps/api/prisma/seed-e2e.ts`
that inserts a known test user, then run it with `pnpm --filter @gastapp/api
prisma:seed` before the suite.

## File structure

```
apps/web/e2e/
  fixtures/          # shared Page Object helpers and auth setup
    auth.ts          # login() helper: POST /auth/login, set cookie/token
  smoke.spec.ts      # toolchain check: login renders, register → dashboard
  expenses.spec.ts
  categories.spec.ts
  reports.spec.ts
  csv-import.spec.ts
```

## Selector strategy

1. **Role-based first** — `getByRole('button', { name: 'New expense' })`,
   `getByRole('dialog')`, `getByLabel('Amount')`.
2. **`data-testid`** as fallback for non-semantic elements — add
   `data-testid="expense-row"` to the source if needed.
3. Never target Tailwind class names — they change with styling.

## Key user journeys to cover

| File | Journey |
|---|---|
| `expenses.spec.ts` | Create expense → appears in list; edit amount; delete; pagination |
| `categories.spec.ts` | Create custom category; rename; delete without expenses; delete with reassign |
| `csv-import.spec.ts` | Upload valid Banesco CSV → imported count matches; reject non-CSV |
| `reports.spec.ts` | Date-range filter updates chart and totals |
| `auth.spec.ts` | Register; login with wrong password → error; logout |

## Run

```bash
pnpm --filter @gastapp/web exec playwright test
pnpm --filter @gastapp/web exec playwright test --ui   # interactive mode
```
