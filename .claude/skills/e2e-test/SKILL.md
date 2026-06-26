---
name: e2e-test
description: Write and run Playwright end-to-end tests for GastApp. Covers full user journeys through the web UI (login → features → assertions). Tests live in apps/web/e2e/. Requires the full stack running (web :5173, API :3000, Postgres). Use when testing feature flows that span frontend and backend.
disable-model-invocation: true
---

# Playwright e2e tests for GastApp

Tests live in `apps/web/e2e/`. They drive the real browser against the running
stack — no mocks, no DOM shortcuts.

## Prerequisites

### 1 — Install Playwright (first time only)

Playwright is not yet installed. Confirm before running:

```bash
# Add to apps/web — confirm version before running (check minimum-release-age)
pnpm --filter @gastapp/web add -D playwright @playwright/test

# Install the Chromium browser binary
pnpm --filter @gastapp/web exec playwright install chromium
```

Add `apps/web/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    cwd: '../..',          // repo root so pnpm -r dev works
  },
});
```

### 2 — Full stack must be running

```bash
docker compose up -d postgres
pnpm --filter @gastapp/api prisma:deploy   # or prisma:migrate
pnpm dev                                   # starts web :5173 + api :3000
```

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
