# syntax=docker/dockerfile:1.7
# Needs an .npmrc with a read:packages token for GitHub Packages:
#   docker build --secret id=npmrc,src=$HOME/.npmrc \
#     --build-arg GATEWAY_URL=http://api-gateway:4000 \
#     --build-arg NEXT_PUBLIC_REALTIME_URL=https://api.example.com -t novachat/web .
ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

FROM base AS builder
ARG GATEWAY_URL=http://api-gateway:4000
ARG NEXT_PUBLIC_REALTIME_URL=http://localhost:4000
ENV GATEWAY_URL=${GATEWAY_URL} NEXT_PUBLIC_REALTIME_URL=${NEXT_PUBLIC_REALTIME_URL} NEXT_TELEMETRY_DISABLED=1
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
