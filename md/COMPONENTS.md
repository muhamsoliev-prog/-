# 🎨 Компоненты OSINOT Platform

## Dashboard.tsx

**Назначение**: Главный аналитический дашборд  
**Статус**: ✅ Активный

### Структура

```typescript
interface KPICard {
  id: string
  title: string          // Название карточки
  value: string | number // Основное значение
  subtext: string        // Подтекст/описание
  delta: number          // Процент изменения
  deltaColor: 'positive' | 'negative'
  color: 'cyan' | 'red' | 'yellow' | 'green'
  icon: React.ElementType
}
```

### 8 KPI Карточек

| Карточка | Цвет | Значение | Тренд | Иконка |
|----------|------|---------|-------|--------|
| Заказы | Cyan | 1,614 | +12% | ShoppingCart |
| Продажи | Cyan | 1,420 | +88% | BarChart3 |
| Возвраты | Red | 141 | -8.7% | TrendingDown |
| Выкуп | Green | 88% | +2.3% | Percent |
| Выручка | Cyan | 4,890,000₽ | +12.5% | DollarSign |
| Удержания WB | Red | 978,000₽ | -3.2% | AlertTriangle |
| Реклама | Yellow | 245,000₽ | +8.1% | BarChart3 |
| Налоги | Green | 293,400₽ | +12.5% | Wallet |

### Дополнительные Секции

1. **Wildberries Недоплата**
   - Критическая информация (красная)
   - Сумма и проценты
   - Детали по SKU

2. **Динамика Прибыли**
   - Интерактивный SVG график
   - Две линии тренда (жёлтая + зелёная)
   - Легенда с показателями

### CSS Классы

```css
.dashboard-page          /* Основной контейнер */
.dashboard-container     /* Ограничение ширины (max 1440px) */
.dashboard-header        /* Заголовок с селектором даты */
.kpi-grid               /* Сетка карточек (4 колонки) */
.kpi-card               /* Отдельная карточка */
.kpi-header             /* Заголовок карточки с иконкой */
.kpi-value              /* Большое значение */
.kpi-trend              /* Тренд и процент */
.additional-section     /* Дополнительные секции */
.critical-badge         /* Красный бейдж для критических данных */
.chart-placeholder      /* Контейнер для графика */
```

### Адаптивность

```css
@media (max-width: 1440px) { 3 колонки }
@media (max-width: 1024px) { 2 колонки }
@media (max-width: 640px)  { 1 колонна }
```

---

## Products.tsx

**Назначение**: Управление товарами  
**Статус**: ✅ Активный

### Функциональность

- 📋 Таблица товаров с сортировкой
- 🔍 Поиск по названию/SKU
- ✏️ Редактирование товаров
- 🗑️ Удаление товаров
- 📊 Статус стока (зелёный/жёлтый/красный)

### Структура

```typescript
interface Product {
  id: string
  name: string
  sku: string
  category: string
  price: number
  stock: number
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
}
```

### Колонки Таблицы

| Колонка | Тип | Описание |
|---------|-----|---------|
| Товар | Image + Text | Фото + название + SKU |
| Категория | Text | Категория товара |
| Цена | Number | Цена в рублях |
| Склад | Number | Количество на складе |
| Статус | Badge | Цветовой индикатор |
| Действия | Buttons | Редактировать / Удалить |

### CSS Классы

```css
.products-page
.products-header
.search-box
.products-table
.product-row
.status-badge       /* Green/Yellow/Red */
.action-buttons
```

---

## Settings.tsx

**Назначение**: Управление настройками пользователя  
**Статус**: ✅ Активный

### Разделы

### 1. 👤 Профиль Пользователя
- Имя
- Email
- Телефон
- Компания
- Кнопка "Сохранить"

### 2. 🌐 Язык и Локализация
- Выбор языка (RU/EN)
- Валюта (₽/USD)
- Часовой пояс

### 3. 🔑 API Токены
- Wildberries API
- Ozon API
- Яндекс.Маркет API
- Компонент TokenCard для ввода

### 4. 🏦 Банковские Реквизиты
- Название банка
- БИК
- ИНН
- КПП
- Номер счёта

### 5. 🔔 Уведомления
- Email уведомления
- Telegram уведомления
- Low Stock alerts
- New Orders alerts
- Payment notifications
- System alerts

### 6. ⚠️ Опасная Зона
- Удаление аккаунта
- Выход из всех сеансов

---

## TokenCard.tsx

**Назначение**: Компонент для управления API токенами  
**Статус**: ✅ Активный

### Функциональность

```typescript
interface TokenCardProps {
  platform: 'wildberries' | 'ozon' | 'yandex'
  value: string
  onChange: (value: string) => void
}
```

### Компоненты

- 🔐 Скрытие/показ токена (Eye иконка)
- ✅ Валидация токена
- 📋 Копирование в буфер обмена
- 🌐 Проверка подключения

### CSS Классы

```css
.token-card
.token-input
.token-actions
.copy-button
.validate-button
.connection-status
```

---

## Subscriptions.tsx

**Назначение**: Управление подписками и тарифными планами  
**Статус**: ✅ Активный

### 4 Тарифа

| Тариф | Цена | Магазины | Поддержка | API |
|-------|------|----------|-----------|-----|
| Starter | Бесплатно | 1 | Email | - |
| Basic | 1,490₽ | 3 | Email | ✅ |
| Pro | 2,990₽ | ∞ | Priority | ✅ |
| Business | 5,990₽ | ∞ | VIP | ✅ |

### Функциональность

- 📅 Выбор месячного/годового тарифа
- 💳 История платежей
- 🔄 Переключение тарифов
- 📊 Таблица сравнения

### CSS Классы

```css
.subscriptions-page
.pricing-container
.pricing-card
.pricing-card.active    /* Текущий план */
.pricing-card.popular   /* Рекомендуемый */
.pricing-button
.pricing-table
.feature-row
```

---

## Sidebar.tsx

**Назначение**: Боковая панель навигации  
**Статус**: ✅ Активный

### Меню Пункты

| Название | Иконка | Маршрут | Badge |
|----------|--------|--------|-------|
| Dashboard | LayoutDashboard | / | - |
| Товары | Package | /products | - |
| Себестоимость | Calculator | /cost-price | - |
| Удержания | AlertCircle | /deductions | 🔴 |
| Выплаты | Wallet | /payouts | - |
| Финансы | DollarSign | /finances | - |
| Отчёты | BarChart3 | /reports | - |
| Заказы | ShoppingCart | /orders | 🔵 |
| Реклама | TrendingUp | /advertising | 🟡 |
| SEO | Search | /seo | - |
| Кластеры | Layers | /clusters | - |
| Контент | FileText | /content | - |
| Тарифы | CreditCard | /subscriptions | - |
| Настройки | Settings | /settings | - |

### Функциональность

- 🎨 Активное состояние (highlight)
- 🔴🟢 Цветные бейджи (danger/warning/success)
- 📌 Sticky позиция при скролле
- 🎭 Поддержка тёмного/светлого режима
- ⬅️ Возможность сворачивания

### CSS Классы

```css
.sidebar
.sidebar-nav
.nav-item
.nav-item.active      /* Активный пункт */
.nav-item-icon
.nav-item-label
.nav-badge            /* Индикатор активности */
.nav-badge.danger     /* Красный */
.nav-badge.warning    /* Жёлтый */
.nav-badge.success    /* Зелёный */
```

---

## Дизайн Система (design-system.css)

**Назначение**: Централизованные переменные и анимации  
**Статус**: ✅ Активный

### CSS Переменные

#### Цвета (Dark Mode)

```css
--color-bg-primary: #0a0f1c          /* Основной фон */
--color-bg-secondary: #111827         /* Вторичный фон */
--color-bg-tertiary: #1f2937          /* Третичный фон */
--color-text-primary: #f3f4f6         /* Основной текст */
--color-text-secondary: #d1d5db       /* Вторичный текст */
--color-text-tertiary: #9ca3af        /* Третичный текст */
--color-border: #374151               /* Границы */
--color-accent-primary: #00D084       /* Главный акцент (зелёный) */
```

#### Цвета (Light Mode)

```css
--color-bg-primary: #ffffff
--color-bg-secondary: #f9fafb
--color-bg-tertiary: #f3f4f6
--color-text-primary: #111827
--color-text-secondary: #6b7280
--color-text-tertiary: #9ca3af
--color-border: #e5e7eb
--color-accent-primary: #00A86B
```

#### Контрастные Цвета

```css
--color-cyan: #06b6d4
--color-red: #ef4444
--color-yellow: #f59e0b
--color-green: #00D084
```

### Отступы

```css
--spacing-xs: 8px
--spacing-sm: 12px
--spacing-md: 16px
--spacing-lg: 20px
--spacing-xl: 32px
```

### Радиусы

```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
```

### Тени

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)
--shadow-card: 0 4px 12px rgba(0, 208, 132, 0.15)
```

### Анимации (Keyframes)

```css
@keyframes fadeInUp       /* Fade + slide up */
@keyframes slideInLeft    /* Slide from left */
@keyframes pulse-glow     /* Пульсирующее свечение */
@keyframes shimmer        /* Shimmer эффект */
@keyframes bounce         /* Bounce анимация */
@keyframes gradient-shift /* Градиент движение */
@keyframes spin           /* Вращение */
@keyframes scale-pop      /* Scale + pop */
```

---

## Палитра Цветов

### Система Контрастных Цветов

| Цвет | Hex | Использование |
|------|-----|---------------|
| Cyan | #06b6d4 | Заказы, Продажи, Выручка |
| Red | #ef4444 | Возвраты, Удержания, Ошибки |
| Yellow | #f59e0b | Реклама, Затраты, Предупреждения |
| Green | #00D084 | Выкуп, Налоги, Успех |

### Нейтральные Цвета (Dark)

| Уровень | Hex | Использование |
|---------|-----|---------------|
| BG Primary | #0a0f1c | Основной фон страницы |
| BG Secondary | #111827 | Карточки, контейнеры |
| BG Tertiary | #1f2937 | Hover состояния |
| Text Primary | #f3f4f6 | Основной текст |
| Text Secondary | #d1d5db | Вторичный текст |
| Border | #374151 | Границы элементов |

---

## Типография

### Шрифты

- **Syne** (Headings) - weights: 400, 500, 600, 700, 800
- **Onest** (Body) - weights: 400, 500, 600, 700

### Размеры

```css
h1: 32px (font-800)
h2: 24px (font-700)
h3: 20px (font-600)
p:  14px (font-400)
small: 12px (font-400)
```

---

## Версионирование Компонентов

```
Dashboard.tsx    v1.0 ✅ Готов
Products.tsx     v1.0 ✅ Готов
Settings.tsx     v1.0 ✅ Готов
Subscriptions.tsx v1.0 ✅ Готов
Sidebar.tsx      v1.0 ✅ Готов
TokenCard.tsx    v1.0 ✅ Готов
```

---

**Последнее обновление**: 11 апреля 2026  
**Версия**: 1.0.0
