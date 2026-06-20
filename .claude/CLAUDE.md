# OSINOT — WB Analytics SaaS

## Архитектура
- Frontend: React + TypeScript на порту 5173
- Backend: Node.js + Express на порту 3000  
- БД: MongoDB Atlas

## Правила работы с WB API данными

### Финансовый отчёт /api/wb/finance-report
- Эндпоинт WB: GET /api/v5/supplier/reportDetailByPeriod
- Параметры: dateFrom (YYYY-MM-DD), dateTo (YYYY-MM-DD), limit=100000
- Заголовок: Authorization: {токен} (БЕЗ слова Bearer!)
- doc_type_name === "Продажа" → считаем в выручку
- doc_type_name === "Возврат" → считаем в возвраты
- ppvz_for_pay → выплачено продавцу
- delivery_rub → логистика
- storage_fee → хранение
- penalty → штрафы

### Заказы /api/wb/orders  
- Эндпоинт WB: GET /api/v1/supplier/orders
- Параметры: dateFrom (ISO формат с временем: 2024-01-01T00:00:00)
- Считай только orders где srid не пустой

### Карточки товаров /api/wb/sync-products
- Эндпоинт WB: POST /content/v2/get/cards/list
- mediaFiles[0] → фото товара
- nmID → артикул WB
- vendorCode → артикул продавца

### ВАЖНО: формат токена WB
WB токены используются БЕЗ приставки "Bearer"!
Правильно: Authorization: eyJhbGc...
Неправильно: Authorization: Bearer eyJhbGc...

### ВАЖНО: формат дат
- /reportDetailByPeriod → формат: 2024-01-01 (только дата)
- /orders и /sales → формат: 2024-01-01T00:00:00 (с временем)

## Правила расчёта KPI на дашборде

Выручка = сумма retail_price_withdisc_rub где doc_type_name = "Продажа"
Удержания WB = комиссия + логистика + хранение + штрафы
Выплачено = сумма ppvz_for_pay
Возвраты = сумма retail_price_withdisc_rub где doc_type_name = "Возврат"
Маржа % = (Выплачено - Себестоимость) / Выручка * 100
ROI % = (Выплачено - Себестоимость) / Себестоимость * 100

## Фильтрация по периоду
- 7 дней → dateFrom = сегодня минус 7 дней
- 30 дней → dateFrom = сегодня минус 30 дней  
- 90 дней → dateFrom = сегодня минус 90 дней
- При смене периода → новый запрос к API

## Частые ошибки которые надо избегать
1. НЕ используй моковые данные — только реальные из WB API
2. НЕ кешируй данные без инвалидации при смене периода
3. Всегда проверяй что токен существует перед запросом к WB
4. WB возвращает 401 если токен без нужных прав доступа
5. WB возвращает 429 если слишком много запросов — добавь retry
