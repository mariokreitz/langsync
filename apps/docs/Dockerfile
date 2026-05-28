# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /repo

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY apps/docs/package.json ./apps/docs/
COPY packages/cli/package.json ./packages/cli/
COPY packages/core/package.json ./packages/core/
COPY packages/excel-engine/package.json ./packages/excel-engine/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --filter @langsync/docs...

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/docs/node_modules ./apps/docs/node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @langsync/docs build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/docs/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/docs/.next/static ./apps/docs/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/docs/public ./apps/docs/public

USER nextjs
EXPOSE 3001

CMD ["node", "apps/docs/server.js"]
