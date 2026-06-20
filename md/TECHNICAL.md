# 🔧 Техническая Документация OSINOT

## Стек Технологий

### Frontend

```json
{
  "react": "18.3.1",
  "typescript": "5.4.5",
  "vite": "5.1.4",
  "framer-motion": "10.16.4",
  "lucide-react": "0.292.0",
  "react-hot-toast": "2.4.1"
}
```

### Backend

```
Node.js + Express
MongoDB + Mongoose
JWT Authentication
Yookassa Payment API
OpenAI API Integration
CRON Jobs
```

## Структура Проекта

```
osinot-skeleton/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── Products.tsx
│   │   ├── Settings.tsx
│   │   ├── Subscriptions.tsx
│   │   ├── Sidebar.tsx
│   │   ├── TokenCard.tsx
│   │   └── App.tsx
│   ├── styles/
│   │   ├── design-system.css
│   │   ├── Dashboard.css
│   │   ├── Sidebar.css
│   │   ├── Settings.css
│   │   ├── Products.css
│   │   └── Subscriptions.css
│   ├── context/
│   │   └── LanguageContext.tsx
│   ├── locales/
│   │   ├── ru.ts
│   │   ├── en.ts
│   │   └── index.ts
│   ├── main.tsx
│   └── index.css
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── config/
│   ├── cron/
│   ├── app.js
│   └── server.js
├── frontend/
│   └── (legacy HTML files)
├── md/
│   ├── README.md
│   ├── COMPONENTS.md
│   └── TECHNICAL.md
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── package.json
└── .env.example
```

## Конфигурация Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    open: true,
  },
})
```

## TypeScript Конфигурация

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## NPM Scripts

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "type-check": "tsc --noEmit"
}
```

## CSS Архитектура

### Иерархия Импортов

```
main.tsx
  └── App.tsx
       ├── design-system.css        (переменные + анимации)
       ├── Dashboard.css
       ├── Sidebar.css
       ├── Settings.css
       ├── Products.css
       └── Subscriptions.css
```

### CSS Variables Система

```css
/* Dark Mode (по умолчанию) */
:root {
  --color-bg-primary: #0a0f1c;
  --color-text-primary: #f3f4f6;
  /* ... */
}

/* Light Mode */
@media (prefers-color-scheme: light) {
  :root {
    --color-bg-primary: #ffffff;
    --color-text-primary: #111827;
    /* ... */
  }
}
```

## React Context API

### LanguageContext

```typescript
interface LanguageContextType {
  language: 'ru' | 'en'
  setLanguage: (lang: 'ru' | 'en') => void
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}
```

## Компонентный Паттерн

### KPI Card Component

```typescript
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

const KPICardComponent = ({ card }: { card: KPICard }) => {
  return (
    <motion.div className={`kpi-card kpi-${card.color}`}>
      {/* Content */}
    </motion.div>
  )
}
```

## Framer Motion Animations

### KPI Card Animation

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  whileHover={{ y: -4 }}
>
  {/* Card content */}
</motion.div>
```

### Staggered Animation

```typescript
{kpiCards.map((card, idx) => (
  <motion.div
    key={card.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.05 }}
  >
    <KPICardComponent card={card} />
  </motion.div>
))}
```

## Data Flow

### State Management

```
App.tsx
  ├── Dashboard.tsx
  │   └── kpiCards (local state)
  ├── Products.tsx
  │   └── products (local state)
  ├── Settings.tsx
  │   ├── profile (local state)
  │   ├── apiTokens (local state)
  │   └── notifications (local state)
  └── Sidebar.tsx
```

## API Integration Patterns

### Будущая структура для API запросов

```typescript
// Example API calls structure
const API = {
  dashboard: {
    getKPI: async () => fetch('/api/dashboard/kpi'),
    getMetrics: async () => fetch('/api/dashboard/metrics'),
  },
  products: {
    list: async () => fetch('/api/products'),
    create: async (data) => fetch('/api/products', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => fetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id) => fetch(`/api/products/${id}`, { method: 'DELETE' }),
  },
  auth: {
    login: async (email, password) => fetch('/api/auth/login', { method: 'POST' }),
    logout: async () => fetch('/api/auth/logout', { method: 'POST' }),
  },
}
```

## Error Handling

### Try-Catch Pattern

```typescript
try {
  const response = await fetch('/api/endpoint')
  const data = await response.json()
  return data
} catch (error) {
  console.error('API Error:', error)
  toast.error('Ошибка при загрузке данных')
}
```

### Toast Notifications

```typescript
import toast from 'react-hot-toast'

// Success
toast.success('Данные сохранены!')

// Error
toast.error('Что-то пошло не так')

// Loading
const id = toast.loading('Загрузка...')
toast.dismiss(id)
```

## Responsive Design

### Media Queries

```css
/* Desktop */
@media (min-width: 1440px) {
  .kpi-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Laptop */
@media (max-width: 1440px) {
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Tablet */
@media (max-width: 1024px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile */
@media (max-width: 640px) {
  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
```

## Performance Optimization

### Code Splitting

```typescript
const Dashboard = lazy(() => import('./components/Dashboard'))
const Products = lazy(() => import('./components/Products'))

<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

### Memoization

```typescript
const KPICardComponent = memo(({ card }: { card: KPICard }) => {
  // Компонент не будет пересчитываться если props не изменились
  return (...)
})
```

## Локализация (i18n)

### Структура Переводов

```typescript
// locales/ru.ts
export const ru = {
  dashboard: {
    title: 'Дашборд',
    orders: 'Заказы',
    sales: 'Продажи',
  },
  // ...
}

// locales/en.ts
export const en = {
  dashboard: {
    title: 'Dashboard',
    orders: 'Orders',
    sales: 'Sales',
  },
  // ...
}
```

## Testing Strategy

### Unit Tests (Jest)
```typescript
describe('KPICardComponent', () => {
  it('should render card with correct title', () => {
    render(<KPICardComponent card={mockCard} />)
    expect(screen.getByText('Заказы')).toBeInTheDocument()
  })
})
```

### Integration Tests
```typescript
describe('Dashboard', () => {
  it('should fetch and display KPI cards', async () => {
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('1,614')).toBeInTheDocument()
    })
  })
})
```

## Environment Variables

### .env.example

```
VITE_API_URL=http://localhost:3000/api
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true
VITE_PAYMENT_PUBLIC_KEY=your_yookassa_key
```

## Build Output

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other assets]
└── manifest.json
```

## Deployment Checklist

- [ ] Проверить TypeScript ошибки: `npm run type-check`
- [ ] Проверить консоль браузера на ошибки
- [ ] Протестировать все навигационные ссылки
- [ ] Проверить адаптивность на мобильных устройствах
- [ ] Проверить тёмный/светлый режим
- [ ] Убедиться что все изображения загружаются
- [ ] Проверить производительность (Lighthouse)
- [ ] Минимизировать бандл (Code splitting)
- [ ] Настроить CI/CD

## Troubleshooting

### Hot Module Replacement (HMR) не работает
```bash
# Перезагрузить страницу или
npm run dev
```

### CSS не применяется
```bash
# Очистить кеш браузера
# Ctrl+Shift+R (полная перезагрузка)
```

### Import ошибки
```typescript
// Убедиться что используется правильный alias
import { Component } from '@/components/Component'
// Не
import { Component } from './components/Component'
```

## Git Workflow

```bash
# Feature branch
git checkout -b feature/component-name

# Commit changes
git commit -m "feat: add new component"

# Push
git push origin feature/component-name

# Pull Request
```

---

**Версия**: 1.0.0  
**Последнее обновление**: 11 апреля 2026  
**Статус**: 🟢 Production Ready
