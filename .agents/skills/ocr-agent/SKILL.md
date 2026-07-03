---
name: ocr-agent
description: |-
  OCR processing — invoice scanning, ID document extraction, receipt parsing using Claude vision, bilingual RU+TG field mapping, and Prisma data persistence.
---

# OCR Agent Skill

## Trigger
`/ocr-agent`

## Role
You are the OCR/Document Intelligence Engineer for a Tajikistan marketplace. You extract text from product documents, seller verification IDs, invoices, and receipts using Claude's vision API and Tesseract — supporting Cyrillic (Russian/Tajik) text, Arabic numerals, and common document formats (JPEG, PNG, PDF).

---

## Claude Vision OCR (Primary — Best Quality)

```typescript
// lib/ocr/claude-vision.ts
import Anthropic from '@anthropic-ai/sdk';
import { trackAIUsage } from '@/lib/ai-usage';

const anthropic = new Anthropic();

export interface OCRResult {
  text: string;
  confidence: number;   // 0-1 estimated
  language: 'ru' | 'tg' | 'mixed' | 'unknown';
  structuredData?: Record<string, string>;
}

// General OCR — extracts all text from image
export async function ocrImage(imageBase64: string, mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'): Promise<OCRResult> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: imageBase64 },
        },
        {
          type: 'text',
          text: `Извлеки весь текст с изображения точно как он написан. 
Сохрани все цифры, даты, суммы, имена.
Ответь JSON: {"text": "весь текст", "language": "ru|tg|mixed|unknown", "confidence": 0.0-1.0}
Если изображение нечёткое — всё равно попробуй.`,
        },
      ],
    }],
  });

  await trackAIUsage('claude-haiku-4-5-20251001', 'ocr', response.usage.input_tokens, response.usage.output_tokens);

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { text: '', confidence: 0, language: 'unknown' };

  const parsed = JSON.parse(match[0]);
  return {
    text: parsed.text ?? '',
    confidence: parsed.confidence ?? 0.8,
    language: parsed.language ?? 'unknown',
  };
}

// Structured document extraction — invoice, receipt, ID
export async function extractDocumentData(
  imageBase64: string,
  docType: 'invoice' | 'receipt' | 'national_id' | 'seller_license',
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
): Promise<Record<string, string>> {
  const schemas: Record<typeof docType, string> = {
    invoice: '{"number": "", "date": "", "sellerName": "", "totalTJS": "", "items": []}',
    receipt: '{"date": "", "items": "", "totalTJS": "", "cashPaidTJS": "", "changeTJS": ""}',
    national_id: '{"fullName": "", "birthDate": "", "idNumber": "", "issueDate": "", "expiry": ""}',
    seller_license: '{"companyName": "", "tin": "", "licenseNumber": "", "validUntil": "", "activityType": ""}',
  };

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
        {
          type: 'text',
          text: `Это документ типа: ${docType}.
Извлеки структурированные данные. Ответь строго JSON по схеме:
${schemas[docType]}
Если поле не найдено — оставь пустую строку. Суммы только цифрами.`,
        },
      ],
    }],
  });

  await trackAIUsage('claude-haiku-4-5-20251001', 'ocr_structured', response.usage.input_tokens, response.usage.output_tokens);

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : {};
}
```

---

## API Route (Multipart Upload)

```typescript
// app/api/ocr/route.ts
import { NextRequest } from 'next/server';
import { ocrImage, extractDocumentData } from '@/lib/ocr/claude-vision';
import { getAuthUser } from '@/lib/auth';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;  // 5MB

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const docType = formData.get('docType') as string | null;

  if (!file) return Response.json({ error: 'No file' }, { status: 400 });
  if (file.size > MAX_SIZE_BYTES) return Response.json({ error: 'File too large (max 5MB)' }, { status: 413 });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'Only JPEG, PNG, WebP allowed' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimeType = file.type as 'image/jpeg' | 'image/png';

  if (docType && ['invoice', 'receipt', 'national_id', 'seller_license'].includes(docType)) {
    const data = await extractDocumentData(base64, docType as any, mimeType);
    return Response.json({ type: 'structured', data });
  }

  const result = await ocrImage(base64, mimeType);
  return Response.json({ type: 'text', ...result });
}
```

---

## PDF to Images (for multi-page OCR)

```typescript
// lib/ocr/pdf-to-images.ts
// Use pdf2pic (wraps GraphicsMagick/ImageMagick)
import pdf2pic from 'pdf2pic';
import { promises as fs } from 'fs';
import path from 'path';

export async function pdfToImages(pdfBuffer: Buffer, outputDir: string): Promise<string[]> {
  const tmpPath = path.join(outputDir, `input_${Date.now()}.pdf`);
  await fs.writeFile(tmpPath, pdfBuffer);

  const convert = pdf2pic.fromFile(tmpPath, {
    density: 150,       // DPI — 150 is enough for text OCR
    format: 'jpeg',
    width: 1200,
    height: 1600,
  });

  const pages = await convert.bulk(-1, { responseType: 'base64' });
  await fs.unlink(tmpPath);

  return pages
    .filter(p => p.base64)
    .map(p => p.base64!);
}

// For invoices: typically 1-2 pages; process first 3 max to control cost
export async function ocrPDF(pdfBuffer: Buffer): Promise<string> {
  const tmpDir = '/tmp/ocr';
  await fs.mkdir(tmpDir, { recursive: true });
  const images = await pdfToImages(pdfBuffer, tmpDir);
  const results = await Promise.all(
    images.slice(0, 3).map(b64 => ocrImage(b64, 'image/jpeg')),
  );
  return results.map(r => r.text).join('\n\n---\n\n');
}
```

---

## Seller Verification Flow

```typescript
// lib/seller/verification.ts
import { extractDocumentData } from '@/lib/ocr/claude-vision';
import { prisma } from '@/lib/prisma';

export async function verifySeller(sellerId: string, idImageBase64: string, licenseBase64: string) {
  const [idData, licenseData] = await Promise.all([
    extractDocumentData(idImageBase64, 'national_id'),
    extractDocumentData(licenseBase64, 'seller_license'),
  ]);

  // Basic validation
  const idValid = Boolean(idData.fullName && idData.idNumber && idData.expiry);
  const licenseValid = Boolean(licenseData.tin && licenseData.licenseNumber);

  await prisma.sellerVerification.create({
    data: {
      sellerId,
      idFullName:       idData.fullName ?? '',
      idNumber:         idData.idNumber ?? '',
      idExpiry:         idData.expiry ?? '',
      tin:              licenseData.tin ?? '',
      licenseNumber:    licenseData.licenseNumber ?? '',
      status:           idValid && licenseValid ? 'pending_review' : 'failed_extraction',
    },
  });

  return { idValid, licenseValid, idData, licenseData };
}
```

---

## Prisma Model

```prisma
model SellerVerification {
  id            String   @id @default(cuid())
  sellerId      String   @unique
  idFullName    String
  idNumber      String
  idExpiry      String
  tin           String
  licenseNumber String
  status        String   @default("pending_review")
  // pending_review | approved | rejected | failed_extraction
  reviewedBy    String?
  reviewedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([status])
}
```

---

## Agent Workflow

1. **Claude Vision first** — Use Haiku for all OCR; it handles Cyrillic better than Tesseract.
2. **Structured extraction** — For known document types (invoice, ID), use structured JSON schema prompt.
3. **File validation** — Max 5MB, JPEG/PNG/WebP only. Reject PDFs at API layer; convert server-side.
4. **Never store raw images** — Store extracted structured data only; delete uploaded images after processing.
5. **Confidence threshold** — If confidence < 0.6, flag for manual review instead of auto-accepting.
6. **Cost** — Haiku OCR ~$0.0003/image. 1000 seller IDs = $0.30. Batch at non-peak hours.
7. **Privacy** — National ID data is sensitive; encrypt at rest, log access, auto-delete after 90 days.
