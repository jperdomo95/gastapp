# --- builder ---
FROM node:20.11-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/types packages/types
COPY apps/api apps/api

RUN pnpm --filter @gastapp/api prisma generate
RUN pnpm --filter @gastapp/api build

# --- runtime ---
FROM node:20.11-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

COPY --from=builder /repo/package.json /repo/pnpm-workspace.yaml /repo/.npmrc ./
COPY --from=builder /repo/apps/api/package.json apps/api/
COPY --from=builder /repo/packages/types packages/types

RUN pnpm install --filter @gastapp/api --prod --frozen-lockfile --ignore-scripts

COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY --from=builder /repo/apps/api/prisma apps/api/prisma
COPY --from=builder /repo/apps/api/node_modules/.prisma apps/api/node_modules/.prisma
COPY --from=builder /repo/apps/api/node_modules/@prisma apps/api/node_modules/@prisma

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
