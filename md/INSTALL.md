# 🚀 Руководство по Установке и Запуску OSINOT

## Требования

### Системные Требования

- **Node.js** >= 16.x
- **npm** >= 8.x или **yarn** >= 1.22.x
- **Git** для управления версиями
- **Python** 3.x (для бэкенда)

### Рекомендуемые IDE

- VS Code + Extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - TypeScript Vue Plugin (Volar)
  - Tailwind CSS IntelliSense
  - Thunder Client (для тестирования API)

## Установка

### 1. Клонирование Репозитория

```bash
git clone https://github.com/your-repo/osinot-skeleton.git
cd osinot-skeleton
```

### 2. Установка Зависимостей Frontend

```bash
npm install
# или
yarn install
```

### 3. Установка Зависимостей Backend

```bash
cd backend
npm install
cd ..
```

### 4. Конфигурация Окружения

Создать файлы `.env` в корне и в `backend/`:

**Корневой .env**
```
VITE_API_URL=http://localhost:3000/api
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true
```

**backend/.env**
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/osinot
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development

# API Keys
WILDBERRIES_API_KEY=your_key
OZON_API_KEY=your_key
YANDEX_API_KEY=your_key

# Payment
YOOKASSA_PUBLIC_KEY=your_key
YOOKASSA_SECRET_KEY=your_key

# OpenAI (для AI функций)
OPENAI_API_KEY=your_key
```

## Запуск Приложения

### Development Mode

#### Frontend

```bash
npm run dev
# Откроется на http://localhost:5173
# (или 5175 если 5173-5174 заняты)
```

Приложение будет автоматически перезагружаться при изменении файлов (HMR).

#### Backend

```bash
cd backend
npm run dev
# Запустится на http://localhost:3000
```

#### Одновременный Запуск (Concurrently)

Добавить в `package.json`:
```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run dev\" \"cd backend && npm run dev\""
  }
}
```

Затем:
```bash
npm run dev:all
```

### Production Build

```bash
# Build
npm run build

# Preview
npm run preview
```

## Проверка Типов

```bash
npm run type-check
```

## Структура Директорий (Frontend)

```
src/
├── components/
│   ├── App.tsx              # Главный компонент
│   ├── Dashboard.tsx        # Дашборд
│   ├── Products.tsx         # Товары
│   ├── Settings.tsx         # Настройки
│   ├── Subscriptions.tsx    # Подписки
│   ├── Sidebar.tsx          # Боковая панель
│   └── TokenCard.tsx        # Компонент токена
├── context/
│   └── LanguageContext.tsx  # Context для языка
├── locales/
│   ├── ru.ts               # Русские переводы
│   ├── en.ts               # Английские переводы
│   └── index.ts            # Экспорт
├── styles/
│   ├── design-system.css   # Дизайн система
│   ├── Dashboard.css       # Стили дашборда
│   ├── Sidebar.css         # Стили боковой панели
│   ├── Settings.css        # Стили настроек
│   ├── Products.css        # Стили товаров
│   └── Subscriptions.css   # Стили подписок
├── main.tsx                # Точка входа
├── index.css               # Глобальные стили
└── vite-env.d.ts           # Типы Vite
```

## Структура Директорий (Backend)

```
backend/
├── models/                 # Mongoose модели
│   ├── User.js
│   ├── Shop.js
│   ├── Product.js
│   ├── Order.js
│   ├── Campaign.js
│   ├── Payment.js
│   └── ...
├── routes/                 # API маршруты
│   ├── auth.js
│   ├── products.js
│   ├── orders.js
│   └── ...
├── middleware/             # Express middleware
│   ├── auth.js             # JWT verificatio
│   └── admin.js            # Admin check
├── utils/                  # Утилиты
│   ├── ai.js              # OpenAI интеграция
│   ├── apiClients.js      # API клиенты маркетплейсов
│   ├── db.js              # Утилиты БД
│   └── yookassa.js        # Yookassa интеграция
├── config/
│   └── db.js              # MongoDB конфигурация
├── cron/
│   └── bidder.js          # CRON для биддинга
├── app.js                 # Express приложение
├── server.js              # Сервер
└── package.json
```

## Вспомогательные Команды

### Frontend

```bash
# Запуск dev сервера
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Lint (если настроен)
npm run lint

# Format (если настроен)
npm run format
```

### Backend

```bash
cd backend

# Запуск dev сервера
npm run dev

# Production
npm start

# Database migration (если используется)
npm run migrate
```

## Первые Шаги Разработки

### 1. Изучение Структуры

```bash
# Посмотреть содержимое папки
ls -la src/

# Перейти в Dashboard
code src/components/Dashboard.tsx
```

### 2. Редактирование Компонента

```typescript
// src/components/Dashboard.tsx
import { useState } from 'react'

export default function Dashboard() {
  const [data, setData] = useState([])

  return (
    <div className="dashboard-page">
      {/* Ваш контент */}
    </div>
  )
}
```

### 3. Добавление Стилей

```css
/* src/styles/Dashboard.css */
.dashboard-page {
  padding: 32px 0;
  background: var(--color-bg-primary);
}
```

### 4. Проверка В Браузере

- Открыть DevTools (F12)
- Проверить Console на ошибки
- Проверить Network для API запросов
- Проверить Elements для структуры

## Обычные Ошибки и Решения

### Ошибка: "Cannot find module '@/components/...'"

**Решение**: Убедиться что используется alias `@/` как указано в `vite.config.ts` и `tsconfig.json`

```typescript
// ✅ Правильно
import { Dashboard } from '@/components/Dashboard'

// ❌ Неправильно
import { Dashboard } from './components/Dashboard'
```

### Ошибка: "EADDRINUSE: address already in use :::5173"

**Решение**: Порт занят. Vite автоматически использует другой порт (5174, 5175, и т.д.)

Или убить процесс:
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

### Ошибка: "Module not found: Can't resolve 'lucide-react'"

**Решение**: Переустановить зависимости

```bash
rm -rf node_modules package-lock.json
npm install
```

### Ошибка: TypeScript errors в VS Code

**Решение**: Перезагрузить TypeScript сервер

```
Ctrl+Shift+P -> TypeScript: Restart TS Server
```

## Debug Mode

### В VS Code

Создать `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/backend/server.js",
      "restart": true,
      "console": "integratedTerminal"
    }
  ]
}
```

Нажать F5 для запуска debugger.

### Browser DevTools

```javascript
// Console
console.log(data)        // Вывести данные
console.table(array)     // Вывести в таблице
console.time('label')    // Начало таймера
console.timeEnd('label') // Конец таймера
```

## Testing Workflow

### Ручное Тестирование

1. Открить браузер на http://localhost:5175
2. Открыть DevTools (F12)
3. Перейти по каждой странице
4. Проверить что все кнопки работают
5. Проверить что нет ошибок в Console
6. Проверить Network tab для API запросов

### API Testing (Thunder Client или Postman)

```
GET http://localhost:3000/api/dashboard/kpi
GET http://localhost:3000/api/products
POST http://localhost:3000/api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

## Deployment

### Подготовка

1. Создать production build:
```bash
npm run build
```

2. Проверить `dist/` папку

3. Развернуть на хостинге:
```bash
# Vercel
vercel

# Netlify
netlify deploy --prod

# Собственный сервер
scp -r dist/* user@server:/var/www/html/
```

## Useful Links

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [Lucide Icons](https://lucide.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)

## Support & Contact

Для вопросов:
- 📧 Email: support@osinot.com
- 💬 Discord: [link]
- 📱 Telegram: @osinot_support

---

**Версия**: 1.0.0  
**Обновлено**: 11 апреля 2026  
**Статус**: ✅ Актуально
