import {
  ShoppingCart, TrendingUp, TrendingDown, Percent,
  DollarSign, BarChart3, AlertTriangle, Wallet,
  RefreshCw, User, Key,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface WbSummary {
  revenue: number
  commission: number
  logistics: number
  storage: number
  penalties: number
  returns: number
  paidToSeller: number
}

const fmt = (n: number) => '₽ ' + Math.round(n).toLocaleString('ru-RU')

const KPICard = ({ card, index }: { card: Record<string, unknown>; index: number }) => {
  const Icon = card.icon as React.ElementType
  const isNegative = (card.delta as number) < 0
  return (
    <motion.div
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${(card.borderColor as string) || 'var(--border-card)'}`,
        borderRadius: 'var(--radius-lg)', padding: '20px 24px',
        boxShadow: (card.glowColor as string) || 'none', transition: 'all 0.2s ease',
      }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index as number) * 0.05 }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        ;(e.currentTarget).style.borderColor = card.color as string
        ;(e.currentTarget).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        ;(e.currentTarget).style.borderColor = (card.borderColor as string) || 'var(--border-card)'
        ;(e.currentTarget).style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 'var(--radius-md)', backgroundColor: card.bgColor as string,
          color: card.color as string, flexShrink: 0,
        }}>
          <Icon size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            {card.title as string}
          </h3>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0 0', opacity: 0.8 }}>
            {card.subtext as string}
          </p>
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: (card.color as string) || 'var(--text-primary)', marginBottom: 12 }}>
        {card.value as string}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span style={{
          fontWeight: 600, padding: '2px 6px', borderRadius: 4,
          color: isNegative ? '#FF6B6B' : 'var(--color-profit)',
          backgroundColor: isNegative ? 'rgba(255,107,107,0.1)' : 'rgba(0,208,132,0.1)',
        }}>
          {isNegative ? '↘' : '↗'} {Math.abs(card.delta as number)}%
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>vs. месяц назад</span>
      </div>
    </motion.div>
  )
}

const Dashboard = () => {
  const navigate    = useNavigate()
  const [period, setPeriod]           = useState(30)           // числовое значение дней
  const [refreshKey, setRefreshKey]   = useState(0)            // инкремент → ручное обновление
  const [loading, setLoading]         = useState(true)
  const [hasToken, setHasToken]       = useState(false)
  const [wbData, setWbData]           = useState<WbSummary | null>(null)
  const [ordersCount, setOrdersCount] = useState<number | null>(null)
  const [lastSync, setLastSync]       = useState('—')
  const [userCostPrice, setUserCostPrice] = useState(0)  // Себестоимость от юзера
  const [userTaxRate, setUserTaxRate]     = useState(18) // НДС %

  /* Загружаем данные при смене периода или при ручном обновлении */
  useEffect(() => {
    const jwt = localStorage.getItem('token')
    if (!jwt) { setLoading(false); return }

    setLoading(true)

    // Сначала проверяем, есть ли у пользователя WB токен
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(me => {
        console.log('User wbToken exists:', !!me.wbTokens?.main)
        setUserCostPrice(me.costPrice || 0)
        setUserTaxRate(me.taxRate || 18)
        
        if (!me.wbTokens?.main) {
          setHasToken(false)
          setLoading(false)
          return
        }

        setHasToken(true)

        // Загружаем данные с учётом выбранного периода
        return Promise.all([
          fetch(`/api/wb/finance-report?days=${period}`, { headers: { Authorization: `Bearer ${jwt}` } })
            .then(r => r.json()),
          fetch(`/api/wb/orders?days=${period}`, { headers: { Authorization: `Bearer ${jwt}` } })
            .then(r => r.json()),
        ]).then(([finance, orders]) => {
          if (finance.summary) {
            setWbData(finance.summary)
            setLastSync(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
          }
          if (Array.isArray(orders)) setOrdersCount(orders.filter((o: any) => o.srid).length)  // Считаем только с srid
        })
      })
      .catch(err => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false))
  }, [period, refreshKey])   // ← обновляем при смене периода или ручном рефреше

  /* КПИ — реальные данные или плейсхолдеры */
  const revenue    = wbData?.revenue     ?? 0
  const deductions = wbData
    ? wbData.commission + wbData.logistics + wbData.storage + wbData.penalties
    : 0
  const paidOut    = wbData?.paidToSeller ?? 0
  const returns    = wbData?.returns      ?? 0
  const orders     = ordersCount          ?? 0
  
  // Правильный расчёт налогов (НДС)
  const taxes = revenue > 0 ? (revenue * userTaxRate / 100) : 0
  
  // Правильный расчёт маржи = (выплачено - себестоимость) / выручка * 100
  const profit = paidOut - userCostPrice
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '—'
  
  // Правильный расчёт ROI = (выплачено - себестоимость) / себестоимость * 100
  const roi = userCostPrice > 0 ? ((profit / userCostPrice) * 100).toFixed(1) : '—'

  const noData = (val: number) => val === 0 ? '—' : fmt(val)

  const orderCards = [
    { id: 'orders',  title: 'Заказы',   value: orders > 0 ? orders.toLocaleString('ru-RU') : '—', subtext: `за ${period} дней`, delta: 0, icon: ShoppingCart, color: '#06B6D4', bgColor: 'rgba(6,182,212,0.15)' },
    { id: 'sales',   title: 'Продажи',  value: orders > 0 ? orders.toLocaleString('ru-RU') : '—', subtext: 'завершены',    delta: 0, icon: TrendingUp,  color: '#00D084', bgColor: 'rgba(0,208,132,0.15)' },
    { id: 'returns', title: 'Возвраты', value: returns > 0 ? fmt(returns) : '—',  subtext: 'сумма возвратов',  delta: 0, icon: TrendingDown, color: '#FF6B6B', bgColor: 'rgba(255,107,107,0.15)' },
    { id: 'buyout',  title: 'Выкуп %',  value: orders > 0 ? ((orders / (orders + Math.max(0, orders * 0.15))) * 100).toFixed(1) + '%' : '—', subtext: 'от заказов',  delta: 0, icon: Percent,    color: '#FFB830', bgColor: 'rgba(255,184,48,0.15)' },
  ]

  const financeCards = [
    { id: 'revenue',  title: 'Выручка',      value: noData(revenue),    subtext: 'валовая',              delta: 0, icon: DollarSign,   color: '#00D084', glowColor: '0 0 30px rgba(0,208,132,0.08)',   borderColor: 'rgba(0,208,132,0.2)',   bgColor: 'rgba(0,208,132,0.15)' },
    { id: 'expenses', title: 'Удержания WB',  value: noData(deductions), subtext: 'комиссии + логистика', delta: 0, icon: Wallet,        color: '#FF6B6B', glowColor: '0 0 30px rgba(255,107,107,0.08)', borderColor: 'rgba(255,107,107,0.2)', bgColor: 'rgba(255,107,107,0.15)' },
    { id: 'ads',      title: 'Реклама',       value: '—',                subtext: 'расходы на кампании',  delta: 0, icon: BarChart3,     color: '#FFB830', glowColor: '0 0 30px rgba(255,184,48,0.08)',  borderColor: 'rgba(255,184,48,0.2)',  bgColor: 'rgba(255,184,48,0.15)' },
    { id: 'taxes',    title: 'Налоги (НДС)',  value: noData(taxes),      subtext: `${userTaxRate}%`,      delta: 0, icon: AlertTriangle, color: '#58A6FF', glowColor: '0 0 30px rgba(88,166,255,0.08)',  borderColor: 'rgba(88,166,255,0.2)',  bgColor: 'rgba(88,166,255,0.15)' },
  ]

  const summaryCards = [
    { id: 'cost',   title: 'Себестоимость', value: noData(userCostPrice), subtext: 'производство',   delta: 0, icon: DollarSign, color: '#A8B3CF', glowColor: '0 0 30px rgba(168,179,207,0.08)', borderColor: 'rgba(168,179,207,0.2)', bgColor: 'rgba(168,179,207,0.15)' },
    { id: 'profit', title: 'Выплачено WB',  value: noData(paidOut), subtext: 'на ваш счёт',  delta: 0, icon: TrendingUp, color: '#00D084', glowColor: '0 0 40px rgba(0,208,132,0.25)',   borderColor: 'rgba(0,208,132,0.3)',   bgColor: 'rgba(0,208,132,0.15)' },
    { id: 'margin', title: 'Маржа %',       value: margin,          subtext: '(выплачено-себестоимость)/выручка', delta: 0, icon: Percent,   color: '#7EE787', glowColor: '0 0 30px rgba(126,231,135,0.08)', borderColor: 'rgba(126,231,135,0.2)', bgColor: 'rgba(126,231,135,0.15)' },
    { id: 'roi',    title: 'ROI %',         value: roi,             subtext: '(выплачено-себестоимость)/себестоимость', delta: 0, icon: BarChart3,  color: '#56D364', glowColor: '0 0 30px rgba(86,211,100,0.08)',  borderColor: 'rgba(86,211,100,0.2)',  bgColor: 'rgba(86,211,100,0.15)' },
  ]

  return (
    <div style={{ padding: '32px 0', background: 'var(--bg-main)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 32px' }}>

        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
              Дашборд
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>
              {loading ? 'Загрузка...'
                : hasToken ? `Синхронизировано: ${lastSync} · период: ${period} дней`
                : 'Подключите WB токен для загрузки данных'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Селектор периода */}
            <select
              value={period}
              onChange={e => setPeriod(Number(e.target.value))}
              style={{ minWidth: 130, padding: '10px 12px', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer' }}
            >
              <option value={7}>7 дней</option>
              <option value={30}>30 дней</option>
              <option value={90}>90 дней</option>
            </select>

            {/* Кнопка обновления — инкрементирует refreshKey */}
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              disabled={loading}
              style={{ padding: '10px 16px', background: loading ? 'rgba(0,208,132,0.4)' : 'var(--accent)',
                color: '#000', border: 'none', borderRadius: 'var(--radius-md)',
                cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s ease' }}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Обновить
            </button>

            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
              boxShadow: '0 0 20px rgba(0,208,132,0.25)' }}>
              <User size={20} />
            </div>
          </div>
        </motion.div>

        {/* ЗАГРУЗКА */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 12 }}>
            <RefreshCw size={18} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Загружаем данные с Wildberries...</span>
          </div>
        )}

        {/* EMPTY STATE — нет токена */}
        {!loading && !hasToken && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '100px 32px', textAlign: 'center',
              background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-card)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(0,208,132,0.1)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: 24, border: '2px solid rgba(0,208,132,0.2)' }}>
              <Key size={32} style={{ color: '#00D084' }} />
            </div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 12, fontSize: 22 }}>
              Данные не загружены
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
              Добавьте API токен Wildberries для отображения реальных данных о продажах, заказах и финансах
            </p>
            <button onClick={() => navigate('/settings')}
              style={{ padding: '13px 28px', background: '#00D084', color: '#000',
                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,208,132,0.3)' }}>
              Добавить токен
            </button>
          </motion.div>
        )}

        {/* КПИ КАРТОЧКИ */}
        {!loading && hasToken && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              {orderCards.map((card, idx) => <KPICard key={card.id} card={card as Record<string, unknown>} index={idx} />)}
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              {financeCards.map((card, idx) => <KPICard key={card.id} card={card as Record<string, unknown>} index={idx + 4} />)}
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {summaryCards.map((card, idx) => <KPICard key={card.id} card={card as Record<string, unknown>} index={idx + 8} />)}
            </motion.div>
          </>
        )}

      </div>
    </div>
  )
}

export default Dashboard
