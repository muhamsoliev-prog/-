import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const PAGE_BG = '#0A0A0B'
const CARD_BG  = '#111113'
const BORDER   = 'rgba(255,255,255,0.06)'
const TEXT1    = '#F0F0F5'
const TEXT2    = '#8B8B9A'

const PIE_DATA = [
  { name: 'Группа A', value: 80, count: 2, color: '#00D084', desc: '20% товаров — 80% выручки' },
  { name: 'Группа B', value: 15, count: 3, color: '#FFB830', desc: '30% товаров — 15% выручки' },
  { name: 'Группа C', value: 5,  count: 5, color: '#FF6B6B', desc: '50% товаров — 5% выручки' },
]

const TOP_PRODUCTS = [
  { name: 'Наушники BT',    revenue: 3480, group: 'A' },
  { name: 'Органайзер A4',  revenue: 2083, group: 'A' },
  { name: 'Рюкзак 30л',     revenue: 1738, group: 'B' },
  { name: 'Термокружка',    revenue: 1329, group: 'B' },
  { name: 'Кроссовки м.42', revenue: 1404, group: 'B' },
  { name: 'Детская пир.',   revenue: 1879, group: 'A' },
  { name: 'Умная лампа',    revenue: 1395, group: 'B' },
  { name: 'Набор отвёрток', revenue: 814,  group: 'C' },
  { name: 'Йогамат TPE',    revenue: 935,  group: 'C' },
  { name: 'Фитнес-браслет', revenue: 817,  group: 'C' },
]

const TABLE_DATA = [
  { rank: 1,  sku: 'WB-30017', name: 'Беспроводные наушники BT 5.0',       revenue: 3_479_560, share: 19.8, cumShare: 19.8,  group: 'A' },
  { rank: 2,  sku: 'WB-90218', name: 'Детская пирамидка деревянная',        revenue: 1_878_500, share: 10.7, cumShare: 30.5,  group: 'A' },
  { rank: 3,  sku: 'WB-40092', name: 'Органайзер для документов A4',        revenue: 2_083_490, share: 11.9, cumShare: 42.4,  group: 'A' },
  { rank: 4,  sku: 'WB-20183', name: 'Рюкзак городской 30л',                revenue: 1_737_600, share: 9.9,  cumShare: 52.3,  group: 'A' },
  { rank: 5,  sku: 'WB-80043', name: 'Умная лампа E27 RGB WiFi',            revenue: 1_394_630, share: 7.9,  cumShare: 60.2,  group: 'A' },
  { rank: 6,  sku: 'WB-50234', name: 'Кроссовки беговые мужские р.42',      revenue: 1_404_000, share: 8.0,  cumShare: 68.2,  group: 'A' },
  { rank: 7,  sku: 'WB-10041', name: 'Термокружка 500мл нержавеющая',       revenue: 1_329_080, share: 7.6,  cumShare: 75.8,  group: 'A' },
  { rank: 8,  sku: 'WB-70156', name: 'Йогамат 6мм TPE антискользящий',     revenue: 934_500,   share: 5.3,  cumShare: 81.1,  group: 'B' },
  { rank: 9,  sku: 'WB-60011', name: 'Набор отвёрток 12 предметов',         revenue: 813_600,   share: 4.6,  cumShare: 85.7,  group: 'B' },
  { rank: 10, sku: 'WB-10319', name: 'Фитнес-браслет с пульсометром IP68', revenue: 816_660,   share: 4.6,  cumShare: 90.3,  group: 'B' },
]

const GROUP_COLOR: Record<string, string> = { A: '#00D084', B: '#FFB830', C: '#FF6B6B' }

const CustomPieLabel = ({ cx, cy, midAngle, outerRadius, name, value }: {
  cx: number; cy: number; midAngle: number; outerRadius: number; name: string; value: number
}) => {
  const RADIAN = Math.PI / 180
  const r = outerRadius + 32
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill={TEXT2} fontSize={12} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {name} {value}%
    </text>
  )
}

export default function ABCAnalysis() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30)

  return (
    <div style={{ padding: '28px 32px', background: PAGE_BG, minHeight: '100%' }}>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT1 }}>ABC-анализ</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: TEXT2 }}>
            Классификация товаров по вкладу в выручку
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([7, 30, 90] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
              background: period === p ? '#00D084' : CARD_BG,
              color: period === p ? '#000' : TEXT2,
              border: `1px solid ${period === p ? '#00D084' : BORDER}`,
            }}>{p}д</button>
          ))}
        </div>
      </motion.div>

      {/* TOP ROW: Pie + Group cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, marginBottom: 16 }}>

        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 600, color: TEXT1 }}>
            Распределение выручки
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                dataKey="value" labelLine={false} label={CustomPieLabel as unknown as boolean}>
                {PIE_DATA.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`}
                contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                labelStyle={{ color: TEXT2 }} itemStyle={{ color: TEXT1 }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Group Summary Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PIE_DATA.map((g, i) => (
            <motion.div key={g.name}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              style={{
                flex: 1, background: CARD_BG, border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: '16px 20px',
                borderLeft: `3px solid ${g.color}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: `${g.color}20`, color: g.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                  }}>
                    {g.name.split(' ')[1]}
                  </span>
                  <span style={{ color: TEXT1, fontWeight: 600, fontSize: 15 }}>{g.name}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{g.desc}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: g.color }}>{g.value}%</div>
                <div style={{ fontSize: 12, color: TEXT2 }}>{g.count} товаров</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '24px', marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 600, color: TEXT1 }}>
          Топ-10 товаров по выручке (тыс. ₽)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={TOP_PRODUCTS} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: TEXT2, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#18181B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              labelStyle={{ color: TEXT2 }} itemStyle={{ color: TEXT1 }}
              formatter={(v) => [`${v} тыс. ₽`, 'Выручка']}
            />
            <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
              {TOP_PRODUCTS.map(entry => (
                <Cell key={entry.name} fill={GROUP_COLOR[entry.group]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: '#0E0E10' }}>
              {['#', 'Артикул', 'Название', 'Выручка', 'Доля', 'Накопленная доля', 'Группа'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: h === '#' ? 'center' : 'left',
                  color: TEXT2, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_DATA.map((row, idx) => (
              <tr key={row.rank}
                style={{ borderBottom: `1px solid ${BORDER}`, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <td style={{ padding: '12px 14px', textAlign: 'center', color: TEXT2, fontWeight: 600 }}>
                  {idx + 1}
                </td>
                <td style={{ padding: '12px 14px', color: TEXT2, fontFamily: 'monospace', fontSize: 12 }}>
                  {row.sku}
                </td>
                <td style={{ padding: '12px 14px', color: TEXT1, fontWeight: 500 }}>{row.name}</td>
                <td style={{ padding: '12px 14px', color: TEXT1 }}>
                  {row.revenue.toLocaleString('ru-RU')} ₽
                </td>
                <td style={{ padding: '12px 14px', color: TEXT2 }}>{row.share}%</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        width: `${Math.min(row.cumShare, 100)}%`,
                        background: row.cumShare <= 80 ? '#00D084' : row.cumShare <= 95 ? '#FFB830' : '#FF6B6B',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: TEXT2, minWidth: 38 }}>{row.cumShare}%</span>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    color: GROUP_COLOR[row.group],
                    background: `${GROUP_COLOR[row.group]}18`,
                  }}>
                    {row.group}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

    </div>
  )
}
