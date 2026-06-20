import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

const plans = [
  {
    id: 'starter',
    name: 'СТАРТ',
    price: 0,
    period: '/мес',
    badge: null,
    popular: false,
    features: [
      { text: '1 магазин', included: true },
      { text: 'Данные за 7 дней', included: true },
      { text: 'Только статистика', included: true },
      { text: 'Фото товаров', included: false },
      { text: 'Финансы WB', included: false },
    ],
    cta: 'Текущий план',
  },
  {
    id: 'basic',
    name: 'БАЗОВЫЙ',
    price: 1490,
    period: '/мес',
    badge: null,
    popular: false,
    features: [
      { text: '1 магазин', included: true },
      { text: 'Данные за 30 дней', included: true },
      { text: '5 токенов (без рекламы)', included: true },
      { text: 'Фото товаров', included: true },
      { text: 'ABC-анализ', included: true },
    ],
    cta: 'Выбрать',
  },
  {
    id: 'pro',
    name: 'ПРОФИ',
    price: 2990,
    period: '/мес',
    badge: '🔥 Популярный',
    popular: true,
    features: [
      { text: '3 магазина', included: true },
      { text: 'Данные за 90 дней', included: true },
      { text: 'Все 6 токенов', included: true },
      { text: 'Telegram алерты', included: true },
      { text: 'Excel выгрузка', included: true },
      { text: 'Реклама WB', included: true },
    ],
    cta: 'Выбрать',
  },
  {
    id: 'business',
    name: 'БИЗНЕС',
    price: 5990,
    period: '/мес',
    badge: null,
    popular: false,
    features: [
      { text: '10 магазинов', included: true },
      { text: 'Данные за 365 дней', included: true },
      { text: 'Всё из Профи', included: true },
      { text: 'API доступ', included: true },
      { text: 'Приоритетная поддержка', included: true },
      { text: 'Персональный консультант', included: true },
    ],
    cta: 'Выбрать',
  },
]

export const Subscriptions = () => {
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>('month')

  const getPrice = (basePrice: number) => {
    if (billingPeriod === 'year') {
      return Math.round(basePrice * 12 * 0.833)
    }
    return basePrice
  }

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
            textAlign: 'center',
            marginBottom: '48px',
          }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1
            style={{
              fontSize: '40px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 16px 0',
            }}
          >
            Выберите тариф
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--text-secondary)',
              margin: '0 0 32px 0',
            }}
          >
            Начните бесплатно, масштабируйтесь по мере роста
          </p>

          {/* Billing Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            <button
              onClick={() => setBillingPeriod('month')}
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                background: billingPeriod === 'month' ? 'var(--accent)' : 'transparent',
                color: billingPeriod === 'month' ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (billingPeriod !== 'month')
                  (e.target as HTMLElement).style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                if (billingPeriod !== 'month')
                  (e.target as HTMLElement).style.color = 'var(--text-secondary)'
              }}
            >
              Месяц
            </button>
            <div
              style={{
                width: '1px',
                height: '24px',
                background: 'var(--border)',
              }}
            />
            <button
              onClick={() => setBillingPeriod('year')}
              style={{
                padding: '10px 24px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                background: billingPeriod === 'year' ? 'var(--accent)' : 'transparent',
                color: billingPeriod === 'year' ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (billingPeriod !== 'year')
                  (e.target as HTMLElement).style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                if (billingPeriod !== 'year')
                  (e.target as HTMLElement).style.color = 'var(--text-secondary)'
              }}
            >
              Год
            </button>
            {billingPeriod === 'year' && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  marginLeft: '16px',
                  padding: '6px 12px',
                  background: 'rgba(0,208,132,0.15)',
                  color: 'var(--accent)',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '20px',
                  border: '1px solid rgba(0,208,132,0.2)',
                }}
              >
                −2 месяца 🎁
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* PLANS GRID */}
        <motion.div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            marginBottom: '64px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              style={{
                position: 'relative',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                zIndex: plan.popular ? 10 : 0,
              }}
            >
              <div
                style={{
                  background: 'var(--bg-card)',
                  border:
                    plan.popular
                      ? '2px solid var(--accent)'
                      : '1px solid var(--border-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  position: 'relative',
                  boxShadow: plan.popular ? 'var(--shadow-glow-green)' : 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!plan.popular)
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,208,132,0.3)'
                }}
                onMouseLeave={(e) => {
                  if (!plan.popular)
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-card)'
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '6px 16px',
                      background: 'var(--accent)',
                      color: '#000',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '20px',
                    }}
                  >
                    {plan.badge}
                  </motion.div>
                )}

                {/* Plan Name */}
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: plan.popular ? '12px 0 16px 0' : '0 0 16px 0',
                  }}
                >
                  {plan.name}
                </h3>

                {/* Price */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    {plan.price > 0 ? (
                      <>
                        <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent)' }}>
                          {getPrice(plan.price).toLocaleString('ru-RU')}
                        </span>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {plan.period}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Бесплатно
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {plan.features.map((feature, fIdx) => (
                    <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      {feature.included ? (
                        <Check
                          size={18}
                          style={{
                            color: 'var(--accent)',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        />
                      ) : (
                        <X
                          size={18}
                          style={{
                            color: 'var(--text-muted)',
                            flexShrink: 0,
                            marginTop: '2px',
                            opacity: 0.5,
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontSize: '13px',
                          color: feature.included ? 'var(--text-primary)' : 'var(--text-muted)',
                          textDecoration: feature.included ? 'none' : 'line-through',
                          opacity: feature.included ? 1 : 0.6,
                        }}
                      >
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => alert('Переход на тариф: ' + plan.name)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background:
                      plan.cta === 'Текущий план' ? 'var(--bg-input)' : 'var(--accent)',
                    color: plan.cta === 'Текущий план' ? 'var(--text-secondary)' : '#000',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    if (plan.cta !== 'Текущий план') {
                      (e.target as HTMLElement).style.background = 'var(--accent-hover)'
                      ;(e.target as HTMLElement).style.boxShadow = '0 4px 15px rgba(0,208,132,0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.cta !== 'Текущий план') {
                      (e.target as HTMLElement).style.background = 'var(--accent)'
                      ;(e.target as HTMLElement).style.boxShadow = 'none'
                    }
                  }}
                >
                  {plan.cta === 'Текущий план' && <Check size={16} />}
                  {plan.cta}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
