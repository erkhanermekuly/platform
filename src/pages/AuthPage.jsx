import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        if (!formData.email || !formData.password) {
          setError('Заполните все поля');
          return;
        }
        await login(formData.email, formData.password);
      } else {
        // Register
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
          setError('Заполните все поля');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Пароли не совпадают');
          return;
        }
        if (formData.password.length < 6) {
          setError('Пароль должен быть не менее 6 символов');
          return;
        }
        await register(formData.name, formData.email, formData.password);
      }

      navigate('/');
    } catch (err) {
      setError(err.message || 'Ошибка при авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <h1>{isLogin ? 'Вход' : 'Регистрация'}</h1>
            <p>
              {isLogin ? 'Введите свои данные для входа' : 'Создайте новый аккаунт'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            {/* Name Field (Register only) */}
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Имя</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Введите ваше имя"
                  className="form-input"
                />
              </div>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="form-input"
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="form-input"
              />
            </div>

            {/* Confirm Password Field (Register only) */}
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Подтвердите пароль</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="form-input"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-large"
            >
              {loading ? 'Загрузка...' : isLogin ? 'Вход' : 'Создать аккаунт'}
            </button>
          </form>

          {/* Toggle */}
          <div className="auth-toggle">
            <p>
              {isLogin ? 'У вас нет аккаунта?' : 'У вас есть аккаунт?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                }}
                className="toggle-btn"
              >
                {isLogin ? 'Зарегистрируйтесь' : 'Войдите'}
              </button>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="demo-credentials">
            <p>Демо данные:</p>
            <code>Email: demo@example.com | Пароль: password</code>
          </div>
        </div>

        {/* Side Illustration */}
        <div className="auth-illustration">
          <svg width="100%" height="100%" viewBox="0 0 300 400">
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <circle cx="150" cy="100" r="60" fill="url(#grad)" />
            <rect x="100" y="200" width="100" height="120" fill="#e0e7ff" rx="10" />
            <text x="150" y="270" textAnchor="middle" fill="#6366f1" fontSize="24" fontWeight="bold">
              Learn
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
