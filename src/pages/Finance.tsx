import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Percent } from 'lucide-react'

const PAGE_BG = '#0A0A0B'
const CARD_BG  = '#111113'
const BORDER   = 'rgba(255,255,255,0.06)'
const TEXT1    = '#F0F0F5'
const TEXT2    = '#8B8B9A'

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽'

const MONTHLY = [
  { month: 'Ноябрь', revenue: 1_820_000, wb: 640_000, logistics: 142_000, storage: 28_000,
    penalties: 8_000,  ads: 45_000, cogs: 520_000, tax: 70_000, net: 367_000 },
  { month: 'Декабрь', revenue: 2_340_000, wb: 820_000, logistics: 198_000, storage: 41_000,
    penalties: 12_000, ads: 68_000, cogs: 670_000, tax: 90_000, net: 441_000 },
  { month: 'Январь',  revenue: 1_560_000, wb: 540_000, logistics: 118_000, storage: 22_000,
    penalties: 5_000,  ads: 38_000, cogs: 445_000, tax: 59_000, net: 333_000 },
  { month: 'Февраль', revenue: 1_780_000, wb: 620_000, logistics: 134_000, storage: 25_000,
    penalties: 7_000,  ads: 52_000, cogs: 510_000, tax: 68_000, net: 364_000 },
  { month: 'Март',    revenue: 2_120_000, wb: 740_000, logistics: 162_000, storage: 32_000,
    penalties: 9_000,  ads: 61_000, cogs: 606_000, tax: 81_000, net: 429_000 },
  { month: 'Апрель',  revenue: 1_960_000, wb: 686_000, logistics: 148_000, storage: 29_000,
    penalties: 8_000,  ads: 57_000, cogs: 560_000, tax: 75_000, net: 397_000 },
]

const CHART_DATA = MONTHLY.map(m => ({
  month: m.month,
  revenue: Math.round(m.revenue / 1000),
  expenses: Math.round((m.wb + m.logistics + m.storage + m.penalties + m.ads + m.cogs) / 1000),
  net: Math.round(m.net / 1000),
}))

const CURRENT = MONTHLY[MONTHLY.length - 1]
const PREV    = MONTHLY[MONTHLY.length - 2]
const pct = (a: number, b: number) => (((a - b) / b) * 100).toFixed(1)

const SUMMARY_CARDS = [
  {
    label: 'Выручка',     value: fmt(CURRENT.revenue),
    change: +Number(pct(CURRENT.revenue, PREV.revenue)),
    icon: TrendingUp,  color: '#00D084', bg: 'rgba(0,208,132,0.12)',
  },
  {
    label: 'Расходы WB',  value: fmt(CURRENT.wb + CURRENT.logistics + CURRENT.storage + CURRENT.penalties),
    change: +Number(pct(CURRENT.wb + CURRENT.logistics, PREV.wb + PREV.logistics)),
    icon: TrendingDown, color: '#FF6B6B', bg: 'rgba(255,107,107,0.12)',
  },
  {
    label: 'Выплачено',   value: fmt(CURRENT.revenue - CURRENT.wb - CURRENT.logistics - CURRENT.storage - CURRENT.penalties),
    change: +Number(pct(CURRENT.revenue - CURRENT.wb, PREV.revenue - PREV.wb)),
    icon: Wallet,       color: '#58A6FF', bg: 'rgba(88,166,255,0.12)',
  },
  {
    label: 'Чистая прибыль', value: fmt(CURRENT.net),
    change: +Number(pct(CURRENT.net, PREV.net)),
    icon: Percent,      color: '#00D084', bg: 'rgba(0,208,132,0.15)',
  },
]

const PL_ROWS = [
  { label: 'Выручка от продаж',       value: CURRENT.revenue,  type: 'income',  indent: 0 },
  { label: '  Комиссия WB',           value: -CURRENT.wb,      type: 'expense', indent: 1 },
  { label: '  Логистика',             value: -CURRENT.logistics, type: 'expense', indent: 1 },
  { label: '  Хранение',              value: -CURRENT.storage, type: 'expense', indent: 1 },
  { label: '  Штрафы',                value: -CURRENT.penalties, type: 'expense', indent: 1 },
  { label: 'ИТОГО удержания WB',      value: -(CURRENT.wb + CURRENT.logistics + CURRENT.storage + CURRENT.penalties), type: 'subtotal', indent: 0 },
  { label: 'Расходы на рекламу',      value: -CURRENT.ads,     type: 'expense', indent: 0 },
  { label: 'Себестоимость товаров',   value: -CURRENT.cogs,    type: 'expense', indent: 0 },
  { label: 'Прибыль до налогов',      value: CURRENT.revenue - CURRENT.wb - CURRENT.logistics - CURRENT.storage - CURRENT.penalties - CURRENT.ads - CURRENT.cogs, type: 'subtotal', indent: 0 },
  { label: 'Налог УСН 6%',           value: -CURRENT.tax,     type: 'expense', indent: 0 },
  { label: 'ЧИСТАЯ ПРИБЫЛЬ',         value: CURRENT.net,       type: 'total',   indent: 0 },
]

export default function Finance() {
  const [activeChart, setActiveChart] = useState<'area' | 'bar'>('area')

  const netMargin = ((CURRENT.net / CURRENT.revenue) * 100).toFixed(1)

  return (
    <div style={{ padding: '28px 32px', background: PAGE_BG, minHeight: '100%' }}>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT1 }}>Финансы</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: TEXT2 }}>
            Отчёт P&amp;L · Апрель 2026 · Рентабельность {netMargin}%
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setActiveChart('area')} style={{
            padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: activeChart === 'area' ? '#00D084' : CARD_BG,
            color: activeChart === 'area' ? '#000' : TEXT2,
            border: `1px solid ${activeChart === 'area' ? '#00D084' : BORDER}`,
          }}>Динамика</button>
          <button onClick={() => setActiveChart('bar')} style={{
            padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: activeChart === 'bar' ? '#00D084' : CARD_BG,
            color: activeChart === 'bar' ? '#000' : TEXT2,
            border: `1px solid ${activeChart === 'bar' ? '#00D084' : BORDER}`,
          }}>По месяцам</button>
        </div>
      </motion.div>

      {/* KPI SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {SUMMARY_CARDS.map((c, i) => {
          const Icon = c.icon
          const isNeg = c.change < 0
          return (
            <motion.div key={c.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 11, color: TEXT2, textTransform: 'uppercase',
                  letterSpacing: '0.5px', fontWeight: 600 }}>{c.label}</p>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: c.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
                  <Icon size={16} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: TEXT1, marginBottom: 8 }}>{c.value}</div>
              <span style={{
                padding: '2px 7px', borderRadius: 5, fontSize: 12, fontWeight: 600,
                color: isNeg ? '#FF6B6B' : '#00D084',
                background: isNeg ? 'rgba(255,107,107,0.12)' : 'rgba(0,208,132,0.12)',
              }}>
                {isNeg ? '↘' : '↗'} {Math.abs(c.change)}%
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* CHART */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '24px', marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 600, color: TEXT1 }}>
          {activeChart === 'area' ? 'Динамика выручки и прибыли' : 'Сравнение по месяцам'} (тыс. ₽)
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          {activeChart === 'area' ? (
            <AreaChart data={CHART_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D084" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00D084" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: TEXT2 }} itemStyle={{ color: TEXT1 }} />
              <Area type="monotone" dataKey="revenue" stroke="#00D084" strokeWidth={2} fill="url(#gRev)" name="Выручка" />
              <Area type="monotone" dataKey="expenses" stroke="#FF6B6B" strokeWidth={2} fill="url(#gExp)" name="Расходы" />
              <Area type="monotone" dataKey="net" stroke="#58A6FF" strokeWidth={2} fill="none" name="Прибыль" />
            </AreaChart>
          ) : (
            <BarChart data={CHART_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: TEXT2 }} itemStyle={{ color: TEXT1 }} />
              <Bar dataKey="revenue" fill="#00D084" fillOpacity={0.8} radius={[4, 4, 0, 0]} name="Выручка" />
              <Bar dataKey="net" fill="#58A6FF" fillOpacity={0.8} radius={[4, 4, 0, 0]} name="Прибыль" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </motion.div>

      {/* P&L TABLE */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: TEXT1 }}>Отчёт P&amp;L — Апрель 2026</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#0E0E10' }}>
              <th style={{ padding: '10px 22px', textAlign: 'left', color: TEXT2, fontSize: 11,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Статья</th>
              <th style={{ padding: '10px 22px', textAlign: 'right', color: TEXT2, fontSize: 11,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Сумма</th>
              <th style={{ padding: '10px 22px', textAlign: 'right', color: TEXT2, fontSize: 11,
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>% от выручки</th>
            </tr>
          </thead>
          <tbody>
            {PL_ROWS.map(row => {
              const isTotal   = row.type === 'total'
              const isSubtotal = row.type === 'subtotal'
              const isExpense  = row.type === 'expense'
              const pct = Math.abs((row.value / CURRENT.revenue) * 100).toFixed(1)
              return (
                <tr key={row.label}
                  style={{
                    borderBottom: `1px solid ${BORDER}`,
                    background: isTotal ? 'rgba(0,208,132,0.06)' : isSubtotal ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  <td style={{
                    padding: `${isTotal ? 14 : 10}px ${22 + row.indent * 16}px`,
                    color: isTotal ? '#00D084' : isSubtotal ? TEXT1 : isExpense ? TEXT2 : TEXT1,
                    fontWeight: isTotal ? 700 : isSubtotal ? 600 : 400,
                    fontSize: isTotal ? 14 : 13,
                  }}>
                    {row.label}
                  </td>
                  <td style={{
                    padding: `${isTotal ? 14 : 10}px 22px`,
                    textAlign: 'right',
                    color: isTotal ? '#00D084' : row.value < 0 ? '#FF6B6B' : TEXT1,
                    fontWeight: isTotal || isSubtotal ? 700 : 400,
                  }}>
                    {row.value < 0 ? '−' : ''}{Math.abs(row.value).toLocaleString('ru-RU')} ₽
                  </td>
                  <td style={{
                    padding: `${isTotal ? 14 : 10}px 22px`,
                    textAlign: 'right',
                    color: TEXT2, fontSize: 12,
                  }}>
                    {pct}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </motion.div>

    </div>
  )
}
