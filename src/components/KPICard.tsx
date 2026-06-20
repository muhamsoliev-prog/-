import { motion } from 'framer-motion'

interface KPICardProps {
  title: string
  value: string
  change?: number
  subtitle?: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor?: string
  index?: number
}

export const KPICard = ({
  title, value, change, subtitle, icon: Icon,
  color, bgColor, borderColor, index = 0,
}: KPICardProps) => {
  const isNeg = (change ?? 0) < 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ translateY: -2 }}
      style={{
        background: '#111113',
        border: `1px solid ${borderColor ?? 'rgba(255,255,255,0.06)'}`,
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        cursor: 'default',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = color
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${color}20`
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = borderColor ?? 'rgba(255,255,255,0.06)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#8B8B9A',
            textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {title}
          </p>
          {subtitle && (
            <p style={{ margin: '2px 0 0 0', fontSize: 10, color: '#555568' }}>{subtitle}</p>
          )}
        </div>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: bgColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color, flexShrink: 0,
        }}>
          <Icon size={18} />
        </div>
      </div>

      <div style={{ fontSize: 26, fontWeight: 700, color: '#F0F0F5', lineHeight: 1 }}>
        {value}
      </div>

      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{
            padding: '2px 7px', borderRadius: 5, fontWeight: 600,
            color: isNeg ? '#FF6B6B' : '#00D084',
            background: isNeg ? 'rgba(255,107,107,0.12)' : 'rgba(0,208,132,0.12)',
          }}>
            {isNeg ? '↘' : '↗'} {Math.abs(change)}%
          </span>
          <span style={{ color: '#555568' }}>vs прошлый период</span>
        </div>
      )}
    </motion.div>
  )
}
