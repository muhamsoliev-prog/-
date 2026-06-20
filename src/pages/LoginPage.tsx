import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Заполните все поля'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Вход выполнен!');
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) { toast.error('Заполните все поля'); return; }
    if (!agreed) { toast.error('Согласитесь с условиями использования'); return; }
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Регистрация выполнена!');
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0D1117',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#161B22',
        border: '1px solid rgba(240, 246, 252, 0.1)',
        borderRadius: '14px',
        padding: '40px 32px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{
          width: '48px', height: '48px',
          background: '#00D084',
          borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: 700, color: '#0D1117',
          margin: '0 auto 32px',
        }}>O</div>

        <h2 style={{ textAlign: 'center', color: '#E6EDF3', marginBottom: '24px', fontSize: '20px' }}>
          OSINOT Analytics
        </h2>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '28px',
          background: '#21262D', padding: '4px', borderRadius: '10px',
        }}>
          {(['login', 'register'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              style={{
                flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                background: mode === tab ? '#161B22' : 'transparent',
                color: mode === tab ? '#00D084' : '#8B949E',
                boxShadow: mode === tab ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'login' ? 'Вход' : 'Регистрация'}
            </button>
          ))}
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" disabled={loading} />
            </Field>
            <Field label="Пароль">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" disabled={loading} />
            </Field>
            <SubmitBtn loading={loading} label="Войти" />
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <Field label="Имя">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Иван Петров" disabled={loading} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" disabled={loading} />
            </Field>
            <Field label="Пароль">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" disabled={loading} />
            </Field>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <input type="checkbox" id="agree" checked={agreed}
                onChange={e => setAgreed(e.target.checked)} disabled={loading}
                style={{ width: '16px', height: '16px', accentColor: '#00D084', cursor: 'pointer' }} />
              <label htmlFor="agree" style={{ fontSize: '13px', color: '#8B949E', cursor: 'pointer' }}>
                Я согласен с условиями использования
              </label>
            </div>
            <SubmitBtn loading={loading} label="Зарегистрироваться" disabled={!agreed} />
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#8B949E', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}

function SubmitBtn({ loading, label, disabled }: { loading: boolean; label: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      style={{
        width: '100%', padding: '13px',
        background: loading || disabled ? 'rgba(0,208,132,0.4)' : '#00D084',
        color: '#0D1117', border: 'none', borderRadius: '10px',
        fontSize: '15px', fontWeight: 700, cursor: loading || disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        marginTop: '8px',
      }}
    >
      {loading ? 'Загрузка...' : label}
    </button>
  );
}
