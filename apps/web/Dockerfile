# --- builder ---
FROM node:20.11-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY packages/types packages/types
COPY apps/web apps/web

ARG VITE_API_URL
ARG VITE_ENABLE_GOOGLE
ENV VITE_API_URL=$VITE_API_URL \
    VITE_ENABLE_GOOGLE=$VITE_ENABLE_GOOGLE

RUN pnpm --filter @gastapp/web build

# --- runtime ---
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
