import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { olympiadsAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';

const emptyForm = { title: '', description: '', image: '' };

export default function OlympiadsPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await olympiadsAPI.list();
      if (res?.success && Array.isArray(res.data)) {
        setItems(res.data);
      } else {
        setError(res?.message || 'Не удалось загрузить олимпиады');
      }
    } catch (e) {
      setError(e?.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      alert('Заполните название и описание');
      return;
    }
    setCreating(true);
    try {
      await olympiadsAPI.create({
        title: form.title.trim(),
        description: form.description.trim(),
        image: form.image.trim() || undefined,
      });
      setForm(emptyForm);
      setFormOpen(false);
      await load();
    } catch (err) {
      alert(err?.message || 'Не удалось создать олимпиаду');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить олимпиаду вместе со всеми вопросами?')) return;
    try {
      await olympiadsAPI.remove(id);
      await load();
    } catch (err) {
      alert(err?.message || 'Не удалось удалить олимпиаду');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(160deg, #e8eef9 0%, #f0f4ff 45%, #e9ecf5 100%)',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#1f2937',
                margin: '0 0 6px',
              }}
            >
              🏆 Олимпиады
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Учебные олимпиады в формате тестирования
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setFormOpen((v) => !v)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background:
                  'linear-gradient(180deg, #4e7ee8 0%, #2b52b5 100%)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {formOpen ? 'Отмена' : '+ Новая олимпиада'}
            </button>
          )}
        </div>

        {isAdmin && formOpen && (
          <form
            onSubmit={handleCreate}
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              marginBottom: 28,
              boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
              display: 'grid',
              gap: 12,
            }}
          >
            <input
              type="text"
              placeholder="Название (например, Полимат)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={inputStyle}
            />
            <textarea
              placeholder="Описание"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <input
              type="text"
              placeholder="URL обложки (необязательно)"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#2b52b5',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: creating ? 0.7 : 1,
                }}
              >
                {creating ? 'Создаём…' : 'Создать'}
              </button>
            </div>
          </form>
        )}

        {loading && <p style={{ color: '#6b7280' }}>Загрузка…</p>}

        {error && (
          <p style={{ color: '#b91c1c' }}>Ошибка: {error}</p>
        )}

        {!loading && !error && items.length === 0 && (
          <p style={{ color: '#6b7280' }}>
            Пока нет ни одной олимпиады.
            {isAdmin && ' Создайте первую через кнопку выше.'}
          </p>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {items.map((o) => (
            <div
              key={o.id}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {o.image && (
                <img
                  src={o.image}
                  alt={o.title}
                  style={{
                    width: '100%',
                    height: 140,
                    objectFit: 'cover',
                    borderRadius: 12,
                  }}
                />
              )}
              <h3 style={{ margin: 0, color: '#0f2744' }}>{o.title}</h3>
              <p
                style={{
                  margin: 0,
                  color: '#4b5563',
                  fontSize: 14,
                  flex: 1,
                }}
              >
                {o.description}
              </p>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Вопросов: {o.questionsCount ?? 0}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link
                  to={`/olympiads/${o.id}`}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background:
                      'linear-gradient(180deg, #4e7ee8 0%, #2b52b5 100%)',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Пройти тест
                </Link>
                {isAdmin && (
                  <>
                    <Link
                      to={`/admin/olympiads/${o.id}/questions`}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: '#eef2ff',
                        color: '#2b52b5',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Вопросы
                    </Link>
                    <button
                      onClick={() => handleDelete(o.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid #fecaca',
                        background: '#fff',
                        color: '#b91c1c',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
};
