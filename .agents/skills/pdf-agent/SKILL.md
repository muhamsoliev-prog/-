---
name: pdf-agent
description: |-
  PDF generation for Tajikistan marketplace — order invoices, delivery receipts, material estimates, bilingual RU+TG documents, and PDFKit/Puppeteer templates.
---

# PDF Agent Skill

## Trigger
`/pdf-agent`

## Role
You are the PDF Engineer for a Tajikistan marketplace. You generate PDF invoices, order receipts, seller reports, and packing slips using React PDF (react-pdf/renderer) — bilingual RU/TG, with dirams→TJS formatting, QR codes, and Cyrillic font support. All PDFs are generated server-side and streamed directly.

---

## Setup

```bash
npm install @react-pdf/renderer react-qr-code
# Cyrillic fonts — download DejaVu or PT Sans
# Place in: public/fonts/DejaVuSans.ttf, DejaVuSans-Bold.ttf
```

---

## Font Registration (Cyrillic)

```typescript
// lib/pdf/fonts.ts
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'DejaVu',
  fonts: [
    { src: '/fonts/DejaVuSans.ttf' },
    { src: '/fonts/DejaVuSans-Bold.ttf', fontWeight: 'bold' },
  ],
});

// CRITICAL: Cyrillic won't render without a registered font.
// Never use default font for Russian/Tajik text.
```

---

## Order Invoice PDF

```tsx
// lib/pdf/invoice.tsx
import {
  Document, Page, Text, View, StyleSheet, Image, renderToBuffer,
} from '@react-pdf/renderer';
import { formatTJS } from '@/lib/utils/format';
import './fonts';  // register fonts

const styles = StyleSheet.create({
  page: { fontFamily: 'DejaVu', fontSize: 10, padding: 40, color: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  logo: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginBottom: 6, color: '#4b5563' },
  row: { flexDirection: 'row', borderBottom: '0.5pt solid #e5e7eb', paddingVertical: 6 },
  th: { fontWeight: 'bold', color: '#6b7280' },
  col1: { width: '50%' },
  col2: { width: '20%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '15%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  totalLabel: { width: '30%', textAlign: 'right', fontWeight: 'bold', paddingRight: 8 },
  totalValue: { width: '20%', textAlign: 'right', fontWeight: 'bold', fontSize: 12 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#9ca3af', fontSize: 8 },
  badge: { backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '3 8', borderRadius: 4, fontSize: 9 },
});

interface InvoiceData {
  orderId: string;
  orderDate: Date;
  lang: 'ru' | 'tg';
  buyer: { name: string; phone: string; address: string; city: string };
  seller: { name: string; phone: string };
  items: Array<{ nameRu: string; nameTg: string; qty: number; priceDirams: bigint }>;
  deliveryDirams: bigint;
  discountDirams: bigint;
  totalDirams: bigint;
  paymentMethod: 'cod' | 'card';
}

const t = {
  ru: {
    invoice: 'Счёт-фактура', order: 'Заказ №', date: 'Дата:',
    buyer: 'Покупатель', seller: 'Продавец', delivery: 'Доставка',
    discount: 'Скидка', total: 'Итого', payment: 'Оплата',
    cod: 'Наличными при получении', card: 'Картой онлайн',
    product: 'Товар', qty: 'Кол-во', price: 'Цена', sum: 'Сумма',
    footer: 'Чек сформирован автоматически. Вопросы: support@market.tj',
  },
  tg: {
    invoice: 'Ҳисобнома', order: 'Фармоиш №', date: 'Сана:',
    buyer: 'Харидор', seller: 'Фурӯшанда', delivery: 'Расонидан',
    discount: 'Тахфиф', total: 'Ҳамагӣ', payment: 'Пардохт',
    cod: 'Нақд ҳангоми қабул', card: 'Бо корт онлайн',
    product: 'Мол', qty: 'Адад', price: 'Нарх', sum: 'Ҷамъ',
    footer: 'Ҳисобнома автоматӣ ташкил шуд. Саволҳо: support@market.tj',
  },
};

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const l = t[data.lang];
  const subtotalDirams = data.items.reduce((s, i) => s + i.priceDirams * BigInt(i.qty), 0n);

  return (
    <Document title={`${l.order}${data.orderId}`} author="Market.TJ">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Market.TJ</Text>
          <View>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>{l.date} {data.orderDate.toLocaleDateString('ru-TJ')}</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>{l.order}{data.orderId.slice(-8)}</Text>
          </View>
        </View>

        <Text style={styles.title}>{l.invoice}</Text>

        {/* Parties */}
        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{l.buyer}</Text>
            <Text>{data.buyer.name}</Text>
            <Text>{data.buyer.phone}</Text>
            <Text>{data.buyer.city}, {data.buyer.address}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{l.seller}</Text>
            <Text>{data.seller.name}</Text>
            <Text>{data.seller.phone}</Text>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.section}>
          <View style={[styles.row, { backgroundColor: '#f9fafb', paddingHorizontal: 4 }]}>
            <Text style={[styles.col1, styles.th]}>{l.product}</Text>
            <Text style={[styles.col2, styles.th]}>{l.qty}</Text>
            <Text style={[styles.col3, styles.th]}>{l.price}</Text>
            <Text style={[styles.col4, styles.th]}>{l.sum}</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={[styles.row, { paddingHorizontal: 4 }]}>
              <Text style={styles.col1}>{data.lang === 'tg' ? item.nameTg : item.nameRu}</Text>
              <Text style={styles.col2}>{item.qty}</Text>
              <Text style={styles.col3}>{formatTJS(item.priceDirams)}</Text>
              <Text style={styles.col4}>{formatTJS(item.priceDirams * BigInt(item.qty))}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        {data.deliveryDirams > 0n && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{l.delivery}:</Text>
            <Text style={styles.totalValue}>{formatTJS(data.deliveryDirams)}</Text>
          </View>
        )}
        {data.discountDirams > 0n && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{l.discount}:</Text>
            <Text style={[styles.totalValue, { color: '#16a34a' }]}>−{formatTJS(data.discountDirams)}</Text>
          </View>
        )}
        <View style={[styles.totalRow, { borderTop: '1pt solid #e5e7eb', paddingTop: 8, marginTop: 4 }]}>
          <Text style={styles.totalLabel}>{l.total}:</Text>
          <Text style={[styles.totalValue, { fontSize: 14, color: '#2563eb' }]}>{formatTJS(data.totalDirams)}</Text>
        </View>

        {/* Payment */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>{l.payment}:</Text>
          <View style={styles.badge}>
            <Text>{data.paymentMethod === 'cod' ? l.cod : l.card}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>{l.footer}</Text>
      </Page>
    </Document>
  );
}

// Generate PDF buffer for storage/email
export async function generateInvoiceBuffer(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoicePDF data={data} />);
}
```

---

## API Route — Stream PDF

```typescript
// app/api/orders/[id]/invoice/route.ts
import { NextRequest } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { InvoicePDF } from '@/lib/pdf/invoice';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return new Response('Unauthorized', { status: 401 });

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      items: { include: { product: { select: { titleRu: true, titleTg: true } } } },
      user:  { select: { name: true, phone: true } },
      address: true,
    },
  });
  if (!order) return new Response('Not found', { status: 404 });

  const lang = (req.nextUrl.searchParams.get('lang') ?? 'ru') as 'ru' | 'tg';

  const data = {
    orderId:       order.id,
    orderDate:     order.createdAt,
    lang,
    buyer:  { name: order.user.name ?? '', phone: order.user.phone, address: order.address.street, city: order.address.city },
    seller: { name: 'Market.TJ', phone: '+992 (37) 221-00-00' },
    items:  order.items.map(i => ({
      nameRu:     i.product.titleRu,
      nameTg:     i.product.titleTg,
      qty:        i.qty,
      priceDirams: i.priceDirams,
    })),
    deliveryDirams: order.deliveryDirams,
    discountDirams: order.discountDirams,
    totalDirams:    order.totalDirams,
    paymentMethod:  order.paymentMethod as 'cod' | 'card',
  };

  const stream = await renderToStream(<InvoicePDF data={data} />);

  return new Response(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${order.id.slice(-8)}.pdf"`,
    },
  });
}
```

---

## Seller Monthly Report PDF

```typescript
// lib/pdf/seller-report.ts
import { renderToBuffer } from '@react-pdf/renderer';

export async function generateSellerReport(sellerId: string, month: Date): Promise<Buffer> {
  const stats = await prisma.sellerMetrics.findMany({
    where: { sellerId, date: { gte: startOfMonth(month), lte: endOfMonth(month) } },
  });

  const totalRevenueDirams = stats.reduce((s, r) => s + r.revenueDirams, 0n);

  // ... build PDF similar to InvoicePDF
  return renderToBuffer(/* <SellerReportPDF ... /> */);
}
```

---

## Agent Workflow

1. **Fonts first** — Register DejaVu or PT Sans Cyrillic before any Russian/Tajik text. Without it, text shows as boxes.
2. **BigInt dirams** — Never convert to number for calculations; only convert in `formatTJS()` at display.
3. **Stream vs buffer** — Use `renderToStream` for direct API response; `renderToBuffer` for email attachments or S3 upload.
4. **Bilingual** — Always render `data.lang === 'tg' ? item.nameTg : item.nameRu`; never hardcode Russian.
5. **SSR only** — `@react-pdf/renderer` is server-only; never import in client components.
6. **COD label** — COD orders must clearly show "Наличными при получении / Нақд ҳангоми қабул" on invoice.
7. **File size** — Keep PDFs under 500KB; avoid embedding large images. Use URLs or small logos.
