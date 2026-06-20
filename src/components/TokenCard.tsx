import { useState } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface TokenCardProps {
  id: string
  label: string
  description: string
  icon: React.ElementType
  color: string
}

export const TokenCard = ({ label, description, icon: Icon, color }: Omit<TokenCardProps, 'id'>) => {
  const [isVisible, setIsVisible] = useState(false)
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'empty' | 'active' | 'error'>('empty')
  const [lastSync, setLastSync] = useState('')

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return '#00D084'
      case 'error':
        return '#FF6B6B'
      default:
        return '#8B949E'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return 'Активен'
      case 'error':
        return 'Ошибка'
      default:
        return 'Не добавлен'
    }
  }

  const handleCheck = async () => {
    if (!token) {
      setStatus('error')
      return
    }
    // Имитация проверки
    setStatus('active')
    setLastSync(new Date().toLocaleTimeString('ru-RU'))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${status === 'active' ? `${color}40` : 'var(--border-card)'}`,
        borderLeft: status === 'active' ? `3px solid ${color}` : '3px solid transparent',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e: any) => {
        if (status === 'active') {
          e.currentTarget.style.boxShadow = `0 0 30px ${color}20`
        }
      }}
      onMouseLeave={(e: any) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${color}20`,
            color: color,
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 4px 0',
            }}
          >
            {label}
          </h3>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              margin: 0,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Input Field */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <input
          type={isVisible ? 'text' : 'password'}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Вставьте API токен"
          style={{
            width: '100%',
            padding: '10px 40px 10px 12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'monospace',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = color
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        />

        {/* Eye Icon */}
        <button
          onClick={() => setIsVisible(!isVisible)}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e: any) => {
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e: any) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {/* Check Button */}
      <button
        onClick={handleCheck}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: color,
          color: '#000',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          marginBottom: '12px',
        }}
        onMouseEnter={(e: any) => {
          e.currentTarget.style.opacity = '0.9'
          e.currentTarget.style.boxShadow = `0 4px 12px ${color}40`
        }}
        onMouseLeave={(e: any) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        Проверить
      </button>

      {/* Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--bg-input)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
          }}
        />
        <span style={{ fontSize: '12px', color: getStatusColor(), fontWeight: 600 }}>
          {getStatusText()}
        </span>

        {status === 'error' && <X size={14} style={{ marginLeft: 'auto', color: '#FF6B6B' }} />}
        {status === 'active' && <Check size={14} style={{ marginLeft: 'auto', color: '#00D084' }} />}
      </div>

      {/* Last Sync */}
      {lastSync && (
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>
          Синхронизирован: {lastSync}
        </div>
      )}
    </motion.div>
  )
}
