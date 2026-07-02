# Marketing Agent Skill

## Trigger
`/marketing-agent`

## Role
You are the Growth & Marketing Engineer for a Tajikistan e-commerce marketplace. You build promo codes, push/SMS campaigns, Telegram channel automation, loyalty points, referral programs, seasonal sale mechanics, and marketing analytics — all tuned for TJ market: Telegram-first audience, Beeline TJ SMS, Russian/Tajik bilingual copy, COD-friendly offers, and seasonal spikes (Навруз, Иди Қурбон, Сомониён).

---

## TJ Marketing Context

```typescript
const TJ_MARKETING = {
  topChannels: ['telegram', 'sms_beeline', 'instagram', 'push_web'],
  telegramPenetration: 0.78,     // 78% of online TJ users on Telegram
  instagramPenetration: 0.55,
  emailPenetration: 0.20,        // email marketing has low reach in TJ
  smsOpenRate: 0.95,             // SMS near-universal open rate
  pushOptInRate: 0.35,
  languages: ['ru', 'tg'],
  currency: 'TJS',
  avgOrderValue_dirams: 45_000,  // ~450 TJS
  codShare: 0.60,                // 60% COD — promos must work without prepayment
};

// Seasonal marketing calendar
const SEASONAL_CALENDAR = {
  navruz: {
    date: '03-21',
    campaignStart: '03-01',  // 3 weeks build-up
    campaignEnd: '03-31',
    categories: ['home_decor', 'textile', 'plants', 'gifts', 'clothing'],
    discountRange: [15, 30],   // % off
    priceMultiplier: 1.8,      // demand spike
    copyTheme: 'Навруз Муборак! / Наврӯзатон муборак!',
  },
  ramadan: {
    // Date shifts yearly — calculate dynamically
    categories: ['food', 'clothing', 'gifts', 'prayer_items'],
    discountRange: [10, 20],
    copyTheme: 'Рамазон Муборак! / Рамазони Мубораk!',
  },
  idi_qurbon: {
    // Date shifts yearly
    categories: ['clothing', 'electronics', 'gifts', 'food'],
    discountRange: [15, 25],
    priceMultiplier: 1.6,
    copyTheme: 'Иди Қурбон Муборак!',
  },
  somoniyon: {
    date: '09-09',              // Сомониён — Tajik national day
    campaignStart: '09-05',
    campaignEnd: '09-10',
    categories: ['all'],
    discountRange: [10, 15],
    copyTheme: 'Рӯзи Сомониён Муборак! Скидки для таджикистанцев!',
  },
  blackFriday: {
    // Last Friday of November
    categories: ['electronics', 'clothing', 'appliances'],
    discountRange: [20, 50],
    copyTheme: 'Чорак — Пятница Скидок! / Ҷумъаи Тахфифҳо!',
  },
  backToSchool: {
    months: [8, 9],
    categories: ['stationery', 'bags', 'electronics', 'clothing'],
    discountRange: [10, 20],
    copyTheme: 'К школе готовы! / Ба мактаб омода!',
  },
  construction: {
    months: [4, 5, 6, 7, 8, 9],
    categories: ['building_materials', 'tools', 'garden'],
    discountRange: [5, 15],
    copyTheme: 'Сезон строительства начался!',
  },
};
```

---

## Promo Code System

```typescript
// lib/marketing/promo.ts
import { prisma } from '@/lib/prisma';

export type PromoType =
  | 'percent_off'          // % скидка на весь заказ
  | 'fixed_off_dirams'     // фиксированная скидка в дирамах
  | 'free_delivery'        // бесплатная доставка
  | 'cashback_points'      // баллы кэшбэка
  | 'buy_x_get_y';         // купи X — получи Y

export interface PromoRule {
  type: PromoType;
  value: number;                    // % or dirams or point multiplier
  minOrderDirams?: number;          // минимальная сумма заказа
  maxDiscountDirams?: number;       // потолок скидки
  applicableCategories?: string[];  // ограничить категориями
  applicableRegions?: string[];     // ограничить регионами
  newUsersOnly?: boolean;
  firstOrderOnly?: boolean;
  maxUsesTotal?: number;
  maxUsesPerUser?: number;
}

export async function createPromoCode(params: {
  code: string;
  rule: PromoRule;
  startsAt: Date;
  expiresAt: Date;
  campaignName: string;
}) {
  return prisma.promoCode.create({
    data: {
      code: params.code.toUpperCase().trim(),
      type: params.rule.type,
      value: params.rule.value,
      minOrderDirams: params.rule.minOrderDirams ? BigInt(params.rule.minOrderDirams) : null,
      maxDiscountDirams: params.rule.maxDiscountDirams ? BigInt(params.rule.maxDiscountDirams) : null,
      applicableCategories: params.rule.applicableCategories ?? [],
      applicableRegions: params.rule.applicableRegions ?? [],
      newUsersOnly: params.rule.newUsersOnly ?? false,
      firstOrderOnly: params.rule.firstOrderOnly ?? false,
      maxUsesTotal: params.rule.maxUsesTotal ?? null,
      maxUsesPerUser: params.rule.maxUsesPerUser ?? 1,
      startsAt: params.startsAt,
      expiresAt: params.expiresAt,
      campaignName: params.campaignName,
      usedCount: 0,
    },
  });
}

// Validate & apply promo at checkout
export async function applyPromoCode(
  code: string,
  userId: string,
  orderDirams: number,
  categoryIds: string[],
  regionId: string,
): Promise<{ discountDirams: bigint; freeDelivery: boolean; bonusPoints: number } | { error: string }> {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
  const now = new Date();

  if (!promo) return { error: 'Промокод не найден' };
  if (now < promo.startsAt) return { error: 'Промокод ещё не активен' };
  if (now > promo.expiresAt) return { error: 'Срок действия промокода истёк' };
  if (promo.maxUsesTotal && promo.usedCount >= promo.maxUsesTotal) return { error: 'Промокод уже использован максимальное количество раз' };

  // Per-user usage check
  const userUses = await prisma.promoCodeUse.count({ where: { promoCodeId: promo.id, userId } });
  if (promo.maxUsesPerUser && userUses >= promo.maxUsesPerUser) return { error: 'Вы уже использовали этот промокод' };

  // Min order check
  if (promo.minOrderDirams && BigInt(orderDirams) < promo.minOrderDirams) {
    const minStr = `${Number(promo.minOrderDirams) / 100} с.`;
    return { error: `Минимальная сумма заказа: ${minStr}` };
  }

  // Category restriction
  if (promo.applicableCategories.length > 0) {
    const hasMatch = categoryIds.some(c => promo.applicableCategories.includes(c));
    if (!hasMatch) return { error: 'Промокод не действует на выбранные товары' };
  }

  // Region restriction
  if (promo.applicableRegions.length > 0 && !promo.applicableRegions.includes(regionId)) {
    return { error: 'Промокод недоступен для вашего региона' };
  }

  // New/first-order checks
  if (promo.newUsersOnly || promo.firstOrderOnly) {
    const orderCount = await prisma.order.count({ where: { userId } });
    if (promo.newUsersOnly && orderCount > 0) return { error: 'Промокод только для новых пользователей' };
    if (promo.firstOrderOnly && orderCount > 0) return { error: 'Промокод только для первого заказа' };
  }

  // Calculate discount
  let discountDirams = BigInt(0);
  let freeDelivery = false;
  let bonusPoints = 0;

  switch (promo.type) {
    case 'percent_off': {
      const raw = BigInt(Math.floor(orderDirams * promo.value / 100));
      discountDirams = promo.maxDiscountDirams
        ? raw < promo.maxDiscountDirams ? raw : promo.maxDiscountDirams
        : raw;
      break;
    }
    case 'fixed_off_dirams':
      discountDirams = BigInt(promo.value);
      break;
    case 'free_delivery':
      freeDelivery = true;
      break;
    case 'cashback_points':
      bonusPoints = Math.floor(orderDirams * promo.value / 100);
      break;
  }

  return { discountDirams, freeDelivery, bonusPoints };
}
```

```prisma
// prisma/schema.prisma additions
model PromoCode {
  id                   String        @id @default(cuid())
  code                 String        @unique
  type                 String
  value                Float
  minOrderDirams       BigInt?
  maxDiscountDirams    BigInt?
  applicableCategories String[]
  applicableRegions    String[]
  newUsersOnly         Boolean       @default(false)
  firstOrderOnly       Boolean       @default(false)
  maxUsesTotal         Int?
  maxUsesPerUser       Int           @default(1)
  usedCount            Int           @default(0)
  campaignName         String
  startsAt             DateTime
  expiresAt            DateTime
  createdAt            DateTime      @default(now())
  uses                 PromoCodeUse[]

  @@index([code])
  @@index([expiresAt])
}

model PromoCodeUse {
  id          String    @id @default(cuid())
  promoCode   PromoCode @relation(fields: [promoCodeId], references: [id])
  promoCodeId String
  userId      String
  orderId     String    @unique
  createdAt   DateTime  @default(now())

  @@unique([promoCodeId, userId])
  @@index([userId])
}
```

---

## Loyalty Points System

```typescript
// lib/marketing/loyalty.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

const POINTS_PER_100_DIRAMS = 1;          // 1 балл за каждые 100 дирам (~1 TJS)
const POINT_VALUE_DIRAMS = 50;            // 1 балл = 50 дирам (0.50 TJS)
const MIN_REDEEM_POINTS = 100;            // минимум для списания
const MAX_REDEEM_PCT = 30;               // не более 30% суммы заказа баллами

export async function earnPoints(userId: string, orderId: string, orderDirams: number) {
  const points = Math.floor(orderDirams / 100) * POINTS_PER_100_DIRAMS;
  if (points === 0) return;

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: { userId, orderId, points, type: 'earn', description: 'Покупка' },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
    }),
  ]);

  // Invalidate cached balance
  await redis.del(`loyalty:balance:${userId}`);
}

export async function redeemPoints(
  userId: string,
  orderId: string,
  points: number,
  orderDirams: number,
): Promise<{ ok: true; discountDirams: number } | { ok: false; error: string }> {
  if (points < MIN_REDEEM_POINTS) {
    return { ok: false, error: `Минимум ${MIN_REDEEM_POINTS} баллов для списания` };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { loyaltyPoints: true } });
  if (user.loyaltyPoints < points) {
    return { ok: false, error: 'Недостаточно баллов' };
  }

  const maxDiscount = Math.floor(orderDirams * MAX_REDEEM_PCT / 100);
  const discountDirams = Math.min(points * POINT_VALUE_DIRAMS, maxDiscount);
  const actualPoints = Math.ceil(discountDirams / POINT_VALUE_DIRAMS);

  await prisma.$transaction([
    prisma.loyaltyTransaction.create({
      data: { userId, orderId, points: -actualPoints, type: 'redeem', description: 'Оплата баллами' },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { decrement: actualPoints } },
    }),
  ]);

  await redis.del(`loyalty:balance:${userId}`);
  return { ok: true, discountDirams };
}

export async function getPointsBalance(userId: string): Promise<number> {
  const cached = await redis.get(`loyalty:balance:${userId}`);
  if (cached) return Number(cached);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } });
  const balance = user?.loyaltyPoints ?? 0;
  await redis.setex(`loyalty:balance:${userId}`, 300, String(balance));
  return balance;
}
```

```prisma
model LoyaltyTransaction {
  id          String   @id @default(cuid())
  userId      String
  orderId     String?
  points      Int                    // negative = redeem
  type        String                 // 'earn' | 'redeem' | 'expire' | 'bonus'
  description String
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
}
```

---

## Referral Program

```typescript
// lib/marketing/referral.ts
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';

const REFERRER_BONUS_DIRAMS  = 2_000;   // 20 TJS для того, кто пригласил
const REFEREE_BONUS_DIRAMS   = 1_500;   // 15 TJS для нового пользователя
const MIN_FIRST_ORDER_DIRAMS = 10_000;  // минимальный первый заказ для активации бонуса

export async function generateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  const code = nanoid(8).toUpperCase();
  await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
  return code;
}

export async function applyReferralCode(newUserId: string, code: string): Promise<void> {
  if (!code) return;

  const referrer = await prisma.user.findFirst({ where: { referralCode: code } });
  if (!referrer || referrer.id === newUserId) return;

  await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId: newUserId,
      status: 'pending',
    },
  });

  await prisma.user.update({
    where: { id: newUserId },
    data: { referredByUserId: referrer.id },
  });
}

// Call after new user's first order completes (COD: after delivery confirmed)
export async function activateReferralBonus(newUserId: string, orderDirams: number): Promise<void> {
  if (orderDirams < MIN_FIRST_ORDER_DIRAMS) return;

  const referral = await prisma.referral.findFirst({
    where: { refereeId: newUserId, status: 'pending' },
  });
  if (!referral) return;

  await prisma.$transaction([
    // Credit both parties as store credit (stored as dirams in UserCredit)
    prisma.userCredit.create({
      data: { userId: referral.referrerId, amountDirams: BigInt(REFERRER_BONUS_DIRAMS), reason: 'referral_bonus', expiresAt: addDays(90) },
    }),
    prisma.userCredit.create({
      data: { userId: newUserId, amountDirams: BigInt(REFEREE_BONUS_DIRAMS), reason: 'welcome_bonus', expiresAt: addDays(60) },
    }),
    prisma.referral.update({
      where: { id: referral.id },
      data: { status: 'rewarded', rewardedAt: new Date() },
    }),
  ]);
}

function addDays(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}
```

```prisma
model Referral {
  id          String    @id @default(cuid())
  referrerId  String
  refereeId   String    @unique
  status      String    @default("pending")  // pending | rewarded | expired
  rewardedAt  DateTime?
  createdAt   DateTime  @default(now())

  @@index([referrerId])
  @@index([status])
}

model UserCredit {
  id            String   @id @default(cuid())
  userId        String
  amountDirams  BigInt
  reason        String
  usedDirams    BigInt   @default(0)
  expiresAt     DateTime
  createdAt     DateTime @default(now())

  @@index([userId, expiresAt])
}
```

---

## SMS Campaigns via Beeline TJ

```typescript
// lib/marketing/sms-campaign.ts
import { smsQueue } from '@/lib/queues/sms';   // existing BullMQ queue

export interface SMSCampaign {
  name: string;
  templateRu: string;   // e.g. "{{name}}, скидка {{pct}}%! Промокод: {{code}}. Заказ: bozor.tj"
  templateTg: string;   // Tajik version
  audience: 'all' | 'inactive_30d' | 'high_value' | 'region';
  regionId?: string;
  scheduledAt: Date;
}

export async function launchSMSCampaign(campaign: SMSCampaign): Promise<void> {
  const users = await getAudience(campaign.audience, campaign.regionId);

  // Batch into 100-user chunks to avoid queue flooding
  const CHUNK = 100;
  for (let i = 0; i < users.length; i += CHUNK) {
    const chunk = users.slice(i, i + CHUNK);
    const delay = Math.floor(i / CHUNK) * 2_000;   // 2s between chunks

    for (const user of chunk) {
      const lang = user.preferredLang ?? 'ru';
      const template = lang === 'tg' ? campaign.templateTg : campaign.templateRu;
      const text = interpolate(template, {
        name: user.firstName ?? 'Покупатель',
        phone: user.phone,
      });

      await smsQueue.add(
        'send-sms',
        { to: user.phone, text, campaignName: campaign.name },
        { delay, attempts: 3, backoff: { type: 'exponential', delay: 5_000 } },
      );
    }
  }
}

async function getAudience(type: SMSCampaign['audience'], regionId?: string) {
  const base = { deletedAt: null, phone: { not: null }, smsOptIn: true };

  switch (type) {
    case 'inactive_30d':
      return prisma.user.findMany({
        where: {
          ...base,
          orders: { none: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } },
        },
        select: { id: true, phone: true, firstName: true, preferredLang: true },
        take: 10_000,
      });

    case 'high_value':
      return prisma.user.findMany({
        where: { ...base, lifetimeSpendDirams: { gte: BigInt(100_000) } }, // ≥1000 TJS lifetime
        select: { id: true, phone: true, firstName: true, preferredLang: true },
        take: 5_000,
      });

    case 'region':
      return prisma.user.findMany({
        where: { ...base, defaultRegionId: regionId },
        select: { id: true, phone: true, firstName: true, preferredLang: true },
        take: 10_000,
      });

    default:
      return prisma.user.findMany({
        where: base,
        select: { id: true, phone: true, firstName: true, preferredLang: true },
        take: 50_000,
      });
  }
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// SMS max 160 chars — always validate
export function validateSMSLength(text: string): boolean {
  return text.length <= 160;
}
```

---

## Telegram Channel Bot

```typescript
// lib/marketing/telegram.ts
// Uses Grammy (lightweight Telegram Bot framework for Node.js)

import { Bot, InlineKeyboard } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID!;   // e.g. '@bozortj' or '-100...'

export interface TGPromoPost {
  titleRu: string;
  titleTg: string;
  discountPct: number;
  promoCode: string;
  originalPriceDirams: number;
  salePriceDirams: number;
  productId: string;
  imageUrl: string;
  expiresAt: Date;
  lang?: 'ru' | 'tg' | 'both';
}

function formatPriceTG(dirams: number): string {
  return `${(dirams / 100).toLocaleString('ru')} с.`;
}

function buildPostText(post: TGPromoPost): string {
  const deadline = post.expiresAt.toLocaleDateString('ru-TJ', { day: 'numeric', month: 'long' });
  const orig = formatPriceTG(post.originalPriceDirams);
  const sale = formatPriceTG(post.salePriceDirams);

  return [
    `🛍️ *${post.titleRu}*`,
    post.lang !== 'ru' ? `_${post.titleTg}_` : '',
    '',
    `~~${orig}~~ → *${sale}* 🔥 (-${post.discountPct}%)`,
    '',
    `🎟 Промокод: \`${post.promoCode}\``,
    `⏳ До ${deadline}`,
    '',
    `[Купить на Бозор.тж](${process.env.NEXT_PUBLIC_SITE_URL}/product/${post.productId})`,
  ].filter(l => l !== undefined).join('\n');
}

export async function publishPromoToChannel(post: TGPromoPost): Promise<void> {
  const text = buildPostText(post);
  const keyboard = new InlineKeyboard()
    .url('🛒 Купить', `${process.env.NEXT_PUBLIC_SITE_URL}/product/${post.productId}`)
    .url('📦 Каталог', `${process.env.NEXT_PUBLIC_SITE_URL}/catalog`);

  await bot.api.sendPhoto(CHANNEL_ID, post.imageUrl, {
    caption: text,
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

// Flash sale countdown post
export async function publishFlashSale(params: {
  products: Array<{ id: string; titleRu: string; priceDirams: number; discountPct: number }>;
  durationHours: number;
  imageUrl: string;
}): Promise<void> {
  const lines = params.products.slice(0, 5).map(p =>
    `• ${p.titleRu} — ${formatPriceTG(p.priceDirams)} (-${p.discountPct}%)`
  );
  const text = [
    `⚡️ *ФЛЭШ-РАСПРОДАЖА — ${params.durationHours} часов!*`,
    '',
    ...lines,
    '',
    `🔗 Все предложения: ${process.env.NEXT_PUBLIC_SITE_URL}/sale`,
  ].join('\n');

  await bot.api.sendPhoto(CHANNEL_ID, params.imageUrl, {
    caption: text,
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .url('🔥 Смотреть все', `${process.env.NEXT_PUBLIC_SITE_URL}/sale`),
  });
}

// Daily digest — top 5 deals of the day (BullMQ cron at 09:00 UTC+5 = 04:00 UTC)
export async function publishDailyDigest(): Promise<void> {
  const { prisma } = await import('@/lib/prisma');

  const deals = await prisma.product.findMany({
    where: { discountPct: { gte: 15 }, stockQty: { gt: 0 }, deletedAt: null },
    orderBy: { discountPct: 'desc' },
    take: 5,
    select: { id: true, titleRu: true, priceDirams: true, originalPriceDirams: true, discountPct: true },
  });

  if (!deals.length) return;

  const lines = deals.map(d =>
    `• [${d.titleRu}](${process.env.NEXT_PUBLIC_SITE_URL}/product/${d.id}) — ${formatPriceTG(Number(d.priceDirams))} (-${d.discountPct}%)`
  );

  const text = [
    `🌅 *Лучшие скидки дня — ${new Date().toLocaleDateString('ru-TJ', { day: 'numeric', month: 'long' })}*`,
    '',
    ...lines,
    '',
    `📲 bozor.tj — доставка по всему Таджикистану`,
  ].join('\n');

  await bot.api.sendMessage(CHANNEL_ID, text, { parse_mode: 'Markdown' });
}
```

---

## Push Notifications

```typescript
// lib/marketing/push.ts
// Uses web-push (VAPID) for PWA

import webPush from 'web-push';
import { prisma } from '@/lib/prisma';

webPush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  badge?: string;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  await Promise.allSettled(
    subscriptions.map(sub =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(async (err) => {
        // 410 Gone — subscription expired, remove it
        if (err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }),
    ),
  );
}

// Personalised abandonment push (BullMQ job, fires 30 min after cart add with no order)
export async function sendAbandonedCartPush(userId: string): Promise<void> {
  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: { items: { include: { product: { select: { titleRu: true, priceDirams: true } } }, take: 1 } },
  });
  if (!cart?.items.length) return;

  const item = cart.items[0].product;
  await sendPushToUser(userId, {
    title: 'Забыли что-то? 🛒',
    body: `${item.titleRu} ждёт вас в корзине — ${(Number(item.priceDirams) / 100).toLocaleString('ru')} с.`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    icon: '/icons/icon-192.png',
  });
}

// Price drop push for users who wishlisted the product
export async function sendPriceDropPush(productId: string, newPriceDirams: number): Promise<void> {
  const wishlists = await prisma.wishlistItem.findMany({
    where: { productId },
    select: { userId: true, product: { select: { titleRu: true } } },
    take: 5000,
  });

  const price = `${(newPriceDirams / 100).toLocaleString('ru')} с.`;

  await Promise.all(
    wishlists.map(w =>
      sendPushToUser(w.userId, {
        title: '📉 Снижение цены!',
        body: `${w.product.titleRu} теперь стоит ${price}`,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/product/${productId}`,
      }),
    ),
  );
}
```

---

## Seasonal Campaign Creator

```typescript
// lib/marketing/seasonal.ts

interface SeasonalCampaign {
  name: string;
  season: keyof typeof SEASONAL_CALENDAR;
  promoCode: string;
  discountPct: number;
  categoryIds: string[];
  maxDiscountDirams: number;
  durationDays: number;
}

export async function launchSeasonalCampaign(cfg: SeasonalCampaign) {
  const season = SEASONAL_CALENDAR[cfg.season];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + cfg.durationDays * 86_400_000);

  // 1. Create promo code
  const promo = await createPromoCode({
    code: cfg.promoCode,
    rule: {
      type: 'percent_off',
      value: cfg.discountPct,
      maxDiscountDirams: cfg.maxDiscountDirams,
      applicableCategories: cfg.categoryIds,
      maxUsesPerUser: 1,
    },
    startsAt: now,
    expiresAt,
    campaignName: cfg.name,
  });

  // 2. Post to Telegram channel
  // (pick first in-stock product from campaign categories as hero)
  const heroProduct = await prisma.product.findFirst({
    where: { categoryId: { in: cfg.categoryIds }, stockQty: { gt: 0 }, deletedAt: null },
    orderBy: { orderCount30d: 'desc' },
    select: { id: true, titleRu: true, titleTg: true, priceDirams: true, originalPriceDirams: true, imageUrls: true },
  });

  if (heroProduct) {
    await publishPromoToChannel({
      titleRu: heroProduct.titleRu,
      titleTg: heroProduct.titleTg ?? heroProduct.titleRu,
      discountPct: cfg.discountPct,
      promoCode: cfg.promoCode,
      originalPriceDirams: heroProduct.originalPriceDirams ? Number(heroProduct.originalPriceDirams) : Number(heroProduct.priceDirams),
      salePriceDirams: Number(heroProduct.priceDirams),
      productId: heroProduct.id,
      imageUrl: heroProduct.imageUrls[0],
      expiresAt,
    });
  }

  // 3. Send SMS to opted-in users (async, never block)
  await launchSMSCampaign({
    name: cfg.name,
    templateRu: `Праздник с нами! Скидка ${cfg.discountPct}% по промокоду ${cfg.promoCode}. bozor.tj`,
    templateTg: `Иди муборак! Тахфифи ${cfg.discountPct}% бо промокоди ${cfg.promoCode}. bozor.tj`,
    audience: 'all',
    scheduledAt: now,
  });

  return promo;
}
```

---

## Marketing Analytics

```typescript
// lib/marketing/analytics.ts
import { prisma } from '@/lib/prisma';

export async function getCampaignStats(campaignName: string) {
  const [promoUses, revenue] = await Promise.all([
    prisma.promoCodeUse.count({
      where: { promoCode: { campaignName } },
    }),
    prisma.order.aggregate({
      where: { promoCode: { campaignName }, status: 'delivered' },
      _sum: { totalDirams: true },
      _count: true,
    }),
  ]);

  const totalRevenueDirams = Number(revenue._sum.totalDirams ?? 0);
  const orderCount = revenue._count;

  return {
    campaignName,
    promoUses,
    orderCount,
    totalRevenueTJS: totalRevenueDirams / 100,
    avgOrderValueTJS: orderCount > 0 ? totalRevenueDirams / orderCount / 100 : 0,
  };
}

export async function getReferralStats() {
  const [total, rewarded, pending] = await Promise.all([
    prisma.referral.count(),
    prisma.referral.count({ where: { status: 'rewarded' } }),
    prisma.referral.count({ where: { status: 'pending' } }),
  ]);

  const creditsPaid = await prisma.userCredit.aggregate({
    where: { reason: { in: ['referral_bonus', 'welcome_bonus'] } },
    _sum: { amountDirams: true },
  });

  return {
    total,
    rewarded,
    pending,
    conversionPct: total > 0 ? (rewarded / total * 100).toFixed(1) : '0',
    totalCreditPaidTJS: Number(creditsPaid._sum.amountDirams ?? 0) / 100,
  };
}
```

---

## Marketing Dashboard Component

```tsx
// components/marketing/MarketingDashboard.tsx
'use client';

import { useEffect, useState } from 'react';

interface DashboardData {
  activeCampaigns: number;
  activePromoCodes: number;
  smsOptIns: number;
  telegramSubscribers: number;
  pointsIssuedToday: number;
  referrals: { total: number; rewarded: number; conversionPct: string };
}

export function MarketingDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch('/api/admin/marketing/summary').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="h-48 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-lg font-semibold">Маркетинг</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KPI label="Активных кампаний"     value={data.activeCampaigns.toString()} />
        <KPI label="Промокодов активных"   value={data.activePromoCodes.toString()} />
        <KPI label="SMS-подписчиков"       value={data.smsOptIns.toLocaleString('ru')} />
        <KPI label="Telegram-подписчиков"  value={data.telegramSubscribers.toLocaleString('ru')} />
        <KPI label="Баллов выдано сегодня" value={data.pointsIssuedToday.toLocaleString('ru')} />
        <KPI label="Рефералов"             value={`${data.referrals.rewarded} / ${data.referrals.total}`} />
        <KPI label="Конверсия рефералов"   value={`${data.referrals.conversionPct}%`} />
      </div>

      <NextCampaigns />
    </div>
  );
}

function NextCampaigns() {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-medium">Предстоящие праздники</h3>
      <ul className="space-y-2 text-sm">
        {UPCOMING_HOLIDAYS.map(h => (
          <li key={h.name} className="flex justify-between">
            <span>{h.name}</span>
            <span className="text-muted-foreground">{h.date} — запускать кампанию за {h.leadDays} дней</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const UPCOMING_HOLIDAYS = [
  { name: 'Навруз',          date: '21 марта',     leadDays: 21 },
  { name: 'Иди Қурбон',     date: 'плавающий',    leadDays: 14 },
  { name: 'Сомониён',        date: '9 сентября',   leadDays: 7  },
  { name: 'Чёрная пятница', date: 'конец ноября', leadDays: 14 },
  { name: 'Новый год',       date: '1 января',     leadDays: 21 },
];

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
```

---

## BullMQ Jobs

```typescript
// workers/marketing.worker.ts
import { Worker, Queue } from 'bullmq';
import { redis } from '@/lib/redis';

export const marketingQueue = new Queue('marketing', { connection: redis });

// Schedule recurring jobs
export async function scheduleMarketingJobs() {
  // Daily deals digest on Telegram — 09:00 Dushanbe time (04:00 UTC)
  await marketingQueue.add('daily-telegram-digest', {}, {
    repeat: { cron: '0 4 * * *' },
    jobId: 'daily-telegram-digest',
  });

  // Expire unused promo codes — midnight UTC
  await marketingQueue.add('expire-promos', {}, {
    repeat: { cron: '0 0 * * *' },
    jobId: 'expire-promos',
  });

  // Expire loyalty points older than 1 year — weekly Sunday
  await marketingQueue.add('expire-points', {}, {
    repeat: { cron: '0 1 * * 0' },
    jobId: 'expire-points',
  });
}

new Worker(
  'marketing',
  async (job) => {
    switch (job.name) {
      case 'daily-telegram-digest':
        await publishDailyDigest();
        break;
      case 'abandoned-cart-push':
        await sendAbandonedCartPush(job.data.userId);
        break;
      case 'price-drop-push':
        await sendPriceDropPush(job.data.productId, job.data.newPriceDirams);
        break;
      case 'expire-promos':
        // handled by DB TTL index — no-op here, just log
        break;
    }
  },
  { connection: redis, concurrency: 5 },
);
```

---

## Agent Workflow

When `/marketing-agent` is invoked:

1. **Campaign** — Create promo code with `createPromoCode()`, validate code is unique and date range is correct.
2. **Seasonal** — For holiday campaigns, call `launchSeasonalCampaign()` with the correct `season` key; it auto-picks hero product, posts to Telegram, queues SMS.
3. **Loyalty** — Confirm `earnPoints()` is called in the order-completed webhook. Confirm `redeemPoints()` is called at checkout.
4. **Referral** — Verify `activateReferralBonus()` is called after first COD delivery confirmed, not at order placement.
5. **Telegram** — `publishPromoToChannel()` requires image URL and valid bot token; test with `bot.api.getMe()` first.
6. **SMS** — Always validate `text.length <= 160` before queuing. Always async via BullMQ — never `await smsApi.send()` inline.
7. **Push** — Send abandoned-cart push 30 min after cart update (BullMQ `delay: 1_800_000`). Remove 410 subscriptions automatically.
8. **Analytics** — Surface `getCampaignStats()` after each campaign. Alert if conversion rate drops below 2%.

### TJ-specific rules
- All credit/discount amounts stored as **integer dirams** (`BigInt` in Prisma).
- SMS text ≤ 160 chars, must contain `bozor.tj` as CTA.
- COD users (60%) — promo must work without prepayment. Never require card for promo activation.
- GBAO region: SMS reaches ~40% only (low connectivity) — prefer Telegram for GBAO.
- Bilingual copy required for Telegram posts; SMS can be single-language (match user's `preferredLang`).
- Навруз campaign: textile/home_decor — launch 01 March, end 31 March.
- Referral bonus activates only **after COD delivery confirmed**, not after order placed.
- Points expiry: 1 year from earn date. Warn user 30 days before expiry via push.
