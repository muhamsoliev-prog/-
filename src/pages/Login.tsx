import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

export default function Login() {
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
    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Вход выполнен!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      toast.error('Заполните все поля');
      return;
    }
    if (!agreed) {
      toast.error('Согласитесь с условиями использования');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Регистрация выполнена!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Логотип */}
        <div className="login-logo">W</div>

        {/* Переключатель режима */}
        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Вход
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            Регистрация
          </button>
        </div>

        {/* Форма входа */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="login-form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div className="login-form-group">
              <label>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Загрузка...' : 'Войти'}
            </button>
          </form>
        )}

        {/* Форма регистрации */}
        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="login-form-group">
              <label>Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Петров"
                disabled={loading}
              />
            </div>

            <div className="login-form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div className="login-form-group">
              <label>Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div className="login-checkbox">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="agree">
                Я согласен с условиями использования
              </label>
            </div>

            <button type="submit" className="login-btn" disabled={loading || !agreed}>
              {loading ? 'Загрузка...' : 'Зарегистрироваться'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
