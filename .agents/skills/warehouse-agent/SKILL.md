# Warehouse Agent

## Trigger
`/warehouse-agent`

## Role
Warehouse management specialist for the Tajikistan marketplace. Covers multi-warehouse topology, fulfillment workflow (receive → store → pick → pack → ship), returns processing, zone/bin management, and integration with inventory and delivery systems.

---

## Warehouse Network — Tajikistan

| ID | City | Coverage | Priority |
|----|------|----------|----------|
| WH-01 | Душанбе (Dushanbe) | Душанбе + Вахш | Main hub |
| WH-02 | Худжанд (Khujand) | Согдийская обл. | North hub |
| WH-03 | Куляб (Kulob) | Хатлонская обл. юг | South hub |
| WH-04 | Бохтар (Bokhtar) | Хатлонская обл. центр | Satellite |
| WH-05 | Турсунзода | Западный Таджикистан | Satellite |

Order assignment rule: closest warehouse with `available_stock > 0`. Fallback: main hub WH-01 with inter-warehouse transfer request.

---

## Zone Model

Each warehouse is divided into functional zones:

```
ZONE_TYPES = ['receiving', 'storage', 'picking', 'packing', 'shipping', 'returns', 'quarantine', 'damaged']
```

- **receiving** — incoming shipments from sellers
- **storage** — general stock shelves, organized by category
- **picking** — staging area for picked items
- **packing** — packing stations
- **shipping** — ready-to-ship parcels awaiting courier
- **returns** — returned parcels awaiting inspection
- **quarantine** — goods pending quality check
- **damaged** — unsaleable goods pending disposal/write-off

### Bin Address Format

```
WH-01 / A / 03 / 05 / 2
│       │    │    │    └─ level (1–5)
│       │    │    └────── position (01–20)
│       │    └─────────── row (01–10)
│       └──────────────── aisle (A–Z)
└──────────────────────── warehouse ID
```

Example: `WH-01/B/02/08/3` = Dushanbe warehouse, aisle B, row 2, position 8, level 3.

---

## Database Schema

```prisma
model Warehouse {
  id          String  @id @default(cuid())
  code        String  @unique  // WH-01
  nameRu      String
  city        String
  address     String
  isActive    Boolean @default(true)
  lat         Float?
  lng         Float?

  zones       WarehouseZone[]
  bins        WarehouseBin[]
  stock       WarehouseStock[]
  inboundShipments  InboundShipment[]
  outboundShipments OutboundShipment[]
  transfers   WarehouseTransfer[] @relation("FromWarehouse")
  createdAt   DateTime @default(now())
}

model WarehouseZone {
  id          String  @id @default(cuid())
  warehouseId String
  type        String  // zone type enum above
  nameRu      String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  bins        WarehouseBin[]
}

model WarehouseBin {
  id          String  @id @default(cuid())
  warehouseId String
  zoneId      String
  address     String  @unique  // WH-01/A/03/05/2
  capacity    Int     @default(100)  // max units
  warehouse   Warehouse     @relation(fields: [warehouseId], references: [id])
  zone        WarehouseZone @relation(fields: [zoneId], references: [id])
  stock       WarehouseStock[]
}

// Per-warehouse per-product stock (complements global inventory)
model WarehouseStock {
  id            String  @id @default(cuid())
  warehouseId   String
  productId     String
  binId         String?
  physicalStock Int     @default(0)
  reservedQty   Int     @default(0)
  // available = physicalStock - reservedQty
  warehouse     Warehouse    @relation(fields: [warehouseId], references: [id])
  product       Product      @relation(fields: [productId], references: [id])
  bin           WarehouseBin? @relation(fields: [binId], references: [id])

  @@unique([warehouseId, productId])
  @@index([warehouseId])
  @@index([productId])
}

// Seller ships goods TO warehouse
model InboundShipment {
  id            String   @id @default(cuid())
  warehouseId   String
  sellerId      String
  status        String   @default("expected")
  // expected → in_transit → received → checked → stocked → partial | rejected
  trackingCode  String?
  expectedAt    DateTime?
  receivedAt    DateTime?
  checkedAt     DateTime?
  notes         String?
  warehouse     Warehouse @relation(fields: [warehouseId], references: [id])
  seller        User      @relation(fields: [sellerId], references: [id])
  items         InboundShipmentItem[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([warehouseId, status])
  @@index([sellerId])
}

model InboundShipmentItem {
  id            String  @id @default(cuid())
  shipmentId    String
  productId     String
  expectedQty   Int
  receivedQty   Int     @default(0)
  acceptedQty   Int     @default(0)  // after quality check
  rejectedQty   Int     @default(0)
  binId         String?
  shipment      InboundShipment @relation(fields: [shipmentId], references: [id])
  product       Product         @relation(fields: [productId], references: [id])
}

// Order fulfillment shipment FROM warehouse to buyer
model OutboundShipment {
  id            String   @id @default(cuid())
  warehouseId   String
  orderId       String   @unique
  status        String   @default("pending")
  // pending → picking → picked → packing → packed → handed_to_courier → delivered → failed
  pickerId      String?  // staff userId
  packerId      String?  // staff userId
  courierCode   String?
  trackingCode  String?
  pickedAt      DateTime?
  packedAt      DateTime?
  handedAt      DateTime?
  deliveredAt   DateTime?
  warehouse     Warehouse @relation(fields: [warehouseId], references: [id])
  order         Order     @relation(fields: [orderId], references: [id])
  items         OutboundShipmentItem[]
  packages      ShipmentPackage[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([warehouseId, status])
}

model OutboundShipmentItem {
  id          String  @id @default(cuid())
  shipmentId  String
  productId   String
  binId       String?
  orderedQty  Int
  pickedQty   Int     @default(0)
  shipment    OutboundShipment @relation(fields: [shipmentId], references: [id])
  product     Product          @relation(fields: [productId], references: [id])
}

model ShipmentPackage {
  id          String  @id @default(cuid())
  shipmentId  String
  trackingNo  String  @unique
  weightG     Int?    // grams
  lengthCm    Int?
  widthCm     Int?
  heightCm    Int?
  barcode     String  @unique @default(cuid())
  shipment    OutboundShipment @relation(fields: [shipmentId], references: [id])
}

// Returns from buyers
model ReturnShipment {
  id            String   @id @default(cuid())
  warehouseId   String
  orderId       String
  buyerId       String
  reason        String   // defective | wrong_item | changed_mind | not_as_described
  status        String   @default("requested")
  // requested → approved → in_transit → received → inspected → completed | rejected
  refundDecision String? // full | partial | none
  inspectedById String?
  notes         String?
  items         ReturnItem[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([warehouseId, status])
}

model ReturnItem {
  id            String  @id @default(cuid())
  returnId      String
  productId     String
  qty           Int
  condition     String  // good | damaged | unusable
  restockable   Boolean @default(false)
  returnShipment ReturnShipment @relation(fields: [returnId], references: [id])
  product        Product        @relation(fields: [productId], references: [id])
}

// Inter-warehouse stock transfers
model WarehouseTransfer {
  id            String   @id @default(cuid())
  fromWarehouseId String
  toWarehouseId   String
  status          String @default("requested")
  // requested → approved → picked → in_transit → received → completed
  requestedById   String
  approvedById    String?
  items           TransferItem[]
  fromWarehouse   Warehouse @relation("FromWarehouse", fields: [fromWarehouseId], references: [id])
  createdAt       DateTime @default(now())
  @@index([fromWarehouseId, status])
  @@index([toWarehouseId])
}

model TransferItem {
  id          String @id @default(cuid())
  transferId  String
  productId   String
  qty         Int
  transfer    WarehouseTransfer @relation(fields: [transferId], references: [id])
  product     Product           @relation(fields: [productId], references: [id])
}
```

---

## Fulfillment Workflow

### 1. Inbound (Seller → Warehouse)

```typescript
// seller declares shipment
async function createInboundShipment(
  sellerId: string,
  warehouseId: string,
  items: { productId: string; expectedQty: number }[]
) {
  return prisma.inboundShipment.create({
    data: {
      warehouseId,
      sellerId,
      status: 'expected',
      items: {
        create: items.map(i => ({
          productId: i.productId,
          expectedQty: i.expectedQty,
        })),
      },
    },
    include: { items: true },
  });
}

// warehouse staff receives and checks
async function receiveInboundShipment(
  shipmentId: string,
  staffId: string,
  receivedItems: {
    itemId: string;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    binId?: string;
  }[]
) {
  return prisma.$transaction(async (tx) => {
    // update each item
    for (const ri of receivedItems) {
      await tx.inboundShipmentItem.update({
        where: { id: ri.itemId },
        data: {
          receivedQty: ri.receivedQty,
          acceptedQty: ri.acceptedQty,
          rejectedQty: ri.rejectedQty,
          binId: ri.binId,
        },
      });

      // upsert warehouse stock
      const item = await tx.inboundShipmentItem.findUnique({
        where: { id: ri.itemId },
        select: { productId: true },
      });
      if (!item) continue;

      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: (await tx.inboundShipment.findUnique({
              where: { id: shipmentId },
              select: { warehouseId: true },
            }))!.warehouseId,
            productId: item.productId,
          },
        },
        create: {
          warehouseId: (await tx.inboundShipment.findUnique({
            where: { id: shipmentId },
            select: { warehouseId: true },
          }))!.warehouseId,
          productId: item.productId,
          physicalStock: ri.acceptedQty,
          binId: ri.binId,
        },
        update: {
          physicalStock: { increment: ri.acceptedQty },
          binId: ri.binId ?? undefined,
        },
      });

      // log to inventory
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          changeQty: ri.acceptedQty,
          reason: 'restock',
          note: `Inbound shipment ${shipmentId}`,
          performedById: staffId,
        },
      });
    }

    const shipment = await tx.inboundShipment.update({
      where: { id: shipmentId },
      data: {
        status: 'stocked',
        checkedAt: new Date(),
      },
    });
    return shipment;
  });
}
```

### 2. Outbound (Order → Fulfillment)

```typescript
// triggered when order is paid
async function createOutboundShipment(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, address: true },
  });
  if (!order) throw new AppError('Order not found', 404);

  // pick nearest warehouse with stock
  const warehouseId = await selectWarehouse(order.items, order.address.city);

  return prisma.outboundShipment.create({
    data: {
      warehouseId,
      orderId,
      status: 'pending',
      items: {
        create: order.items.map(i => ({
          productId: i.productId,
          orderedQty: i.quantity,
        })),
      },
    },
    include: { items: true },
  });
}

async function selectWarehouse(
  items: { productId: string; quantity: number }[],
  city: string
): Promise<string> {
  // ordered by proximity to city then by available stock
  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: [{ city: 'asc' }], // in real impl: geo distance sort
  });

  for (const wh of warehouses) {
    const hasStock = await Promise.all(
      items.map(async (item) => {
        const ws = await prisma.warehouseStock.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: wh.id,
              productId: item.productId,
            },
          },
        });
        const available = (ws?.physicalStock ?? 0) - (ws?.reservedQty ?? 0);
        return available >= item.quantity;
      })
    );
    if (hasStock.every(Boolean)) return wh.id;
  }

  // fallback to main hub
  const mainHub = await prisma.warehouse.findFirst({
    where: { code: 'WH-01' },
  });
  return mainHub!.id;
}

// picker scans products
async function markItemPicked(
  shipmentId: string,
  productId: string,
  pickedQty: number,
  pickerId: string
) {
  return prisma.$transaction(async (tx) => {
    await tx.outboundShipmentItem.updateMany({
      where: { shipmentId, productId },
      data: { pickedQty },
    });

    const items = await tx.outboundShipmentItem.findMany({
      where: { shipmentId },
    });

    const allPicked = items.every(i => i.pickedQty >= i.orderedQty);
    if (allPicked) {
      await tx.outboundShipment.update({
        where: { id: shipmentId },
        data: { status: 'picked', pickerId, pickedAt: new Date() },
      });
    }
  });
}

// packer creates package label
async function packShipment(
  shipmentId: string,
  packerId: string,
  packageData: {
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  }
) {
  return prisma.$transaction(async (tx) => {
    const pkg = await tx.shipmentPackage.create({
      data: {
        shipmentId,
        trackingNo: generateTrackingNo(),
        ...packageData,
      },
    });

    await tx.outboundShipment.update({
      where: { id: shipmentId },
      data: { status: 'packed', packerId, packedAt: new Date() },
    });

    return pkg;
  });
}

function generateTrackingNo(): string {
  // TJ-2024-XXXXXXXXXXXX
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TJ${ts}${rand}`;
}

// hand to courier
async function handToCourier(shipmentId: string, courierCode: string) {
  return prisma.outboundShipment.update({
    where: { id: shipmentId },
    data: {
      status: 'handed_to_courier',
      courierCode,
      handedAt: new Date(),
    },
  });
}
```

---

## Returns Processing

```typescript
async function processReturn(
  returnId: string,
  staffId: string,
  inspectedItems: {
    itemId: string;
    condition: 'good' | 'damaged' | 'unusable';
    restockable: boolean;
  }[],
  refundDecision: 'full' | 'partial' | 'none'
) {
  return prisma.$transaction(async (tx) => {
    for (const ri of inspectedItems) {
      const item = await tx.returnItem.update({
        where: { id: ri.itemId },
        data: {
          condition: ri.condition,
          restockable: ri.restockable,
        },
      });

      // restock if good condition
      if (ri.restockable) {
        const ret = await tx.returnShipment.findUnique({
          where: { id: returnId },
          select: { warehouseId: true },
        });
        await tx.warehouseStock.updateMany({
          where: {
            warehouseId: ret!.warehouseId,
            productId: item.productId,
          },
          data: { physicalStock: { increment: item.qty } },
        });
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            changeQty: item.qty,
            reason: 'return',
            note: `Return ${returnId} - condition: ${ri.condition}`,
            performedById: staffId,
          },
        });
      }
    }

    // update return status and refund decision
    await tx.returnShipment.update({
      where: { id: returnId },
      data: {
        status: 'inspected',
        refundDecision,
        inspectedById: staffId,
      },
    });

    // if refund approved → trigger payment refund
    if (refundDecision !== 'none') {
      const ret = await tx.returnShipment.findUnique({
        where: { id: returnId },
        select: { orderId: true },
      });
      // enqueue refund job
      await refundQueue.add('process-refund', {
        orderId: ret!.orderId,
        type: refundDecision,
      });
    }
  });
}
```

---

## Inter-Warehouse Transfer

```typescript
async function requestTransfer(
  fromWarehouseId: string,
  toWarehouseId: string,
  items: { productId: string; qty: number }[],
  requestedById: string
) {
  // validate source has enough stock
  for (const item of items) {
    const ws = await prisma.warehouseStock.findUnique({
      where: {
        warehouseId_productId: {
          warehouseId: fromWarehouseId,
          productId: item.productId,
        },
      },
    });
    const available = (ws?.physicalStock ?? 0) - (ws?.reservedQty ?? 0);
    if (available < item.qty) {
      throw new AppError(
        `Insufficient stock for product ${item.productId}: available ${available}, requested ${item.qty}`,
        409
      );
    }
  }

  return prisma.warehouseTransfer.create({
    data: {
      fromWarehouseId,
      toWarehouseId,
      requestedById,
      status: 'requested',
      items: {
        create: items.map(i => ({
          productId: i.productId,
          qty: i.qty,
        })),
      },
    },
    include: { items: true },
  });
}

async function completeTransfer(transferId: string, staffId: string) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.warehouseTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) throw new AppError('Transfer not found', 404);

    for (const item of transfer.items) {
      // deduct from source
      await tx.warehouseStock.update({
        where: {
          warehouseId_productId: {
            warehouseId: transfer.fromWarehouseId,
            productId: item.productId,
          },
        },
        data: { physicalStock: { decrement: item.qty } },
      });

      // add to destination
      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: transfer.toWarehouseId,
            productId: item.productId,
          },
        },
        create: {
          warehouseId: transfer.toWarehouseId,
          productId: item.productId,
          physicalStock: item.qty,
        },
        update: { physicalStock: { increment: item.qty } },
      });
    }

    return tx.warehouseTransfer.update({
      where: { id: transferId },
      data: { status: 'completed' },
    });
  });
}
```

---

## API Routes

```typescript
// src/api/v1/warehouse/routes.ts
import { Router } from 'express';
import { requireAuth, requireRole } from '@/middleware/auth';
import * as wh from './warehouse.controller';

const router = Router();

// Warehouses
router.get('/', requireAuth, requireRole('admin'), wh.listWarehouses);
router.get('/:warehouseId/stock', requireAuth, requireRole('admin', 'warehouse_staff'), wh.getWarehouseStock);
router.get('/:warehouseId/bins', requireAuth, requireRole('admin', 'warehouse_staff'), wh.listBins);

// Inbound shipments
router.post('/inbound', requireAuth, requireRole('seller'), wh.createInbound);
router.get('/inbound', requireAuth, requireRole('admin', 'warehouse_staff'), wh.listInbound);
router.patch('/inbound/:id/receive', requireAuth, requireRole('warehouse_staff'), wh.receiveInbound);

// Outbound shipments (fulfillment)
router.get('/outbound', requireAuth, requireRole('admin', 'warehouse_staff'), wh.listOutbound);
router.patch('/outbound/:id/pick-item', requireAuth, requireRole('warehouse_staff'), wh.pickItem);
router.patch('/outbound/:id/pack', requireAuth, requireRole('warehouse_staff'), wh.packShipment);
router.patch('/outbound/:id/hand-courier', requireAuth, requireRole('warehouse_staff', 'admin'), wh.handToCourier);

// Returns
router.get('/returns', requireAuth, requireRole('admin', 'warehouse_staff'), wh.listReturns);
router.patch('/returns/:id/inspect', requireAuth, requireRole('warehouse_staff'), wh.inspectReturn);

// Transfers
router.post('/transfers', requireAuth, requireRole('admin'), wh.createTransfer);
router.patch('/transfers/:id/complete', requireAuth, requireRole('admin', 'warehouse_staff'), wh.completeTransfer);

export default router;
```

---

## Seller Dashboard — Inbound Tracking

```typescript
// GET /api/v1/seller/inbound-shipments
async function getSellerInboundShipments(sellerId: string) {
  return prisma.inboundShipment.findMany({
    where: { sellerId },
    orderBy: { createdAt: 'desc' },
    include: {
      warehouse: { select: { code: true, nameRu: true, city: true } },
      items: {
        include: {
          product: { select: { name: true, sku: true } },
        },
      },
    },
  });
}
```

```tsx
// components/seller/InboundShipmentStatus.tsx
const STATUS_LABELS: Record<string, string> = {
  expected: 'Ожидается',
  in_transit: 'В пути',
  received: 'Получено',
  checked: 'Проверено',
  stocked: 'На складе',
  partial: 'Частично принято',
  rejected: 'Отклонено',
};

const STATUS_COLORS: Record<string, string> = {
  expected: 'bg-gray-100 text-gray-700',
  in_transit: 'bg-blue-100 text-blue-700',
  received: 'bg-yellow-100 text-yellow-700',
  checked: 'bg-purple-100 text-purple-700',
  stocked: 'bg-green-100 text-green-700',
  partial: 'bg-orange-100 text-orange-700',
  rejected: 'bg-red-100 text-red-700',
};

function InboundStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
```

---

## Admin Fulfillment Board (Kanban-style)

```tsx
// Columns: pending | picking | picked | packing | packed | handed_to_courier
const FULFILLMENT_STAGES = [
  { key: 'pending',           label: 'Ожидает' },
  { key: 'picking',           label: 'Сборка' },
  { key: 'picked',            label: 'Собрано' },
  { key: 'packing',           label: 'Упаковка' },
  { key: 'packed',            label: 'Упаковано' },
  { key: 'handed_to_courier', label: 'У курьера' },
];

// React Query hook
function useOutboundShipments(warehouseId: string, status: string) {
  return useQuery({
    queryKey: ['outbound', warehouseId, status],
    queryFn: () =>
      api.get<OutboundShipment[]>(`/warehouse/outbound?warehouseId=${warehouseId}&status=${status}`),
    refetchInterval: 30_000, // refresh every 30s
  });
}
```

---

## Barcode Scanning (Mobile Staff App)

```typescript
// POST /api/v1/warehouse/scan
// Used by warehouse staff scanning product barcodes
async function handleScan(barcode: string, context: 'pick' | 'pack' | 'receive') {
  const product = await prisma.product.findFirst({
    where: { barcode },
    select: { id: true, name: true, sku: true },
  });
  if (!product) throw new AppError('Product not found for barcode', 404);

  if (context === 'pick') {
    // find pending outbound shipment containing this product
    const shipmentItem = await prisma.outboundShipmentItem.findFirst({
      where: {
        productId: product.id,
        shipment: { status: 'picking' },
        pickedQty: { lt: prisma.outboundShipmentItem.fields.orderedQty },
      },
      include: {
        shipment: {
          include: {
            packages: true,
            order: { select: { id: true, buyer: { select: { phone: true } } } },
          },
        },
      },
    });
    return { product, shipmentItem };
  }

  return { product };
}
```

---

## Delivery Integration (Tajikistan Couriers)

| Courier | Code | Coverage | API |
|---------|------|----------|-----|
| Tezkor Express | TEZKOR | Душанбе | REST |
| Speedy TJ | SPEEDY | Север (Худжанд) | REST |
| Manzil | MANZIL | Все регионы | REST |
| Ownfleet (in-house) | OWN | Душанбе | Internal |

```typescript
// courier webhook receiver
// POST /api/v1/webhooks/courier
async function handleCourierWebhook(req: Request, res: Response) {
  // always respond 200 immediately
  res.status(200).json({ ok: true });

  const { tracking_no, status, timestamp } = req.body;

  const pkg = await prisma.shipmentPackage.findUnique({
    where: { trackingNo: tracking_no },
    include: { shipment: { include: { order: true } } },
  });
  if (!pkg) return;

  const mappedStatus = mapCourierStatus(status);

  await prisma.outboundShipment.update({
    where: { id: pkg.shipmentId },
    data: {
      status: mappedStatus,
      ...(mappedStatus === 'delivered' ? { deliveredAt: new Date(timestamp) } : {}),
    },
  });

  // notify buyer via Socket.io
  io.to(`user:${pkg.shipment.order.buyerId}`).emit('order:status', {
    orderId: pkg.shipment.orderId,
    status: mappedStatus,
  });
}

function mapCourierStatus(raw: string): string {
  const map: Record<string, string> = {
    'OUT_FOR_DELIVERY': 'handed_to_courier',
    'DELIVERED': 'delivered',
    'FAILED': 'failed',
    'RETURNED': 'in_transit', // returning to warehouse
  };
  return map[raw] ?? 'handed_to_courier';
}
```

---

## BullMQ Queues

```typescript
// queues/fulfillment.queue.ts
export const fulfillmentQueue = new Queue('fulfillment', { connection: redis });

// Workers:
// 'create-outbound'  — called after order payment confirmed
// 'assign-picker'    — round-robin among available staff
// 'send-pick-task'   — push notification to picker's device
// 'release-timeout'  — if not picked in 2h, re-assign

fulfillmentQueue.add(
  'create-outbound',
  { orderId },
  { delay: 0, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
);
```

---

## Tajikistan-Specific Notes

- **COD orders** still go through full fulfillment; payment collected on delivery by courier
- **Rural deliveries** (Горный Бадахшан, Раштская долина) may take 5–10 days; show realistic ETA
- **Label language**: print in Russian (most staff literate in Russian); add Tajik transliteration if needed
- **Fragile goods** (electronics): double-boxing mandatory; flag in packing instructions
- **Cold chain** not yet required — no food delivery at launch
- **Seller self-fulfillment** option: seller ships directly to buyer, warehouse not involved; track via external tracking code only

---

## Status Transition Rules

```
InboundShipment:  expected → in_transit → received → checked → stocked
                                                              ↘ partial
                                                              ↘ rejected

OutboundShipment: pending → picking → picked → packing → packed → handed_to_courier → delivered
                                                                                     ↘ failed

ReturnShipment:   requested → approved → in_transit → received → inspected → completed
                                                                             ↘ rejected
```

Never skip states. Transitions validated server-side before DB update.

---

## Checklist

- [ ] Warehouse stock is per-warehouse (WarehouseStock), not just global inventory
- [ ] `selectWarehouse()` prefers nearest to buyer's city
- [ ] Inbound acceptance increments WarehouseStock AND global inventory
- [ ] Outbound picking decrements WarehouseStock reserved qty
- [ ] Returns restock only `condition === 'good' && restockable`
- [ ] Inter-warehouse transfers are atomic (deduct source, add destination in one transaction)
- [ ] Courier webhook always returns 200 before processing
- [ ] Tracking numbers are generated server-side (never trust client)
- [ ] Barcode scanning works offline-first (cache product list on staff device)
