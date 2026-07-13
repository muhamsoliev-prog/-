---
name: fraud-detection-agent
description: |-
  Fraud detection for Tajikistan e-commerce — suspicious order patterns, COD cancellation scoring, device fingerprinting, BullMQ risk queue, and admin alerts.
---

# Fraud Detection Agent Skill

## Trigger
`/fraud-detection-agent`

## Role
You are the Fraud & Trust Engineer for a Tajikistan marketplace. You detect COD fraud (non-delivery, fake returns), fake reviews, counterfeit listings, and account takeovers — using rule-based scoring + ML features, with human review queue for edge cases. All decisions are logged and auditable.

---

## TJ Fraud Patterns

```typescript
const TJ_FRAUD_SIGNALS = {
  cod: {
    // COD fraud: 60% of orders — most common attack surface
    nonDeliveryFraud: 'buyer claims not received but GPS shows delivery',
    returnFraud: 'return different item (brick-in-box)',
    addressFarm: 'multiple orders same address different names',
    phoneRotation: 'same device, rotating phone numbers',
  },
  seller: {
    listingFraud: 'copy competitor photos, ship lower quality',
    reviewFarm: 'new accounts, same device, 5-star reviews',
    priceManipulation: 'inflate original price for fake discount',
    inventoryFraud: 'accept orders with zero actual stock',
  },
  account: {
    credentialStuffing: 'bulk login attempts from VPN/proxy',
    accountTakeover: 'password reset + immediate high-value order',
    sellerImpersonation: 'register similar seller name',
  },
};
```

---

## Order Risk Scorer

```typescript
// lib/fraud/order-scorer.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface OrderRiskResult {
  score: number;           // 0-100 (100 = highest risk)
  level: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  action: 'auto_approve' | 'manual_review' | 'auto_reject';
  blockDelivery: boolean;
}

export async function scoreOrderRisk(orderId: string): Promise<OrderRiskResult> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true, createdAt: true, phone: true,
          orders: { select: { status: true }, take: 50 },
        },
      },
      items: { include: { product: { select: { categoryId: true, priceDirams: true } } } },
      address: true,
    },
  });

  let score = 0;
  const flags: string[] = [];

  // --- Account age signals ---
  const accountAgeDays = Math.floor((Date.now() - order.user.createdAt.getTime()) / 86_400_000);
  if (accountAgeDays < 1)  { score += 30; flags.push('new_account_same_day'); }
  else if (accountAgeDays < 7) { score += 15; flags.push('new_account_week'); }

  // --- Order history signals ---
  const pastOrders = order.user.orders;
  const cancelRate = pastOrders.length > 0
    ? pastOrders.filter(o => o.status === 'cancelled').length / pastOrders.length
    : 0;
  const returnRate = pastOrders.length > 0
    ? pastOrders.filter(o => o.status === 'returned').length / pastOrders.length
    : 0;

  if (cancelRate > 0.5 && pastOrders.length >= 3) { score += 25; flags.push('high_cancel_rate'); }
  if (returnRate > 0.4 && pastOrders.length >= 3) { score += 20; flags.push('high_return_rate'); }
  if (pastOrders.length === 0) { score += 10; flags.push('first_order'); }

  // --- Order value signals ---
  const totalDirams = Number(order.totalDirams);
  if (totalDirams > 500_000 && order.paymentMethod === 'cod') {
    score += 20; flags.push('high_value_cod');  // COD > 5000 TJS
  }

  // --- Address signals ---
  const addressKey = `${order.address.city}:${order.address.street}`.toLowerCase();
  const addressOrderCount = await redis.incr(`fraud:addr:${addressKey}`);
  await redis.expire(`fraud:addr:${addressKey}`, 86_400 * 7);
  if (addressOrderCount > 5) { score += 15; flags.push('address_farm'); }

  // --- Phone rotation ---
  const deviceKey = await redis.get(`device:${order.userId}`);
  if (deviceKey) {
    const deviceOrders = await redis.incr(`fraud:device:${deviceKey}`);
    if (deviceOrders > 10) { score += 20; flags.push('device_rotation'); }
  }

  // --- GBAO region high-value COD ---
  if (order.regionId === 'gbao' && totalDirams > 200_000 && order.paymentMethod === 'cod') {
    score += 10; flags.push('gbao_high_value_cod');
  }

  // Determine level and action
  const level: OrderRiskResult['level'] =
    score >= 70 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'medium' : 'low';

  const action: OrderRiskResult['action'] =
    score >= 70 ? 'auto_reject' : score >= 40 ? 'manual_review' : 'auto_approve';

  return { score, level, flags, action, blockDelivery: score >= 70 };
}
```

---

## Review Fraud Detection

```typescript
// lib/fraud/review-fraud.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function detectFakeReview(reviewId: string): Promise<{
  isFake: boolean;
  confidence: number;
  reasons: string[];
}> {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: {
      user: { select: { createdAt: true, orderCount: true, reviewCount: true, deviceFingerprint: true } },
      product: { select: { sellerId: true } },
    },
  });

  const reasons: string[] = [];
  let riskScore = 0;

  const accountAgeDays = Math.floor((Date.now() - review.user.createdAt.getTime()) / 86_400_000);

  // Rule-based pre-screening
  if (accountAgeDays < 3 && review.rating === 5) { riskScore += 30; reasons.push('new_account_five_star'); }
  if (review.user.orderCount === 0) { riskScore += 40; reasons.push('never_ordered'); }
  if (review.user.reviewCount > 20 && accountAgeDays < 30) { riskScore += 25; reasons.push('review_farm'); }

  // Device fingerprint — same device reviewing same seller?
  if (review.user.deviceFingerprint) {
    const deviceSellerKey = `fraud:review:${review.user.deviceFingerprint}:${review.product.sellerId}`;
    const count = await redis.incr(deviceSellerKey);
    await redis.expire(deviceSellerKey, 86_400 * 30);
    if (count > 3) { riskScore += 35; reasons.push('device_seller_farm'); }
  }

  // AI content analysis for remaining borderline cases
  if (riskScore < 60 && riskScore > 15) {
    const aiResult = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: `Определи, является ли этот отзыв накруткой (fake review). Оцени 0-100.
Отзыв: "${review.text}"
Оценка: ${review.rating}/5
Дата регистрации аккаунта: ${accountAgeDays} дней назад.
Ответь JSON: {"fakeScore": 0-100, "reason": "..."}`,
      }],
    });

    const text = aiResult.content[0].type === 'text' ? aiResult.content[0].text : '{}';
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const { fakeScore, reason } = JSON.parse(m[0]);
      riskScore += Math.floor(fakeScore * 0.4);  // AI contributes 40% weight
      if (reason) reasons.push(`ai:${reason}`);
    }
  }

  const isFake = riskScore >= 60;
  const confidence = Math.min(100, riskScore);

  if (isFake) {
    await prisma.review.update({
      where: { id: reviewId },
      data: { status: 'flagged', fraudScore: confidence },
    });
  }

  return { isFake, confidence, reasons };
}
```

---

## Seller Listing Fraud

```typescript
// lib/fraud/listing-fraud.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function checkListingFraud(productId: string): Promise<{
  suspicious: boolean;
  flags: string[];
}> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { titleRu: true, priceDirams: true, originalPriceDirams: true, imageUrls: true, descriptionRu: true },
  });

  const flags: string[] = [];

  // Fake discount detection: original price inflated > 3x
  if (product.originalPriceDirams) {
    const ratio = Number(product.originalPriceDirams) / Number(product.priceDirams);
    if (ratio > 3) flags.push('inflated_original_price');
  }

  // AI image analysis — detect watermarks or stock photos
  if (product.imageUrls.length > 0) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: product.imageUrls[0] } },
          { type: 'text', text: 'Does this product image have watermarks, stock photo branding, or appear to be stolen from another website? Reply JSON: {"hasWatermark": bool, "isStockPhoto": bool}' },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const { hasWatermark, isStockPhoto } = JSON.parse(m[0]);
      if (hasWatermark) flags.push('image_watermark');
      if (isStockPhoto) flags.push('stock_photo_suspected');
    }
  }

  return { suspicious: flags.length > 0, flags };
}
```

---

## Fraud Dashboard API

```typescript
// app/api/admin/fraud/queue/route.ts
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level') ?? 'high';

  const orders = await prisma.orderFraudLog.findMany({
    where: { level: { in: level === 'all' ? ['low','medium','high','critical'] : [level, 'critical'] } },
    orderBy: [{ level: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      order: { select: { id: true, totalDirams: true, paymentMethod: true, regionId: true, user: { select: { phone: true } } } },
    },
  });

  return Response.json(orders.map(log => ({
    orderId: log.orderId,
    score: log.score,
    level: log.level,
    flags: log.flags,
    action: log.action,
    totalTJS: Number(log.order.totalDirams) / 100,
    paymentMethod: log.order.paymentMethod,
    region: log.order.regionId,
    phone: log.order.user.phone,
    createdAt: log.createdAt,
  })));
}
```

```prisma
model OrderFraudLog {
  id       String   @id @default(cuid())
  orderId  String   @unique
  score    Int
  level    String
  flags    String[]
  action   String
  reviewed Boolean  @default(false)
  reviewedBy String?
  reviewedAt DateTime?
  createdAt DateTime @default(now())
  order    Order    @relation(fields: [orderId], references: [id])

  @@index([level, reviewed])
  @@index([createdAt])
}
```

---

## Agent Workflow

1. **Order scoring** — Call `scoreOrderRisk()` synchronously before confirming COD order. Block if `score >= 70`.
2. **Review fraud** — Run `detectFakeReview()` async after review submission (BullMQ job).
3. **Listing fraud** — Run `checkListingFraud()` after new product publish.
4. **Manual review queue** — `score 40-69` → admin queue. Target: human review within 2 hours.
5. **Auto-reject** — `score >= 70` → cancel order, notify buyer, do NOT ship.
6. **GBAO** — Extra caution: COD > 2000 TJS in GBAO → always manual_review regardless of score.
7. **ML upgrade path** — Once 50k+ orders exist, replace rule-based scorer with XGBoost trained on `OrderFraudLog` outcomes. Current rules are the training labels.
8. **Privacy** — Never log full address or card numbers. Phone stored hashed in fraud logs.
