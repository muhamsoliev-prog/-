import { useState } from 'react'
import { TrendingUp, Edit2, Trash2, Plus } from 'lucide-react'
import { motion } from 'framer-motion'

interface CostProduct {
  id: string
  name: string
  sku: string
  purchasePrice: number
  sellingPrice: number
  margin: number
  marginPercent: number
  monthlyProfit: number
  category: string
}

export const CostPrice = () => {
  const [products] = useState<CostProduct[]>([
    { id: '1', name: 'Товар 1', sku: 'SKU-001', purchasePrice: 800, sellingPrice: 1999, margin: 1199, marginPercent: 60, monthlyProfit: 539550, category: 'Электроника' },
    { id: '2', name: 'Товар 2', sku: 'SKU-002', purchasePrice: 1500, sellingPrice: 2499, margin: 999, marginPercent: 40, monthlyProfit: 319680, category: 'Одежда' },
    { id: '3', name: 'Товар 3', sku: 'SKU-003', purchasePrice: 900, sellingPrice: 1599, margin: 699, marginPercent: 44, monthlyProfit: 195720, category: 'Электроника' },
    { id: '4', name: 'Товар 4', sku: 'SKU-004', purchasePrice: 2500, sellingPrice: 3999, margin: 1499, marginPercent: 60, monthlyProfit: 233844, category: 'Техника' },
    { id: '5', name: 'Товар 5', sku: 'SKU-005', purchasePrice: 400, sellingPrice: 799, margin: 399, marginPercent: 50, monthlyProfit: 356108, category: 'Бюджет' },
  ])

  const [categoryStats] = useState([
    { name: 'Электроника', avgMargin: 52, count: 24, totalProfit: 1250000 },
    { name: 'Одежда', avgMargin: 45, count: 18, totalProfit: 890000 },
    { name: 'Техника', avgMargin: 58, count: 12, totalProfit: 750000 },
    { name: 'Бюджет', avgMargin: 50, count: 32, totalProfit: 1100000 },
  ])

  const avgMarginPercent = (products.reduce((sum, p) => sum + p.marginPercent, 0) / products.length).toFixed(1)

  return (
    <div className="dashboard">
      <div className="section-header">
        <h1 className="section-title">Себестоимость и маржа</h1>
        <button className="view-map-btn">
          <Plus className="w-4 h-4" />
          Добавить товар
        </button>
      </div>

      {/* Stats */}
      <motion.div className="kpi-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Средняя маржа</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value">{avgMarginPercent}%</div>
          </div>
          <div className="kpi-footer">
            <div className="kpi-delta positive">
              <TrendingUp className="w-3 h-3" />
              <span>+2.5%</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Категорий</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value">{categoryStats.length}</div>
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '12px', color: 'hsl(var(--muted))' }}>Всего товаров: {products.length}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Сумма маржи</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value text-green-600">{(products.reduce((sum, p) => sum + p.margin, 0) * 10).toLocaleString('ru-RU')}<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <div className="kpi-delta positive">
              <TrendingUp className="w-3 h-3" />
              <span>+12.3%</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <div className="kpi-title">Прибыль/месяц</div>
          </div>
          <div className="kpi-value-section">
            <div className="kpi-value text-green-600">{(products.reduce((sum, p) => sum + p.monthlyProfit, 0) / 1000000).toFixed(1)}M<span>₽</span></div>
          </div>
          <div className="kpi-footer">
            <div className="kpi-delta positive">
              <TrendingUp className="w-3 h-3" />
              <span>+8.1%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category Analysis */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <h2 className="panel-section-title">📊 Анализ по категориям</h2>
        
        <div className="category-grid">
          {categoryStats.map((cat, idx) => (
            <motion.div 
              key={idx}
              className="category-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="category-name">{cat.name}</div>
              <div className="category-stats">
                <div className="stat">
                  <span className="stat-label">Средняя маржа</span>
                  <span className="stat-value">{cat.avgMargin}%</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Товаров</span>
                  <span className="stat-value">{cat.count}</span>
                </div>
              </div>
              <div className="category-profit">
                <span>Прибыль/мес:</span>
                <span className="profit-value">{(cat.totalProfit / 1000).toFixed(0)}K ₽</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Products Table */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="panel-section-title">📦 Товары с расчётом маржи</h2>
        
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>SKU</th>
                <th>Категория</th>
                <th>Цена закупки</th>
                <th>Цена продажи</th>
                <th>Маржа</th>
                <th>%</th>
                <th>Прибыль/мес</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => (
                <motion.tr 
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="table-row-tr"
                >
                  <td className="font-medium">{product.name}</td>
                  <td className="text-muted">{product.sku}</td>
                  <td>
                    <span className="category-badge">{product.category}</span>
                  </td>
                  <td>{product.purchasePrice.toLocaleString('ru-RU')} ₽</td>
                  <td className="font-medium">{product.sellingPrice.toLocaleString('ru-RU')} ₽</td>
                  <td className="font-semibold text-success">{product.margin.toLocaleString('ru-RU')} ₽</td>
                  <td>
                    <div className="margin-percent">
                      <span>{product.marginPercent}%</span>
                    </div>
                  </td>
                  <td className="font-semibold">{(product.monthlyProfit / 1000).toFixed(1)}K ₽</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn edit"><Edit2 className="w-4 h-4" /></button>
                      <button className="action-btn delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
