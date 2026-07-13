---
name: devops-agent
description: |-
  DevOps for Next.js/PostgreSQL/Redis stack — Docker Compose, CI/CD pipelines, health checks, environment secrets, Prisma migration deployment, and monitoring.
---

# DevOps Agent Skill

## Trigger
`/devops-agent`

## Role
You are the DevOps Engineer for a Tajikistan marketplace. You set up CI/CD pipelines, GitHub Actions workflows, environment management, monitoring, alerting, and infrastructure-as-code for Next.js + BullMQ workers on Kubernetes or Vercel — with zero-downtime deployments and automatic rollback.

---

## GitHub Actions CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, 'claude/**']
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: marketplace_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
        options: --health-cmd "redis-cli ping" --health-interval 5s
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/marketplace_test
      REDIS_URL: redis://localhost:6379
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy
      - run: npm test -- --coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  build:
    runs-on: ubuntu-latest
    needs: [lint-typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: .next/
          retention-days: 7
```

---

## CD Pipeline (Deploy to K8s)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    needs: []
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.REGISTRY_HOST }}
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASS }}

      - name: Build & Push App
        uses: docker/build-push-action@v5
        with:
          context: .
          target: runner
          push: true
          tags: ${{ secrets.REGISTRY_HOST }}/marketplace:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build & Push Worker
        uses: docker/build-push-action@v5
        with:
          context: .
          file: Dockerfile.worker
          push: true
          tags: ${{ secrets.REGISTRY_HOST }}/marketplace-worker:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to K8s
        uses: actions-hub/kubectl@master
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
        with:
          args: |
            set image deployment/marketplace-app app=${{ secrets.REGISTRY_HOST }}/marketplace:${{ github.sha }} -n marketplace &&
            set image deployment/marketplace-worker worker=${{ secrets.REGISTRY_HOST }}/marketplace-worker:${{ github.sha }} -n marketplace

      - name: Wait for rollout
        uses: actions-hub/kubectl@master
        env:
          KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
        with:
          args: rollout status deployment/marketplace-app deployment/marketplace-worker -n marketplace --timeout=300s

      - name: Notify Telegram on failure
        if: failure()
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_OPS_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: "❌ Deploy failed for ${{ github.sha }} — ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

---

## Environment Variables Management

```bash
# .env.example — checked into git (no secrets)
DATABASE_URL=postgresql://user:pass@localhost:5432/marketplace_dev
REDIS_URL=redis://localhost:6379
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_KEY=meili_dev_key
ANTHROPIC_API_KEY=sk-ant-...
BEELINE_SMS_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_OPS_CHAT_ID=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

```bash
# Production secrets via GitHub Actions Secrets (never in code):
# DATABASE_URL, REDIS_URL → managed service connection strings
# ANTHROPIC_API_KEY → Anthropic Console
# All others → generate with: openssl rand -base64 32
```

---

## Monitoring Stack

```yaml
# k8s/monitoring/prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: 'marketplace-app'
        static_configs:
          - targets: ['marketplace-app-service.marketplace:3000']
        metrics_path: /api/metrics
      - job_name: 'redis'
        static_configs:
          - targets: ['redis-exporter:9121']
```

```typescript
// app/api/metrics/route.ts — Prometheus metrics endpoint
export async function GET() {
  const [orderCount, activeUsers, queueSize] = await Promise.all([
    redis.get('metrics:orders:today') ?? '0',
    redis.scard('metrics:dau:today'),
    redis.llen('bull:sms:waiting'),
  ]);

  const metrics = [
    `# HELP marketplace_orders_today Total orders placed today`,
    `# TYPE marketplace_orders_today gauge`,
    `marketplace_orders_today ${orderCount}`,
    `# HELP marketplace_dau Daily active users`,
    `marketplace_dau ${activeUsers}`,
    `# HELP marketplace_sms_queue_size SMS queue backlog`,
    `marketplace_sms_queue_size ${queueSize}`,
  ].join('\n');

  return new Response(metrics, { headers: { 'Content-Type': 'text/plain' } });
}
```

---

## Alerting Rules

```yaml
# k8s/monitoring/alerts.yaml
groups:
  - name: marketplace
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        annotations:
          summary: "Error rate > 5% for 2 minutes"

      - alert: SMSQueueBacklog
        expr: marketplace_sms_queue_size > 1000
        for: 5m
        annotations:
          summary: "SMS queue has {{ $value }} items — worker may be down"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total{namespace="marketplace"}[5m]) > 0
        for: 1m
        annotations:
          summary: "Pod {{ $labels.pod }} is crash-looping"
```

---

## Database Backup

```bash
#!/bin/bash
# scripts/backup-db.sh
set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="marketplace_${DATE}.sql.gz"

pg_dump $DATABASE_URL | gzip > /tmp/$BACKUP_FILE

# Upload to S3-compatible storage (Wasabi, Backblaze B2)
aws s3 cp /tmp/$BACKUP_FILE s3://marketplace-backups/postgres/$BACKUP_FILE \
  --endpoint-url $S3_ENDPOINT

rm /tmp/$BACKUP_FILE
echo "Backup complete: $BACKUP_FILE"
```

```yaml
# k8s/cronjob-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
  namespace: marketplace
spec:
  schedule: "0 3 * * *"  # 03:00 UTC daily (07:00 Dushanbe)
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: postgres:16-alpine
              command: ["/scripts/backup-db.sh"]
              envFrom:
                - secretRef:
                    name: marketplace-secrets
```

---

## Agent Workflow

1. **CI gates** — Lint + typecheck + tests must all pass before any merge to main.
2. **Build cache** — Use `cache-from: type=gha` in Docker builds to cut CI time from 8min to 2min.
3. **Zero-downtime** — `maxUnavailable: 0` in K8s RollingUpdate + readiness probe before traffic.
4. **Secrets** — All secrets in GitHub Actions Secrets or K8s Secrets; never in code or `.env` files committed to git.
5. **Monitoring** — Prometheus metrics endpoint + Telegram alerts for ops team (already using Telegram for marketing).
6. **Backups** — Daily DB backup to S3-compatible storage at 03:00 UTC; test restore monthly.
7. **Rollback** — `kubectl rollout undo deployment/marketplace-app` if error rate spikes post-deploy.
