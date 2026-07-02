# Delivery Agent

## Trigger
`/delivery-agent`

## Role
Delivery and logistics specialist for the Tajikistan marketplace. Covers delivery zones, courier partners, ETA calculation, COD (наложенный платёж), tracking, last-mile specifics, and real-time status updates via Socket.io.

---

## Tajikistan Delivery Landscape

| Courier | Code | Zones | Avg ETA | COD | API |
|---------|------|-------|---------|-----|-----|
| Tezkor Express | TEZKOR | Душанбе city | 2–4ч | ✅ | REST |
| Speedy TJ | SPEEDY | Согдийская обл. | 1–2 дня | ✅ | REST |
| Manzil | MANZIL | Все регионы | 2–5 дней | ✅ | REST |
| Bakhshi Delivery | BAKHSH | Хатлон | 2–3 дня | ✅ | REST |
| Own Fleet | OWN | Душанбе (приоритет) | 3–6ч | ✅ | Internal |

**Reality checks:**
- 60% of orders are COD — courier must carry change
- Дорогой Бадахшан (GBAO): +3–7 дней, only Manzil delivers there
- Mountain roads closed Nov–Mar: show seasonal ETA warnings
- Buyer phone confirmation call before delivery is standard practice
- Many addresses lack street numbers — use landmarks in notes field

---

## Delivery Zones

```typescript
// Zones used for courier selection and ETA calculation
const DELIVERY_ZONES: DeliveryZone[] = [
  {
    code: 'DSH_CITY',
    nameRu: 'Душанбе (город)',
    region: 'Душанбе',
    couriers: ['OWN', 'TEZKOR', 'MANZIL'],
    etaDays: { min: 0, max: 1 },
    etaHours: { min: 2, max: 6 },    // same-day delivery possible
    sameDayCutoff: '14:00',           // orders before 14:00 → same day
  },
  {
    code: 'DSH_SUBURBS',
    nameRu: 'Пригород Душанбе',
    region: 'РРП',
    couriers: ['TEZKOR', 'MANZIL'],
    etaDays: { min: 1, max: 2 },
    sameDayCutoff: null,
  },
  {
    code: 'KHUJAND',
    nameRu: 'Худжанд',
    region: 'Согдийская область',
    couriers: ['SPEEDY', 'MANZIL'],
    etaDays: { min: 1, max: 3 },
    sameDayCutoff: null,
  },
  {
    code: 'KHATLON',
    nameRu: 'Хатлонская область',
    region: 'Хатлон',
    couriers: ['BAKHSH', 'MANZIL'],
    etaDays: { min: 2, max: 4 },
    sameDayCutoff: null,
  },
  {
    code: 'SUGD',
    nameRu: 'Согдийская область',
    region: 'Согд',
    couriers: ['SPEEDY', 'MANZIL'],
    etaDays: { min: 2, max: 4 },
    sameDayCutoff: null,
  },
  {
    code: 'GBAO',
    nameRu: 'Горный Бадахшан',
    region: 'ГБАО',
    couriers: ['MANZIL'],
    etaDays: { min: 5, max: 10 },
    sameDayCutoff: null,
    seasonalWarning: true,  // winter road closures
  },
  {
    code: 'DRS',
    nameRu: 'Районы республиканского подчинения',
    region: 'РРП',
    couriers: ['MANZIL', 'BAKHSH'],
    etaDays: { min: 2, max: 5 },
    sameDayCutoff: null,
  },
];
```

---

## Database Schema

```prisma
model DeliveryAddress {
  id          String  @id @default(cuid())
  userId      String
  label       String? // "Дом", "Работа"
  region      String
  city        String
  district    String?
  street      String?
  building    String?
  apartment   String?
  landmark    String? // "напротив школы №5" — critical for TJ
  postalCode  String?
  lat         Float?
  lng         Float?
  isDefault   Boolean @default(false)
  user        User    @relation(fields: [userId], references: [id])
  orders      Order[]
  createdAt   DateTime @default(now())
  @@index([userId])
}

model DeliverySlot {
  id          String   @id @default(cuid())
  zoneCode    String
  date        DateTime @db.Date
  timeFrom    String   // "09:00"
  timeTo      String   // "13:00"
  capacity    Int      @default(20)
  bookedCount Int      @default(0)
  courier     String   // courier code
  isAvailable Boolean  @default(true)
  orders      Order[]
  @@unique([zoneCode, date, timeFrom, courier])
  @@index([zoneCode, date, isAvailable])
}

model Delivery {
  id              String   @id @default(cuid())
  orderId         String   @unique
  courierCode     String
  trackingNo      String?  @unique
  externalId      String?  // courier's own order ID
  zoneCode        String
  slotId          String?
  status          String   @default("pending")
  // pending → assigned → picked_up → in_transit → out_for_delivery
  // → delivered | failed_attempt | returned_to_warehouse
  attemptCount    Int      @default(0)
  maxAttempts     Int      @default(3)
  estimatedDate   DateTime?
  deliveredAt     DateTime?
  failureReason   String?
  courierName     String?
  courierPhone    String?  // masked on frontend
  isCOD           Boolean  @default(false)
  codAmount       Int?     // dirams to collect
  codCollected    Boolean  @default(false)
  notes           String?  // buyer notes for courier
  events          DeliveryEvent[]
  order           Order    @relation(fields: [orderId], references: [id])
  slot            DeliverySlot? @relation(fields: [slotId], references: [id])
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@index([courierCode, status])
  @@index([trackingNo])
}

model DeliveryEvent {
  id          String   @id @default(cuid())
  deliveryId  String
  status      String
  description String
  location    String?
  happenedAt  DateTime @default(now())
  source      String   @default("webhook")  // 'webhook' | 'manual' | 'system'
  delivery    Delivery @relation(fields: [deliveryId], references: [id])
  @@index([deliveryId, happenedAt])
}

model CourierConfig {
  id          String  @id @default(cuid())
  code        String  @unique
  nameRu      String
  apiBaseUrl  String
  apiKey      String  // encrypted at rest
  webhookSecret String
  isActive    Boolean @default(true)
  maxCODAmount Int?   // max COD per order in dirams
  createdAt   DateTime @default(now())
}
```

---

## Delivery Service

```typescript
// src/services/delivery.service.ts

// Create delivery after order is paid and packed
async function createDelivery(
  orderId: string,
  options: {
    courierCode: string;
    slotId?: string;
    isCOD: boolean;
    notes?: string;
  }
): Promise<Delivery> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { address: true, items: { include: { product: true } } },
  });
  if (!order) throw new AppError('Order not found', 404);

  const zoneCode = await resolveZone(order.address.region, order.address.city);

  // register with courier API
  const courierResponse = await registerWithCourier(options.courierCode, {
    order,
    zoneCode,
    isCOD: options.isCOD,
    notes: options.notes,
  });

  return prisma.delivery.create({
    data: {
      orderId,
      courierCode: options.courierCode,
      trackingNo: courierResponse.trackingNo,
      externalId: courierResponse.externalId,
      zoneCode,
      slotId: options.slotId ?? null,
      isCOD: options.isCOD,
      codAmount: options.isCOD ? order.totalAmount : null,
      notes: options.notes,
      estimatedDate: await calculateETA(zoneCode),
      events: {
        create: {
          status: 'pending',
          description: 'Заказ передан в службу доставки',
          source: 'system',
        },
      },
    },
  });
}

async function resolveZone(region: string, city: string): Promise<string> {
  const key = `${region}:${city}`.toLowerCase();
  const map: Record<string, string> = {
    'душанбе:душанбе': 'DSH_CITY',
    'ррп:вахдат': 'DSH_SUBURBS',
    'ррп:турсунзода': 'DSH_SUBURBS',
    'согдийская область:худжанд': 'KHUJAND',
    'хатлонская область:куляб': 'KHATLON',
    'хатлонская область:бохтар': 'KHATLON',
    'гбао:хорог': 'GBAO',
  };
  return map[key] ?? 'DRS';
}

async function calculateETA(zoneCode: string): Promise<Date> {
  const zone = DELIVERY_ZONES.find(z => z.code === zoneCode);
  if (!zone) return addDays(new Date(), 5);

  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (zone.etaHours && zone.sameDayCutoff) {
    const [cutH, cutM] = zone.sameDayCutoff.split(':').map(Number);
    const beforeCutoff = hour < cutH || (hour === cutH && minute < cutM);
    if (beforeCutoff) {
      return addHours(now, zone.etaHours.max);
    }
  }

  return addDays(now, zone.etaDays.max);
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
```

---

## Courier API Integrations

```typescript
// src/integrations/couriers/index.ts

interface CourierOrderPayload {
  order: Order & { address: DeliveryAddress; items: OrderItem[] };
  zoneCode: string;
  isCOD: boolean;
  notes?: string;
}

interface CourierResponse {
  trackingNo: string;
  externalId: string;
}

async function registerWithCourier(
  courierCode: string,
  payload: CourierOrderPayload
): Promise<CourierResponse> {
  switch (courierCode) {
    case 'TEZKOR': return registerTezkor(payload);
    case 'SPEEDY': return registerSpeedy(payload);
    case 'MANZIL': return registerManzil(payload);
    case 'BAKHSH': return registerBakhshi(payload);
    case 'OWN':    return registerOwnFleet(payload);
    default: throw new AppError(`Unknown courier: ${courierCode}`, 400);
  }
}

// Tezkor Express
async function registerTezkor(payload: CourierOrderPayload): Promise<CourierResponse> {
  const config = await getCourierConfig('TEZKOR');
  const res = await axios.post(
    `${config.apiBaseUrl}/orders`,
    {
      recipient_name: payload.order.buyerName,
      recipient_phone: payload.order.address.phone,
      address: buildAddressString(payload.order.address),
      comment: payload.notes,
      cod_amount: payload.isCOD ? payload.order.totalAmount / 100 : 0, // Tezkor uses somoni
      weight_kg: estimateWeight(payload.order.items),
      items: payload.order.items.map(i => ({
        name: i.product.name,
        qty: i.quantity,
        price: i.priceAmount / 100,
      })),
    },
    { headers: { Authorization: `Bearer ${config.apiKey}` } }
  );
  return {
    trackingNo: res.data.tracking_number,
    externalId: res.data.order_id,
  };
}

// Manzil (all-region fallback)
async function registerManzil(payload: CourierOrderPayload): Promise<CourierResponse> {
  const config = await getCourierConfig('MANZIL');
  const res = await axios.post(
    `${config.apiBaseUrl}/v1/shipments`,
    {
      to: {
        name: payload.order.buyerName,
        phone: payload.order.address.phone,
        city: payload.order.address.city,
        address: buildAddressString(payload.order.address),
        landmark: payload.order.address.landmark,
      },
      cod: payload.isCOD ? { amount: payload.order.totalAmount } : null,
      notes: payload.notes,
      parcels: [{ weight: estimateWeight(payload.order.items) * 1000 }], // grams
    },
    { headers: { 'X-API-Key': config.apiKey } }
  );
  return {
    trackingNo: res.data.tracking_code,
    externalId: res.data.id,
  };
}

// Own fleet — internal dispatch
async function registerOwnFleet(payload: CourierOrderPayload): Promise<CourierResponse> {
  const trackingNo = `OWN-${Date.now().toString(36).toUpperCase()}`;
  // dispatch job to assign to nearest available driver
  await ownFleetQueue.add('dispatch', {
    orderId: payload.order.id,
    address: payload.order.address,
    isCOD: payload.isCOD,
    codAmount: payload.order.totalAmount,
    trackingNo,
  });
  return { trackingNo, externalId: trackingNo };
}

function buildAddressString(addr: DeliveryAddress): string {
  const parts = [addr.city, addr.district, addr.street, addr.building, addr.apartment]
    .filter(Boolean);
  const base = parts.join(', ');
  return addr.landmark ? `${base} (${addr.landmark})` : base;
}

function estimateWeight(items: OrderItem[]): number {
  // rough estimate: 0.5 kg per item if no weight data
  return items.reduce((sum, i) => sum + ((i.product.weightG ?? 500) / 1000) * i.quantity, 0);
}
```

---

## Webhook Handler

```typescript
// POST /api/v1/webhooks/delivery/:courier
async function handleDeliveryWebhook(req: Request, res: Response) {
  const { courier } = req.params;

  // verify signature
  const isValid = await verifyWebhookSignature(courier, req);
  if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

  // always 200 immediately
  res.status(200).json({ ok: true });

  try {
    const event = parseWebhookEvent(courier, req.body);
    await processDeliveryEvent(event);
  } catch (err) {
    logger.error({ err, courier, body: req.body }, 'Webhook processing error');
  }
}

interface NormalizedDeliveryEvent {
  trackingNo: string;
  status: string;
  description: string;
  location?: string;
  happenedAt: Date;
  courierName?: string;
  courierPhone?: string;
  isCODCollected?: boolean;
}

function parseWebhookEvent(courier: string, body: any): NormalizedDeliveryEvent {
  switch (courier) {
    case 'TEZKOR':
      return {
        trackingNo: body.tracking_number,
        status: mapTezkorStatus(body.status),
        description: body.comment ?? body.status,
        happenedAt: new Date(body.updated_at),
        courierName: body.driver_name,
        courierPhone: body.driver_phone,
        isCODCollected: body.cod_paid === true,
      };
    case 'MANZIL':
      return {
        trackingNo: body.tracking_code,
        status: mapManzilStatus(body.event_type),
        description: body.description,
        location: body.location,
        happenedAt: new Date(body.timestamp),
      };
    default:
      throw new AppError(`Unknown courier webhook: ${courier}`, 400);
  }
}

const TEZKOR_STATUS_MAP: Record<string, string> = {
  'CREATED':           'pending',
  'PICKED_UP':         'picked_up',
  'IN_TRANSIT':        'in_transit',
  'OUT_FOR_DELIVERY':  'out_for_delivery',
  'DELIVERED':         'delivered',
  'FAILED':            'failed_attempt',
  'RETURNED':          'returned_to_warehouse',
};
const mapTezkorStatus = (s: string) => TEZKOR_STATUS_MAP[s] ?? 'in_transit';

const MANZIL_STATUS_MAP: Record<string, string> = {
  'shipment.created':    'pending',
  'shipment.picked':     'picked_up',
  'shipment.transit':    'in_transit',
  'shipment.out':        'out_for_delivery',
  'shipment.delivered':  'delivered',
  'shipment.attempt':    'failed_attempt',
  'shipment.return':     'returned_to_warehouse',
};
const mapManzilStatus = (s: string) => MANZIL_STATUS_MAP[s] ?? 'in_transit';

async function processDeliveryEvent(event: NormalizedDeliveryEvent) {
  const delivery = await prisma.delivery.findUnique({
    where: { trackingNo: event.trackingNo },
    include: { order: true },
  });
  if (!delivery) return;

  await prisma.$transaction(async (tx) => {
    // add event to timeline
    await tx.deliveryEvent.create({
      data: {
        deliveryId: delivery.id,
        status: event.status,
        description: event.description,
        location: event.location,
        happenedAt: event.happenedAt,
        source: 'webhook',
      },
    });

    // update delivery
    const updates: Prisma.DeliveryUpdateInput = {
      status: event.status,
      updatedAt: new Date(),
    };

    if (event.courierName) updates.courierName = event.courierName;
    if (event.courierPhone) updates.courierPhone = maskPhone(event.courierPhone);

    if (event.status === 'delivered') {
      updates.deliveredAt = event.happenedAt;
      if (delivery.isCOD) updates.codCollected = true;
    }

    if (event.status === 'failed_attempt') {
      updates.attemptCount = { increment: 1 };
      if (delivery.attemptCount + 1 >= delivery.maxAttempts) {
        updates.status = 'returned_to_warehouse';
        // trigger return flow
        await returnQueue.add('process-failed-delivery', {
          orderId: delivery.orderId,
          reason: 'max_attempts_reached',
        });
      }
    }

    await tx.delivery.update({ where: { id: delivery.id }, data: updates });

    // update order status
    const orderStatus = deliveryStatusToOrderStatus(event.status);
    if (orderStatus) {
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: orderStatus },
      });
    }
  });

  // real-time notification to buyer
  io.to(`user:${delivery.order.buyerId}`).emit('delivery:update', {
    orderId: delivery.orderId,
    trackingNo: event.trackingNo,
    status: event.status,
    description: event.description,
    location: event.location,
  });

  // send SMS on key events (out_for_delivery + delivered)
  if (['out_for_delivery', 'delivered', 'failed_attempt'].includes(event.status)) {
    await smsQueue.add('delivery-update', {
      phone: delivery.order.address.phone,
      templateKey: `delivery_${event.status}`,
      params: { trackingNo: event.trackingNo },
    });
  }
}

function deliveryStatusToOrderStatus(deliveryStatus: string): string | null {
  const map: Record<string, string> = {
    'picked_up':              'processing',
    'in_transit':             'shipped',
    'out_for_delivery':       'out_for_delivery',
    'delivered':              'delivered',
    'returned_to_warehouse':  'return_in_progress',
  };
  return map[deliveryStatus] ?? null;
}

function maskPhone(phone: string): string {
  // +992 XX XXX XX XX → +992 XX *** ** 99
  return phone.replace(/(\+992\s?\d{2})\s?\d{3}\s?\d{2}(\s?\d{2})/, '$1 *** **$2');
}
```

---

## Webhook Signature Verification

```typescript
async function verifyWebhookSignature(courier: string, req: Request): Promise<boolean> {
  const config = await getCourierConfig(courier);

  switch (courier) {
    case 'TEZKOR': {
      const sig = req.headers['x-tezkor-signature'] as string;
      const expected = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    }
    case 'MANZIL': {
      const ts = req.headers['x-timestamp'] as string;
      const sig = req.headers['x-signature'] as string;
      const payload = `${ts}.${JSON.stringify(req.body)}`;
      const expected = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(payload)
        .digest('hex');
      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    }
    default:
      return true; // own fleet = internal, no sig needed
  }
}
```

---

## Delivery Slots (Time Window Booking)

```typescript
// GET /api/v1/delivery/slots?zoneCode=DSH_CITY&date=2024-12-25
async function getAvailableSlots(zoneCode: string, date: string) {
  return prisma.deliverySlot.findMany({
    where: {
      zoneCode,
      date: new Date(date),
      isAvailable: true,
      bookedCount: { lt: prisma.deliverySlot.fields.capacity },
    },
    orderBy: { timeFrom: 'asc' },
  });
}

async function bookSlot(slotId: string): Promise<void> {
  const slot = await prisma.deliverySlot.findUnique({ where: { id: slotId } });
  if (!slot || !slot.isAvailable) throw new AppError('Слот недоступен', 409);
  if (slot.bookedCount >= slot.capacity) throw new AppError('Слот заполнен', 409);

  await prisma.deliverySlot.update({
    where: { id: slotId },
    data: {
      bookedCount: { increment: 1 },
      isAvailable: slot.bookedCount + 1 < slot.capacity,
    },
  });
}

// Cron: generate slots 7 days ahead every night at midnight
async function generateUpcomingSlots() {
  const zones = DELIVERY_ZONES.filter(z => z.code !== 'GBAO'); // GBAO = no slots
  const timeWindows = [
    { from: '09:00', to: '13:00' },
    { from: '13:00', to: '17:00' },
    { from: '17:00', to: '21:00' },
  ];

  for (let day = 1; day <= 7; day++) {
    const date = addDays(new Date(), day);
    if (date.getDay() === 0) continue; // no delivery on Sundays

    for (const zone of zones) {
      for (const courier of zone.couriers) {
        for (const tw of timeWindows) {
          await prisma.deliverySlot.upsert({
            where: {
              zoneCode_date_timeFrom_courier: {
                zoneCode: zone.code,
                date,
                timeFrom: tw.from,
                courier,
              },
            },
            create: {
              zoneCode: zone.code,
              date,
              timeFrom: tw.from,
              timeTo: tw.to,
              capacity: 20,
              courier,
              isAvailable: true,
            },
            update: {}, // don't overwrite if exists
          });
        }
      }
    }
  }
}
```

---

## Tracking Page (Frontend)

```tsx
// app/orders/[id]/tracking/page.tsx
export default async function TrackingPage({ params }: { params: { id: string } }) {
  const delivery = await getDelivery(params.id); // server fetch

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 text-lg font-bold">Отслеживание заказа</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Трек: {delivery.trackingNo}
      </p>
      <DeliveryTimeline events={delivery.events} currentStatus={delivery.status} />
      {delivery.estimatedDate && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          Ожидаемая дата доставки:{' '}
          <strong>
            {new Date(delivery.estimatedDate).toLocaleDateString('ru-TJ', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </strong>
        </div>
      )}
      {delivery.status === 'out_for_delivery' && delivery.courierPhone && (
        <a
          href={`tel:${delivery.courierPhone}`}
          className="mt-3 flex items-center gap-2 rounded-lg border p-3 text-sm font-medium"
        >
          <PhoneIcon className="h-4 w-4 text-green-600" />
          Позвонить курьеру
        </a>
      )}
      <TrackingRealtime orderId={params.id} />
    </main>
  );
}
```

```tsx
// components/delivery/DeliveryTimeline.tsx
const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  pending:               { label: 'Заказ оформлен',          icon: '📦', color: 'text-gray-500' },
  assigned:              { label: 'Курьер назначен',          icon: '🚴', color: 'text-blue-500' },
  picked_up:             { label: 'Забран со склада',         icon: '🏭', color: 'text-blue-600' },
  in_transit:            { label: 'В пути',                   icon: '🚚', color: 'text-blue-700' },
  out_for_delivery:      { label: 'Курьер едет к вам',        icon: '📍', color: 'text-orange-500' },
  delivered:             { label: 'Доставлено',               icon: '✅', color: 'text-green-600' },
  failed_attempt:        { label: 'Не удалось доставить',     icon: '❌', color: 'text-red-500' },
  returned_to_warehouse: { label: 'Возврат на склад',         icon: '↩️', color: 'text-gray-500' },
};

export function DeliveryTimeline({
  events,
  currentStatus,
}: {
  events: DeliveryEvent[];
  currentStatus: string;
}) {
  return (
    <ol className="relative space-y-4 border-l border-gray-200 pl-5">
      {events.map((ev, i) => {
        const cfg = STATUS_CONFIG[ev.status] ?? { label: ev.status, icon: '•', color: 'text-gray-500' };
        return (
          <li key={ev.id} className="relative">
            <span className="absolute -left-[22px] flex h-5 w-5 items-center justify-center rounded-full bg-white text-sm ring-2 ring-gray-200">
              {cfg.icon}
            </span>
            <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
            {ev.description && (
              <p className="text-xs text-muted-foreground">{ev.description}</p>
            )}
            {ev.location && (
              <p className="text-xs text-muted-foreground">📍 {ev.location}</p>
            )}
            <time className="text-xs text-muted-foreground">
              {new Date(ev.happenedAt).toLocaleString('ru-TJ')}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
```

```tsx
// Real-time updates via Socket.io
// components/delivery/TrackingRealtime.tsx
'use client';
export function TrackingRealtime({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, { withCredentials: true });

    socket.on('delivery:update', (data: { orderId: string; status: string }) => {
      if (data.orderId !== orderId) return;
      router.refresh(); // re-fetch server component data
    });

    return () => { socket.disconnect(); };
  }, [orderId, router]);

  return null;
}
```

---

## Checkout Delivery Step

```tsx
// components/checkout/DeliveryStep.tsx
export function DeliveryStep({ address, onSelectSlot }: DeliveryStepProps) {
  const zone = resolveZoneClient(address.region, address.city);
  const zoneInfo = DELIVERY_ZONES.find(z => z.code === zone);
  const today = new Date().toISOString().split('T')[0];

  const { data: slots } = useQuery({
    queryKey: ['slots', zone, today],
    queryFn: () => api.get<DeliverySlot[]>(`/delivery/slots?zoneCode=${zone}&date=${today}`),
    enabled: !!zone,
  });

  return (
    <div className="space-y-4">
      {/* ETA estimate */}
      {zoneInfo && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          {zoneInfo.etaHours && zoneInfo.sameDayCutoff
            ? `Доставка сегодня за ${zoneInfo.etaHours.min}–${zoneInfo.etaHours.max} ч (при заказе до ${zoneInfo.sameDayCutoff})`
            : `Доставка через ${zoneInfo.etaDays.min}–${zoneInfo.etaDays.max} дней`}
        </div>
      )}

      {/* Seasonal warning for GBAO */}
      {zoneInfo?.seasonalWarning && (
        <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          ⚠️ Горный Бадахшан: возможны задержки из-за дорожных условий в зимний период
        </div>
      )}

      {/* Slot selection */}
      {slots && slots.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Выберите удобное время доставки</p>
          <div className="grid grid-cols-3 gap-2">
            {slots.map(slot => (
              <button
                key={slot.id}
                onClick={() => onSelectSlot(slot.id)}
                className="rounded-md border p-2 text-xs hover:border-primary hover:bg-primary/5"
              >
                {slot.timeFrom}–{slot.timeTo}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes for courier */}
      <div>
        <label className="text-sm font-medium">Комментарий курьеру</label>
        <textarea
          placeholder="Ориентир, код домофона, этаж..."
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          rows={2}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Например: «Напротив мечети, 3 этаж, домофон 47»
        </p>
      </div>
    </div>
  );
}
```

---

## SMS Templates

```typescript
// Delivered in Russian (most buyers literate in Russian)
const SMS_TEMPLATES = {
  delivery_out_for_delivery: (p: { trackingNo: string }) =>
    `Курьер уже едет к вам! Трек: ${p.trackingNo}. Пожалуйста, будьте на связи.`,

  delivery_delivered: (p: { trackingNo: string }) =>
    `Ваш заказ ${p.trackingNo} доставлен. Спасибо за покупку!`,

  delivery_failed_attempt: (p: { trackingNo: string }) =>
    `Не удалось доставить заказ ${p.trackingNo}. Курьер перезвонит для перепланирования.`,

  delivery_returned: (p: { trackingNo: string }) =>
    `Заказ ${p.trackingNo} возвращён на склад. Обратитесь в поддержку.`,
};
```

---

## COD Reconciliation

```typescript
// Daily: match COD collections from courier reports
async function reconcileCOD(courierCode: string, date: string) {
  const report = await fetchCourierCODReport(courierCode, date);

  for (const entry of report.entries) {
    const delivery = await prisma.delivery.findUnique({
      where: { trackingNo: entry.trackingNo },
    });
    if (!delivery || !delivery.isCOD) continue;

    if (entry.collected && !delivery.codCollected) {
      await prisma.$transaction([
        prisma.delivery.update({
          where: { id: delivery.id },
          data: { codCollected: true },
        }),
        // trigger payment completion
        prisma.payment.updateMany({
          where: { orderId: delivery.orderId, method: 'cod', status: 'pending' },
          data: { status: 'completed', completedAt: new Date() },
        }),
      ]);
    }
  }
}
```

---

## API Routes

```typescript
// src/api/v1/delivery/routes.ts
const router = Router();

// Public tracking (no auth required — anyone with tracking no can check)
router.get('/track/:trackingNo', deliveryController.trackByTrackingNo);

// Authenticated buyer
router.get('/orders/:orderId/delivery', requireAuth, deliveryController.getOrderDelivery);
router.get('/slots', requireAuth, deliveryController.getAvailableSlots);

// Admin / warehouse staff
router.post('/create', requireAuth, requireRole('admin', 'warehouse_staff'), deliveryController.createDelivery);
router.patch('/:id/status', requireAuth, requireRole('admin'), deliveryController.manualStatusUpdate);
router.get('/active', requireAuth, requireRole('admin'), deliveryController.listActiveDeliveries);
router.post('/cod/reconcile', requireAuth, requireRole('admin'), deliveryController.reconcileCOD);

// Webhooks (no auth — signature verified inside)
router.post('/webhooks/:courier', deliveryController.handleWebhook);

export default router;
```

---

## Checklist

- [ ] Webhook always returns 200 before processing (async)
- [ ] HMAC signature verified with `timingSafeEqual` (prevent timing attacks)
- [ ] Courier phone masked before storing and displaying to buyer
- [ ] COD `codAmount` set in dirams, never floats
- [ ] `attemptCount >= maxAttempts` triggers auto-return flow
- [ ] Delivery events have `source` field ('webhook' | 'manual' | 'system')
- [ ] GBAO zone shows seasonal road closure warning in checkout
- [ ] Sunday deliveries disabled in slot generation
- [ ] `router.refresh()` used in TrackingRealtime (not manual state — server component pattern)
- [ ] Landmark field prominent in address form and in courier payload
- [ ] COD reconciliation runs daily to catch courier-side collection confirmations
- [ ] ETA shown as range, not exact time (Tajikistan roads are unpredictable)
