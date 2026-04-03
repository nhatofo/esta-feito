# ── Stage 1: deps ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY apps/backend/package.json    ./apps/backend/package.json
RUN npm install --legacy-peer-deps

# ── Stage 2: build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages/shared               ./packages/shared
COPY apps/backend                  ./apps/backend
COPY package.json                  ./package.json
RUN node_modules/.bin/tsc --project apps/backend/tsconfig.json

# ── Stage 3: production runtime ───────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/apps/backend/dist/apps/backend/src ./dist
COPY --from=builder /app/node_modules                        ./node_modules
COPY apps/backend/package.json                               ./package.json

# Print what was compiled so we can debug in build logs
RUN echo "=== dist contents ===" && find dist -name "*.js" | head -20

RUN mkdir -p logs && chown -R node:node /app
USER node

EXPOSE 8080
CMD ["node", "dist/index.js"]
