# 🚀 QUICK START GUIDE

## 1️⃣ ЗАПУСК ЛОКАЛЬНО

```bash
cd c:\Users\RedmiBook\Downloads\osinot-skeleton
npm run dev
```

**Результат:** localhost:5175 в браузере

---

## 2️⃣ СТРУКТУРА ПРОЕКТА

```
src/
├── components/
│   ├── Dashboard.tsx          ← 12 KPI метрик
│   ├── Sidebar.tsx            ← Навигация
│   ├── Subscriptions.tsx      ← 4 тарифа
│   ├── Products.tsx           ← Таблица товаров
│   ├── Settings.tsx           ← Профиль
│   ├── TokenCard.tsx          ← Компонент токена
│   └── ...
├── styles/
│   ├── globals.css            ← 30+ переменные
│   ├── design-system.css      ← Дизайн-система
│   └── ...
└── App.tsx                    ← Root компонент
```

---

## 3️⃣ КЛЮЧЕВЫЕ ФАЙЛЫ

| Файл | Назначение |
|------|-----------|
| **globals.css** | CSS переменные и глобальные стили |
| **Dashboard.tsx** | 12 KPI карточек |
| **Subscriptions.tsx** | 4 тарифа подписок |
| **Products.tsx** | Таблица с фото и фильтрами |
| **Sidebar.tsx** | Боковое меню |

---

## 4️⃣ ЦВЕТОВЫЕ ПЕРЕМЕННЫЕ

Используй в коде:

```css
var(--bg-main)           /* #0D1117 */
var(--bg-card)           /* #161B22 */
var(--accent)            /* #00D084 - неоновый зелёный */
var(--color-revenue)     /* #00D084 - выручка */
var(--color-expense)     /* #FF6B6B - удержания */
var(--color-ads)         /* #FFB830 - реклама */
var(--text-primary)      /* #E6EDF3 - основной текст */
var(--text-secondary)    /* #8B949E - вторичный текст */
```

---

## 5️⃣ ПРИМЕРЫ КОДА

### Кнопка с акцентом
```tsx
<button style={{
  background: 'var(--accent)',
  color: '#000',
  padding: '10px 16px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  cursor: 'pointer',
}}>
  Нажми меня
</button>
```

### Карточка
```tsx
<div style={{
  background: 'var(--bg-card)',
  border: '1px solid var(--border-card)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
}}>
  Контент карточки
</div>
```

### Цветное свечение
```tsx
<div style={{
  background: 'var(--bg-card)',
  border: '1px solid rgba(0,208,132,0.2)',
  boxShadow: '0 0 30px rgba(0,208,132,0.15)',
}}>
  Светящаяся карточка
</div>
```

---

## 6️⃣ ПРОВЕРКА BUILD

```bash
npm run build
```

**Ожидаемый результат:**
```
✅ 0 TypeScript errors
✅ 340 KB JS gzip
✅ 3-4 seconds build time
```

---

## 7️⃣ ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ

### Q: Как изменить основной цвет?
**A:** Отредактируй переменную в `globals.css`:
```css
--accent: #00D084; /* Поменяй на новый цвет */
```

### Q: Как добавить новый компонент?
**A:** Создай файл в `src/components/`, импортируй в `App.tsx`, добавь route.

### Q: Где добавить новую иконку?
**A:** Используй lucide-react:
```tsx
import { IconName } from 'lucide-react'
<IconName size={24} />
```

### Q: Как добавить тост-уведомление?
**A:** 
```tsx
import toast from 'react-hot-toast'
toast.success('Успех!')
toast.error('Ошибка!')
```

---

## 8️⃣ ПОЛЕЗНЫЕ ССЫЛКИ

- 📖 [React Docs](https://react.dev)
- 🎨 [Lucide Icons](https://lucide.dev)
- 📱 [Framer Motion](https://www.framer.com/motion/)
- 🛣️ [React Router](https://reactrouter.com)
- 🔔 [React Hot Toast](https://react-hot-toast.com)

---

## 9️⃣ ФИНАЛЬНЫЙ ЧЕКЛИСТ

- [x] Тёмная тема установлена
- [x] Неоновый зелёный акцент работает
- [x] 12 KPI карточек на дашборде
- [x] 4 тарифа на Subscriptions
- [x] Таблица товаров с фото
- [x] Фильтры и сортировка
- [x] 0 TypeScript ошибок
- [x] Build успешен
- [x] Локально запускается

**✅ ВСЁ ГОТОВО!**

---

**Версия:** 1.0.0  
**Дата:** 11 апреля 2026  
**Статус:** PRODUCTION READY 🚀
