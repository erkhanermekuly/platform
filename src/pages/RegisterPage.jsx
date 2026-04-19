import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pathAfterAuth } from '../auth/roles';
import AuthSocialRow from '../components/auth/AuthSocialRow';
import AuthSwitchLink from '../components/auth/AuthSwitchLink';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!form.name?.trim() || !form.email || !form.password) {
        setError('Заполните все поля');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }
      const data = await register(form.name.trim(), form.email, form.password);
      const role = data?.user?.role;
      navigate(pathAfterAuth(role, location.state?.from), { replace: true });
    } catch (err) {
      setError(err.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.panel} ${styles.panelGradient}`}>
          <h2 className={`${styles.title} ${styles.titleLight}`}>Уже с нами?</h2>
          <p className={`${styles.subtitle} ${styles.subtitleLight}`}>
            Войдите под своим email и паролем — система проверит учётную запись в базе
          </p>
          <AuthSwitchLink to="/login" className={styles.ghostLink}>
            Войти
          </AuthSwitchLink>
        </div>
        <div className={`${styles.panel} ${styles.panelLight}`}>
          <h1 className={styles.title}>Регистрация</h1>
          <AuthSocialRow />
          <p className={styles.divider}>или создайте аккаунт</p>
          <form className={styles.form} onSubmit={onSubmit}>
            {error ? <div className={styles.error}>{error}</div> : null}
            <input
              className={styles.input}
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Имя"
              autoComplete="name"
            />
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
              placeholder="Пароль (не менее 6 символов)"
              autoComplete="new-password"
            />
            <input
              className={styles.input}
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Подтвердите пароль"
              autoComplete="new-password"
            />
            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? '…' : 'Создать аккаунт'}
            </button>
          </form>
          <p className={styles.footerLink}>
            После регистрации вы получите роль «студент». Доступ к курсам выдаёт администратор.
          </p>
        </div>
      </div>
    </div>
  );
}
