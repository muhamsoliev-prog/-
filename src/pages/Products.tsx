import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, Download, ChevronUp, ChevronDown, Star } from 'lucide-react'

const PAGE_BG = '#0A0A0B'
const CARD_BG  = '#111113'
const BORDER   = 'rgba(255,255,255,0.06)'
const TEXT1    = '#F0F0F5'
const TEXT2    = '#8B8B9A'

interface Product {
  id: number
  sku: string
  name: string
  category: string
  stock: number
  price: number
  orders: number
  revenue: number
  margin: number
  profit: number
  rating: number
}

const MOCK: Product[] = [
  { id: 1,  sku: 'WB-10041', name: 'Термокружка 500мл нержавеющая сталь', category: 'Посуда',     stock: 247, price: 1490, orders: 892, revenue: 1329080, margin: 38, profit: 504650, rating: 4.9 },
  { id: 2,  sku: 'WB-20183', name: 'Рюкзак городской 30л водонепроницаемый', category: 'Сумки',  stock: 89,  price: 3200, orders: 543, revenue: 1737600, margin: 42, profit: 729792, rating: 4.7 },
  { id: 3,  sku: 'WB-30017', name: 'Беспроводные наушники Bluetooth 5.0',  category: 'Электроника', stock: 156, price: 2890, orders: 1204, revenue: 3479560, margin: 35, profit: 1217846, rating: 4.6 },
  { id: 4,  sku: 'WB-40092', name: 'Органайзер для документов A4',        category: 'Канцелярия', stock: 512, price: 890,  orders: 2341, revenue: 2083490, margin: 55, profit: 1145920, rating: 4.8 },
  { id: 5,  sku: 'WB-50234', name: 'Кроссовки беговые мужские р.42',      category: 'Обувь',      stock: 34,  price: 4500, orders: 312,  revenue: 1404000, margin: 28, profit: 393120, rating: 4.5 },
  { id: 6,  sku: 'WB-60011', name: 'Набор отвёрток 12 предметов',          category: 'Инструменты', stock: 731, price: 1200, orders: 678,  revenue: 813600,  margin: 47, profit: 382392, rating: 4.7 },
  { id: 7,  sku: 'WB-70156', name: 'Йогамат 6мм TPE антискользящий',     category: 'Спорт',       stock: 203, price: 2100, orders: 445,  revenue: 934500,  margin: 44, profit: 411180, rating: 4.9 },
  { id: 8,  sku: 'WB-80043', name: 'Умная лампа E27 RGB WiFi 10W',        category: 'Электроника', stock: 89,  price: 890,  orders: 1567, revenue: 1394630, margin: 40, profit: 557852, rating: 4.4 },
  { id: 9,  sku: 'WB-90218', name: 'Детская пирамидка деревянная 10 колец', category: 'Игрушки',  stock: 445, price: 650,  orders: 2890, revenue: 1878500, margin: 62, profit: 1164670, rating: 5.0 },
  { id: 10, sku: 'WB-10319', name: 'Фитнес-браслет с пульсометром IP68',   category: 'Электроника', stock: 67,  price: 3490, orders: 234,  revenue: 816660,  margin: 31, profit: 253165, rating: 4.3 },
]

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽'
const CATEGORIES = ['Все категории', ...Array.from(new Set(MOCK.map(p => p.category)))]

type SortKey = keyof Pick<Product, 'revenue' | 'orders' | 'margin' | 'profit' | 'stock'>
type SortDir = 'asc' | 'desc'

export default function Products() {
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('Все категории')
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const rows = useMemo(() => MOCK
    .filter(p =>
      (category === 'Все категории' || p.category === category) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
       p.sku.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]),
    [search, category, sortKey, sortDir]
  )

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? null :
    sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />

  const ColHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      onClick={() => handleSort(col)}
      style={{ padding: '11px 14px', textAlign: 'right', color: TEXT2, fontSize: 11,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
        {label} <SortIcon col={col} />
      </span>
    </th>
  )

  return (
    <div style={{ padding: '28px 32px', background: PAGE_BG, minHeight: '100%' }}>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT1 }}>Товары</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: TEXT2 }}>
            {rows.length} из {MOCK.length} товаров
          </p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '9px 18px', borderRadius: 9, background: '#00D084',
          color: '#000', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          <Download size={14} /> Экспорт
        </button>
      </motion.div>

      {/* FILTERS */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          background: CARD_BG, border: `1px solid ${BORDER}`,
          borderRadius: 10, padding: '0 14px',
        }}>
          <Search size={15} style={{ color: TEXT2, flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или артикулу..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: TEXT1, fontSize: 13, padding: '10px 0' }}
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ padding: '10px 14px', background: CARD_BG, border: `1px solid ${BORDER}`,
            borderRadius: 10, color: TEXT1, fontSize: 13, cursor: 'pointer', outline: 'none' }}
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px',
          background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
          color: TEXT2, fontSize: 13, cursor: 'pointer',
        }}>
          <Filter size={14} /> Фильтры
        </button>
      </motion.div>

      {/* TABLE */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#0E0E10' }}>
                <th style={{ padding: '11px 14px', textAlign: 'left', color: TEXT2, fontSize: 11,
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Товар</th>
                <th style={{ padding: '11px 14px', textAlign: 'left', color: TEXT2, fontSize: 11,
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Категория</th>
                <ColHeader col="stock"   label="Остаток" />
                <ColHeader col="orders"  label="Заказы" />
                <ColHeader col="revenue" label="Выручка" />
                <ColHeader col="margin"  label="Маржа" />
                <ColHeader col="profit"  label="Прибыль" />
                <th style={{ padding: '11px 14px', textAlign: 'right', color: TEXT2, fontSize: 11,
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Рейтинг</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, idx) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  style={{ borderBottom: `1px solid ${BORDER}`, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 14px' }}>
                    <div style={{ fontWeight: 600, color: TEXT1, marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: TEXT2 }}>{p.sku}</div>
                  </td>
                  <td style={{ padding: '13px 14px' }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: 5, fontSize: 11, fontWeight: 500,
                      background: 'rgba(255,255,255,0.05)', color: TEXT2,
                    }}>{p.category}</span>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right',
                    color: p.stock < 50 ? '#FF6B6B' : p.stock < 100 ? '#FFB830' : TEXT1,
                    fontWeight: p.stock < 100 ? 600 : 400 }}>
                    {p.stock} шт.
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', color: TEXT1 }}>
                    {p.orders.toLocaleString('ru-RU')}
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right', color: TEXT1, fontWeight: 500 }}>
                    {fmt(p.revenue)}
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                    <span style={{
                      fontWeight: 700,
                      color: p.margin >= 40 ? '#00D084' : p.margin >= 25 ? '#FFB830' : '#FF6B6B',
                    }}>
                      {p.margin}%
                    </span>
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right',
                    color: p.profit > 0 ? '#00D084' : '#FF6B6B', fontWeight: 600 }}>
                    {fmt(p.profit)}
                  </td>
                  <td style={{ padding: '13px 14px', textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#FFB830', fontWeight: 600 }}>
                      <Star size={11} fill="#FFB830" /> {p.rating}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div style={{ padding: '60px 0', textAlign: 'center', color: TEXT2 }}>
            Товары не найдены
          </div>
        )}
      </motion.div>

    </div>
  )
}
