import { useState } from 'react'
import { CheckCircle, Clock, AlertCircle, Download } from 'lucide-react'
import { motion } from 'framer-motion'

interface Payout {
  id: string
  date: string
  amount: number
  status: 'success' | 'pending' | 'failed'
  accountNumber: string
  bank: string
}

export const Payouts = () => {
  const [payouts] = useState<Payout[]>([
    { id: '1', date: '2026-04-10', amount: 425000, status: 'success', accountNumber: '40702...01', bank: 'Сбербанк' },
    { id: '2', date: '2026-04-03', amount: 389500, status: 'success', accountNumber: '40702...01', bank: 'Сбербанк' },
    { id: '3', date: '2026-03-27', amount: 412300, status: 'pending', accountNumber: '40702...01', bank: 'Альфа-Банк' },
    { id: '4', date: '2026-03-20', amount: 395800, status: 'success', accountNumber: '40702...01', bank: 'Сбербанк' },
    { id: '5', date: '2026-03-13', amount: 0, status: 'failed', accountNumber: '40702...01', bank: 'Сбербанк' },
  ])

  const [schedule] = useState({
    frequency: 'Еженедельно',
    nextPayout: '2026-04-17',
    daysLeft: 4,
    expectedAmount: 287500
  })

  const totalPayouts = payouts.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0)
  const successCount = payouts.filter(p => p.status === 'success').length
  const pendingAmount = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0)

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'success':
        return <span className="status-badge success">✓ Выплачено</span>
      case 'pending':
        return <span className="status-badge pending">⏱️ В пути</span>
      case 'failed':
        return <span className="status-badge failed">✕ Ошибка</span>
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'success':
        return <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
      case 'pending':
        return <Clock className="w-5 h-5" style={{ color: '#f97316' }} />
      case 'failed':
        return <AlertCircle className="w-5 h-5" style={{ color: '#dc2626' }} />
      default:
        return null
    }
  }

  return (
    <div className="dashboard">
      <div className="section-header">
        <h1 className="section-title">Выплаты и переводы</h1>
        <button className="view-map-btn">
          <Download className="w-4 h-4" />
          Выгрузить отчёт
        </button>
      </div>

      {/* Stats */}
      <motion.div className="kpi-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Выплачено</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value text-green-600">{(totalPayouts / 1000).toFixed(0)}K<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>{successCount} выплат</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">В пути</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value">{(pendingAmount / 1000).toFixed(0)}K<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>1 выплата</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Следующая</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value">{(schedule.expectedAmount / 1000).toFixed(0)}K<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>через {schedule.daysLeft} дней</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Сбербанк</div>
          </div>
          <div className="kpi-value-section">
            <div style={{ fontSize: '14px', fontWeight: '500', color: 'hsl(var(--muted))' }}>40702...01</div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>Основной счёт</span>
          </div>
        </div>
      </motion.div>

      {/* Schedule */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h2 className="panel-section-title">📅 График выплат</h2>
        
        <div className="schedule-info">
          <div className="schedule-item">
            <div className="schedule-label">Периодичность</div>
            <div className="schedule-value">{schedule.frequency}</div>
          </div>
          <div className="schedule-item">
            <div className="schedule-label">Следующая выплата</div>
            <div className="schedule-value">{new Date(schedule.nextPayout).toLocaleDateString('ru-RU')}</div>
          </div>
          <div className="schedule-item">
            <div className="schedule-label">Ожидаемая сумма</div>
            <div className="schedule-value" style={{ color: '#16a34a', fontWeight: '600' }}>
              {schedule.expectedAmount.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div className="schedule-item">
            <div className="schedule-label">До выплаты</div>
            <div className="schedule-value" style={{ fontSize: '24px', fontWeight: '700' }}>{schedule.daysLeft}</div>
            <div style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>дней</div>
          </div>
        </div>
      </motion.div>

      {/* History */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="panel-section-title">📋 История выплат</h2>
        
        <div className="payouts-timeline">
          {payouts.map((payout, idx) => (
            <motion.div 
              key={payout.id}
              className="payout-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="payout-status">
                {getStatusIcon(payout.status)}
              </div>
              
              <div className="payout-info">
                <div className="payout-date">{new Date(payout.date).toLocaleDateString('ru-RU', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div className="payout-bank">{payout.bank} • {payout.accountNumber}</div>
              </div>

              <div className="payout-amount">
                {payout.amount.toLocaleString('ru-RU')} ₽
              </div>

              <div className="payout-status-badge">
                {getStatusBadge(payout.status)}
              </div>

              <button className="payout-action">
                <Download className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bank Details */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <h2 className="panel-section-title">🏦 Реквизиты счёта</h2>
        
        <div className="bank-info">
          <div className="bank-item">
            <span className="bank-label">Банк</span>
            <span className="bank-value">Сбербанк России</span>
          </div>
          <div className="bank-item">
            <span className="bank-label">Расчётный счёт</span>
            <span className="bank-value">40702810812345678901</span>
          </div>
          <div className="bank-item">
            <span className="bank-label">БИК</span>
            <span className="bank-value">044525225</span>
          </div>
          <div className="bank-item">
            <span className="bank-label">Корр. счёт</span>
            <span className="bank-value">30101810400000000225</span>
          </div>
        </div>
        
        <button className="btn-primary" style={{ marginTop: '16px' }}>
          Изменить реквизиты
        </button>
      </motion.div>
    </div>
  )
}
