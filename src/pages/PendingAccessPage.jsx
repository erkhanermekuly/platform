import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages.css';

export default function PendingAccessPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const switchAccount = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          textAlign: 'center',
          background: '#fff',
          borderRadius: 16,
          padding: '40px 32px',
          boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: 12, color: '#1f2937' }}>Аккаунт создан</h1>
        <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 8 }}>
          Здравствуйте, <strong>{user?.name}</strong>!
        </p>
        <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 28 }}>
          Учётная запись сохранена в базе. Доступ к курсам и материалам появится после того, как администратор
          назначит вам роль преподавателя или откроет доступ.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <button type="button" className="btn btn-primary" onClick={() => void switchAccount()}>
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
