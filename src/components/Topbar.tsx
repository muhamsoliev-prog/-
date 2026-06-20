import { Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  const userName = localStorage.getItem('userName') || user?.name || user?.ipName || user?.email || 'Компания'
  const businessName = `ИП ${userName}`

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 260,
        right: 0,
        height: '38px',
        zIndex: 999,
        background: 'var(--bg-topbar)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Левая часть — название ИП */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: theme === 'dark' ? '#000' : '#fff',
            flexShrink: 0,
          }}
        >
          W
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '0.01em',
          }}
        >
          {businessName}
        </span>
      </div>

      {/* Правая часть — кнопки */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {/* Переключатель темы */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-input)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '3px 10px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            fontSize: 12,
            height: 26,
            transition: 'all 0.15s ease',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.color = 'var(--accent)'
            btn.style.borderColor = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.color = 'var(--text-secondary)'
            btn.style.borderColor = 'var(--border)'
          }}
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' 
            ? (
              <>
                <Sun size={13} style={{ flexShrink: 0 }} />
                <span>Светлая</span>
              </>
            )
            : (
              <>
                <Moon size={13} style={{ flexShrink: 0 }} />
                <span>Тёмная</span>
              </>
            )
          }
        </button>

        {/* Кнопка выхода */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            padding: '3px 10px',
            cursor: 'pointer',
            color: '#ef4444',
            fontSize: 12,
            height: 26,
            transition: 'all 0.15s ease',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.background = 'rgba(239, 68, 68, 0.2)'
            btn.style.borderColor = '#ef4444'
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.background = 'rgba(239, 68, 68, 0.1)'
            btn.style.borderColor = 'rgba(239, 68, 68, 0.3)'
          }}
          title="Выйти из аккаунта"
        >
          <LogOut size={13} style={{ flexShrink: 0 }} />
          <span>Выйти</span>
        </button>
      </div>
    </div>
  )
}
