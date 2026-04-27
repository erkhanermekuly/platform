import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pathAfterAuth } from '../auth/roles';
import AuthSocialRow from '../components/auth/AuthSocialRow';
import AuthSwitchLink from '../components/auth/AuthSwitchLink';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!form.email || !form.password) {
        setError('Заполните email и пароль');
        return;
      }
      const data = await login(form.email, form.password);
      const role = data?.user?.role;
      navigate(pathAfterAuth(role, location.state?.from), { replace: true });
    } catch (err) {
      setError(err.message || 'Ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.panel} ${styles.panelLight}`}>
          <h1 className={styles.title}>Вход</h1>
          <AuthSocialRow />
          <p className={styles.divider}>или используйте аккаунт</p>
          <form className={styles.form} onSubmit={onSubmit}>
            {error ? <div className={styles.error}>{error}</div> : null}
            <input
              className={styles.input}
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              autoComplete="email"
            />
            <input
              className={styles.input}
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Пароль"
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.forgot}
              onClick={() => window.alert('Обратитесь к администратору платформы.')}
            >
              Забыли пароль?
            </button>
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? '…' : 'Войти'}
            </button>
          </form>
          {/* <p className={styles.hint}>
            Демо: admin@example.com / 123456 (админ)
          </p> */}
        </div>
        <div className={`${styles.panel} ${styles.panelGradient}`}>
          <div className={styles.titleContainer}>
            <h2 className={`${styles.title} ${styles.titleLight}`}>Привет!</h2>
            <p className={`${styles.subtitle} ${styles.subtitleLight}`}>
              Вместе с нами вы сможете освоить новые навыки и стать лучше!
            </p>
          </div>

          <p className={`${styles.subtitle} ${styles.subtitleLight2}`}>
            У вас нет аккаунта? Зарегистрируйтесь!
            <AuthSwitchLink to="/register" className={styles.ghostLink}>
              Регистрация
            </AuthSwitchLink>
          </p>
        </div>
      </div>
    </div>
  );
}
