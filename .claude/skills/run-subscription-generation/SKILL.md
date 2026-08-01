---
name: run-subscription-generation
description: Force, inspect or backfill recurring-expense generation for GastApp subscriptions. Use when charges are missing from the ledger, after changing a subscription's schedule, or to verify generation after a deploy.
disable-model-invocation: true
---

# Run subscription generation

Subscriptions materialise real `Expense` rows. Generation is **idempotent** — a
unique index on `Expense(subscriptionId, date)` makes a double run impossible to
double-charge — so every command here is safe to repeat.

## How generation is triggered normally

Three paths, all calling `SubscriptionsService.runDueGenerations()`:

1. **Lazy catch-up on read** — `GET /api/subscriptions`, `GET /api/expenses` and
   the three `/api/reports/*` endpoints run it for the current user first. This
   is the self-healing path: opening the app is enough.
2. **Daily sweep** — `SubscriptionsScheduler` (`@Cron`, 02:00 UTC) runs it for
   everyone, so totals are right even without a visit.
3. **Manual** — `POST /api/subscriptions/run-generation`.

Nothing is generated for a `PAUSED`/`ARCHIVED` subscription, past its `endDate`,
or before its `nextOccurrenceDate` has arrived **in the owner's timezone**.

## Force a catch-up

```bash
TOKEN=<access token>
curl -sS -X POST http://localhost:3001/api/subscriptions/run-generation \
  -H "Authorization: Bearer $TOKEN" | jq
# => { "generated": 2, "subscriptionsProcessed": 1 }
```

`generated: 0` means nothing was due — not that something failed.

## Inspect the cursors

```sql
SELECT id, name, status, frequency,
       "startDate", "endDate", "nextOccurrenceDate", "lastGeneratedDate"
FROM "Subscription"
WHERE "userId" = '<user id>'
ORDER BY "nextOccurrenceDate";
```

Reading the state:

- `nextOccurrenceDate` — the next period still to materialise. **NULL** means
  the schedule is finished (past its `endDate`).
- `lastGeneratedDate` — the most recent period actually written.
- A cursor in the past on an `ACTIVE` row means a run is pending, not lost.

What was generated, and whether anything doubled up:

```sql
SELECT date, amount, description FROM "Expense"
WHERE "subscriptionId" = '<sub id>' ORDER BY date;

-- Must return zero rows. If it ever does not, the unique index is missing.
SELECT "subscriptionId", date, count(*) FROM "Expense"
WHERE "subscriptionId" IS NOT NULL
GROUP BY 1, 2 HAVING count(*) > 1;
```

## Backfill periods that were never generated

Generation only moves the cursor **forward**, so a deleted month is never
resurrected and a paused gap is never charged retroactively. To deliberately
re-run a stretch of history, move the cursor back and trigger a run:

```sql
UPDATE "Subscription"
SET "nextOccurrenceDate" = DATE '2026-01-15'   -- must sit on the schedule grid
WHERE id = '<sub id>';
```

```bash
curl -sS -X POST http://localhost:3001/api/subscriptions/run-generation \
  -H "Authorization: Bearer $TOKEN" | jq
```

Periods that already have an expense are skipped (P2002 swallowed); only the
genuinely missing ones are written. An off-grid date is snapped forward to the
next real occurrence, so prefer a date you can see in the `Expense` list above.

A single pass caps at `MAX_OCCURRENCES_PER_RUN` (400, in
`apps/api/src/subscriptions/subscriptions.service.ts`) so a bad date cannot hang
the request — just run it again to continue.

## Scheduled price changes

Generation charges the latest change effective **on or before** each occurrence,
falling back to `Subscription.amount`. Periods already generated keep the amount
they were written with, so a change never rewrites history.

```sql
SELECT amount, "effectiveFrom" FROM "SubscriptionAmountChange"
WHERE "subscriptionId" = '<sub id>' ORDER BY "effectiveFrom";
```

If a backfill produced the wrong prices, add or correct the change rows first,
delete the affected expenses, rewind `nextOccurrenceDate` as above, and re-run —
generation will rebuild them at the right price.

## Verify after a deploy

```bash
curl -sS https://api.gastapp.dev/api/health          # process is up
# Then, authenticated:
curl -sS -X POST https://api.gastapp.dev/api/subscriptions/run-generation \
  -H "Authorization: Bearer $TOKEN" | jq
```

If the daily sweep never seems to fire, check that `ScheduleModule.forRoot()` is
still in `apps/api/src/app.module.ts` — without it `@Cron` handlers are silently
never registered, with no error and no log.
