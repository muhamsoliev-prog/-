---
name: accessibility-agent
description: |-
  Accessibility audit and fixes for React/Next.js — WCAG 2.1 AA, ARIA roles, keyboard navigation, color contrast, 44px touch targets, and bilingual RU+TG screen reader labels.
---

# Accessibility Agent Skill

## Trigger
`/accessibility-agent`

## Role
You are the Accessibility Engineer for a Tajikistan marketplace. You implement WCAG 2.1 AA compliance for Russian/Tajik bilingual UI on mobile-first Android devices — covering screen readers (TalkBack), keyboard navigation, color contrast, focus management, and semantic HTML for a COD-heavy buyer audience.

---

## Mobile-First A11y Context

```typescript
// TJ marketplace a11y priorities:
// - 80%+ Android mobile → TalkBack screen reader support critical
// - Many first-time smartphone users → clear focus indicators, large tap targets
// - Bilingual RU/TG → lang attributes, RTL-aware (Tajik is LTR but plan for it)
// - Low-bandwidth → avoid heavy a11y JS polyfills; use native HTML semantics
// - COD checkout → form accessibility is highest priority (money flow)
```

---

## Semantic HTML Patterns

```tsx
// components/product/ProductCard.tsx
// BEFORE — div soup
<div onClick={handleClick} className="product-card">
  <div className="image">...</div>
  <div className="title">{product.titleRu}</div>
  <div className="price">{price}</div>
  <div className="btn" onClick={addToCart}>В корзину</div>
</div>

// AFTER — semantic, keyboard-navigable, screen-reader friendly
<article
  aria-label={product.titleRu}
  className="product-card"
>
  <a href={`/product/${product.id}`} tabIndex={0}>
    <img
      src={product.imageUrls[0]}
      alt={product.titleRu}
      width={300}
      height={300}
      loading="lazy"
    />
    <h3 className="text-sm font-medium">{product.titleRu}</h3>
    <p aria-label={`Цена: ${formatTJS(product.priceDirams)}`} className="font-bold">
      {formatTJS(product.priceDirams)}
    </p>
    {product.originalPriceDirams && (
      <s aria-label={`Старая цена: ${formatTJS(product.originalPriceDirams)}`} className="text-muted-foreground text-xs">
        {formatTJS(product.originalPriceDirams)}
      </s>
    )}
  </a>
  <button
    onClick={addToCart}
    aria-label={`Добавить "${product.titleRu}" в корзину`}
    className="mt-2 w-full rounded-lg bg-primary py-2 text-sm text-white min-h-[44px]"
  >
    В корзину
  </button>
</article>
```

---

## Form Accessibility (Checkout — Critical)

```tsx
// components/checkout/AddressForm.tsx
export function AddressForm({ lang = 'ru' }: { lang: 'ru' | 'tg' }) {
  const labels = {
    ru: { city: 'Город', street: 'Улица и дом', phone: 'Номер телефона', phoneHint: 'Формат: +992901234567' },
    tg: { city: 'Шаҳр', street: 'Кӯча ва хона', phone: 'Рақами телефон', phoneHint: 'Намуна: +992901234567' },
  }[lang];

  return (
    <form aria-label={lang === 'tg' ? 'Суроғаи расонидан' : 'Адрес доставки'} noValidate>
      <div className="space-y-4">
        {/* City */}
        <div>
          <label htmlFor="city" className="block text-sm font-medium mb-1">
            {labels.city} <span aria-label="обязательное поле" className="text-red-500">*</span>
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            autoComplete="address-level2"
            aria-required="true"
            aria-describedby="city-error"
            className="w-full rounded-lg border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            // min 44px height for touch targets
            style={{ minHeight: '44px' }}
          />
          <p id="city-error" role="alert" className="text-red-500 text-xs mt-1 hidden" />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            {labels.phone} <span aria-label="обязательное поле" className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            aria-required="true"
            aria-describedby="phone-hint phone-error"
            className="w-full rounded-lg border px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ minHeight: '44px' }}
          />
          <p id="phone-hint" className="text-muted-foreground text-xs mt-1">{labels.phoneHint}</p>
          <p id="phone-error" role="alert" className="text-red-500 text-xs mt-1 hidden" />
        </div>
      </div>
    </form>
  );
}
```

---

## Focus Management (Modal & Dialogs)

```tsx
// components/ui/Modal.tsx
'use client';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ open, onClose, title, children, lang = 'ru' }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; lang?: 'ru' | 'tg';
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeLabel = lang === 'tg' ? 'Бастан' : 'Закрыть';

  useEffect(() => {
    if (!open) return;
    // Trap focus inside modal
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && focusable) {
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 rounded-2xl bg-background p-6 shadow-xl max-w-lg w-full mx-4">
        <h2 id="modal-title" className="text-lg font-semibold mb-4">{title}</h2>
        {children}
        <button
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
}
```

---

## Color Contrast (WCAG AA)

```typescript
// tailwind.config.ts — ensure contrast ratios ≥ 4.5:1 for text, 3:1 for UI
// Check with: https://webaim.org/resources/contrastchecker/

const colors = {
  // Primary text on white: #1a1a2e → 13.5:1 ✅
  // Muted text on white: #6b7280 → 4.6:1 ✅ (just passes)
  // Price in red on white: #dc2626 → 4.2:1 ⚠️ — use #c41a1a instead → 5.1:1 ✅
  // Primary button text (white on #2563eb): 4.9:1 ✅
  primary: { DEFAULT: '#2563eb', foreground: '#ffffff' },
  destructive: { DEFAULT: '#c41a1a', foreground: '#ffffff' },
};
```

---

## ARIA Live Regions (Cart updates, etc.)

```tsx
// components/cart/CartFeedback.tsx
// Announce dynamic changes to screen readers without visual popup
export function CartFeedback({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"   // visually hidden, but read by screen readers
    >
      {message}
    </div>
  );
}

// Usage: when user adds to cart
// setFeedback('Смартфон добавлен в корзину. 3 товара в корзине.');
// TalkBack will announce this automatically
```

---

## Skip Navigation

```tsx
// app/layout.tsx — skip links for keyboard users
<body>
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
  >
    {lang === 'tg' ? 'Ба мундариҷа гузаред' : 'Перейти к содержимому'}
  </a>
  <Header />
  <main id="main-content" tabIndex={-1}>
    {children}
  </main>
</body>
```

---

## Automated A11y Testing

```typescript
// tests/a11y/product-page.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('product page has no critical a11y violations', async ({ page }) => {
  await page.goto('/product/test-product');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations.filter(v => v.impact === 'critical')).toHaveLength(0);
});

test('checkout form is fully keyboard navigable', async ({ page }) => {
  await page.goto('/checkout');
  await page.keyboard.press('Tab'); // Should focus first field
  await expect(page.locator(':focus')).toHaveAttribute('name', 'city');
});
```

---

## Agent Workflow

1. **Touch targets** — Minimum 44×44px for all interactive elements (buttons, links, inputs).
2. **Focus indicators** — `focus:ring-2 focus:ring-primary` on every interactive element; never `outline: none` without replacement.
3. **Labels** — Every `<input>` must have `<label htmlFor>` or `aria-label`. Never use placeholder as the only label.
4. **Semantic HTML** — `<article>` for product cards, `<nav>` for navigation, `<main>` for content, `<form>` with `aria-label` for forms.
5. **Bilingual** — Set `lang` attribute on `<html>` and switch on `lang` prop for page-specific content.
6. **Screen reader testing** — Test with TalkBack on Android Chrome before shipping any new component.
7. **Automated** — Run `axe-core/playwright` in CI; fail on `critical` and `serious` violations.
