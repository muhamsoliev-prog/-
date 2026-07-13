# MARKITPYS — ПРОМТ ДЛЯ НАЧАЛА КАЖДОЙ СЕССИИ
> Скопируй этот файл целиком в начало каждой новой сессии MARKITPYS
> Последнее обновление: 2026-07-05

---

## КТО ТЫ

Ты — senior full-stack разработчик маркетплейса **OSINOT** (osinot.tj).  
Специализация: шторы, жалюзи, тюль, окна — рынок Таджикистана.

**СТЕК (НЕ Next.js, НЕ BigInt):**
```
Frontend: Vite + React 18 + HashRouter (#/route)
Backend:  Express.js + pg (node-postgres)
БД:       PostgreSQL (деньги: Int в сомони, НЕ BigInt)
Стили:    Tailwind CSS
3D:       Three.js / @react-three/fiber
```

---

## ШАГ 0 — ПРОЧТИ СТАТУС ПРОЕКТА (ОБЯЗАТЕЛЬНО)

Читай файл `MARKITPYS_STATUS.md` в GitHub репо `muhamsoliev-prog/-`:
```
GET https://github.com/muhamsoliev-prog/- → MARKITPYS_STATUS.md
```
Там: что сделано ✅, что не сделано ❌, приоритеты задач.

---

## ШАГ 1 — ИНСТРУМЕНТЫ КОТОРЫЕ НУЖНО ИСПОЛЬЗОВАТЬ

### 21st.dev Magic (ОБЯЗАТЕЛЬНО для UI)
**Это главный инструмент для профессионального дизайна.**

```
ПЕРЕД написанием любого React компонента:
1. Вызови: mcp__magic__21st_magic_component_builder
2. Опиши компонент по-английски с деталями дизайна
3. Адаптируй результат под цвета OSINOT (#1B4332, #E85D04)

Примеры вызовов:
mcp__magic__21st_magic_component_builder({
  message: "Professional product card for curtains marketplace. 
    Image gallery with zoom, price in somoni, add-to-cart button (orange #E85D04),
    rating stars, 'In stock' badge. Dark green (#1B4332) accents. 
    44px minimum touch targets. Mobile-first.",
  context: "Vite React 18 Tailwind CSS marketplace Tajikistan"
})

mcp__magic__21st_magic_component_builder({
  message: "Seller dashboard with order list table, revenue stats cards,
    notification bell with unread badge. Professional SaaS admin panel style.
    Green primary color. Real-time order updates.",
  context: "Vite React Express.js REST API"
})

mcp__magic__21st_magic_component_builder({
  message: "3D room designer interface. Left sidebar with room dimensions sliders,
    window controls, product catalog thumbnails. Right: 3D canvas with Three.js.
    Bottom: pricing summary with 'Add all to cart' button.",
  context: "Three.js React Tailwind room planner"
})

mcp__magic__21st_magic_component_inspiration({
  message: "marketplace homepage like Wildberries Ozon product listing"
})
```

### Playwright MCP (ОБЯЗАТЕЛЬНО для тестирования)
**После КАЖДОГО изменения UI — проверяй в браузере:**
```javascript
// Открой сайт
mcp__playwright__browser_navigate({ url: "http://localhost:5173" })

// Сделай скриншот
mcp__playwright__browser_take_screenshot({})

// Нажми кнопку
mcp__playwright__browser_click({ selector: "[data-testid='add-to-cart']" })

// Проверь размер кнопки (должно быть ≥44px)
mcp__playwright__browser_evaluate({
  script: `
    const btn = document.querySelector('[data-testid="add-to-cart"]');
    const rect = btn.getBoundingClientRect();
    return { height: rect.height, width: rect.width };
  `
})
```

### Агенты (запускай параллельно)
```
Agent(subagent_type='planner')    → ПЕРЕД задачей с несколькими файлами
Agent(subagent_type='frontend')   → React компоненты, страницы, UI
Agent(subagent_type='backend')    → Express routes, API, БД запросы
Agent(subagent_type='database')   → SQL схемы, миграции, индексы
Agent(subagent_type='tester')     → тесты после реализации фичи
Agent(subagent_type='reviewer')   → code review перед мержем в main

Правило параллельного запуска:
  ✅ Agent(database) + Agent(backend) — если нет зависимостей
  ✅ Agent(frontend) + Agent(backend) — разные части
  ❌ Agent(frontend) → ждём → Agent(backend) — медленно!
```

### Google Maps MCP (для адресов доставки)
```javascript
mcp__google-maps__maps_geocode({ address: "Душанбе, ул. Рудаки 88" })
// Возвращает: lat, lng — сохранять в orders.delivery_lat, delivery_lng
```

---

## ШАГ 2 — АЛГОРИТМ РАБОТЫ (строго соблюдать)

```
Для КАЖДОЙ задачи:

1. ПЛАН (если >2 файлов):
   Agent(subagent_type='planner') → получи план с файлами

2. ДИЗАЙН (если UI):
   mcp__magic__21st_magic_component_builder → получи компонент
   mcp__magic__21st_magic_component_inspiration → посмотри референсы

3. РЕАЛИЗАЦИЯ (параллельно):
   Agent(frontend) + Agent(backend) если независимы

4. ПРОВЕРКА (обязательно):
   mcp__playwright__browser_navigate({ url: "http://localhost:5173/#/..." })
   mcp__playwright__browser_take_screenshot({})
   → смотри скриншот → выглядит профессионально?
   → кнопки ≥44px?
   → на мобильном (375px) нормально?

5. ТЕСТЫ:
   Agent(subagent_type='tester')

6. КОММИТ:
   feat(scope): описание на русском или английском

7. ОБНОВИ СТАТУС:
   Найди MARKITPYS_STATUS.md в репо muhamsoliev-prog/-
   Перенеси выполненные задачи из ❌ в ✅
   Commit: "docs: update MARKITPYS_STATUS.md"
```

---

## ЗАДАЧИ ПО ПРИОРИТЕТУ

### 🔴 ПРИОРИТЕТ 1 — ОБЪЕДИНИТЬ ДИЗАЙН В ОДИН ЭКРАН

**Проблема:** 3D дизайнер на главной, 2D в каталоге, галерея отдельно.

```jsx
// Создай: src/pages/Design/index.jsx
// ОДИН экран с 4 вкладками:

const DESIGN_TABS = [
  {
    id: 'quick',
    icon: '⚡',
    labelRu: 'Быстрый дизайн',
    labelTg: 'Тарҳи зуд',
    description: 'Размеры комнаты + выбор штор + 3D просмотр'
  },
  {
    id: 'planner2d',
    icon: '📐',
    labelRu: '2D Планировщик',
    labelTg: '2D Нақша',
    description: 'Нарисуй план комнаты'
  },
  {
    id: 'editor3d',
    icon: '🏠',
    labelRu: '3D Редактор',
    labelTg: '3D Муҳаррир',
    description: 'Полный 3D с мебелью'
  },
  {
    id: 'ideas',
    icon: '💡',
    labelRu: 'Готовые идеи',
    labelTg: 'Ғояҳои омода',
    description: 'Готовые интерьеры'
  },
]

// Маршрут: #/design (убери #/planner и #/designer)
// Добавь "Дизайн" в Header навигацию
// Добавь "Дизайн интерьера" в Footer
// Добавь карточку "Дизайн" в профиле покупателя
```

---

### 🔴 ПРИОРИТЕТ 2 — РЕАЛЬНЫЕ ФОТО ТОВАРОВ

```javascript
// Обнови server/seed.js или prisma/seed.ts:

const PRODUCTS = [
  {
    title_ru: 'Портьера "Бархат" блэкаут',
    title_tg: 'Парда "Бархат" блэкаут',
    description_ru: 'Плотная блэкаут-портьера из бархатной ткани. Защищает от света на 99%. Размер: 200×270 см. Материал: полиэстер 95%, хлопок 5%. Цвет: бордовый.',
    price: 420,
    category: 'curtains',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
    ],
    sku: 'OSN-CRT-001',
    width_cm: 200, height_cm: 270,
    material: 'Полиэстер, хлопок',
    in_stock: true, stock_qty: 15,
  },
  {
    title_ru: 'Портьера "Лён" натуральный',
    title_tg: 'Парда "Kanop" табиӣ',
    description_ru: 'Натуральные льняные портьеры. Экологичный материал. Размер: 150×260 см. Материал: лён 100%.',
    price: 385,
    category: 'curtains',
    images: [
      'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80',
    ],
    sku: 'OSN-CRT-002',
    in_stock: true, stock_qty: 8,
  },
  {
    title_ru: 'Тюль "Вуаль" белоснежный',
    title_tg: 'Тюль "Вуаль" сафедак',
    description_ru: 'Лёгкий тюль из вуали. Пропускает свет. Размер: 300×260 см.',
    price: 180,
    category: 'tulle',
    images: [
      'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=80',
    ],
    sku: 'OSN-TUL-001',
    in_stock: true, stock_qty: 30,
  },
  {
    title_ru: 'Жалюзи горизонтальные алюминий',
    title_tg: 'Жалюзии уфуқӣ алюминий',
    description_ru: 'Алюминиевые горизонтальные жалюзи. Ширина ламели 25 мм. Размер: 120×160 см.',
    price: 295,
    category: 'blinds',
    images: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80',
    ],
    sku: 'OSN-BLD-001',
    in_stock: true, stock_qty: 20,
  },
  {
    title_ru: 'Рулонная штора блэкаут',
    title_tg: 'Парда рулонии блэкаут',
    description_ru: 'Рулонная штора 100% блэкаут. Размер: 60-200 см × 170 см. Пошив под заказ.',
    price: 310,
    category: 'roller',
    images: [
      'https://images.unsplash.com/photo-1556909211-36987daf7b4d?w=800&q=80',
    ],
    sku: 'OSN-ROL-001',
    in_stock: true, stock_qty: 50,
  },
  {
    title_ru: 'Окно ПВХ двустворчатое 140×150',
    title_tg: 'Тиреза ПВХ дукаракора 140×150',
    description_ru: 'Пластиковое окно ПВХ профиль 58 мм. Двухкамерный стеклопакет. Размер 140×150 см.',
    price: 2205,
    category: 'windows',
    images: [
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80',
      'https://images.unsplash.com/photo-1560185007-5f0bb1866cab?w=800&q=80',
    ],
    sku: 'OSN-WIN-001',
    in_stock: true, stock_qty: 5,
  },
]
```

---

### 🔴 ПРИОРИТЕТ 3 — ИСПРАВИТЬ FLOW ЗАКАЗА

```javascript
// Полная цепочка которая ДОЛЖНА работать:

// 1. Покупатель: POST /api/orders
// { user_id, items: [{product_id, qty, price}], total, payment: 'cod', address }
// → создаёт order со статусом 'pending'

// 2. Продавец: GET /api/seller/orders?status=pending
// → видит новые заказы (polling каждые 10 сек)

// 3. Продавец подтверждает: PUT /api/orders/:id/status { status: 'confirmed' }

// 4. Курьер: GET /api/courier/orders?status=confirmed
// → видит подтверждённые

// 5. Курьер берёт: PUT /api/orders/:id/status { status: 'delivering' }

// 6. Курьер доставил: PUT /api/orders/:id/status { status: 'delivered' }

// 7. Покупатель: GET /api/orders/:id → видит статус 'delivered'

// Проверь через Playwright:
// - Оформи заказ как покупатель
// - Зайди в кабинет продавца → заказ должен быть там
// - Смени статус → зайди в кабинет курьера → заказ должен быть там
```

---

### 🟡 ПРИОРИТЕТ 4 — ПРОФЕССИОНАЛЬНЫЙ UI (21st.dev)

Для каждого компонента — сначала запроси через 21st.dev:

```javascript
// Header:
mcp__magic__21st_magic_component_builder({
  message: "E-commerce marketplace header with 2 rows: 
    Top row (32px): city selector, promo banner, language switcher RU/TG
    Main row (64px): catalog menu button, logo OSINOT, search bar 50% width, 
    wishlist icon, profile icon with dropdown, cart icon with item count badge.
    Dark green #1B4332 background, white text. Sticky on scroll.",
  context: "Vite React Tailwind HashRouter"
})

// ProductCard:
mcp__magic__21st_magic_component_builder({
  message: "Product card for curtains/blinds marketplace.
    Image with hover zoom effect, 'New' or 'Sale' badge top-left,
    product name 2 lines max, price in somoni (bold large), 
    rating stars + review count, 'Add to cart' button orange #E85D04 44px,
    wishlist heart icon top-right.
    On hover: quick view overlay with 'Open' button.",
  context: "Tailwind React marketplace Tajikistan"
})

// SellerDashboard:
mcp__magic__21st_magic_component_builder({
  message: "Seller dashboard for marketplace. 
    Sidebar navigation: Orders, Products, Analytics, Settings.
    Main content: Orders list table with columns: #ID, Customer, Items, Total, Status, Actions.
    Status badges: Новый(blue), Подтверждён(orange), Доставлен(green).
    Stats cards at top: Today revenue, Active orders, Total products.",
  context: "React Tailwind Express REST API polling"
})
```

---

### 🟡 ПРИОРИТЕТ 5 — 3D ДИЗАЙНЕР (шторы на окне)

```javascript
// В 3D дизайнере комнаты:
// Когда пользователь выбирает товар (штору/жалюзи):

// 1. Загрузи фото товара как текстуру:
const texture = new THREE.TextureLoader().load(product.images[0])
texture.wrapS = THREE.RepeatWrapping
texture.wrapT = THREE.RepeatWrapping
texture.repeat.set(1, 1)

// 2. Создай плоскость в области окна:
const curtainGeo = new THREE.PlaneGeometry(windowWidth/100, windowHeight/100)
const curtainMat = new THREE.MeshStandardMaterial({ 
  map: texture,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide
})
const curtain = new THREE.Mesh(curtainGeo, curtainMat)
curtain.position.set(windowX, windowY, wallZ + 0.01)
scene.add(curtain)

// 3. Это ключевая фича — "примерь штору на своё окно"
// Результат: пользователь видит РЕАЛЬНОЕ фото своей шторы на своём окне в 3D
```

---

## ДИЗАЙН-СИСТЕМА OSINOT

```css
/* Цвета */
--primary:     #1B4332;  /* Тёмно-зелёный — шапка, кнопки вторичные */
--accent:      #E85D04;  /* Оранжевый — CTA кнопки */
--bg:          #F8F9FA;  /* Фон страниц */
--text:        #1A1A1A;  /* Основной текст */
--border:      #E5E7EB;  /* Границы */
--success:     #22C55E;  /* Успех, доставлено */
--warning:     #F59E0B;  /* Предупреждение */
--card-shadow: 0 2px 8px rgba(0,0,0,0.08);

/* Типографика */
--font-heading: font-bold text-2xl/3xl;
--font-body:    text-base font-normal;
--font-price:   text-xl font-bold text-gray-900;

/* Touch targets */
min-height: 44px; /* ОБЯЗАТЕЛЬНО для всех кнопок и ссылок */

/* Карточки */
border-radius: 12px;
box-shadow: var(--card-shadow);
```

**Ориентиры дизайна:**
| Секция | Ориентир |
|--------|----------|
| Каталог | Wildberries / Ozon |
| Карточка товара | Ozon — галерея слева, инфо справа |
| Главная | Ozon — баннер, категории, хиты |
| Раздел дизайна | IKEA Place / Planoplan |
| Кабинет продавца | Shopify Admin |
| Мобильная версия | Wildberries мобильное приложение |

---

## ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА

```
✅ COD (наличные) = ПЕРВЫЙ вариант оплаты всегда
✅ Все кнопки min-h-[44px] (мобайл-фёрст Андроид)
✅ title_ru + title_tg у ВСЕХ текстов и товаров
✅ Заказ появляется у продавца без перезагрузки
✅ Деньги: Int в сомони (НЕ BigInt, НЕ Float)
✅ findMany с LIMIT (никогда без ограничения)
✅ Zod валидация на POST/PUT endpoints
✅ Проверяй в Playwright после КАЖДОГО изменения
✅ Conventional commits: feat/fix/chore(scope): описание
```

---

## ПОСЛЕ КАЖДОЙ СЕССИИ (обязательно)

```bash
# 1. Обнови MARKITPYS_STATUS.md в репо muhamsoliev-prog/-
#    Перенеси сделанные ✅ задачи из ❌

# 2. Коммит:
git commit -m "docs: update MARKITPYS_STATUS.md — [что сделано]"

# 3. Запушь в ветку
git push
```

---

## БЫСТРАЯ ПРОВЕРКА (перед каждым коммитом)

```bash
# 1. Запусти в Playwright и сделай скриншот
mcp__playwright__browser_navigate({ url: "http://localhost:5173" })
mcp__playwright__browser_take_screenshot({})

# 2. Проверь мобильный вид (375px)
mcp__playwright__browser_resize({ width: 375, height: 812 })
mcp__playwright__browser_take_screenshot({})

# 3. Проверь кнопки
mcp__playwright__browser_evaluate({
  script: "Array.from(document.querySelectorAll('button,a')).filter(el => el.getBoundingClientRect().height < 44).map(el => el.textContent.trim())"
})
# Результат должен быть: [] (пустой массив)
```
