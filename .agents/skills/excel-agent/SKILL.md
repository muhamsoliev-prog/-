# Excel Agent Skill

## Trigger
`/excel-agent`

## Role
You are the Excel/Spreadsheet Engineer for a Tajikistan marketplace. You generate Excel reports for sellers (sales, inventory, orders), import product catalogs from XLSX, and export analytics data — using ExcelJS with bilingual RU/TG headers, BigInt dirams formatting, and styled tables that open correctly in LibreOffice (most common in TJ).

---

## Setup

```bash
npm install exceljs
npm install -D @types/exceljs  # if not bundled
```

---

## Seller Sales Report

```typescript
// lib/excel/seller-report.ts
import ExcelJS from 'exceljs';
import { formatTJS } from '@/lib/utils/format';
import { prisma } from '@/lib/prisma';

interface SalesRow {
  orderId: string;
  date: Date;
  productTitleRu: string;
  productTitleTg: string;
  qty: number;
  priceDirams: bigint;
  totalDirams: bigint;
  status: string;
  region: string;
}

export async function generateSellerSalesReport(
  sellerId: string,
  from: Date,
  to: Date,
  lang: 'ru' | 'tg' = 'ru',
): Promise<Buffer> {
  const items = await prisma.orderItem.findMany({
    where: {
      product: { sellerId },
      order: { createdAt: { gte: from, lte: to }, status: { not: 'cancelled' } },
    },
    include: {
      product: { select: { titleRu: true, titleTg: true } },
      order:   { select: { id: true, createdAt: true, status: true, regionId: true } },
    },
    orderBy: { order: { createdAt: 'desc' } },
  });

  const wb  = new ExcelJS.Workbook();
  wb.creator  = 'Market.TJ';
  wb.created  = new Date();
  const ws = wb.addWorksheet(lang === 'tg' ? 'Фурӯш' : 'Продажи', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  // Column definitions
  const headers = lang === 'ru'
    ? ['Номер заказа', 'Дата', 'Товар', 'Кол-во', 'Цена (с.)', 'Сумма (с.)', 'Статус', 'Регион']
    : ['Рақами фармоиш', 'Сана', 'Мол', 'Адад', 'Нарх (с.)', 'Ҷамъ (с.)', 'Ҳолат', 'Минтақа'];

  ws.columns = [
    { key: 'orderId',  width: 20 },
    { key: 'date',     width: 14 },
    { key: 'product',  width: 40 },
    { key: 'qty',      width: 8,  style: { alignment: { horizontal: 'center' } } },
    { key: 'price',    width: 12, style: { alignment: { horizontal: 'right' }, numFmt: '#,##0.00' } },
    { key: 'total',    width: 12, style: { alignment: { horizontal: 'right' }, numFmt: '#,##0.00' } },
    { key: 'status',   width: 14 },
    { key: 'region',   width: 14 },
  ];

  // Header row with styling
  const headerRow = ws.addRow(headers);
  headerRow.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height    = 22;

  // Data rows
  const statusMap: Record<string, string> = {
    pending: lang === 'ru' ? 'Ожидание' : 'Интизор',
    confirmed: lang === 'ru' ? 'Подтверждён' : 'Тасдиқ',
    shipped: lang === 'ru' ? 'Отправлен' : 'Фиристода',
    delivered: lang === 'ru' ? 'Доставлен' : 'Расонида',
    returned: lang === 'ru' ? 'Возврат' : 'Баргардонда',
  };

  let totalRevenueDirams = 0n;

  for (const item of items) {
    const title = lang === 'tg' ? item.product.titleTg : item.product.titleRu;
    const rowTotal = item.priceDirams * BigInt(item.qty);
    totalRevenueDirams += rowTotal;

    const row = ws.addRow({
      orderId: item.order.id.slice(-12),
      date:    item.order.createdAt.toLocaleDateString('ru-TJ'),
      product: title,
      qty:     item.qty,
      price:   Number(item.priceDirams) / 100,
      total:   Number(rowTotal) / 100,
      status:  statusMap[item.order.status] ?? item.order.status,
      region:  item.order.regionId,
    });

    // Alternate row colors for readability (LibreOffice compatible)
    if (ws.rowCount % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFF' } };
    }
  }

  // Totals row
  ws.addRow([]);
  const totalLabel = lang === 'ru' ? 'ИТОГО:' : 'ҲАМАГӢ:';
  const totalRow = ws.addRow([totalLabel, '', '', items.length, '', Number(totalRevenueDirams) / 100, '', '']);
  totalRow.font = { bold: true };
  totalRow.getCell(5).value = lang === 'ru' ? `${items.length} позиций` : `${items.length} мол`;

  // Apply border to all data
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  // Auto-filter
  ws.autoFilter = { from: 'A1', to: `H1` };

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

---

## API Route

```typescript
// app/api/seller/reports/sales/route.ts
import { NextRequest } from 'next/server';
import { generateSellerSalesReport } from '@/lib/excel/seller-report';
import { getAuthSeller } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const seller = await getAuthSeller(req);
  if (!seller) return new Response('Unauthorized', { status: 401 });

  const params = req.nextUrl.searchParams;
  const from = new Date(params.get('from') ?? Date.now() - 30 * 86_400_000);
  const to   = new Date(params.get('to')   ?? Date.now());
  const lang = (params.get('lang') ?? 'ru') as 'ru' | 'tg';

  const buffer = await generateSellerSalesReport(seller.id, from, to, lang);
  const filename = lang === 'tg' ? 'furush-hisobot.xlsx' : 'otchet-prodazhi.xlsx';

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

---

## Product Catalog Import (XLSX → Prisma)

```typescript
// lib/excel/catalog-import.ts
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const ProductRowSchema = z.object({
  titleRu:      z.string().min(5).max(200),
  titleTg:      z.string().min(5).max(200),
  priceTJS:     z.coerce.number().positive(),        // seller enters TJS; we convert
  stockQty:     z.coerce.number().int().min(0),
  categorySlug: z.string(),
  description:  z.string().optional(),
});

export interface ImportResult {
  total: number;
  imported: number;
  errors: Array<{ row: number; message: string }>;
}

export async function importProductCatalog(
  xlsxBuffer: Buffer,
  sellerId: string,
): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xlsxBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found');

  const errors: ImportResult['errors'] = [];
  let imported = 0;
  const rows = ws.rowCount - 1; // exclude header

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    const raw = {
      titleRu:      row.getCell(1).text,
      titleTg:      row.getCell(2).text,
      priceTJS:     row.getCell(3).value,
      stockQty:     row.getCell(4).value,
      categorySlug: row.getCell(5).text,
      description:  row.getCell(6).text || undefined,
    };

    const parsed = ProductRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: i, message: parsed.error.errors.map(e => e.message).join('; ') });
      continue;
    }

    const { data } = parsed;
    const category = await prisma.category.findUnique({ where: { slug: data.categorySlug } });
    if (!category) {
      errors.push({ row: i, message: `Категория не найдена: ${data.categorySlug}` });
      continue;
    }

    await prisma.product.create({
      data: {
        sellerId,
        categoryId:   category.id,
        titleRu:      data.titleRu,
        titleTg:      data.titleTg,
        priceDirams:  BigInt(Math.round(data.priceTJS * 100)),
        stockQty:     data.stockQty,
        descriptionRu: data.description,
        imageUrls:    [],
      },
    });
    imported++;
  }

  return { total: rows, imported, errors };
}
```

---

## Import API

```typescript
// app/api/seller/catalog/import/route.ts
export async function POST(req: NextRequest) {
  const seller = await getAuthSeller(req);
  if (!seller) return new Response('Unauthorized', { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return Response.json({ error: 'No file' }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: 'Max 10MB' }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await importProductCatalog(buffer, seller.id);

  return Response.json(result);
}
```

---

## Download Template

```typescript
// lib/excel/templates.ts — provide blank template for sellers to fill
export async function generateImportTemplate(lang: 'ru' | 'tg' = 'ru'): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(lang === 'tg' ? 'Молҳо' : 'Товары');

  const headers = lang === 'ru'
    ? ['Название RU *', 'Название TG *', 'Цена (с.) *', 'Остаток *', 'Категория *', 'Описание']
    : ['Ном RU *', 'Ном TG *', 'Нарх (с.) *', 'Миқдор *', 'Категория *', 'Тавсиф'];

  ws.columns = headers.map((h, i) => ({
    header: h, width: [30, 30, 12, 10, 20, 50][i] ?? 20,
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };

  // Example row
  ws.addRow(['Смартфон Samsung Galaxy A54', 'Смартфони Samsung Galaxy A54', 1200, 10, 'electronics', '']);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

---

## Agent Workflow

1. **ExcelJS only** — Use ExcelJS for all XLSX generation. It produces proper `.xlsx` (not `.xls`) readable by LibreOffice.
2. **BigInt dirams** — Convert to TJS number (`Number(d) / 100`) only in the Excel cell value; keep BigInt everywhere else.
3. **Bilingual headers** — Always pass `lang` param; switch headers and status labels based on it.
4. **Import validation** — Validate with Zod row-by-row; collect all errors, don't fail on first.
5. **LibreOffice compat** — Avoid complex cell formulas; use static values. TJ users mostly use LibreOffice, not Excel.
6. **File size** — 10MB limit for imports (≈50k rows). For larger catalogs, use CSV import instead.
7. **Template** — Always provide a downloadable blank template so sellers know column order.
