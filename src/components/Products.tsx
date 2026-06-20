import { useState, useEffect } from 'react'
import { Search, Filter, Download, Edit2, Trash2, Key } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface Product {
  id: string
  name: string
  sku: string
  photoUrl?: string
  stock: number
  price: number
  sales: number
  revenue: number
  margin: number
  profit: number
  rating: number
}

export const Products = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('revenue')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const jwt = localStorage.getItem('token')
    if (!jwt) { setLoading(false); return }

    fetch('/api/wb/synced-products', { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.products)) {
          const mapped: Product[] = data.products.map((p: {
            nmID: number; vendorCode: string; name: string; photoUrl: string | null
          }) => ({
            id:       String(p.nmID),
            name:     p.name || p.vendorCode || '—',
            sku:      p.vendorCode || String(p.nmID),
            photoUrl: p.photoUrl || undefined,
            stock:    0,
            price:    0,
            sales:    0,
            revenue:  0,
            margin:   0,
            profit:   0,
            rating:   0,
          }))
          setProducts(mapped)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredProducts = products
    .filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortBy as keyof Product] as number
      const bVal = b[sortBy as keyof Product] as number
      return (aVal < bVal ? 1 : -1)
    })

  return (
    <div
      style={{
        padding: '32px 0',
        background: 'var(--bg-main)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        {/* HEADER */}
        <motion.div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Товары
          </h1>
        </motion.div>

        {/* FILTERS */}
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr auto auto',
            gap: '12px',
            marginBottom: '24px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              gap: '10px',
            }}
          >
            <Search size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Поиск товара или SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <select
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <option>Все категории</option>
            <option>Электроника</option>
            <option>Одежда</option>
            <option>Дом и сад</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <option value="revenue">Сортировка: Выручка</option>
            <option value="sales">Сортировка: Продажи</option>
            <option value="price">Сортировка: Цена</option>
            <option value="profit">Сортировка: Прибыль</option>
          </select>

          <button
            style={{
              padding: '10px 16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.borderColor = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.borderColor = 'var(--border)'
            }}
          >
            <Filter size={16} />
            Фильтры
          </button>

          <button
            style={{
              padding: '10px 16px',
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              fontWeight: 600,
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'var(--accent-hover)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'var(--accent)'
            }}
          >
            <Download size={16} />
            Excel
          </button>
        </motion.div>

        {/* EMPTY STATE */}
        {!loading && products.length === 0 && (
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
              Товары не синхронизированы
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.6, marginBottom: 32 }}>
              Добавьте API токен Wildberries и сохраните его в настройках — товары синхронизируются автоматически
            </p>
            <button onClick={() => navigate('/settings')}
              style={{ padding: '13px 28px', background: '#00D084', color: '#000',
                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,208,132,0.3)' }}>
              Перейти в настройки
            </button>
          </motion.div>
        )}

        {/* TABLE */}
        {!loading && products.length > 0 && (
        <motion.div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-input)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Фото
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                    }}
                  >
                    Название
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    SKU
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Остаток
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Цена
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Продажи
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Маржа %
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Прибыль
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Рейтинг
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <img
                        src={product.photoUrl}
                        alt={product.name}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          background: 'var(--bg-input)',
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {product.name}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {product.sku}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: product.stock < 100 ? '#FF6B6B' : 'var(--text-primary)',
                      }}
                    >
                      {product.stock} шт.
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {product.price.toLocaleString('ru-RU')} ₽
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {product.sales}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color:
                          product.margin > 40
                            ? 'var(--accent)'
                            : product.margin > 20
                              ? '#FFB830'
                              : '#FF6B6B',
                        fontWeight: 600,
                      }}
                    >
                      {product.margin}%
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: product.profit > 0 ? 'var(--accent)' : '#FF6B6B',
                        fontWeight: 600,
                      }}
                    >
                      {product.profit.toLocaleString('ru-RU')} ₽
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      ⭐ {product.rating}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        gap: '8px',
                      }}
                    >
                      <button
                        style={{
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.borderColor = 'var(--accent)'
                          ;(e.target as HTMLElement).style.color = 'var(--accent)'
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.borderColor = 'var(--border)'
                          ;(e.target as HTMLElement).style.color = 'var(--text-secondary)'
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        style={{
                          padding: '6px 10px',
                          background: 'transparent',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.borderColor = '#FF6B6B'
                          ;(e.target as HTMLElement).style.color = '#FF6B6B'
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.borderColor = 'var(--border)'
                          ;(e.target as HTMLElement).style.color = 'var(--text-secondary)'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
        )}
      </div>
    </div>
  )
}
