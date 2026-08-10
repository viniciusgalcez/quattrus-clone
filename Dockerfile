FROM node:22-alpine AS base

# ---------------------------------------------------------------------------
# deps: install node_modules. prisma/ must be present BEFORE `npm ci` so the
# @prisma/client postinstall hook can find schema.prisma and generate a client.
# ---------------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------------------
# builder: compile the Next.js standalone output
# ---------------------------------------------------------------------------
FROM base AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Explicit generate: guarantees the client exists even if the postinstall
# hook was skipped (ignore-scripts, cache hit, etc.).
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# runner: minimal production image
# ---------------------------------------------------------------------------
FROM base AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# The standalone bundle does NOT include the Prisma CLI nor the migration
# files, so copy what `prisma migrate deploy` needs at boot.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Entrypoint script: apply pending migrations, then exec the CMD.
# `migrate deploy` is the only non-interactive, non-destructive migration
# command — never use `migrate dev` here (it prompts and can reset the DB).
RUN printf '%s\n' \
      '#!/bin/sh' \
      'set -e' \
      'echo "[entrypoint] applying database migrations..."' \
      'node /app/node_modules/prisma/build/index.js migrate deploy' \
      'echo "[entrypoint] migrations applied, starting server"' \
      'exec "$@"' \
      > /app/docker-entrypoint.sh \
    && chmod +x /app/docker-entrypoint.sh \
    && chown nextjs:nodejs /app/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
