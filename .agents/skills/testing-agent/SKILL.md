# Testing Agent Skill

## Trigger
`/testing-agent`

## Role
You are the Testing Engineer for a Tajikistan marketplace. You write unit tests with Vitest, integration tests with Prisma test transactions, and E2E tests with Playwright — covering COD order flows, fraud scoring, bilingual content, and payment edge cases. All tests run in CI with `npm test`.

---

## Setup

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom \
  @playwright/test msw supertest
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['lib/prisma.ts', '**/*.d.ts'],
      thresholds: { lines: 80, functions: 80 },
    },
  },
});
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Unit Tests — Fraud Scorer

```typescript
// tests/unit/fraud-scorer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis and Prisma before importing scorer
vi.mock('@/lib/prisma', () => ({ prisma: { order: { findUniqueOrThrow: vi.fn() } } }));
vi.mock('@/lib/redis', () => ({ redis: { incr: vi.fn(), expire: vi.fn(), get: vi.fn() } }));

import { scoreOrderRisk } from '@/lib/fraud/order-scorer';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

const mockOrder = (overrides = {}) => ({
  id: 'ord_1',
  userId: 'usr_1',
  totalDirams: BigInt(10_000),
  paymentMethod: 'cod',
  regionId: 'dushanbe',
  address: { city: 'Душанбе', street: 'Рудаки 1' },
  user: {
    id: 'usr_1',
    createdAt: new Date(Date.now() - 30 * 86_400_000),   // 30 days old
    phone: '+992901234567',
    orders: [],
  },
  items: [],
  ...overrides,
});

describe('scoreOrderRisk', () => {
  beforeEach(() => {
    vi.mocked(redis.incr).mockResolvedValue(1);
    vi.mocked(redis.expire).mockResolvedValue(1);
    vi.mocked(redis.get).mockResolvedValue(null);
  });

  it('low risk for established user, low value COD', async () => {
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(mockOrder() as any);
    const result = await scoreOrderRisk('ord_1');
    expect(result.level).toBe('low');
    expect(result.action).toBe('auto_approve');
  });

  it('adds 30 points for same-day account', async () => {
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(
      mockOrder({ user: { ...mockOrder().user, createdAt: new Date() } }) as any,
    );
    const result = await scoreOrderRisk('ord_1');
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.flags).toContain('new_account_same_day');
  });

  it('flags high-value COD over 5000 TJS', async () => {
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(
      mockOrder({ totalDirams: BigInt(600_000) }) as any,
    );
    const result = await scoreOrderRisk('ord_1');
    expect(result.flags).toContain('high_value_cod');
  });

  it('auto_reject at score >= 70', async () => {
    vi.mocked(prisma.order.findUniqueOrThrow).mockResolvedValue(
      mockOrder({
        totalDirams: BigInt(600_000),
        user: {
          ...mockOrder().user,
          createdAt: new Date(),
          orders: Array(10).fill({ status: 'cancelled' }),
        },
      }) as any,
    );
    const result = await scoreOrderRisk('ord_1');
    expect(result.action).toBe('auto_reject');
    expect(result.blockDelivery).toBe(true);
  });
});
```

---

## Unit Tests — A/B Bucketing

```typescript
// tests/unit/ab-bucketing.test.ts
import { describe, it, expect } from 'vitest';
import { assignVariant } from '@/lib/experiments/bucketing';
import type { Experiment } from '@/lib/experiments/types';

const experiment: Experiment = {
  id: 'checkout-cta-text',
  name: 'CTA Test',
  hypothesis: 'test',
  metric: 'checkout_completion',
  guardMetrics: ['return_rate'],
  variants: [
    { id: 'control',   name: 'Control',   weight: 50, config: {} },
    { id: 'treatment', name: 'Treatment', weight: 50, config: {} },
  ],
  trafficPct: 100,
  startedAt: new Date(),
  status: 'running',
  minSamplePerVariant: 500,
  confidenceLevel: 0.95,
};

describe('assignVariant', () => {
  it('is deterministic — same user always gets same variant', () => {
    const v1 = assignVariant('user-abc', experiment);
    const v2 = assignVariant('user-abc', experiment);
    expect(v1?.id).toBe(v2?.id);
  });

  it('returns null when user is outside trafficPct', () => {
    const lowTraffic = { ...experiment, trafficPct: 0 };
    expect(assignVariant('user-abc', lowTraffic)).toBeNull();
  });

  it('distributes roughly 50/50 over 1000 users', () => {
    const counts: Record<string, number> = { control: 0, treatment: 0 };
    for (let i = 0; i < 1000; i++) {
      const v = assignVariant(`user-${i}`, experiment);
      if (v) counts[v.id] = (counts[v.id] ?? 0) + 1;
    }
    expect(counts.control).toBeGreaterThan(400);
    expect(counts.treatment).toBeGreaterThan(400);
  });
});
```

---

## Integration Tests — API Routes

```typescript
// tests/integration/search.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createServer } from 'http';
import { GET } from '@/app/api/search/route';
import { NextRequest } from 'next/server';

describe('GET /api/search', () => {
  it('returns results for valid query', async () => {
    const req = new NextRequest('http://localhost/api/search?q=телефон&lang=ru');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('hits');
    expect(Array.isArray(body.hits)).toBe(true);
  });

  it('returns 400 for missing query', async () => {
    const req = new NextRequest('http://localhost/api/search');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
```

---

## Prisma Integration Tests (real DB with rollback)

```typescript
// tests/integration/order.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Order creation', () => {
  beforeEach(async () => {
    // Use interactive transactions for test isolation
    await prisma.$executeRaw`BEGIN`;
  });

  afterEach(async () => {
    await prisma.$executeRaw`ROLLBACK`;
  });

  it('decrements stock on order placement', async () => {
    const product = await prisma.product.create({
      data: {
        titleRu: 'Test', titleTg: 'Test', priceDirams: 10_000n,
        stockQty: 5, sellerId: 'seller_1', categoryId: 'cat_1',
        imageUrls: [],
      },
    });
    // ... place order, check stockQty = 4
    const updated = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updated.stockQty).toBe(4);
  });
});
```

---

## E2E Tests — Playwright

```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('COD Checkout Flow', () => {
  test('user can place a COD order', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="product-card"]:first-child');
    await page.click('[data-testid="add-to-cart"]');
    await page.click('[data-testid="cart-icon"]');
    await page.click('[data-testid="checkout-btn"]');

    // Fill address
    await page.fill('[name="city"]', 'Душанбе');
    await page.fill('[name="street"]', 'Рудаки 1');
    await page.fill('[name="phone"]', '+992901234567');

    // Select COD payment
    await page.click('[data-testid="payment-cod"]');

    // Place order
    await page.click('[data-testid="place-order-btn"]');
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-success"]')).toContainText('оплата при получении');
  });

  test('shows bilingual content for Tajik users', async ({ page }) => {
    await page.goto('/?lang=tg');
    await expect(page.locator('[data-testid="hero-title"]')).toContainText('харид');
  });
});
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## MSW Mock Server

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/support/chat', () => {
    return HttpResponse.json({ reply: 'Чем могу помочь?', escalate: false, suggestedActions: [] });
  }),
  http.get('/api/search', ({ request }) => {
    const q = new URL(request.url).searchParams.get('q');
    return HttpResponse.json({ hits: q ? [{ id: 'p1', titleRu: q }] : [], total: q ? 1 : 0 });
  }),
];
```

---

## Agent Workflow

1. **Unit tests** — Mock Prisma + Redis with `vi.mock()`; test pure business logic in isolation.
2. **Integration tests** — Use real DB wrapped in `BEGIN`/`ROLLBACK` transactions for isolation.
3. **E2E** — Playwright on mobile Android viewport (Pixel 7) because 80%+ TJ users are mobile.
4. **Coverage threshold** — 80% lines/functions for `lib/` and `app/api/`. CI fails below this.
5. **COD-first** — Always test the COD path as the primary happy path (not card payment).
6. **Bilingual** — Test Russian and Tajik UI strings in E2E; never test only one language.
7. **Fraud tests** — Score boundary tests: 39 → auto_approve, 40 → manual_review, 70 → auto_reject.
