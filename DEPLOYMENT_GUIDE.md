#!/usr/bin/env bash
# 🚀 OSINOT - КОМАНДЫ ДЛЯ ЗАПУСКА И РАЗВЁРТЫВАНИЯ

## ✨ БЫСТРЫЙ СТАРТ

# 1️⃣  Разработка (development)
npm run dev
# ➜ Откроется на http://localhost:5175
# ➜ Горячая перезагрузка при изменении файлов
# ➜ Нажмите 'h' для справки

# 2️⃣  Production build
npm run build
# ➜ Создаст папку dist/
# ➜ Оптимизированная версия (~115 KB gzip)
# ➜ Готова для деплоя

# 3️⃣  Preview production версии
npm run preview
# ➜ Проверит как выглядит production build
# ➜ На локальном сервере

---

## 🔧 ДЕТАЛЬНЫЕ КОМАНДЫ

### Development
```bash
npm run dev
# Запускает Vite dev server
# Горячая перезагрузка
# Source maps для отладки
# Слушает на http://localhost:5175
```

### TypeScript проверка
```bash
npx tsc --noEmit
# Проверяет типы без компиляции
# Показывает все ошибки
```

### Build (production)
```bash
npm run build
# Полная оптимизация
# Минификация CSS/JS
# Tree-shaking неиспользуемого кода
# Выход: dist/
```

### Preview production build
```bash
npm run preview
# Локальный preview production версии
# Полезно перед деплоем
```

### Линтинг (если есть ESLint)
```bash
npm run lint
# Проверка кода на ошибки/стиль
```

---

## 🌍 ДЕПЛОЙ НА РАЗНЫЕ ПЛАТФОРМЫ

### Vercel (рекомендуется)
```bash
# 1. Установить Vercel CLI
npm install -g vercel

# 2. Логиниться
vercel login

# 3. Развернуть
vercel deploy
# или для production
vercel deploy --prod
```

### GitHub Pages
```bash
# 1. Собрать проект
npm run build

# 2. Загрузить папку dist/ на GitHub
# 3. В настройках репозитория:
#    - Pages > Source > Deploy from a branch
#    - Branch > gh-pages / / root
```

### Netlify
```bash
# 1. Установить Netlify CLI
npm install -g netlify-cli

# 2. Логиниться
netlify login

# 3. Развернуть
netlify deploy --prod --dir=dist
```

### Fly.io
```bash
# 1. Установить Fly CLI
curl https://fly.io/install.sh | sh

# 2. Логиниться
flyctl auth login

# 3. Развернуть
flyctl launch
flyctl deploy
```

### Свой сервер (VPS/Dedicated)
```bash
# На локальной машине:
npm run build
# Скопировать папку dist/

# На сервере (через SSH):
scp -r dist/ user@server.com:/var/www/osinot/
# или
rsync -av dist/ user@server.com:/var/www/osinot/

# Настроить веб-сервер (Nginx, Apache)
```

### Nginx конфиг
```nginx
server {
    listen 80;
    server_name osinot.example.com;

    root /var/www/osinot;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэш для статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Не кэшировать HTML
    location ~ \.html$ {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }
}
```

---

## 📊 ПРОВЕРКА ПРОЕКТА

### Размер бандла
```bash
npm run build
# Посмотреть размер в консоли

# Детальный анализ (если установлен rollup-plugin-visualizer)
npm install --save-dev rollup-plugin-visualizer
npm run build --analyze
```

### Производительность
```bash
# Chrome DevTools
# 1. Запустить npm run dev
# 2. Открыть http://localhost:5175
# 3. F12 > Performance > Record
# 4. Взаимодействовать с приложением
# 5. Stop > Analyze

# Lighthouse
# 1. F12 > Lighthouse
# 2. Analyse page load
# 3. Посмотреть рекомендации
```

### TypeScript типы
```bash
# Полная проверка типов
npx tsc --noEmit --strict

# Специфичная папка
npx tsc --noEmit src/
```

---

## 🔄 ОБНОВЛЕНИЯ И ОБСЛУЖИВАНИЕ

### Обновить зависимости
```bash
# Посмотреть устаревшие пакеты
npm outdated

# Обновить все
npm update

# Обновить специфичный пакет
npm update react
npm update typescript

# Major обновление (осторожно!)
npm install react@latest
```

### Очистка
```bash
# Удалить node_modules
rm -rf node_modules

# Переустановить
npm install

# Или одной командой
npm ci
```

### Лог версий (git)
```bash
git log --oneline -10
git tag
git show v1.0.0
```

---

## 🐛 ОТЛАДКА И РЕШЕНИЕ ПРОБЛЕМ

### Dev сервер не запускается
```bash
# Порт занят?
# Попробуйте другой порт
npm run dev -- --port 3000

# Или найти процесс на порту 5175
lsof -i :5175
kill -9 <PID>
```

### TypeScript ошибки
```bash
# Очистить кэш
rm -rf node_modules/.vite
npm run build  # переkompilировать

# Полная переустановка
rm -rf node_modules package-lock.json
npm install
```

### Build ошибки
```bash
# Проверить версию Node
node --version
# Должна быть >= 16

# Очистить кэш npm
npm cache clean --force

# Переустановить все
rm -rf node_modules dist
npm install
npm run build
```

### CSS не применяется
```bash
# Переименовать CSS
git add -u src/styles/
npm run build
# Если всё ещё не работает, проверить:
# 1. Импорт в App.tsx
# 2. Селекторы в globals.css
# 3. Specificity конфликты
```

---

## 📈 ОПТИМИЗАЦИЯ

### Уменьшить размер bundle
```bash
# 1. Удалить неиспользуемые импорты
import { useState } from 'react'  // ✅ используется
import { ReactNode } from 'react'  // ❌ не используется, удалить

# 2. Lazy loading компонентов
const Dashboard = lazy(() => import('./Dashboard'))

# 3. Code splitting автоматически при build
# Vite делает это по умолчанию

# 4. Minify CSS/JS (автоматически в build)
npm run build
```

### Улучшить производительность
```bash
# 1. Memoize компоненты если нужно
const MemoizedDashboard = memo(Dashboard)

# 2. useCallback для функций
const handleClick = useCallback(() => {
  // ...
}, [dependencies])

# 3. Виртуализировать длинные списки (если нужно)
import { FixedSizeList } from 'react-window'
```

---

## 📋 ЧЕКЛИСТ ПЕРЕД ПРОДАКШЕНОМ

- [ ] npm run build — без ошибок
- [ ] TypeScript: npx tsc --noEmit — без ошибок
- [ ] npm run preview — всё выглядит правильно
- [ ] DevTools Console — нет ошибок/предупреждений
- [ ] Network tab — нет 404 ошибок
- [ ] Lighthouse > 80+ для всех метрик
- [ ] Тестирование на разных браузерах (Chrome, Firefox, Safari, Edge)
- [ ] Тестирование на мобильных устройствах
- [ ] Проверить все ссылки и кнопки
- [ ] HTTPS сертификат настроен
- [ ] DNS настроен правильно
- [ ] Резервные копии готовы
- [ ] Мониторинг ошибок настроен (Sentry, Rollbar)

---

## 🔒 БЕЗОПАСНОСТЬ

### Перед продакшеном
```bash
# Проверить уязвимости
npm audit

# Обновить если есть проблемы
npm audit fix

# Для критических проблем
npm audit fix --force
```

### Environment переменные
```bash
# Создать .env.local (не коммитить!)
cat > .env.local << EOF
VITE_API_URL=https://api.example.com
VITE_API_KEY=your-secret-key
EOF

# Использовать в коде
const apiUrl = import.meta.env.VITE_API_URL
```

### CORS настройка
```bash
# Если API на другом домене, настроить CORS
# На сервере добавить заголовки:
Access-Control-Allow-Origin: https://osinot.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 📦 PACKAGE.JSON СКРИПТЫ

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 🆘 ПОЛЕЗНЫЕ ССЫЛКИ

- 📖 React: https://react.dev
- 🎨 lucide-react: https://lucide.dev
- 🔄 Framer Motion: https://www.framer.com/motion
- ⚡ Vite: https://vitejs.dev
- 🔵 TypeScript: https://www.typescriptlang.org
- 🚀 Vercel: https://vercel.com

---

## 🎯 КОМАНДЫ ДЛЯ БЫСТРОГО КОПИРОВАНИЯ

```bash
# Development
npm run dev

# Production build
npm run build && npm run preview

# Type check
npx tsc --noEmit

# Deploy на Vercel
vercel deploy --prod

# All at once
npm install && npm run build
```

---

**Версия:** 1.0.0-complete  
**Статус:** 🟢 PRODUCTION READY  
**Последнее обновление:** 2024
