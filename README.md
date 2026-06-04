# GastApp

Expense tracker built for personal use and sharing with family/friends.

## Stack

- **Monorepo:** pnpm workspaces
- **Frontend:** React + Vite, Tailwind CSS, Radix UI primitives, TanStack Query
- **Backend:** NestJS + Prisma + PostgreSQL
- **Auth:** Email/password + Google OAuth (JWT access + httpOnly refresh cookie)
- **Deployment:** Docker Compose (self-hosted)

## Layout

```
gastapp/
├── apps/
│   ├── api/        # NestJS backend
│   └── web/        # React + Vite frontend
├── packages/
│   └── types/      # Shared Zod schemas + TS types
└── docker-compose.yml
```

## Quick start

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install --frozen-lockfile --ignore-scripts
pnpm --filter @gastapp/api prisma migrate dev
pnpm --filter @gastapp/api prisma db seed
pnpm dev
```

API: http://localhost:3001 — Web: http://localhost:5173

## Supply chain hygiene

- All dependency versions are pinned exactly (`save-exact=true` in `.npmrc`).
- CI installs use `--frozen-lockfile --ignore-scripts`.
- `minimum-release-age=2880` (48h) skips just-published versions to give the community time to flag bad releases.
- Run `pnpm audit` regularly; CI gates on it.
