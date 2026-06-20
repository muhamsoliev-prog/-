import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  ShoppingCart, TrendingUp, TrendingDown, Percent, DollarSign,
  BarChart3, AlertTriangle, Wallet, Package, RefreshCw, Truck, Tag,
} from 'lucide-react'
import { KPICard } from '../components/KPICard'

// ── Мок данные ──────────────────────────────────────────────────────────────

const chartData30 = [
  { day: '1 апр', revenue: 142000, expenses: 58000, profit: 84000 },
  { day: '5 апр', revenue: 168000, expenses: 64000, profit: 104000 },
  { day: '10 апр', revenue: 155000, expenses: 60000, profit: 95000 },
  { day: '15 апр', revenue: 193000, expenses: 70000, profit: 123000 },
  { day: '20 апр', revenue: 221000, expenses: 78000, profit: 143000 },
  { day: '25 апр', revenue: 187000, expenses: 68000, profit: 119000 },
  { day: '30 апр', revenue: 245000, expenses: 88000, profit: 157000 },
]

const chartData7 = [
  { day: 'Пн', revenue: 38000, expenses: 14000, profit: 24000 },
  { day: 'Вт', revenue: 42000, expenses: 16000, profit: 26000 },
  { day: 'Ср', revenue: 35000, expenses: 13000, profit: 22000 },
  { day: 'Чт', revenue: 51000, expenses: 19000, profit: 32000 },
  { day: 'Пт', revenue: 67000, expenses: 24000, profit: 43000 },
  { day: 'Сб', revenue: 78000, expenses: 28000, profit: 50000 },
  { day: 'Вс', revenue: 55000, expenses: 20000, profit: 35000 },
]

const chartData90 = Array.from({ length: 12 }, (_, i) => ({
  day: `${(i + 1) * 7} дн`,
  revenue: 120000 + Math.random() * 200000,
  expenses: 45000 + Math.random() * 80000,
  profit: 60000 + Math.random() * 140000,
}))

const fmt = (n: number) => '₽ ' + Math.round(n).toLocaleString('ru-RU')

// ── Компонент ────────────────────────────────────────────────────────────────

const PAGE_BG  = '#0A0A0B'
const CARD_BG  = '#111113'
const BORDER   = 'rgba(255,255,255,0.06)'
const TEXT1    = '#F0F0F5'
const TEXT2    = '#8B8B9A'

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number; name: string }[]; label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '12px 16px', fontSize: 13 }}>
      <p style={{ color: TEXT2, margin: '0 0 8px 0' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: '4px 0', color: TEXT1 }}>
          <span style={{ color: TEXT2, marginRight: 8 }}>
            {p.name === 'revenue' ? 'Выручка' : p.name === 'expenses' ? 'Расходы' : 'Прибыль'}:
          </span>
          {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)

  const chartData = period === 7 ? chartData7 : period === 30 ? chartData30 : chartData90

  const kpiRow1 = [
    { title: 'Выручка',   value: fmt(1_311_000), change: 12.4,  subtitle: `за ${period} дней`, icon: DollarSign,   color: '#00D084', bgColor: 'rgba(0,208,132,0.12)',   borderColor: 'rgba(0,208,132,0.2)' },
    { title: 'Заказы',    value: '1 847',         change: 8.1,   subtitle: 'штук',              icon: ShoppingCart, color: '#06B6D4', bgColor: 'rgba(6,182,212,0.12)',   borderColor: 'rgba(6,182,212,0.2)' },
    { title: 'Продажи',   value: '1 523',         change: 6.9,   subtitle: 'завершены',          icon: TrendingUp,   color: '#7EE787', bgColor: 'rgba(126,231,135,0.12)', borderColor: 'rgba(126,231,135,0.2)' },
    { title: 'Возвраты',  value: fmt(87_400),     change: -3.2,  subtitle: 'сумма',              icon: TrendingDown, color: '#FF6B6B', bgColor: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.2)' },
  ]

  const kpiRow2 = [
    { title: 'Выплачено WB',   value: fmt(743_000),  change: 5.6,  subtitle: 'на счёт',        icon: Wallet,       color: '#00D084', bgColor: 'rgba(0,208,132,0.12)' },
    { title: 'Комиссия WB',    value: fmt(183_500),  change: -1.2, subtitle: '14% от выручки', icon: Percent,      color: '#FFB830', bgColor: 'rgba(255,184,48,0.12)' },
    { title: 'Логистика',      value: fmt(96_800),   change: 2.3,  subtitle: 'доставка',        icon: Truck,        color: '#58A6FF', bgColor: 'rgba(88,166,255,0.12)' },
    { title: 'Хранение',       value: fmt(34_200),   change: 7.1,  subtitle: 'склад WB',        icon: Package,      color: '#A78BFA', bgColor: 'rgba(167,139,250,0.12)' },
  ]

  const kpiRow3 = [
    { title: 'Штрафы',        value: fmt(12_400),   change: -15.3, subtitle: 'WB',              icon: AlertTriangle, color: '#FF6B6B', bgColor: 'rgba(255,107,107,0.12)' },
    { title: 'Реклама',       value: fmt(58_000),   change: 22.1,  subtitle: 'кампании',        icon: BarChart3,     color: '#F97316', bgColor: 'rgba(249,115,22,0.12)' },
    { title: 'Себестоимость', value: fmt(389_000),  change: 3.4,   subtitle: 'закупка',         icon: Tag,           color: '#A8B3CF', bgColor: 'rgba(168,179,207,0.12)' },
    { title: 'Чистая прибыль',value: fmt(296_000),  change: 18.7,  subtitle: 'после налогов',   icon: TrendingUp,    color: '#00D084', bgColor: 'rgba(0,208,132,0.15)', borderColor: 'rgba(0,208,132,0.35)' },
  ]

  return (
    <div style={{ padding: '28px 32px', background: PAGE_BG, minHeight: '100%' }}>

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT1 }}>Дашборд</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: TEXT2 }}>
            Аналитика за последние {period} дней
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {([7, 30, 90] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: period === p ? '#00D084' : CARD_BG,
                color: period === p ? '#000' : TEXT2,
                border: `1px solid ${period === p ? '#00D084' : BORDER}`,
              }}
            >
              {p}д
            </button>
          ))}
          <button
            style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', background: CARD_BG, color: TEXT2,
              border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <RefreshCw size={14} /> Обновить
          </button>
        </div>
      </motion.div>

      {/* KPI ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
        {kpiRow1.map((card, i) => <KPICard key={card.title} {...card} index={i} />)}
      </div>

      {/* KPI ROW 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
        {kpiRow2.map((card, i) => <KPICard key={card.title} {...card} index={i + 4} />)}
      </div>

      {/* KPI ROW 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        {kpiRow3.map((card, i) => <KPICard key={card.title} {...card} index={i + 8} />)}
      </div>

      {/* CHART */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          background: CARD_BG, border: `1px solid ${BORDER}`,
          borderRadius: 16, padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: TEXT1 }}>
              Динамика выручки и прибыли
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: TEXT2 }}>
              Выручка · Расходы · Прибыль
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { color: '#00D084', label: 'Выручка' },
              { color: '#FF6B6B', label: 'Расходы' },
              { color: '#58A6FF', label: 'Прибыль' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TEXT2 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00D084" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#00D084" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#FF6B6B" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#58A6FF" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#58A6FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="day" tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue"  stroke="#00D084" strokeWidth={2} fill="url(#gradRevenue)" />
            <Area type="monotone" dataKey="expenses" stroke="#FF6B6B" strokeWidth={2} fill="url(#gradExpenses)" />
            <Area type="monotone" dataKey="profit"   stroke="#58A6FF" strokeWidth={2} fill="url(#gradProfit)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

    </div>
  )
}
