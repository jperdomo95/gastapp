# GastApp: project rules

Personal and friends expense tracker. pnpm monorepo: `apps/api` (NestJS + Prisma
+ Postgres), `apps/web` (React + Vite + TanStack Query + Radix + Tailwind),
`packages/types` (shared Zod schemas, the API contract). The README covers setup.

These rules are checked in code review. A change that breaks one should say why.

## Quality gates

CI runs these steps in this order, and every PR must pass them locally first:

```bash
pnpm --filter @gastapp/api exec prisma generate   # after any schema change or branch switch
pnpm --filter @gastapp/types build                # after editing packages/types or switching branches
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

- `@gastapp/types` resolves through `dist/`. Stale `dist/` or a stale Prisma
  client shows up as errors like "Cannot find module" or "property does not
  exist on PrismaService". Rebuild before you debug.
- Railway deploys `main` as soon as it changes, without waiting for CI. Never
  merge a red PR.

## Domain rules

- **USD only.** Inputs accept only `'USD'` (`currencyInput` / `CURRENCY` in
  `packages/types/src/expense.ts`). Read schemas keep a plain 3-letter string so
  legacy rows still parse. Don't add currency pickers, per-currency branches or
  conversions. Multi-currency is a deferred, optional follow-up.
- **Money** travels as decimal strings (`moneyString`). Do arithmetic in
  integer cents (`Math.round(Number(x) * 100)`), never in floats.
- **Dates** are `YYYY-MM-DD` strings in UTC. Convert at the Prisma boundary
  with `toDbDate` and `toDateString` (`subscriptions/recurrence.ts`). The user's
  "today" is `todayInTimezone(user.timezone)`, never `new Date()`.
- **Pure core, thin services.** Calculation logic (pay cycle, recurrence,
  recurring-charge detection, goal progress) lives in pure, string-dated
  modules with their own specs. Services load rows, map them, call the module
  and serialize the result.
- **Imports are idempotent and atomic.** Re-importing an overlapping statement
  must not double anything: dedupe against stored rows. Write related rows in
  one `$transaction`.
- **One attribution rule.** An expense pays at most one set-aside: the first
  match in `sortOrder`, then `createdAt` order (`bucketFor`). Any view that
  attributes expenses (pay cycle, goals) uses that same function.
- **Never silently drop user input or data.** Surface caps ("showing the 200
  most recent"), dropped values and failed saves in the UI. Before unlinking or
  deleting something that progress is computed from, fold that progress into
  stored state first (as `GoalsService.freezeBalances` does).
- **Ownership.** Every query is scoped to the authenticated `userId`. A
  referenced row (category, source, set-aside) is checked for ownership, which
  means 404 when missing and 403 when someone else's, before it is used.

## API

- Validate request bodies with the Zod schemas from `@gastapp/types`, using
  `ZodValidationPipe`. Response shapes match the read schemas there.
- Schema changes go through a Prisma migration (`/create-migration`). Never
  edit a migration that has reached `main`.

## Web

- Use raw Radix primitives plus Tailwind, not shadcn (`/new-component`).
- Read env only through `apps/web/src/lib/env.ts`, never `import.meta.env` in
  components or hooks.
- **Cache invalidation follows the data.** A mutation invalidates every query
  derived from what it changed. Expense writes invalidate `['expenses']`,
  `['reports']`, `['income']`, `['subscriptions', 'candidates']` and
  `['goals']`. Income and set-aside writes invalidate `['income']` and
  `['goals']`. When you add a derived query, add it to its sources' mutations.
- Catch `mutateAsync` failures and show the API's message (`apiErrorMessage`).
  Never leave a rejection unhandled.

## Tests

- API: Jest, with the service instantiated directly against a mocked Prisma
  (see `categories.service.spec.ts`). Test outcomes (results, thrown
  exceptions), not call shapes. Pure modules get table-style specs.
- Web has no DOM test runner. User journeys are Playwright e2e tests in
  `apps/web/e2e/` (`/e2e-test`, `e2e-writer` agent).
- Every bug fix comes with a regression test that fails without the fix.
- All test data is synthetic. Never use real bank data, names or account
  numbers. CSV fixtures follow the Banesco format: `;`-delimited, Spanish
  headers, DD/MM/YYYY dates, signed MONTO.

## Dependencies and secrets

- Pin exact versions (`save-exact`). Install with `--frozen-lockfile
  --ignore-scripts`. Prefer established libraries over hand-rolled parsers.
- `.env` and `pnpm-lock.yaml` are hook-protected. Change them by hand, on
  purpose.

## Workflow

- Branch from `main`. Never commit to `main` directly.
- **Stacked PRs.** Each PR's base is the branch below it. After fixing a lower
  branch, *merge* it into each branch above it, in order, running the gates at
  each step. Never rebase pushed branches. After the bottom PR merges, retarget
  the next PR to `main` (head branches are not auto-deleted) and merge `main`
  up the stack.
- **Review before merge.** Run `/code-review <PR>` on every PR. Fix every
  important finding, or answer it on the thread with reasoning. Resolve a
  thread only with a reply naming the fixing commit or the reason it stands.
- **Merge gate.** `main` requires the `ci` check and (once #15 is live)
  `claude-review`, which fails on any critical finding or on a missing verdict.
  Fix the finding and push; don't bypass the gate as admin except to recover
  from a broken review run.
- **Agents.** `qa` verifies a change against the running app and only reports.
  `security-reviewer` covers any change to `apps/api/src/auth/**`, guards,
  CORS or helmet. `test-writer` and `e2e-writer` write tests. Fixes happen in
  the main session.
