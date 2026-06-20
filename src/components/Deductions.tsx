import { useState } from 'react'
import { Info, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

interface Deduction {
  id: string
  type: string
  amount: number
  date: string
  reason: string
  status: 'active' | 'resolved'
}

export const Deductions = () => {
  const [deductions] = useState<Deduction[]>([
    { id: '1', type: 'Комиссия МП', amount: 185340, date: '2026-04-10', reason: 'Комиссия за продажи (15%)', status: 'active' },
    { id: '2', type: 'Логистика', amount: 42500, date: '2026-04-10', reason: 'Доставка и обработка', status: 'active' },
    { id: '3', type: 'Возврат', amount: 8250, date: '2026-04-09', reason: 'Возврат товара покупателем', status: 'resolved' },
    { id: '4', type: 'Штраф', amount: 5000, date: '2026-04-08', reason: 'Нарушение правил маркетплейса', status: 'active' },
    { id: '5', type: 'Комиссия МП', amount: 156400, date: '2026-04-07', reason: 'Комиссия за продажи (15%)', status: 'active' },
  ])

  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [deductionsByType] = useState({
    commission: 341740,
    logistics: 85000,
    returns: 24750,
    penalties: 15000,
  })

  const totalDeductions = Object.values(deductionsByType).reduce((a, b) => a + b, 0)

  return (
    <div className="dashboard">
      <div className="section-header">
        <h1 className="section-title">Удержания и комиссии</h1>
        <select 
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="period-select"
        >
          <option value="week">На неделю</option>
          <option value="month">За месяц</option>
          <option value="quarter">За квартал</option>
          <option value="year">За год</option>
        </select>
      </div>

      {/* Summary Stats */}
      <motion.div className="kpi-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Всего удержано</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value text-red-600">{(totalDeductions / 1000).toFixed(0)}K<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '600' }}>
              -15.2% от выручки
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Комиссия МП</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value">{(deductionsByType.commission / 1000).toFixed(0)}K<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>56% от удержаний</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Логистика</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value">{(deductionsByType.logistics / 1000).toFixed(0)}K<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>28% от удержаний</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Возвраты</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value text-red-600">{(deductionsByType.returns / 1000).toFixed(0)}K<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>8% от удержаний</span>
          </div>
        </div>
      </motion.div>

      {/* Breakdown Chart */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h2 className="panel-section-title">📊 Распределение удержаний</h2>
        
        <div className="deductions-breakdown">
          {[
            { label: 'Комиссия МП', value: deductionsByType.commission, color: '#3b82f6', percent: 56 },
            { label: 'Логистика', value: deductionsByType.logistics, color: '#10b981', percent: 28 },
            { label: 'Возвраты', value: deductionsByType.returns, color: '#ef4444', percent: 8 },
            { label: 'Штрафы', value: deductionsByType.penalties, color: '#f97316', percent: 8 },
          ].map((item, idx) => (
            <div key={idx} className="deduction-item">
              <div className="deduction-info">
                <div className="deduction-color" style={{ background: item.color }}></div>
                <div>
                  <div className="deduction-label">{item.label}</div>
                  <div className="deduction-value">{(item.value / 1000).toFixed(0)}K ₽</div>
                </div>
              </div>
              <div className="deduction-percent">{item.percent}%</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Details Table */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="panel-section-title">📋 Детали удержаний</h2>
        
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Тип</th>
                <th>Сумма</th>
                <th>Дата</th>
                <th>Причина</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {deductions.map((ded, idx) => (
                <motion.tr 
                  key={ded.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="table-row-tr"
                >
                  <td className="font-medium">{ded.type}</td>
                  <td className="font-semibold text-red-600">{ded.amount.toLocaleString('ru-RU')} ₽</td>
                  <td className="text-muted">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar className="w-4 h-4" />
                      {new Date(ded.date).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td>{ded.reason}</td>
                  <td>
                    <span className={`status-badge ${ded.status === 'active' ? 'active' : 'resolved'}`}>
                      {ded.status === 'active' ? '⏱️ Активно' : '✓ Решено'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Info Section */}
      <motion.div className="panel info-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Info className="w-5 h-5" style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h3 style={{ marginBottom: '8px', fontWeight: '600' }}>Как уменьшить удержания?</h3>
            <ul style={{ fontSize: '13px', lineHeight: '1.6', color: 'hsl(var(--muted))' }}>
              <li>📦 Правильно упаковывайте товары для снижения процента возвратов</li>
              <li>⭐ Поддерживайте высокий рейтинг (4.5+) - маркетплейсы снижают комиссию</li>
              <li>📊 Оптимизируйте цены для баланса между продажами и маржой</li>
              <li>🎯 Используйте рекомендации алгоритмов для хитов продаж</li>
              <li>📞 Свяжитесь с поддержкой МП для обсуждения коммерческих условий</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
