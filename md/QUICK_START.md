# ⚡ Быстрый Старт (Quick Start Guide)

## За 5 Минут

### Шаг 1: Клонирование (30 сек)

```bash
git clone https://github.com/your-repo/osinot-skeleton.git
cd osinot-skeleton
```

### Шаг 2: Установка (2 мин)

```bash
npm install
```

### Шаг 3: Запуск (30 сек)

```bash
npm run dev
```

Браузер откроется автоматически на **http://localhost:5175**

### Шаг 4: Проверка (1-2 мин)

✅ Дашборд загрузился  
✅ 8 KPI карточек видны  
✅ Можно кликать по меню  
✅ Готово! 🎉

---

## Основные Папки & Файлы

```
src/
├── components/Dashboard.tsx     ← Главный дашборд
├── components/Products.tsx      ← Товары
├── components/Settings.tsx      ← Настройки
├── styles/Dashboard.css         ← Стили дашборда
└── App.tsx                      ← Главный компонент

md/
├── README.md                    ← Описание проекта
├── COMPONENTS.md                ← Документация компонентов
├── TECHNICAL.md                 ← Техническая инфа
├── INSTALL.md                   ← Установка & запуск
└── ROADMAP.md                   ← План развития
```

---

## Основные Команды

| Команда | Описание |
|---------|---------|
| `npm run dev` | Запуск dev сервера |
| `npm run build` | Build для production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Проверка TypeScript |

---

## Структура Кода

### Dashboard.tsx - Главный Дашборд

```typescript
// 8 KPI карточек в 2x4 сетка
const kpiCards: KPICard[] = [
  {
    id: 'orders',
    title: 'Заказы',
    value: '1,614',
    color: 'cyan',
    delta: 12,
    deltaColor: 'positive'
  },
  // ... 7 ещё карточек
]

// Компонент карточки
const KPICardComponent = ({ card }) => (
  <motion.div className={`kpi-card kpi-${card.color}`}>
    {/* Содержимое */}
  </motion.div>
)
```

### Дизайн Система

```css
/* Переменные цветов */
--color-cyan: #06b6d4      /* Заказы, Продажи */
--color-red: #ef4444       /* Возвраты, Ошибки */
--color-yellow: #f59e0b    /* Реклама */
--color-green: #00D084     /* Выкуп, Налоги */
```

### Боковое Меню

```
🏠 Dashboard
📦 Товары
🧮 Себестоимость
⚠️ Удержания
💰 Выплаты
💳 Финансы
📊 Отчёты
🛒 Заказы
📢 Реклама
🔍 SEO
🗂️ Кластеры
📝 Контент
💎 Подписки
⚙️ Настройки
```

---

## Делать Изменения

### Отредактировать Цвет KPI Карточки

```typescript
// src/components/Dashboard.tsx
{
  id: 'orders',
  color: 'cyan',  // ← Измените на: red, yellow, green
}
```

### Добавить Новую KPI Карточку

```typescript
{
  id: 'new-metric',
  title: 'Новая Метрика',
  value: '1,000',
  subtext: '+5% к прошлому месяцу',
  delta: 5,
  deltaColor: 'positive',
  color: 'cyan',
  icon: IconName,
}
```

### Изменить Размер Текста

```css
/* src/styles/Dashboard.css */
.kpi-value {
  font-size: 28px;  /* ← Измените размер */
}
```

---

## Структура KPI Карточки

```
┌─────────────────────────┐
│ 📊 ЗАКАЗЫ        ← иконка + название
│ ← субтекст       +12% в прошлой неделе
│
│ 1,614            ← большое значение
│ ↑ +12%           ← тренд с дельта
└─────────────────────────┘
```

---

## Цвета Системы

### Контрастные Цвета

```
🔵 Cyan   (#06b6d4)  → Информация, Заказы
🔴 Red    (#ef4444)  → Ошибки, Возвраты
🟡 Yellow (#f59e0b)  → Предупреждения, Реклама
🟢 Green  (#00D084)  → Успех, Выкуп
```

### Фоновые Цвета

```
Dark:  #0a0f1c (основной фон)
       #111827 (карточки)
       #1f2937 (hover)

Light: #ffffff (основной фон)
       #f9fafb (карточки)
       #f3f4f6 (hover)
```

---

## Файловая Структура CSS

```
design-system.css      ← Переменные + анимации
├── Dashboard.css      ← Стили дашборда
├── Sidebar.css        ← Стили меню
├── Settings.css       ← Стили настроек
├── Products.css       ← Стили товаров
└── Subscriptions.css  ← Стили подписок
```

---

## Типы Данных (TypeScript)

```typescript
// KPI Card
interface KPICard {
  id: string
  title: string
  value: string | number
  subtext: string
  delta: number
  deltaColor: 'positive' | 'negative'
  color: 'cyan' | 'red' | 'yellow' | 'green'
  icon: React.ElementType
}

// Product
interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
}
```

---

## Часто Используемые Компоненты

### Motion (Framer)

```typescript
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

### Иконки (Lucide)

```typescript
import { ShoppingCart, TrendingUp, Settings } from 'lucide-react'

<ShoppingCart size={20} />
```

### Toast Уведомления

```typescript
import toast from 'react-hot-toast'

toast.success('Успешно!')
toast.error('Ошибка')
```

---

## Отладка

### Console Логирование

```typescript
console.log('Данные:', data)
console.table(array)
```

### DevTools Shortcuts

| Shortcut | Действие |
|----------|---------|
| F12 | Открыть DevTools |
| Ctrl+Shift+R | Полная перезагрузка |
| Ctrl+Shift+I | Inspect Element |
| Ctrl+Shift+J | Console |

### Common Issues

| Проблема | Решение |
|----------|---------|
| Стили не применяются | Ctrl+Shift+R (полная перезагрузка) |
| HMR не работает | `npm run dev` снова |
| Import ошибка | Используйте `@/` alias |
| TypeScript ошибка | Cmd+Shift+P → "Restart TS Server" |

---

## Трюки и Советы

### Быстрое изменение цвета карточки

Просто измените класс в JSX:
```tsx
// Было
className={`kpi-card kpi-cyan`}

// Стало
className={`kpi-card kpi-red`}
```

### Просмотр темного/светлого режима

В DevTools Console:
```javascript
// Светлый
document.documentElement.style.colorScheme = 'light'

// Тёмный
document.documentElement.style.colorScheme = 'dark'
```

### Быстрый экспорт данных

```javascript
// В Console скопировать данные
copy(JSON.stringify(data, null, 2))
```

---

## Полезные Ссылки в Коде

```
// Импорты
import { motion } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'

// Стили
import '../styles/Dashboard.css'

// Context
import { useLanguage } from '@/context/LanguageContext'
```

---

## Следующие Шаги

1. ✅ Запустите приложение (`npm run dev`)
2. 📖 Прочитайте `md/README.md`
3. 🎨 Изучите компоненты в `src/components/`
4. 🛠️ Отредактируйте коммпонент (добавьте новую карточку)
5. 🚀 Сделайте свой commit (`git add .` → `git commit`)

---

## Support

📧 **Email**: support@osinot.com  
💬 **Discord**: [link]  
📱 **Telegram**: @osinot_support  
📚 **Docs**: Смотрите папку `md/`

---

**Статус**: ✅ Готово к использованию  
**Версия**: 1.0.0  
**Обновлено**: 11 апреля 2026
