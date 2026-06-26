---
name: gen-test
description: Generate a Jest feature test file for a NestJS service in apps/api/src. Use when adding tests to a service under apps/api/src/**/<name>.service.ts. Web component/hook tests are not supported yet (vitest + jsdom infra not configured); web feature behavior belongs in the e2e layer.
disable-model-invocation: true
---

# Generate a feature test for an API service

GastApp uses **direct service instantiation + a hand-rolled Prisma mock** — no
NestJS TestingModule, no supertest. See `categories.service.spec.ts` for the
canonical pattern.

## Target: API services only

- File naming: `<name>.service.spec.ts` next to the source file.
- Test framework: Jest (`ts-jest`, `testEnvironment: node`).
- Web (`apps/web`) has no DOM test infra — feature behaviour there lives in
  Playwright e2e tests (`/e2e-test`).

## Steps

1. **Read the service file** and identify the public methods and their behaviour
   branches. Focus on *what a user can and cannot do*, not on private helpers.

2. **Build a minimal Prisma mock** — only the Prisma methods the service
   actually calls, each a `jest.fn()`. If the service uses `$transaction`,
   include it.

   ```ts
   function makePrisma() {
     return {
       expense: { findUnique: jest.fn(), create: jest.fn(), ... },
       $transaction: jest.fn(),
     };
   }
   ```

3. **Instantiate directly** in `beforeEach`:

   ```ts
   let prisma: ReturnType<typeof makePrisma>;
   let service: ExpensesService;

   beforeEach(() => {
     prisma = makePrisma();
     service = new ExpensesService(prisma as unknown as PrismaService);
   });
   ```

4. **Write one `describe` per method**, one `it` per behaviour branch. Cover:
   - **Success path** — mock returns valid data; assert the serialized result.
   - **Ownership / AuthZ** — another user's resource → `ForbiddenException`.
   - **Not found** — Prisma returns `null` → `NotFoundException`.
   - **Conflict / validation** — duplicate name, Prisma `P2002` error →
     `ConflictException`.
   - **Edge cases specific to the method** (e.g., CSV import with no rows,
     delete with expenses attached).

5. **Use fully synthetic data** — invented names, amounts, IDs. Never real bank
   data or real emails.

6. **Do not test**:
   - Private helpers directly.
   - That `prisma.expense.findUnique` was called with an exact query shape —
     test the *outcome*, not the implementation.

## Import paths

```ts
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExpensesService } from './expenses.service';
```

Adjust relative paths for the actual target module.

## Run

```bash
pnpm --filter @gastapp/api test -- --testPathPattern=<name>.service.spec
```
