import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categoriesAPI, coursesAPI, authAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';
import '../styles/pages.css';

export default function ApiCheckPage() {
  const { isAuthenticated } = useAuth();
  const [log, setLog] = useState([]);

  const push = (title, ok, detail) => {
    setLog((prev) => [...prev, { t: new Date().toISOString(), title, ok, detail }]);
  };

  const run = async (title, fn) => {
    try {
      const data = await fn();
      push(title, true, JSON.stringify(data, null, 2));
    } catch (e) {
      push(title, false, e.message || String(e));
    }
  };

  return (
    <div className="course-details-page api-check-page">
      <p style={{ marginBottom: 16 }}>
        <Link to="/courses">← К курсам</Link>
      </p>
      <h1 style={{ marginBottom: 8 }}>Проверка API</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Запросы идут на <code>VITE_API_URL</code> (в dev через прокси Vite → бэкенд{' '}
        <code>127.0.0.1:5240</code>).
      </p>

      <div className="api-check-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => run('GET /api/categories', () => categoriesAPI.getCategories())}
        >
          Категории
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => run('GET /api/courses', () => coursesAPI.getAllCourses())}
        >
          Курсы
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!isAuthenticated}
          title={!isAuthenticated ? 'Войдите, чтобы вызвать /api/auth/me' : undefined}
          onClick={() => run('GET /api/auth/me', () => authAPI.getCurrentUser())}
        >
          Текущий пользователь (JWT)
        </button>
      </div>

      {!isAuthenticated && (
        <p style={{ fontSize: 14, color: '#92400e', marginBottom: 16 }}>
          Для «Текущий пользователь» нужен вход: сохранённый токен в{' '}
          <code>localStorage</code>.
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {log.map((row, i) => (
          <li
            key={`${row.t}-${i}`}
            style={{
              marginBottom: 16,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 12,
              background: row.ok ? '#f0fdf4' : '#fef2f2',
            }}
          >
            <strong>{row.title}</strong>{' '}
            <span style={{ color: row.ok ? '#166534' : '#991b1b' }}>
              {row.ok ? 'OK' : 'Ошибка'}
            </span>
            <pre
              style={{
                marginTop: 8,
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 240,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {row.detail}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
