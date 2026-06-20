# 🌐 Руководство по локализации OSINOT

## Как использовать локализацию в компонентах

### 1. Импорт необходимых модулей

```typescript
import { useLanguage } from '@/context/LanguageContext'
import { useTranslations, formatCurrency, formatNumber, formatDate } from '@/locales'
```

### 2. Получение текущего языка и переводов

```typescript
export const MyComponent = () => {
  // Получить текущий язык и функцию для изменения
  const { language, setLanguage } = useLanguage()
  
  // Получить переводы для текущего языка
  const t = useTranslations(language)
  
  return (
    <div>
      <h1>{t.dashboard.revenue}</h1> {/* "Выручка" */}
      <p>Язык: {language}</p>
    </div>
  )
}
```

### 3. Форматирование чисел

```typescript
const amount = 1255176

// Форматирование чисел по языку
formatNumber(amount, language)
// ru: "1 255 176"
// en: "1,255,176"
// zh: "1255176"
// tg: "1 255 176"

// Форматирование денег с валютой
formatCurrency(amount, language)
// ru: "1 255 176 ₽"
// en: "$1,255,176"
// zh: "¥1255176"
// tg: "1 255 176 сўм"
```

### 4. Форматирование дат

```typescript
const date = new Date()

formatDate(date, language)
// ru: "1 апреля 2024"
// en: "April 1, 2024"
// zh: "2024年4月1日"
// tg: "1 апрелӣ 2024"
```

### 5. Переключение языка в компоненте

```typescript
const { language, setLanguage } = useLanguage()

// Переключить на английский
<button onClick={() => setLanguage('en')}>
  English
</button>
```

---

## Структура переводов

Переводы организованы по разделам:

```typescript
translations = {
  ru: {
    sidebar: { ... },      // Меню навигации
    dashboard: { ... },    // Дашборд
    products: { ... },     // Товары
    costPrice: { ... },    // Себестоимость
    deductions: { ... },   // Удержания
    payouts: { ... },      // Выплаты
    settings: { ... }      // Настройки
  },
  en: { ... },
  zh: { ... },
  tg: { ... }
}
```

### Примеры использования

```typescript
// Русский
t.sidebar.dashboard        // "Дашборд"
t.products.search          // "Поиск по названию или SKU"
t.settings.emailNotif      // "Email уведомления"

// English
t.dashboard.revenue        // "Revenue"
t.deductions.commission    // "Commission"
t.payouts.download         // "Download Report"
```

---

## Добавление новых переводов

### 1. Откройте файл `src/locales/index.ts`

### 2. Добавьте новый раздел в объект `translations`

```typescript
export const translations = {
  ru: {
    // ... существующие разделы
    myNewSection: {
      title: 'Название',
      description: 'Описание',
      button: 'Кнопка'
    }
  },
  en: {
    // ... существующие разделы
    myNewSection: {
      title: 'Title',
      description: 'Description',
      button: 'Button'
    }
  },
  // Добавьте на все 4 языка!
  zh: { /* ... */ },
  tg: { /* ... */ }
}
```

### 3. Используйте в компоненте

```typescript
const t = useTranslations(language)
const text = t.myNewSection.title
```

---

## Изменение языка по умолчанию

### В файле `src/context/LanguageContext.tsx`

```typescript
const [language, setLanguageState] = useState<Language>(() => {
  const saved = localStorage.getItem('language') as Language | null
  return saved || 'ru'  // ← Измените на нужный язык
})
```

### Доступные языки по умолчанию:
- `'ru'` - Русский (текущее значение)
- `'en'` - English
- `'zh'` - 中文
- `'tg'` - Тоҷикӣ

---

## Типы и интерфейсы

```typescript
// Тип для языка
type Language = 'ru' | 'en' | 'zh' | 'tg'

// Контекст языка
interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

// Переводы по компонентам
interface Translations {
  sidebar: SidebarTranslations
  dashboard: DashboardTranslations
  products: ProductsTranslations
  // ... и т.д.
}
```

---

## Примеры использования в реальных компонентах

### Dashboard

```typescript
import { useLanguage } from '@/context/LanguageContext'
import { useTranslations, formatCurrency } from '@/locales'

export default function Dashboard() {
  const { language } = useLanguage()
  const t = useTranslations(language)

  return (
    <div>
      <h1>{t.dashboard.revenue}</h1>
      <p>{formatCurrency(1255176, language)} ₽</p>
    </div>
  )
}
```

### Products

```typescript
export const Products = () => {
  const { language } = useLanguage()
  const t = useTranslations(language)

  return (
    <div>
      <input 
        placeholder={t.products.search}
      />
      <table>
        <thead>
          <tr>
            <th>{t.products.name}</th>
            <th>{t.products.sku}</th>
            <th>{t.products.stock}</th>
            <th>{t.products.price}</th>
          </tr>
        </thead>
      </table>
    </div>
  )
}
```

### Settings

```typescript
export const Settings = () => {
  const { language, setLanguage } = useLanguage()
  const t = useTranslations(language)
  
  const languages = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'tg', name: 'Тоҷикӣ', flag: '🇹🇯' }
  ]

  return (
    <div>
      <h2>{t.settings.language}</h2>
      <div className="language-grid">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code as Language)}
            className={language === lang.code ? 'active' : ''}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## Хранение языка в localStorage

Выбранный язык автоматически сохраняется в `localStorage`:

```javascript
// При выборе языка в Settings
localStorage.setItem('language', 'en')

// При загрузке страницы восстанавливается
const saved = localStorage.getItem('language') // 'en'
```

### Очистка языка

```javascript
// Вернуть на русский (значение по умолчанию)
localStorage.removeItem('language')

// Или явно установить
localStorage.setItem('language', 'ru')
```

---

## Форматирование по локали

### Русский (ru)
```
Число:    1 255 176     (пробел как разделитель)
Деньги:   1 255 176 ₽  (рубль)
Дата:     1 апреля 2024
```

### English (en)
```
Число:    1,255,176     (запятая как разделитель)
Деньги:   $1,255,176    (доллар)
Дата:     April 1, 2024
```

### 中文 (zh - Китайский)
```
Число:    1255176       (без разделителя)
Деньги:   ¥1255176      (юань)
Дата:     2024年4月1日
```

### Тоҷикӣ (tg - Таджикский)
```
Число:    1 255 176     (пробел как разделитель)
Деньги:   1 255 176 сўм (сўм - таджикская валюта)
Дата:     1 апрелӣ 2024
```

---

## Отладка локализации

### Проверить текущий язык в консоли

```javascript
// В компоненте с useLanguage
const { language } = useLanguage()
console.log('Current language:', language)
```

### Проверить переводы

```javascript
// Импортируйте в консоли браузера
import { translations } from '@/locales'
console.log(translations.ru.dashboard)
// Выведет все переводы раздела dashboard
```

### Проверить localStorage

```javascript
// В консоли браузера
localStorage.getItem('language') // 'ru'
```

---

## Миграция существующих компонентов

Если у вас уже есть компоненты с захардкодированными текстами, вот как их обновить:

### ❌ ДО (захардкодированные тексты)
```typescript
<h2>Выручка</h2>
<p>Поиск по названию или SKU</p>
<button>Сохранить</button>
```

### ✅ ПОСЛЕ (с локализацией)
```typescript
import { useLanguage } from '@/context/LanguageContext'
import { useTranslations } from '@/locales'

export const MyComponent = () => {
  const { language } = useLanguage()
  const t = useTranslations(language)

  return (
    <>
      <h2>{t.dashboard.revenue}</h2>
      <p>{t.products.search}</p>
      <button>{t.settings.save}</button>
    </>
  )
}
```

---

## Контрольный список

- [ ] Импортированы `useLanguage` и `useTranslations`
- [ ] Получены `language` и `t` в компоненте
- [ ] Все текстовые строки заменены на `t.section.key`
- [ ] Числа форматируются с `formatNumber` или `formatCurrency`
- [ ] Даты форматируются с `formatDate`
- [ ] Тестирование на всех 4 языках
- [ ] Переводы добавлены в `src/locales/index.ts`
- [ ] TypeScript ошибок нет

---

## Полезные ссылки

- Файл переводов: `src/locales/index.ts`
- Контекст языка: `src/context/LanguageContext.tsx`
- Компонент Settings: `src/components/Settings.tsx`
- Документация данных: `DATA_VALIDATION.md`

---

## Поддержка и вопросы

Если нужно:
1. ✅ Добавить новый язык - добавьте объект в `translations`
2. ✅ Изменить переводы - отредактируйте `src/locales/index.ts`
3. ✅ Форматировать число - используйте `formatNumber(num, language)`
4. ✅ Переключить язык - вызовите `setLanguage('en')`

Удачи! 🚀
