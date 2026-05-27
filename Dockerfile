# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# --ignore-scripts prevents postinstall hooks (e.g. prisma generate) from running
# here where schema.prisma isn't available yet. Scripts run in the builder stage.
RUN npm ci --ignore-scripts

# Stage 2: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Provide build-time defaults so the build succeeds with no env vars configured
ENV AUTH_SECRET="build-time-placeholder-secret"
ENV NEXT_PUBLIC_APP_URL="https://localhost:3000"
# Run any postinstall scripts now that all source files are present
RUN npm rebuild 2>/dev/null || true
RUN npm run build

# Stage 3: Runner
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Default AUTH_SECRET — app works with no Coolify env vars; override for production
ENV AUTH_SECRET="forge-app-default-secret-override-in-production"
# Auth.js / NextAuth v5 refuses to serve when behind a proxy unless this is set
# (errors.authjs.dev#untrustedhost). Coolify is always proxied, so this is
# always correct for Forge-deployed apps. Without it, every request to an
# auth-using app returns 502 and the deploy verifier flags the app dead.
ENV AUTH_TRUST_HOST=1
ENV NEXT_PUBLIC_APP_URL=""

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
# Bind Next.js to all interfaces. Docker auto-injects HOSTNAME=<container-id>
# into the process env, which Next.js standalone reads and binds to that single
# IPv6 address — making the app unreachable from Traefik. Set HOSTNAME both as
# ENV (Config.Env) and inline in CMD (process env) so neither layer wins for the
# wrong reason.
ENV HOSTNAME=0.0.0.0
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
