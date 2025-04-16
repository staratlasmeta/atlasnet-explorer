FROM node:20-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
ARG FLAVOR
ENV FLAVOR=$FLAVOR

FROM base AS deps
RUN apk add --no-cache libc6-compat git

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml .pnpmfile.cjs ./
RUN pnpm install --frozen-lockfile --prefer-frozen-lockfile

# Builder
FROM base AS builder

RUN corepack enable
RUN corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN NEXT_PUBLIC_FLAVOR=$FLAVOR pnpm build


FROM base AS runner

ENV NODE_ENV=production


# Set correct permissions for nextjs user and don't run as root
RUN addgroup nodejs
RUN adduser -SDH nextjs
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
