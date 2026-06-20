# 🚀 OSINOT - Быстрый старт за 5 минут

## ⏱️ Шаг 1: Установка (1 минута)

```bash
# Клонируем репозиторий
git clone https://github.com/yourusername/osinot.git
cd osinot

# Устанавливаем зависимости
npm install
```

## ⏱️ Шаг 2: Запуск dev сервера (1 минута)

```bash
npm run dev
```

Приложение откроется на **http://localhost:5174**

## ⏱️ Шаг 3: Первый вход (1 минута)

1. Откройте http://localhost:5174
2. Вы увидите Dashboard с 8 KPI карточками
3. Нажмите на логотип в боковой панели для свёртывания

## ⏱️ Шаг 4: Выбор языка (1 минута)

1. Перейдите в **Settings** (иконка ⚙️ в левом меню)
2. Нажмите на флаг нужного языка:
   - 🇷🇺 Русский (текущий)
   - 🇺🇸 English
   - 🇨🇳 中文
   - 🇹🇯 Тоҷикӣ

Язык автоматически сохранится!

## ⏱️ Шаг 5: Добавление API токенов (1 минута)

1. В **Settings** найдите раздел **API Tokens**
2. Выберите **Wildberries**
3. Вставьте ваш токен (получить на https://seller.wildberries.ru)
4. Нажмите **Test Token** для проверки
5. Нажмите **Save**

---

## 📱 Структура приложения

### 🧭 Боковое меню (11 пунктов)

```
📊 Dashboard      → Главная страница (KPI, графики)
📦 Products       → Каталог товаров (поиск, сортировка)
💰 Cost Price     → Анализ маржи
🔻 Deductions     → Удержания и комиссии
💸 Payouts        → История выплат
⚙️ Settings       → Настройки (язык, API, профиль)
⚠️ Underpayments  → Недоплаты (в разработке)
📈 Reports        → Отчёты (в разработке)
🏪 Stores         → Магазины (в разработке)
🔔 Notifications  → Уведомления (в разработке)
🤖 AI Analytics   → ИИ Аналитика (в разработке)
```

---

## 📊 Основные страницы

### Dashboard
```
[KPI 1] [KPI 2] [KPI 3] [KPI 4]
[KPI 5] [KPI 6] [KPI 7] [KPI 8]

📈 График последних 7 дней
📍 Таблица регионов
```

### Products
```
Поиск: [________________]

Таблица:
Name | SKU | Stock | Price | Sales | Revenue | Rating
```

### Settings
```
👤 Профиль
   [Имя] [Фамилия]
   [Email] [Телефон]

🌐 Язык
   [🇷🇺] [🇺🇸] [🇨🇳] [🇹🇯]

🔑 API Tokens
   Wildberries [Token] [Test] [Copy]

💳 Банковские реквизиты
   [БИК] [ИНН] [КПП] [Счёт]

🔔 Уведомления
   ☑ Email  ☑ Telegram  ☑ Низкие остатки
```

---

## 💡 Полезные команды

```bash
# 🚀 Запуск dev сервера
npm run dev

# 🔨 Сборка для продакшена
npm run build

# 👀 Предпросмотр сборки
npm run preview

# ✅ Проверка TypeScript
npm run type-check

# 🔍 Просмотр логов сервера (в отдельном терминале)
npm run dev -- --host
```

---

## 🎨 Быстрая кастомизация

### Изменение языка по умолчанию

Откройте `src/context/LanguageContext.tsx`:

```typescript
// Текущее значение
return saved || 'ru'

// Измените на:
return saved || 'en'  // для English
return saved || 'zh'  // для 中文
return saved || 'tg'  // для Тоҷикӣ
```

### Изменение цветовой схемы

Откройте `src/styles/globals.css` и отредактируйте CSS переменные:

```css
:root {
  --primary: #2563eb;      /* Основной цвет */
  --success: #10b981;      /* Зелёный (успех) */
  --danger: #ef4444;       /* Красный (ошибка) */
  --bg: #ffffff;           /* Фон */
  --text: #111827;         /* Текст */
}
```

### Добавление нового меню элемента

1. Откройте `src/components/Sidebar.tsx`
2. Добавьте новый пункт в массив `menuItems`
3. Откройте `src/locales/index.ts`
4. Добавьте перевод в раздел `sidebar`

---

## 🐛 Отладка

### Проверить текущий язык

```javascript
// В консоли браузера (F12)
localStorage.getItem('language')
```

### Сбросить язык на русский

```javascript
localStorage.setItem('language', 'ru')
location.reload()
```

### Посмотреть все переводы

```javascript
// В консоли браузера
import { translations } from './src/locales/index.ts'
console.log(translations.ru.dashboard)
```

---

## 📦 Структура папок

```
osinot/
├── src/
│   ├── components/    ← Компоненты
│   ├── context/       ← Контексты (язык)
│   ├── locales/       ← Переводы
│   ├── styles/        ← CSS файлы
│   ├── App.tsx        ← Главный компонент
│   ├── main.tsx       ← Точка входа
│   └── vite-env.d.ts  ← Типы
├── public/            ← Статические файлы
├── dist/              ← Готовая сборка
├── .env               ← Переменные окружения
├── package.json       ← Зависимости
├── tsconfig.json      ← TypeScript конфиг
└── vite.config.ts     ← Vite конфиг
```

---

## 🌐 Форматирование данных по языку

Система автоматически форматирует:

### Числа

```
Русский:   1 255 176        (пробел)
English:   1,255,176        (запятая)
中文:      1255176          (ничего)
Тоҷикӣ:    1 255 176        (пробел)
```

### Валюты

```
Русский:   1 255 176 ₽
English:   $1,255,176
中文:      ¥1255176
Тоҷикӣ:    1 255 176 сўм
```

### Даты

```
Русский:   1 апреля 2024
English:   April 1, 2024
中文:      2024年4月1日
Тоҷикӣ:    1 апрелӣ 2024
```

---

## 🔑 API токены Wildberries

### Получение токенов

1. Откройте https://seller.wildberries.ru
2. Перейдите в Настройки → Интеграция → API Ключи
3. Нажмите "Создать новый ключ"
4. Выберите тип (Marketplace, Statistics, Content, Seller)
5. Скопируйте токен (он отображается только один раз!)

### Типы токенов

| Тип | Для |
|-----|-----|
| **Marketplace API** | Товары, заказы, логистика |
| **Statistics API** | Аналитика, статистика |
| **Content API** | Описания товаров |
| **Seller API** | Информация продавца |

### Добавление в OSINOT

1. Settings → API Tokens
2. Выберите Wildberries
3. Вставьте токен Marketplace API
4. Нажмите "Test Token"
5. Если ✅ - токен работает!

---

## 📚 Документация

В проекте есть 4 документа:

1. **DATA_VALIDATION.md** - Проверка корректности всех данных
2. **LOCALIZATION_GUIDE.md** - Подробное руководство локализации
3. **WB_API_TOKENS.md** - Полная документация Wildberries API
4. **PROJECT_DOCUMENTATION.md** - Полная документация проекта
5. **FINAL_CHECKLIST.md** - Финальный чек-лист
6. **QUICKSTART.md** - Этот файл

---

## 🎯 Частые вопросы

### Q: Как добавить новый язык?
**A:** Откройте `src/locales/index.ts`, добавьте новый объект в `translations` со своим кодом языка.

### Q: Как изменить цвета?
**A:** Отредактируйте CSS переменные в `src/styles/globals.css`.

### Q: Как добавить новую страницу?
**A:** Создайте компонент в `src/components/`, добавьте маршрут в `App.tsx`, добавьте пункт в Sidebar.

### Q: Где хранятся данные?
**A:** Сейчас в состоянии компонентов (useState). Позже подключится настоящий backend.

### Q: Как запустить на продакшене?
**A:** Запустите `npm run build` и загрузите папку `dist/` на сервер.

### Q: Как получить токен Wildberries?
**A:** https://seller.wildberries.ru → Настройки → Интеграция → API Ключи

---

## ✅ Готово к запуску!

```bash
# Скопируйте эту команду и выполните

npm install && npm run dev
```

**Готово! Приложение запустилось на http://localhost:5174** 🎉

---

## 📞 Помощь

Если что-то не работает:

1. Проверьте что Node.js 16+ установлен: `node -v`
2. Очистите кэш npm: `npm cache clean --force`
3. Удалите node_modules и package-lock.json
4. Переустановите: `npm install`
5. Запустите заново: `npm run dev`

---

**Спасибо за использование OSINOT!** 🚀

Для более подробной информации смотрите:
- [DATA_VALIDATION.md](./DATA_VALIDATION.md)
- [LOCALIZATION_GUIDE.md](./LOCALIZATION_GUIDE.md)
- [WB_API_TOKENS.md](./WB_API_TOKENS.md)
- [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
