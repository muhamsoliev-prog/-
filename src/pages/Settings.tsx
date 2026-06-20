import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Key, User, Bell, Shield, Check, Eye, EyeOff, X, Save,
  Package, DollarSign, BarChart2, Image, TrendingUp, Tag,
} from 'lucide-react'
import axios from 'axios'
import { useLanguage } from '../context/LanguageContext'

const PAGE_BG = '#0A0A0B'
const CARD_BG  = '#111113'
const INPUT_BG = '#18181B'
const BORDER   = 'rgba(255,255,255,0.06)'
const TEXT1    = '#F0F0F5'
const TEXT2    = '#8B8B9A'

type TokenStatus = 'idle' | 'checking' | 'active' | 'limited' | 'error'

const Section = ({ title, icon: Icon, children, delay = 0 }: {
  title: string; icon: React.ElementType; children: React.ReactNode; delay?: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16,
      padding: '24px 28px', marginBottom: 16 }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,208,132,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D084' }}>
        <Icon size={18} />
      </div>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT1 }}>{title}</h2>
    </div>
    {children}
  </motion.div>
)

const inputStyle = (focused?: boolean): React.CSSProperties => ({
  width: '100%', padding: '11px 14px', background: INPUT_BG,
  border: `1px solid ${focused ? '#00D084' : BORDER}`,
  borderRadius: 10, color: TEXT1, fontSize: 13, outline: 'none',
  transition: 'border-color 0.15s', boxSizing: 'border-box',
})

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: TEXT2, marginBottom: 6, fontWeight: 500,
}

export default function Settings() {
  const { language, setLanguage } = useLanguage()

  /* WB Token */
  const [tokenValue, setTokenValue]     = useState('')
  const [tokenVisible, setTokenVisible] = useState(false)
  const [tokenStatus, setTokenStatus]   = useState<TokenStatus>('idle')
  const [tokenWarning, setTokenWarning] = useState<string | null>(null)
  const [lastSync, setLastSync]         = useState<string | null>(null)

  /* Profile */
  const [profile, setProfile]   = useState({ name: '', email: '', phone: '', company: '' })
  const [editing, setEditing]   = useState(false)
  const [tempP, setTempP]       = useState(profile)

  /* Notifications */
  const [notifs, setNotifs] = useState({
    email: true, telegram: false, lowStock: true,
    newOrders: true, payments: true, alerts: false,
  })

  useEffect(() => {
    axios.get('/api/auth/me').then(({ data }) => {
      if (data.wbTokens?.main) {
        setTokenValue('••••••••••••••••••••••••')
        setTokenStatus(data.wbTokens.status === 'active' ? 'active' : 'limited')
        if (data.wbTokens.lastCheck)
          setLastSync(new Date(data.wbTokens.lastCheck).toLocaleString('ru-RU'))
      }
      setProfile(p => ({
        ...p,
        name:  data.name  || '',
        email: data.email || '',
        phone: data.phone || '',
      }))
    }).catch(() => {})
  }, [])

  const handleSaveToken = async () => {
    if (!tokenValue || tokenValue.startsWith('•')) return
    setTokenStatus('checking')
    setTokenWarning(null)
    try {
      const { data } = await axios.post('/api/wb/save-token', { token: tokenValue })
      setTokenStatus(data.status === 'active' ? 'active' : 'limited')
      setTokenWarning(data.warning || null)
      setLastSync(new Date().toLocaleString('ru-RU'))
      // Автосинхронизация карточек
      const jwt = localStorage.getItem('token')
      if (jwt) fetch('/api/wb/sync-products', {
        method: 'POST', headers: { Authorization: `Bearer ${jwt}` },
      }).then(r => r.json()).then(d => console.log('Синхронизировано:', d.count)).catch(() => {})
    } catch {
      setTokenStatus('error')
    }
  }

  const statusMeta: Record<TokenStatus, { color: string; text: string }> = {
    idle:     { color: '#8B8B9A', text: '○ Токен не добавлен' },
    checking: { color: '#FFB830', text: '⏳ Проверяем...' },
    active:   { color: '#00D084', text: '✓ Токен активен' },
    limited:  { color: '#FFB830', text: '⚠ Токен сохранён (ограниченный доступ)' },
    error:    { color: '#FF6B6B', text: '✗ Ошибка сохранения' },
  }
  const sm = statusMeta[tokenStatus]

  const CAPABILITIES = [
    { icon: Package,    label: 'Заказы и продажи' },
    { icon: DollarSign, label: 'Финансы WB' },
    { icon: BarChart2,  label: 'Аналитика и отчёты' },
    { icon: Image,      label: 'Фото товаров' },
    { icon: TrendingUp, label: 'Статистика' },
    { icon: Tag,        label: 'Цены и скидки' },
  ]

  const LANGS = [
    { code: 'ru', name: 'Русский',  flag: '🇷🇺' },
    { code: 'en', name: 'English',  flag: '🇺🇸' },
    { code: 'zh', name: '中文',     flag: '🇨🇳' },
    { code: 'tg', name: 'Тоҷикӣ', flag: '🇹🇯' },
  ]

  return (
    <div style={{ padding: '28px 32px', background: PAGE_BG, minHeight: '100%' }}>

      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: TEXT1 }}>Настройки</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: TEXT2 }}>Управление аккаунтом и интеграциями</p>
      </motion.div>

      {/* PROFILE */}
      <Section title="Профиль пользователя" icon={User} delay={0.05}>
        {!editing ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {[
                { label: 'Имя и фамилия', value: profile.name  || '—' },
                { label: 'Email',          value: profile.email || '—' },
                { label: 'Телефон',        value: profile.phone || '—' },
                { label: 'Компания',       value: profile.company || '—' },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ ...labelStyle }}>{f.label}</p>
                  <p style={{ margin: 0, padding: '10px 14px', background: INPUT_BG,
                    borderRadius: 10, fontSize: 13, color: TEXT1,
                    border: `1px solid ${BORDER}` }}>{f.value}</p>
                </div>
              ))}
            </div>
            <button onClick={() => { setTempP(profile); setEditing(true) }}
              style={{ padding: '10px 22px', background: '#00D084', color: '#000',
                border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Редактировать
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {(['name', 'email', 'phone', 'company'] as const).map(f => (
                <div key={f}>
                  <label style={labelStyle}>{{ name: 'Имя', email: 'Email', phone: 'Телефон', company: 'Компания' }[f]}</label>
                  <input
                    value={tempP[f]}
                    onChange={e => setTempP({ ...tempP, [f]: e.target.value })}
                    style={inputStyle()}
                    onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#00D084'}
                    onBlur={e => (e.target as HTMLInputElement).style.borderColor = BORDER}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setProfile(tempP); setEditing(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                  background: '#00D084', color: '#000', border: 'none', borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <Save size={14} /> Сохранить
              </button>
              <button onClick={() => setEditing(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                  background: INPUT_BG, color: TEXT2, border: `1px solid ${BORDER}`,
                  borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
                <X size={14} /> Отмена
              </button>
            </div>
          </div>
        )}
      </Section>

      {/* WB TOKEN */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{
          background: CARD_BG, borderRadius: 16, padding: '24px 28px', marginBottom: 16,
          border: `1px solid ${tokenStatus === 'active' ? 'rgba(0,208,132,0.3)' : tokenStatus === 'error' ? 'rgba(255,107,107,0.2)' : BORDER}`,
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,208,132,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00D084' }}>
            <Key size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT1 }}>API Токен Wildberries</h2>
            <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>Один токен для всех данных</p>
          </div>
        </div>

        {/* Инструкция */}
        <div style={{ padding: '14px 18px', background: INPUT_BG, borderRadius: 10,
          borderLeft: '3px solid #00D084', marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2, lineHeight: 1.9 }}>
            1. Откройте <strong style={{ color: TEXT1 }}>seller.wildberries.ru</strong> → Настройки → Доступ к API<br />
            2. Нажмите «Создать токен» — выберите <strong style={{ color: '#00D084' }}>ВСЕ права</strong><br />
            3. Скопируйте токен и вставьте в поле ниже
          </p>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={tokenVisible ? 'text' : 'password'}
              value={tokenValue}
              onChange={e => { setTokenValue(e.target.value); setTokenStatus('idle'); setTokenWarning(null) }}
              placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
              style={{
                ...inputStyle(),
                paddingRight: 44,
                fontFamily: 'monospace',
                borderColor: tokenStatus === 'active' ? 'rgba(0,208,132,0.4)'
                  : tokenStatus === 'error' ? 'rgba(255,107,107,0.4)' : BORDER,
              }}
            />
            <button onClick={() => setTokenVisible(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: TEXT2, cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center' }}>
              {tokenVisible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {(tokenStatus === 'active' || tokenStatus === 'limited') && (
            <button onClick={() => { setTokenValue(''); setTokenStatus('idle'); setTokenWarning(null); setLastSync(null) }}
              style={{ padding: '0 14px', background: 'rgba(255,107,107,0.1)',
                border: '1px solid rgba(255,107,107,0.2)', borderRadius: 10,
                color: '#FF6B6B', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={15} />
            </button>
          )}
        </div>

        <button
          onClick={handleSaveToken}
          disabled={!tokenValue || tokenValue.startsWith('•') || tokenStatus === 'checking'}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 700,
            cursor: (!tokenValue || tokenValue.startsWith('•') || tokenStatus === 'checking') ? 'not-allowed' : 'pointer',
            marginBottom: 14, transition: 'all 0.15s',
            background: tokenStatus === 'active' ? 'rgba(0,208,132,0.12)'
              : tokenStatus === 'error'  ? 'rgba(255,107,107,0.12)' : '#00D084',
            color: tokenStatus === 'active' ? '#00D084'
              : tokenStatus === 'error' ? '#FF6B6B' : '#000',
            border: `1px solid ${tokenStatus === 'active' ? 'rgba(0,208,132,0.3)'
              : tokenStatus === 'error' ? 'rgba(255,107,107,0.3)' : 'transparent'}`,
          }}
        >
          {tokenStatus === 'checking' ? '⏳ Проверяем токен...' : 'Проверить и сохранить'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sm.color,
            boxShadow: tokenStatus === 'active' ? '0 0 6px rgba(0,208,132,0.6)' : 'none' }} />
          <span style={{ fontSize: 13, color: sm.color, fontWeight: 600 }}>{sm.text}</span>
          {lastSync && <span style={{ fontSize: 11, color: '#555568', marginLeft: 4 }}>· {lastSync}</span>}
        </div>

        {tokenWarning && (
          <div style={{ padding: '10px 14px', background: 'rgba(255,184,48,0.08)',
            border: '1px solid rgba(255,184,48,0.2)', borderRadius: 9, marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#FFB830' }}>{tokenWarning}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CAPABILITIES.map(({ icon: Icon, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, fontSize: 12,
              background: INPUT_BG, border: `1px solid ${BORDER}`, color: TEXT2,
            }}>
              <Icon size={12} style={{ color: '#00D084' }} /> {label}
            </div>
          ))}
        </div>
      </motion.div>

      {/* LANGUAGE */}
      <Section title="Язык интерфейса" icon={Check} delay={0.15}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {LANGS.map(lang => (
            <button key={lang.code} onClick={() => setLanguage(lang.code as 'ru' | 'en' | 'zh' | 'tg')}
              style={{
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                background: language === lang.code ? 'rgba(0,208,132,0.1)' : INPUT_BG,
                border: `1px solid ${language === lang.code ? 'rgba(0,208,132,0.4)' : BORDER}`,
                color: language === lang.code ? '#00D084' : TEXT2,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500,
              }}>
              <span style={{ fontSize: 18 }}>{lang.flag}</span>
              {lang.name}
              {language === lang.code && <Check size={13} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      </Section>

      {/* NOTIFICATIONS */}
      <Section title="Уведомления" icon={Bell} delay={0.2}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { key: 'email',    title: 'Email уведомления',     desc: 'Важные уведомления на почту' },
            { key: 'telegram', title: 'Telegram',              desc: 'Уведомления в Telegram боте' },
            { key: 'lowStock', title: 'Низкий остаток',        desc: 'Когда остаток ниже 10 единиц' },
            { key: 'newOrders',title: 'Новые заказы',          desc: 'При каждом новом заказе' },
            { key: 'payments', title: 'Выплаты WB',            desc: 'При переводе средств на счёт' },
            { key: 'alerts',   title: 'Системные алерты',      desc: 'Технические ошибки системы' },
          ].map((n, idx, arr) => (
            <div key={n.key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 0',
              borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: TEXT1, fontWeight: 500 }}>{n.title}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: TEXT2 }}>{n.desc}</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer', flexShrink: 0 }}>
                <input type="checkbox" checked={notifs[n.key as keyof typeof notifs]}
                  onChange={e => setNotifs({ ...notifs, [n.key]: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 12, transition: 'all 0.2s',
                  background: notifs[n.key as keyof typeof notifs] ? '#00D084' : 'rgba(255,255,255,0.1)',
                }}>
                  <span style={{
                    position: 'absolute', top: 3, transition: 'left 0.2s',
                    left: notifs[n.key as keyof typeof notifs] ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  }} />
                </span>
              </label>
            </div>
          ))}
        </div>
      </Section>

      {/* DANGER ZONE */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        style={{ background: CARD_BG, border: '1px solid rgba(255,107,107,0.15)', borderRadius: 16, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,107,107,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B6B' }}>
            <Shield size={18} />
          </div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#FF6B6B' }}>Опасная зона</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: TEXT1, fontWeight: 500 }}>Удалить аккаунт</p>
            <p style={{ margin: '2px 0 0 0', fontSize: 12, color: TEXT2 }}>Все данные будут безвозвратно удалены</p>
          </div>
          <button style={{ padding: '9px 18px', background: 'rgba(255,107,107,0.1)',
            color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Удалить аккаунт
          </button>
        </div>
      </motion.div>

    </div>
  )
}
