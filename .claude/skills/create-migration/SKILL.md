---
name: create-migration
description: Create a new Prisma migration for the GastApp API after a schema.prisma change. Use when adding/altering models, fields, indexes, or relations in apps/api/prisma/schema.prisma.
disable-model-invocation: true
---

# Create a Prisma migration

Standardizes schema changes for `@gastapp/api` (Prisma 5 + PostgreSQL). Run this
after editing `apps/api/prisma/schema.prisma`.

## Preconditions

1. Postgres must be running: `docker compose up -d postgres`
2. The schema change is already saved in `apps/api/prisma/schema.prisma`.
3. `.env` at the repo root holds a valid `DATABASE_URL` (already wired through
   `dotenv -e ../../.env` by the package scripts — do not edit `.env`, it is
   blocked by a project hook).

## Steps

1. **Pick a migration name** in `snake_case`, describing the change as a verb +
   noun, e.g. `add_expense_tags`, `make_category_color_required`,
   `index_expense_created_at`. Keep it specific — it becomes the migration
   folder name under `apps/api/prisma/migrations/`.

2. **Generate the migration** (creates SQL, applies it to the dev DB, and
   regenerates the Prisma client):

   ```bash
   pnpm --filter @gastapp/api prisma:migrate --name <migration_name>
   ```

3. **Review the generated SQL** in
   `apps/api/prisma/migrations/<timestamp>_<migration_name>/migration.sql`.
   Confirm it matches intent — watch for accidental `DROP`s, non-nullable
   columns added without a default (will fail on existing rows), and missing
   indexes on new foreign keys.

4. **Regenerate types if needed** (usually done by step 2, but safe to re-run):

   ```bash
   pnpm --filter @gastapp/api prisma:generate
   ```

5. **Update affected code** — services/controllers in `apps/api/src/**` and any
   shared zod schemas in `packages/types` that mirror the model.

6. **Commit** the schema change AND the generated migration folder together.
   Never hand-edit an already-applied migration; create a new one instead.

## Production note

`prisma:migrate` is for development. Deploys run `pnpm --filter @gastapp/api
prisma:deploy` (which calls `prisma migrate deploy`) — do not run that here.
