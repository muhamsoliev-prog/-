# 🔑 Wildberries API токены - Полная документация

## 📌 Обзор типов токенов

Wildberries предоставляет 4 основных типа API токенов для разных целей:

| Тип токена | API | Назначение | Приоритет |
|-----------|-----|-----------|----------|
| **Marketplace API** | `https://suppliers-api.wildberries.ru` | Работа с товарами, заказами | 🔴 Высокий |
| **Statistics API** | `https://statistics-api.wildberries.ru` | Получение аналитики и статистики | 🟡 Высокий |
| **Content API** | `https://content-api.wildberries.ru` | Управление карточками товаров | 🟡 Средний |
| **Seller API** | `https://seller.wildberries.ru` | Данные продавца и аккаунта | 🟡 Средний |

---

## 1. 🛒 Marketplace API (Основной токен)

### Описание
Используется для работы с товарами, заказами, логистикой и основной бизнес-логикой.

### Функциональность
- ✅ Получение списка товаров
- ✅ Обновление информации о товарах
- ✅ Управление заказами
- ✅ Отслеживание логистики
- ✅ Работа с возвратами
- ✅ Управление ценами и акциями

### Основные endpoints

```
GET  /api/v3/suppliers/me                      - Информация продавца
GET  /api/v3/products                          - Список товаров
POST /api/v3/products/upload                   - Загрузка товаров
PATCH /api/v3/products/{id}                    - Обновление товара
GET  /api/v3/orders                            - Список заказов
GET  /api/v3/warehouses                        - Склады
```

### Пример запроса

```bash
curl -X GET "https://suppliers-api.wildberries.ru/api/v3/products" \
  -H "Authorization: Bearer YOUR_MARKETPLACE_TOKEN"
```

### Область применения в OSINOT
```
📊 Dashboard   - Получение заказов, выручки
📦 Products    - Список товаров, их обновление
💸 Payouts     - Информация о выплатах
🔻 Deductions  - Комиссии и удержания
```

---

## 2. 📊 Statistics API (Аналитический токен)

### Описание
Специализированный API для получения аналитических данных, статистики продаж и производительности.

### Функциональность
- ✅ Статистика продаж по дням/неделям/месяцам
- ✅ Анализ популярности товаров
- ✅ Данные по возвратам и рекламациям
- ✅ Информация о конкурентах
- ✅ Прогнозы спроса
- ✅ Рейтинги и отзывы

### Основные endpoints

```
GET  /api/v1/supplier/sales                    - Продажи
GET  /api/v1/supplier/stocks                   - Остатки товаров
GET  /api/v1/supplier/orders                   - Заказы и выполнение
GET  /api/v1/supplier/returns                  - Возвраты
GET  /api/v1/supplier/reviews                  - Отзывы
GET  /api/v1/supplier/ratings                  - Рейтинги товаров
```

### Пример запроса

```bash
# Получить статистику продаж за месяц
curl -X GET "https://statistics-api.wildberries.ru/api/v1/supplier/sales?dateFrom=2024-01-01&dateTo=2024-01-31" \
  -H "Authorization: Bearer YOUR_STATISTICS_TOKEN"
```

### Ответ (пример)

```json
{
  "data": [
    {
      "date": "2024-01-15",
      "sales": 125,
      "revenue": 450000,
      "returns": 8,
      "cancellations": 3
    }
  ]
}
```

### Область применения в OSINOT
```
📈 Dashboard   - Графики и KPI данные
📦 Products    - Популярность товаров
💰 CostPrice   - Анализ маржи
🔻 Deductions  - Процент возвратов
🎯 Reports     - Аналитические отчёты
```

---

## 3. 📝 Content API (Карточки товаров)

### Описание
API для управления контентом - описаниями товаров, изображениями, характеристиками и SEO.

### Функциональность
- ✅ Создание и редактирование карточек товаров
- ✅ Управление медиа (фото, видео)
- ✅ Работа с характеристиками (атрибутами)
- ✅ SEO оптимизация (заголовки, описания)
- ✅ Категоризация товаров
- ✅ Управление вариантами (размеры, цвета)

### Основные endpoints

```
GET  /api/v1/nomenclatures                     - Список товаров
POST /api/v1/nomenclatures                     - Создание товара
PATCH /api/v1/nomenclatures/{id}               - Обновление информации
DELETE /api/v1/nomenclatures/{id}              - Удаление товара
POST /api/v1/upload/file                       - Загрузка изображения
GET  /api/v1/characteristics/categories        - Характеристики категории
```

### Пример запроса

```bash
# Обновить описание товара
curl -X PATCH "https://content-api.wildberries.ru/api/v1/nomenclatures/123456" \
  -H "Authorization: Bearer YOUR_CONTENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ноутбук ASUS ROG 15 дюймов",
    "description": "Мощный ноутбук для геймеров с RTX 4070",
    "seoTitle": "Купить ноутбук ASUS ROG 15 RTX 4070"
  }'
```

### Область применения в OSINOT
```
📝 Content     - Редактирование описаний
📸 SEO         - SEO оптимизация
📦 Products    - Карточки товаров
🎨 Settings    - Управление контентом
```

---

## 4. 👤 Seller API (Аккаунт продавца)

### Описание
API для получения информации об аккаунте продавца, его статистике и параметрах.

### Функциональность
- ✅ Информация о профиле продавца
- ✅ Статус аккаунта и баланс
- ✅ Параметры доставки и логистики
- ✅ Платежные реквизиты
- ✅ История с платформой
- ✅ Данные о сертификатах и лицензиях

### Основные endpoints

```
GET  /api/v1/seller                            - Информация о продавце
GET  /api/v1/seller/balance                    - Баланс и финансы
GET  /api/v1/seller/contracts                  - Договоры и контракты
GET  /api/v1/seller/documents                  - Документы
GET  /api/v1/seller/suppliers                  - Список поставщиков
```

### Пример запроса

```bash
# Получить информацию о продавце
curl -X GET "https://seller.wildberries.ru/api/v1/seller" \
  -H "Authorization: Bearer YOUR_SELLER_TOKEN"
```

### Ответ (пример)

```json
{
  "seller": {
    "id": 12345,
    "name": "ООО МОЙ МАГАЗИН",
    "email": "shop@example.com",
    "phone": "+7 (999) 123-45-67",
    "balance": 250000,
    "status": "active"
  }
}
```

### Область применения в OSINOT
```
⚙️ Settings    - Информация о компании
💰 Payouts     - Баланс и выплаты
📊 Dashboard   - Статус аккаунта
🏪 Stores      - Информация о магазине
```

---

## 🔐 Получение токенов Wildberries

### Шаг 1: Вход в кабинет продавца

1. Откройте https://seller.wildberries.ru
2. Введите логин и пароль
3. Пройдите двухфакторную аутентификацию

### Шаг 2: Переход в настройки API

```
Меню → Настройки → Интеграция → API Ключи
или прямо: https://seller.wildberries.ru/settings/api-keys
```

### Шаг 3: Создание ключа

1. Нажмите "Создать новый ключ"
2. Выберите тип ключа (Marketplace, Statistics, Content или Seller)
3. Установите период действия (рекомендуется 1 год)
4. Нажмите "Создать"

### Шаг 4: Сохранение токена

⚠️ **ВАЖНО**: Токен отображается только один раз! Сохраните его немедленно.

```
Ваш токен: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Шаг 5: Внесение в OSINOT

1. Откройте приложение OSINOT
2. Перейдите в Settings → API Tokens
3. Выберите Wildberries
4. Вставьте токен
5. Нажмите "Test Token" для проверки

---

## 📋 Матрица использования токенов

| Операция | Marketplace | Statistics | Content | Seller |
|----------|:-----------:|:----------:|:-------:|:------:|
| Создать товар | ✅ | ❌ | ✅ | ❌ |
| Обновить цену | ✅ | ❌ | ❌ | ❌ |
| Получить заказы | ✅ | ✅ | ❌ | ❌ |
| Статистика продаж | ❌ | ✅ | ❌ | ❌ |
| Редактировать описание | ✅ | ❌ | ✅ | ❌ |
| Получить баланс | ❌ | ❌ | ❌ | ✅ |
| Загрузить изображение | ✅ | ❌ | ✅ | ❌ |
| Данные о профиле | ✅ | ❌ | ❌ | ✅ |
| Управление возвратами | ✅ | ❌ | ❌ | ❌ |
| Аналитика товаров | ❌ | ✅ | ❌ | ❌ |

---

## 🛡️ Безопасность токенов

### Рекомендации

✅ **ДЕЛАЙТЕ:**
- Хранить токены в защищённых переменных окружения
- Использовать разные токены для разных приложений
- Регулярно ротировать токены (каждые 3 месяца)
- Ограничивать доступ по IP адресам
- Устанавливать минимальные необходимые права

❌ **НЕ ДЕЛАЙТЕ:**
- Сохранять токены в коде репозитория
- Передавать токены по незащищённым каналам
- Использовать один токен для всех приложений
- Делиться токенами с посторонними
- Хранить токены в браузере (localStorage, cookies)

### Переменные окружения (.env)

```env
VITE_WB_MARKETPLACE_TOKEN=your_marketplace_token_here
VITE_WB_STATISTICS_TOKEN=your_statistics_token_here
VITE_WB_CONTENT_TOKEN=your_content_token_here
VITE_WB_SELLER_TOKEN=your_seller_token_here
```

### Использование в коде

```typescript
const WB_TOKEN = import.meta.env.VITE_WB_MARKETPLACE_TOKEN

async function fetchWildberriesData() {
  const response = await fetch(
    'https://suppliers-api.wildberries.ru/api/v3/products',
    {
      headers: {
        'Authorization': `Bearer ${WB_TOKEN}`
      }
    }
  )
  return response.json()
}
```

---

## 🚨 Обработка ошибок

### Распространённые ошибки

#### 401 Unauthorized
```
Причина: Неверный или истёкший токен
Решение: Проверьте токен в кабинете Wildberries
```

#### 403 Forbidden
```
Причина: Токен не имеет прав на эту операцию
Решение: Используйте правильный тип токена
```

#### 429 Too Many Requests
```
Причина: Превышен лимит запросов (обычно 100/сек)
Решение: Добавьте задержку между запросами (setTimeout)
```

#### 500 Internal Server Error
```
Причина: Ошибка на стороне Wildberries
Решение: Повторите запрос через несколько минут
```

### Пример обработки ошибок

```typescript
async function testWildberriesToken(token: string) {
  try {
    const response = await fetch(
      'https://suppliers-api.wildberries.ru/api/v3/suppliers/me',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Ошибка: ${error.message}`)
    }

    const data = await response.json()
    console.log('✅ Токен корректен!')
    return data
  } catch (error) {
    console.error('❌ Ошибка токена:', error.message)
    return null
  }
}
```

---

## 📊 Интеграция с OSINOT

### Где используются токены в приложении

```
Settings → API Tokens → Wildberries
├── Marketplace API  → Для товаров и заказов
├── Statistics API   → Для аналитики
├── Content API      → Для описаний товаров
└── Seller API       → Для информации о продавце
```

### Поток данных

```
WB API Tokens (Settings)
    ↓
Store (Redux/Context)
    ↓
Dashboard ← Statistics API
Products ← Marketplace API
CostPrice ← Statistics API
Payouts ← Marketplace API
```

---

## 🔄 Ротация токенов

### Когда менять токены

- 🔴 По расписанию (каждые 90 дней)
- 🔴 При подозрении на компрометацию
- 🔴 При смене контактного лица
- 🔴 При изменении прав доступа

### Как поменять токен

1. Создайте новый токен в кабинете WB
2. Обновите значение в переменной окружения .env
3. Перезагрузите приложение
4. Удалите старый токен в кабинете WB (через неделю)

---

## 📞 Поддержка Wildberries

- **Документация API**: https://openapi.wildberries.ru/
- **Поддержка продавцов**: https://support.wildberries.ru/
- **Форум**: https://seller.wildberries.ru/community/
- **Email**: api@wildberries.ru

---

## ✅ Checklist для интеграции

- [ ] Учётная запись на Wildberries создана
- [ ] Все 4 типа токенов получены
- [ ] Токены сохранены в безопасном месте
- [ ] Переменные окружения установлены (.env)
- [ ] Токены протестированы в OSINOT
- [ ] API интеграция работает
- [ ] Данные корректно отображаются
- [ ] Ошибки обрабатываются правильно
- [ ] Логирование включено для отладки
- [ ] План ротации токенов установлен

---

## 📌 Итоговая сводка

| Параметр | Значение |
|----------|----------|
| Типов токенов | 4 |
| Главный API | Marketplace |
| Лимит запросов | ~100 в секунду |
| Период действия | ~1 год (настраивается) |
| Обновление | Каждые 90 дней |
| Поддержка | https://support.wildberries.ru/ |

**Все токены готовы к использованию!** 🚀
