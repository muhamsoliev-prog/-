# ✅ API ТОКЕНЫ В SETTINGS — ОБНОВЛЕНО

**Дата обновления:** 12 апреля 2026  
**Файл:** `src/components/Settings.tsx`  
**Статус:** ✅ Готово, 0 TypeScript ошибок

---

## 🔑 СТРУКТУРА API ТОКЕНОВ

### 6 токенов WB с разными цветами и описаниями

```javascript
const tokens = [
  { 
    id: 'statistics',  
    label: 'Статистика',    
    icon: BarChart2,  
    color: '#00D084',      // Зелёный
    desc: 'Заказы • Продажи • Остатки • Возвраты' 
  },
  { 
    id: 'analytics',  
    label: 'Аналитика',     
    icon: TrendingUp, 
    color: '#58A6FF',      // Голубой
    desc: 'Воронка продаж • NM-отчёт по артикулам' 
  },
  { 
    id: 'finance',    
    label: 'Финансы',        
    icon: Wallet,     
    color: '#FFB830',      // Оранжевый
    desc: 'Комиссии WB • Логистика • Хранение • Штрафы' 
  },
  { 
    id: 'content',    
    label: 'Контент',        
    icon: Image,      
    color: '#A371F7',      // Фиолетовый
    desc: 'Карточки товаров • Фотографии' 
  },
  { 
    id: 'prices',     
    label: 'Цены и скидки',  
    icon: Tag,        
    color: '#FF6B6B',      // Красный
    desc: 'Текущие цены • Установка скидок' 
  },
  { 
    id: 'advert',     
    label: 'Реклама',        
    icon: Megaphone,  
    color: '#FFB830',      // Оранжевый
    desc: 'Расходы на кампании • Ставки • CPM' 
  },
]
```

---

## 🎨 СТИЛЬ КАЖДОЙ КАРТОЧКИ ТОКЕНА

### Размер и внешний вид
```tsx
// До: просто grid карточек
// Теперь: каждая карточка имеет:

{
  background: 'var(--bg-card)',           // #161B22
  border: state.status === 'active' 
    ? `3px solid ${token.color}`          // 3px граница цвета когда активен
    : '1px solid var(--border-card)',     // 1px серая граница когда не активен
  borderRadius: 'var(--radius-lg)',       // 14px скругление
  padding: '20px',                        // 20px отступ внутри
  transition: 'all 0.2s ease',            // Плавный переход
}
```

### Компоненты карточки

1. **Заголовок** (top)
   - Icon (40×40px) с полупрозрачным фоном цвета токена
   - Label: "Статистика", "Аналитика", и т.д.
   - Description: "Заказы • Продажи • Остатки • Возвраты"

2. **Input** (middle)
   - type="password" (скрывает токен по умолчанию)
   - Placeholder: "Введите API токен..."
   - Кнопка Eye/EyeOff справа для показа/скрытия

3. **Check Button** (action)
   - Текст: "Проверить"
   - Цвет при нажатии выполняет валидацию:
     ```tsx
     // Имитация проверки (в реальности запрос к API)
     status: state.value.length > 10 ? 'active' : 'error'
     ```
   - Background: серый если поле пусто, цветной когда активен

4. **Status Indicator** (bottom)
   - Цветная точка (8×8px):
     - 🟢 Зелёная если status === 'active'
     - 🔴 Красная если status === 'error'
     - ⚫ Серая если status === 'empty'
   - Текст рядом:
     - "✓ Активен" (зелёный)
     - "✗ Ошибка" (красный)
     - "○ Не добавлен" (серый)

5. **Last Sync** (footer, только если был синхрон)
   - Время в формате HH:MM
   - Пример: "Синхр: 14:32"

---

## 📊 СОСТОЯНИЯ ТОКЕНА

```javascript
const [tokenStates, setTokenStates] = useState<Record<string, {
  value: string                          // Сам токен (пароль)
  visible: boolean                       // Показан/скрыт
  status: 'empty' | 'active' | 'error'   // Статус
  lastSync?: string                      // Время синхро (опционально)
}>>()
```

### Переходы между статусами

```
EMPTY (○ Не добавлен, серый)
  ↓
User вводит токен
  ↓
User нажимает "Проверить"
  ↓
API запрос к /api/wb/validate/{tokenType}
  ↓
ACTIVE (✓ Активен, 🟢 зелёный) ИЛИ ERROR (✗ Ошибка, 🔴 красный)
  ↓
Сохраняется lastSync время
```

---

## 🔗 API ИНТЕГРАЦИЯ

### Текущая реализация (имитация)
```tsx
onClick={() => {
  if (state.value) {
    setTokenStates({
      ...tokenStates,
      [token.id]: {
        ...state,
        status: state.value.length > 10 ? 'active' : 'error',
        lastSync: new Date().toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }
    })
  }
}}
```

### Будущая реализация (реальный API)
```tsx
// Вместо проверки длины, сделать запрос:
const response = await fetch('/api/wb/validate/' + token.id, {
  method: 'POST',
  body: JSON.stringify({ token: state.value })
})

const isValid = response.ok
setTokenStates({
  ...tokenStates,
  [token.id]: {
    ...state,
    status: isValid ? 'active' : 'error',
    lastSync: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }
})
```

---

## 🎯 ИСПОЛЬЗОВАНИЕ

### В Settings странице

```tsx
// Импорты
import { Eye, EyeOff, BarChart2, TrendingUp, Wallet, Image, Tag, Megaphone } from 'lucide-react'

// Данные
const tokens = [ /* 6 токенов как выше */ ]

// State
const [tokenStates, setTokenStates] = useState({ /* начальные значения */ })

// Рендер
{tokens.map((token, index) => (
  <motion.div key={token.id} /* сама карточка */>
    {/* Header с иконкой и описанием */}
    {/* Input с Eye toggle */}
    {/* Check Button */}
    {/* Status Indicator */}
    {/* Last Sync */}
  </motion.div>
))}
```

---

## 📋 ИЗМЕНЕНИЯ В ФАЙЛЕ

### src/components/Settings.tsx

**Удалено:**
- ❌ Импорт `TokenCard` компонента
- ❌ `wbTokens` массив со старой структурой

**Добавлено:**
- ✅ Импорт иконок: `Eye`, `EyeOff`, `BarChart2`, `TrendingUp`, `Wallet`, `Image`, `Tag`, `Megaphone`
- ✅ `tokens` массив с 6 новыми токенами (id, label, icon, color, desc)
- ✅ `tokenStates` useState для отслеживания state каждого токена
- ✅ Полная переделка секции "Токены Wildberries API" с индивидуальными карточками

**Результат:**
- ✅ Каждый токен отображается в собственной карточке
- ✅ Свой цвет для каждого типа
- ✅ Password input с toggle видимости
- ✅ Check button для проверки токена
- ✅ Status indicator с точкой и текстом
- ✅ Время последней синхронизации

---

## 🚀 КАК ЗАПУСТИТЬ И ПРОВЕРИТЬ

```bash
# Build проект
npm run build

# Dev сервер
npm run dev

# Открыть http://localhost:5175
# Перейти на вкладку Settings
# Проверить секцию "Токены Wildberries API"
```

---

## ✅ СТАТУС

- [x] Settings.tsx обновлён
- [x] 6 новых токенов добавлены
- [x] Цвета для каждого токена установлены
- [x] Password input с toggle реализован
- [x] Check button работает
- [x] Status indicator работает
- [x] Last sync display работает
- [x] 0 TypeScript ошибок
- [x] Build проходит успешно

---

**Версия:** 1.0.0-updated  
**Дата:** 12 апреля 2026  
**Статус:** ✅ READY
