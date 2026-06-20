import { useState, useEffect } from 'react'
import { Check, Save, Eye, EyeOff, X, Key, Package, TrendingUp, BarChart2, Image, DollarSign, Tag } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useLanguage } from '@/context/LanguageContext'

type TokenStatus = 'idle' | 'checking' | 'active' | 'error'

export const Settings = () => {
  const { language, setLanguage } = useLanguage()

  /* ── WB Token ── */
  const [tokenValue, setTokenValue]   = useState('')
  const [tokenVisible, setTokenVisible] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>('idle')
  const [lastSync, setLastSync]       = useState<string | null>(null)

  /* ── Profile ── */
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', company: '' })
  const [editing, setEditing] = useState(false)
  const [tempProfile, setTempProfile] = useState(profile)

  /* ── Notifications ── */
  const [notifications, setNotifications] = useState({
    email: true, telegram: false, lowStock: true,
    newOrders: true, paymentSuccessful: true, systemAlerts: false,
  })

  const languages = [
    { code: 'ru', name: 'Русский',  flag: '🇷🇺' },
    { code: 'en', name: 'English',  flag: '🇺🇸' },
    { code: 'zh', name: '中文',     flag: '🇨🇳' },
    { code: 'tg', name: 'Тоҷикӣ', flag: '🇹🇯' },
  ]

  const capabilities = [
    { icon: Package,    label: 'Заказы' },
    { icon: DollarSign, label: 'Продажи' },
    { icon: BarChart2,  label: 'Аналитика' },
    { icon: Image,      label: 'Фото товаров' },
    { icon: TrendingUp, label: 'Финансы WB' },
    { icon: Tag,        label: 'Цены' },
  ]

  /* Загружаем статус токена при монтировании */
  useEffect(() => {
    axios.get('/api/auth/me').then(({ data }) => {
      if (data.wbTokens?.main) {
        setTokenValue('••••••••••••••••')
        setTokenStatus('active')
        if (data.wbTokens.lastCheck) {
          setLastSync(new Date(data.wbTokens.lastCheck).toLocaleString('ru-RU'))
        }
      }
      if (data.name)  setProfile(p => ({ ...p, name: data.name }))
      if (data.email) setProfile(p => ({ ...p, email: data.email }))
      if (data.phone) setProfile(p => ({ ...p, phone: data.phone }))
    }).catch(() => {})
  }, [])

  const handleSaveToken = async () => {
    if (!tokenValue || tokenValue.startsWith('•')) return
    setTokenStatus('checking')
    try {
      await axios.post('/api/wb/save-token', { token: tokenValue })
      setTokenStatus('active')
      setLastSync(new Date().toLocaleString('ru-RU'))

      // Автоматически синхронизируем карточки товаров после сохранения токена
      const jwt = localStorage.getItem('token')
      if (jwt) {
        fetch('/api/wb/sync-products', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
        })
          .then(r => r.json())
          .then(d => console.log('Синхронизировано товаров:', d.count))
          .catch(err => console.warn('Sync products error:', err))
      }
    } catch {
      setTokenStatus('error')
    }
  }

  const handleClearToken = () => {
    setTokenValue('')
    setTokenStatus('idle')
    setLastSync(null)
  }

  const handleProfileSave = () => {
    setProfile(tempProfile)
    setEditing(false)
  }

  const statusColor = tokenStatus === 'active' ? '#00D084'
    : tokenStatus === 'error' ? '#FF6B6B'
    : tokenStatus === 'checking' ? '#FFB830'
    : '#8B949E'

  const statusText = tokenStatus === 'active' ? '✓ Токен активен'
    : tokenStatus === 'error' ? '✗ Токен недействителен'
    : tokenStatus === 'checking' ? '⏳ Проверяем...'
    : '○ Токен не добавлен'

  return (
    <div className="dashboard">
      <div className="settings-header">
        <h1 className="section-title">Настройки</h1>
      </div>

      {/* Profile */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="panel-section-title">👤 Профиль пользователя</h2>
        {!editing ? (
          <div className="profile-view">
            {[
              { label: 'Имя и фамилия', value: profile.name || '—' },
              { label: 'Email',          value: profile.email || '—' },
              { label: 'Имя ИП (шапка)', value: localStorage.getItem('userName') || 'Компания',
                hint: 'Отображается как "ИП [Имя]" в шапке приложения' },
              { label: 'Телефон',        value: profile.phone || '—' },
              { label: 'Компания',       value: profile.company || '—' },
            ].map(f => (
              <div key={f.label} className="profile-field">
                <label>{f.label}</label>
                <p className="profile-value">{f.value}</p>
                {f.hint && <small style={{ color: 'var(--text-muted)', marginTop: 4 }}>{f.hint}</small>}
              </div>
            ))}
            <button onClick={() => { setTempProfile(profile); setEditing(true) }} className="btn-primary">
              Редактировать профиль
            </button>
          </div>
        ) : (
          <div className="profile-edit">
            {(['name', 'email', 'phone', 'company'] as const).map(field => (
              <div key={field} className="profile-field">
                <label>{{ name: 'Имя', email: 'Email', phone: 'Телефон', company: 'Компания' }[field]}</label>
                <input
                  type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                  value={tempProfile[field]}
                  onChange={e => setTempProfile({ ...tempProfile, [field]: e.target.value })}
                  className="input-field"
                />
              </div>
            ))}
            <div className="profile-field">
              <label>Имя ИП (шапка)</label>
              <input
                type="text"
                placeholder="Рахимов Мухамед"
                defaultValue={localStorage.getItem('userName') || ''}
                onChange={e => {
                  localStorage.setItem('userName', e.target.value)
                  window.dispatchEvent(new Event('storage'))
                }}
                className="input-field"
              />
            </div>
            <div className="button-group">
              <button onClick={handleProfileSave} className="btn-primary">
                <Save size={14} /> Сохранить
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary">
                <X size={14} /> Отмена
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Language */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <h2 className="panel-section-title">🌐 Язык и локализация</h2>
        <div className="language-grid">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code as 'ru' | 'en' | 'zh' | 'tg')}
              className={`language-card ${language === lang.code ? 'active' : ''}`}
            >
              <span className="language-flag">{lang.flag}</span>
              <span className="language-name">{lang.name}</span>
              {language === lang.code && <Check size={14} style={{ color: '#00D084' }} />}
            </button>
          ))}
        </div>
      </motion.div>

      {/* WB API Token */}
      <motion.div
        className="panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ border: tokenStatus === 'active' ? '1px solid rgba(0,208,132,0.3)' : undefined }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(0,208,132,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#00D084',
          }}>
            <Key size={20} />
          </div>
          <div>
            <h2 className="panel-section-title" style={{ margin: 0 }}>🔑 API Токен Wildberries</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Создайте один токен со всеми правами доступа
            </p>
          </div>
        </div>

        {/* Инструкция */}
        <div style={{
          margin: '20px 0',
          padding: '16px 20px',
          background: 'var(--bg-input)',
          borderRadius: 10,
          borderLeft: '3px solid var(--accent)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.8 }}>
            1. Откройте <strong style={{ color: 'var(--text-primary)' }}>seller.wildberries.ru</strong> → Настройки → Доступ к API<br />
            2. Нажмите «Создать токен»<br />
            3. Выберите <strong style={{ color: 'var(--accent)' }}>ВСЕ права</strong>: Контент, Статистика, Аналитика,<br />
            &nbsp;&nbsp;&nbsp;&nbsp;Финансы, Цены и скидки, Поставки, Возвраты, Документы<br />
            4. Скопируйте токен и вставьте ниже
          </p>
        </div>

        {/* Поле ввода токена */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type={tokenVisible ? 'text' : 'password'}
              value={tokenValue}
              onChange={e => { setTokenValue(e.target.value); setTokenStatus('idle') }}
              placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
              style={{
                width: '100%',
                padding: '12px 44px 12px 14px',
                background: 'var(--bg-input)',
                border: `1px solid ${tokenStatus === 'active' ? 'rgba(0,208,132,0.4)' : tokenStatus === 'error' ? 'rgba(255,107,107,0.4)' : 'var(--border)'}`,
                borderRadius: 10,
                color: 'var(--text-primary)',
                fontSize: 13,
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => setTokenVisible(v => !v)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', padding: 4, display: 'flex',
              }}
            >
              {tokenVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {tokenStatus === 'active' && (
            <button
              onClick={handleClearToken}
              style={{
                padding: '0 14px', background: 'rgba(255,107,107,0.1)',
                border: '1px solid rgba(255,107,107,0.2)', borderRadius: 10,
                color: '#FF6B6B', cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Кнопка проверки */}
        <button
          onClick={handleSaveToken}
          disabled={!tokenValue || tokenValue.startsWith('•') || tokenStatus === 'checking'}
          style={{
            width: '100%', padding: '13px',
            background: tokenStatus === 'active' ? 'rgba(0,208,132,0.15)'
              : tokenStatus === 'error' ? 'rgba(255,107,107,0.15)'
              : 'var(--accent)',
            color: tokenStatus === 'active' ? '#00D084'
              : tokenStatus === 'error' ? '#FF6B6B'
              : '#000',
            border: `1px solid ${tokenStatus === 'active' ? 'rgba(0,208,132,0.3)' : tokenStatus === 'error' ? 'rgba(255,107,107,0.3)' : 'transparent'}`,
            borderRadius: 10, fontSize: 14, fontWeight: 700,
            cursor: (!tokenValue || tokenValue.startsWith('•') || tokenStatus === 'checking') ? 'not-allowed' : 'pointer',
            marginBottom: 16, transition: 'all 0.15s ease',
          }}
        >
          {tokenStatus === 'checking' ? '⏳ Проверяем токен...' : 'Проверить и сохранить'}
        </button>

        {/* Статус */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor,
            boxShadow: tokenStatus === 'active' ? '0 0 6px rgba(0,208,132,0.6)' : 'none' }} />
          <span style={{ fontSize: 13, color: statusColor, fontWeight: 600 }}>{statusText}</span>
          {lastSync && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
            Синхр: {lastSync}
          </span>}
        </div>

        {/* Что даёт токен */}
        <div style={{
          padding: '16px', background: 'var(--bg-input)',
          borderRadius: 10, border: '1px solid var(--border-card)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Что даёт этот токен
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {capabilities.map(({ icon: Icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                fontSize: 12, color: 'var(--text-secondary)',
              }}>
                <Icon size={13} style={{ color: 'var(--accent)' }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Financial Parameters */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <h2 className="panel-section-title">💰 Финансовые параметры</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div className="profile-field">
            <label>Себестоимость товаров (₽)</label>
            <input
              type="number"
              placeholder="0"
              defaultValue={0}
              onChange={_ => console.log('Cost updated')}
              className="input-field"
            />
            <small style={{ color: 'var(--text-muted)', marginTop: 4 }}>Сумма себестоимости для расчёта маржи и ROI</small>
          </div>
          <div className="profile-field">
            <label>Налоговая ставка (%)</label>
            <select defaultValue="18" className="input-field">
              <option value="0">Без налогов</option>
              <option value="6">УСН 6%</option>
              <option value="15">УСН 15%</option>
              <option value="18">НДС 18%</option>
              <option value="20">НДС 20%</option>
            </select>
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: 16 }}>
          <Save size={14} /> Сохранить финансовые параметры
        </button>
      </motion.div>

      {/* Notifications */}
      <motion.div className="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="panel-section-title">🔔 Уведомления</h2>
        <div className="notifications-list">
          {[
            { key: 'email',            title: 'Email уведомления',      desc: 'Получайте важные уведомления на почту' },
            { key: 'telegram',         title: 'Telegram уведомления',   desc: 'Получайте уведомления в Telegram боте' },
            { key: 'lowStock',         title: 'Низкий остаток товара',  desc: 'Уведомлять когда остаток ниже 10 единиц' },
            { key: 'newOrders',        title: 'Новые заказы',           desc: 'Уведомлять о каждом новом заказе' },
            { key: 'paymentSuccessful',title: 'Успешные выплаты',       desc: 'Уведомлять при переводе денег на счёт' },
            { key: 'systemAlerts',     title: 'Системные алерты',       desc: 'Уведомлять о системных ошибках' },
          ].map(n => (
            <div key={n.key} className="notification-item">
              <div className="notification-info">
                <h4>{n.title}</h4>
                <p>{n.desc}</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifications[n.key as keyof typeof notifications]}
                  onChange={e => setNotifications({ ...notifications, [n.key]: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{ marginTop: 16 }}>
          <Save size={14} /> Сохранить настройки уведомлений
        </button>
      </motion.div>

      {/* Danger Zone */}
      <motion.div className="panel danger-zone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <h2 className="panel-section-title" style={{ color: '#dc2626' }}>⚠️ Опасная зона</h2>
        <div className="danger-actions">
          <div className="danger-item">
            <div>
              <h4>Удалить аккаунт</h4>
              <p>Безвозвратно удалить все данные из системы</p>
            </div>
            <button className="btn-danger">Удалить аккаунт</button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
