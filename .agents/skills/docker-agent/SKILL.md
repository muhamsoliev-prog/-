# Docker Agent Skill

## Trigger
`/docker-agent`

## Role
You are the Docker/Containerization Engineer for a Tajikistan marketplace. You write production-ready Dockerfiles, multi-stage builds, Docker Compose configs for local dev, and deployment manifests — optimized for Next.js 14, Node.js workers, and PostgreSQL/Redis/Meilisearch services.

---

## Production Dockerfile (Next.js)

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

# Build the source code
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image — minimal
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy only what's needed
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## BullMQ Worker Dockerfile

```dockerfile
# Dockerfile.worker
FROM node:20-alpine AS base
RUN apk add --no-cache openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 worker

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=worker:nodejs . .
RUN npx prisma generate

USER worker

# Workers don't expose ports — they consume BullMQ queues
CMD ["node", "--loader", "ts-node/esm", "workers/index.ts"]
```

---

## .dockerignore

```
node_modules
.next
.git
.env
.env.*
!.env.example
coverage
*.log
.DS_Store
prisma/migrations
```

---

## Docker Compose (local dev)

```yaml
# docker-compose.yml
version: '3.9'

services:
  app:
    build:
      context: .
      target: builder
    command: npm run dev
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    ports:
      - '3000:3000'
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      meilisearch:
        condition: service_started
    environment:
      DATABASE_URL: postgresql://marketplace:secret@postgres:5432/marketplace_dev
      REDIS_URL: redis://redis:6379
      MEILISEARCH_HOST: http://meilisearch:7700

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    command: npm run worker:dev
    volumes:
      - .:/app
      - /app/node_modules
    env_file: .env
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://marketplace:secret@postgres:5432/marketplace_dev
      REDIS_URL: redis://redis:6379
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: marketplace_dev
      POSTGRES_USER: marketplace
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U marketplace -d marketplace_dev']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

  meilisearch:
    image: getmeili/meilisearch:v1.7
    ports:
      - '7700:7700'
    environment:
      MEILI_MASTER_KEY: meili_dev_key
      MEILI_ENV: development
    volumes:
      - meilisearch_data:/meili_data

  mailhog:
    image: mailhog/mailhog
    ports:
      - '1025:1025'   # SMTP
      - '8025:8025'   # Web UI

volumes:
  postgres_data:
  redis_data:
  meilisearch_data:
```

---

## Docker Compose (production override)

```yaml
# docker-compose.prod.yml
version: '3.9'

services:
  app:
    build:
      context: .
      target: runner
    restart: always
    ports:
      - '3000:3000'
    env_file: .env.production
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
      target: runner
    restart: always
    env_file: .env.production
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

---

## Health Check API

```typescript
// app/api/health/route.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export async function GET() {
  const checks = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ]);

  const healthy = checks.every(c => c.status === 'fulfilled');
  return Response.json(
    { ok: healthy, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
```

---

## Makefile for Common Commands

```makefile
# Makefile
.PHONY: dev build up down logs migrate seed

dev:
	docker compose up --build

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f app worker

migrate:
	docker compose exec app npx prisma migrate dev

seed:
	docker compose exec app npx prisma db seed

build-prod:
	docker build -t marketplace:latest --target runner .

shell:
	docker compose exec app sh
```

---

## Agent Workflow

1. **Multi-stage** — Always use multi-stage builds: `deps` → `builder` → `runner`. Never ship devDependencies to production.
2. **Non-root** — Create a dedicated `nextjs`/`worker` user; never run as root in production.
3. **Healthchecks** — Every service in Compose must have a `healthcheck`. App container depends_on with `condition: service_healthy`.
4. **Volumes** — Use named volumes for Postgres/Redis/Meilisearch data. Mount source code only in dev.
5. **Secrets** — Use `.env` files locally; Docker secrets or Vault in production. Never COPY `.env` into the image.
6. **Standalone** — Set `output: 'standalone'` in `next.config.js` for minimal production image.
7. **Prisma** — Run `prisma generate` in the builder stage; copy `.prisma` client to runner.
