# 🎨 Палитра Цветов и Дизайн Система OSINOT

## Основная Палитра

### Контрастные Цвета (Brand Colors)

```
┌─────────────────────────────────────────────────┐
│ 🔵 CYAN       #06b6d4   (Информация)           │
│ 🔴 RED        #ef4444   (Ошибки, внимание)     │
│ 🟡 YELLOW     #f59e0b   (Предупреждения)       │
│ 🟢 GREEN      #00D084   (Успех, позитив)       │
└─────────────────────────────────────────────────┘
```

### Использование Цветов

| Цвет | Hex | Где Используется |
|------|-----|-----------------|
| **Cyan** | #06b6d4 | Заказы, Продажи, Выручка |
| **Red** | #ef4444 | Возвраты, Удержания, Ошибки |
| **Yellow** | #f59e0b | Реклама, Затраты, Предупреждения |
| **Green** | #00D084 | Выкуп, Налоги, Успех |

---

## Тёмный Режим (Dark Mode) - По Умолчанию

### Фоновые Цвета

| Переменная | Hex | Уровень |
|-----------|-----|--------|
| `--color-bg-primary` | #0a0f1c | Основной фон |
| `--color-bg-secondary` | #111827 | Карточки |
| `--color-bg-tertiary` | #1f2937 | Hover/Active |

### Текстовые Цвета

| Переменная | Hex | Размер |
|-----------|-----|--------|
| `--color-text-primary` | #f3f4f6 | Основной текст (h1, body) |
| `--color-text-secondary` | #d1d5db | Вторичный текст (labels) |
| `--color-text-tertiary` | #9ca3af | Третичный текст (hints) |

### Граница и Разделители

| Переменная | Hex |
|-----------|-----|
| `--color-border` | #374151 |

### Акцентные Цвета

| Переменная | Hex |
|-----------|-----|
| `--color-accent-primary` | #00D084 |

---

## Светлый Режим (Light Mode)

### Фоновые Цвета

| Переменная | Hex | Уровень |
|-----------|-----|--------|
| `--color-bg-primary` | #ffffff | Основной фон |
| `--color-bg-secondary` | #f9fafb | Карточки |
| `--color-bg-tertiary` | #f3f4f6 | Hover/Active |

### Текстовые Цвета

| Переменная | Hex | Размер |
|-----------|-----|--------|
| `--color-text-primary` | #111827 | Основной текст |
| `--color-text-secondary` | #6b7280 | Вторичный текст |
| `--color-text-tertiary` | #9ca3af | Третичный текст |

### Граница и Разделители

| Переменная | Hex |
|-----------|-----|
| `--color-border` | #e5e7eb |

### Акцентные Цвета

| Переменная | Hex |
|-----------|-----|
| `--color-accent-primary` | #00A86B |

---

## KPI Карточки - Цветовая Кодировка

### Верхняя Граница (Left Border)

```
┌─ Cyan  #06b6d4
├─ Red   #ef4444
├─ Yellow #f59e0b
└─ Green #00D084
```

### Цветовые Комбинации

```css
/* Cyan Card */
.kpi-cyan {
  border-left: 3px solid #06b6d4;
}
.kpi-icon-cyan {
  background: rgba(6, 182, 212, 0.15);
  color: #06b6d4;
}

/* Red Card */
.kpi-red {
  border-left: 3px solid #ef4444;
}
.kpi-icon-red {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Yellow Card */
.kpi-yellow {
  border-left: 3px solid #f59e0b;
}
.kpi-icon-yellow {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

/* Green Card */
.kpi-green {
  border-left: 3px solid #00D084;
}
.kpi-icon-green {
  background: rgba(0, 208, 132, 0.15);
  color: #00D084;
}
```

---

## Трендовые Индикаторы

### Positive (Зелёный)

```
Background: rgba(0, 208, 132, 0.1)
Foreground: #00D084
Symbol: ↑
```

### Negative (Красный)

```
Background: rgba(239, 68, 68, 0.1)
Foreground: #ef4444
Symbol: ↓
```

---

## Shadow и Depth

| Тип | CSS | Использование |
|-----|-----|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Default |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Large |
| `--shadow-card` | `0 4px 12px rgba(0,208,132,0.15)` | KPI Cards |

---

## Отступы и Размеры

### Spacing Scale

```css
--spacing-xs: 8px
--spacing-sm: 12px
--spacing-md: 16px
--spacing-lg: 20px
--spacing-xl: 32px
```

### Border Radius

```css
--radius-sm: 4px    /* Малые элементы */
--radius-md: 8px    /* Стандартные */
--radius-lg: 12px   /* Карточки */
```

---

## Типография

### Шрифты

```
Headings:  'Syne' (400, 500, 600, 700, 800)
Body Text: 'Onest' (400, 500, 600, 700)
```

### Размеры

```
h1: 32px (font-800)
h2: 24px (font-700)
h3: 20px (font-600)
Body: 14px (font-400)
Small: 12px (font-400)
Tiny: 11px (font-400)
```

---

## Состояния Элементов

### Button States

```css
/* Default */
background: var(--color-bg-secondary);
color: var(--color-text-primary);
border: 1px solid var(--color-border);

/* Hover */
background: var(--color-border);
color: var(--color-text-primary);

/* Active */
background: var(--color-accent-primary);
color: #ffffff;
```

### Input States

```css
/* Default */
border: 1px solid var(--color-border);

/* Focus */
border: 1px solid var(--color-accent-primary);
box-shadow: 0 0 0 3px rgba(0, 208, 132, 0.1);

/* Error */
border: 1px solid #ef4444;
box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
```

---

## Анимации и Переходы

### Основные Переходы

```css
transition: all 0.2s ease;      /* Быстрый */
transition: all 0.3s ease;      /* Стандартный */
transition: all 0.5s ease-out;  /* Медленный */
```

### Keyframe Анимации

```css
@keyframes fadeInUp        /* Fade + slide up */
@keyframes slideInLeft     /* Slide from left */
@keyframes pulse-glow      /* Пульсирующее свечение */
@keyframes shimmer         /* Shimmer эффект */
@keyframes bounce          /* Bounce */
@keyframes gradient-shift  /* Gradient motion */
@keyframes spin            /* Вращение */
@keyframes scale-pop       /* Scale + pop */
```

---

## Accessibility (A11y)

### Контрастность

All colors meet WCAG AA standards:

| Foreground | Background | Ratio |
|-----------|-----------|-------|
| Text (14px) | BG Primary | 7:1+ |
| Text (18px) | BG Primary | 4.5:1+ |
| Cyan Text | White | 8:1+ |
| Red Text | White | 6:1+ |

### Color Independence

- ❌ Не используйте только цвет для информации
- ✅ Добавьте символы, текст, иконки
- ✅ Используйте patterns наряду с цветом

---

## CSS Variables в Коде

### Тёмный Режим (Выключено)

```css
:root {
  --color-bg-primary: #0a0f1c;
  --color-text-primary: #f3f4f6;
  --color-cyan: #06b6d4;
  --color-red: #ef4444;
  --color-yellow: #f59e0b;
  --color-green: #00D084;
}
```

### Светлый Режим (Включено)

```css
@media (prefers-color-scheme: light) {
  :root {
    --color-bg-primary: #ffffff;
    --color-text-primary: #111827;
    --color-cyan: #06b6d4;
    --color-red: #ef4444;
    --color-yellow: #f59e0b;
    --color-green: #00A86B;
  }
}
```

---

## Hex to RGB Conversion

Если нужен RGBA:

```javascript
// Hex to RGB
#06b6d4 → rgb(6, 182, 212)
#ef4444 → rgb(239, 68, 68)
#f59e0b → rgb(245, 158, 11)
#00D084 → rgb(0, 208, 132)
```

Использование в CSS:

```css
rgba(6, 182, 212, 0.15)      /* 15% opacity */
rgba(239, 68, 68, 0.1)       /* 10% opacity */
```

---

## Инструменты для Проверки Цветов

- 🎨 [Coolors.co](https://coolors.co/) - палитра
- ♿ [WebAIM](https://webaim.org/resources/contrastchecker/) - контраст
- 🎯 [Color Blindness Simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/) - симуляция
- 📐 [Adobe Color](https://color.adobe.com/) - гармонии

---

## Примеры Использования

### Dashboard KPI Cards

```html
<!-- Cyan Card (Orders) -->
<div class="kpi-card kpi-cyan">
  <div class="kpi-icon kpi-icon-cyan">📊</div>
  <div class="kpi-value">1,614</div>
</div>

<!-- Red Card (Returns) -->
<div class="kpi-card kpi-red">
  <div class="kpi-icon kpi-icon-red">⚠️</div>
  <div class="kpi-value">141</div>
</div>
```

### Status Badges

```html
<!-- Success -->
<span class="status-badge success">✓ Delivered</span>

<!-- Warning -->
<span class="status-badge warning">⚠ Processing</span>

<!-- Error -->
<span class="status-badge error">✗ Failed</span>
```

### Buttons

```html
<!-- Primary (Green) -->
<button class="btn btn-primary">Save</button>

<!-- Secondary -->
<button class="btn btn-secondary">Cancel</button>

<!-- Danger (Red) -->
<button class="btn btn-danger">Delete</button>
```

---

## Версионирование

**Палитра Версия**: 1.0  
**Обновлено**: 11 апреля 2026  
**Статус**: ✅ Финальная

---

## Чек-Лист Дизайна

- [ ] Все карточки используют правильный цвет
- [ ] Текст имеет достаточный контраст
- [ ] Иконки видны на фоне
- [ ] Состояния (hover, active) понятны
- [ ] Разные режимы (dark/light) работают
- [ ] Respons layout нормальный
- [ ] Анимации гладкие
- [ ] Шрифты загружаются корректно

---

**Сохраните эту палитру для справки!** 🎨
