# 🚀 ИНСТРУКЦИЯ ДЛЯ ЗАВЕРШЕНИЯ ДИЗАЙН-ПЕРЕДЕЛКИ

## ✅ ГОТОВО
- [x] globals.css — все цвета обновлены
- [x] Sidebar.tsx — тёмный стиль с неоновым зелёным

## ⏳ ОСТАЛОСЬ

### Шаг 4: Dashboard.tsx (ВАЖНЫЙ!)

Замени содержимое 12 KPI карточек:

**РЯД 1 (Заказы):**
```
1. Заказы (Cyan)  - 1,614 | +12% ↗
2. Продажи (Cyan) - 3,240 | +8% ↗
3. Возвраты (Red) - 85 | -5% ↘
4. Выкуп % (Green) - 94.2% | +1% ↗
```

**РЯД 2 (Финансы с СВЕЧЕНИЯМИ):**
```
1. ВЫРУЧКА (Green glow) - 485,230 ₽ | +15% ↗
2. УДЕРЖАНИЯ WB (Red glow) - 48,523 ₽ | +3% ↘
3. РЕКЛАМА (Orange glow) - 12,450 ₽ | -2% ↘  
4. НАЛОГИ (Blue glow) - 19,408 ₽ | 0% →
```

**РЯД 3 (Итоги):**
```
1. Себестоимость (Gray) - 215,000 ₽
2. Чистая прибыль (Green + BIG GLOW) - 189,849 ₽ | +12% ↗
3. Маржа (Light Green) - 39.2%
4. ROI (Green) - 88%
```

**Стили KPI карточек:**
- className="kpi-card" + "kpi-green" / "kpi-red" / "kpi-orange" / "kpi-blue"
- Для иконок: <div className="icon-wrapper icon-green"> (или icon-red, icon-orange, icon-blue, icon-gray)

**Анимации:**
```css
animation: fadeInUp 0.4s ease forwards;
animation-delay: calc(0.05s * var(--index));
```

---

### Шаг 5: Settings.tsx — Токены WB

Добавь новую секцию после существующего профиля.

**6 токенов WB:**

```tsx
const tokens = [
  {
    id: 'statistics',
    label: 'Статистика',
    icon: 'BarChart2',
    color: '#00D084',
    desc: 'Заказы • Продажи • Остатки • Возвраты'
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    icon: 'TrendingUp',
    color: '#58A6FF',
    desc: 'Воронка продаж • NM-отчёт по артикулам'
  },
  {
    id: 'finance',
    label: 'Финансы',
    icon: 'Wallet',
    color: '#FFB830',
    desc: 'Комиссии WB • Логистика • Хранение • Штрафы'
  },
  {
    id: 'content',
    label: 'Контент',
    icon: 'Image',
    color: '#A371F7',
    desc: 'Карточки товаров • Фотографии'
  },
  {
    id: 'prices',
    label: 'Цены и скидки',
    icon: 'Tag',
    color: '#FF6B6B',
    desc: 'Текущие цены • Установка скидок'
  },
  {
    id: 'advert',
    label: 'Реклама',
    icon: 'Megaphone',
    color: '#FFB830',
    desc: 'Расходы на кампании • Ставки • CPM'
  },
]
```

**Каждый токен — карточка:**
- Заголовок: иконка + название
- Описание: мелкий текст
- Input type="password" для токена + кнопка глаз
- Кнопка "Проверить" → POST /api/wb/validate/{type}
- Статус:
  - ✓ Активен (зелёный) если валидный
  - ◯ Не добавлен (серый) если пусто
  - ✗ Ошибка (красный) если невалидный
- Дата последней синхронизации

---

### Шаг 6: Subscriptions.tsx — 4 тарифа

**Переключатель Месяц/Год** вверху.

**4 карточки тарифов:**

```
СТАРТ (0 ₽/мес)     БАЗОВЫЙ (1490 ₽)  ПРОФИ* (2990 ₽)   БИЗНЕС (5990 ₽)

*ПРОФИ — выделена:
- border: 2px solid var(--accent)
- box-shadow: var(--shadow-glow-green)
- Бейдж: "🔥 Популярный" (background: var(--accent), color: #000)
```

**Функции:**

```
СТАРТ:    1 магазин | 7 дней | только Статистика
БАЗОВЫЙ:  1 магазин | 30 дней | 5 токенов | фото товаров | ABC
ПРОФИ:    3 магазина | 90 дней | все 6 токенов | Telegram алерты | Excel
БИЗНЕС:   10 магазинов | 365 дней | всё + API доступ + приоритет
```

**Стиль функций:**
- ✓ зелёный (var(--color-profit))
- ✗ серый (var(--text-muted)), зачёркнут, opacity: 0.5

**Кнопки:**
- Текущий план: disabled, outline стиль
- Другие: background: var(--accent), color: #000, bold
- ПРОФИ: дополнительно box-shadow: 0 4px 15px rgba(0,208,132,0.4)

---

### Шаг 7: Products.tsx — Таблица с фото

**Первая колонка — Фото:**
```tsx
<td>
  <img 
    src={product.photoUrl || '/placeholder.png'}
    style={{
      width: 44,
      height: 44,
      borderRadius: 6,
      objectFit: 'cover',
      background: 'var(--bg-input)'
    }}
  />
</td>
```

**Фильтры над таблицей:**
- Input поиск товара или SKU
- Select все категории
- Select сортировка
- Button Экспорт Excel

**Цветные метрики в таблице:**
- Маржа: >40% зелёный | 20-40% жёлтый | <20% красный
- Прибыль: если >0 зелёный | если <0 красный

---

### Шаг 8: App.tsx — Добавь Toaster

```tsx
import { Toaster } from 'react-hot-toast';

// В компоненте App:
<Toaster
  position="bottom-right"
  toastOptions={{
    style: {
      background: '#161B22',
      color: '#E6EDF3',
      border: '1px solid rgba(240,246,252,0.1)',
      borderRadius: '10px',
      fontSize: '14px',
    },
    success: {
      iconTheme: {
        primary: '#00D084',
        secondary: '#0D1117'
      }
    },
    error: {
      iconTheme: {
        primary: '#FF6B6B',
        secondary: '#0D1117'
      }
    },
  }}
/>
```

---

### Шаг 9: Финальная проверка

```bash
npm run build  # Должно быть 0 ошибок
npm run dev    # Запустить локально
```

---

## 📝 ВАЖНЫЕ МОМЕНТЫ

1. **CSS переменные уже определены в globals.css:**
   - var(--bg-main) / var(--bg-card) / var(--bg-input)
   - var(--accent) / var(--text-primary) / var(--text-secondary)
   - var(--color-revenue) / var(--color-expense) / var(--color-ads) / var(--color-tax)
   - var(--shadow-glow-green) / var(--shadow-glow-red) и т.д.

2. **Иконки из lucide-react:**
   ```tsx
   import { ShoppingCart, TrendingUp, DollarSign, Percent, ... } from 'lucide-react'
   ```

3. **Анимации из globals.css:**
   - @keyframes fadeInUp
   - @keyframes slideInLeft
   - @keyframes pulse

4. **Использовать inline styles через style={{}}** для динамических значений или className для статических.

---

## 🎨 ЦВЕТОВАЯ СХЕМА

- **Основной зелёный (неоновый):** #00D084
- **Выручка/Прибыль:** #00D084
- **Удержания/Расходы:** #FF6B6B
- **Реклама:** #FFB830
- **Налоги:** #58A6FF
- **Себестоимость:** #A8B3CF
- **Маржа:** #7EE787
- **ROI:** #56D364

---

**После завершения всех шагов:**
```bash
npm run build  # Проверить сборку
npm run dev    # Запустить локально на localhost:5175
```

✅ Проект готов к production!
