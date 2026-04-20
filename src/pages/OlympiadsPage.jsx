import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { olympiadsAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';
import '../styles/olympiads.css';

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

  const handleDelete = async (olympiadId) => {
    if (!window.confirm('Удалить олимпиаду вместе со всеми вопросами и результатами?')) return;
    try {
      await olympiadsAPI.remove(olympiadId);
      await load();
    } catch (err) {
      alert(err?.message || 'Не удалось удалить олимпиаду');
    }
  };

  return (
    <div className="olym-root">
      <div className="olym-shell">
        <div className="olym-toolbar">
          <div>
            <div className="olym-kicker">Центр олимпиад</div>
            <h1 className="olym-title" style={{ margin: '6px 0 0' }}>
              Олимпиады
            </h1>
            <p className="olym-desc" style={{ marginTop: 10 }}>
              Одна зачётная попытка на олимпиаду. После прохождения доступ к тесту закрывается; рейтинг и бонусы
              ведёт администратор.
            </p>
          </div>
          {isAdmin && (
            <button type="button" className="olym-btn olymp-btn--primary" onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? 'Отмена' : '+ Новая олимпиада'}
            </button>
          )}
        </div>

        {isAdmin && formOpen && (
          <form className="olym-form-panel" onSubmit={handleCreate}>
            <input
              className="olym-input"
              type="text"
              placeholder="Название"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <textarea
              className="olym-textarea"
              placeholder="Описание для участников"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              className="olym-input"
              type="text"
              placeholder="URL обложки (необязательно)"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />
            <button type="submit" className="olym-btn olymp-btn--primary" disabled={creating} style={{ justifySelf: 'start' }}>
              {creating ? 'Создаём…' : 'Создать'}
            </button>
          </form>
        )}

        {loading && <p className="olym-empty">Загрузка…</p>}
        {error && <p className="olym-error">Ошибка: {error}</p>}

        {!loading && !error && items.length === 0 && (
          <p className="olym-empty">
            Пока нет ни одной олимпиады.
            {isAdmin ? ' Создайте первую через кнопку выше.' : ''}
          </p>
        )}

        <div className="olym-grid">
          {items.map((o) => {
            const done = !!o.myCompleted && !isAdmin;
            const qn = o.questionsCount ?? 0;
            return (
              <article key={o.id} className="olym-card">
                <div className={`olym-card-media${o.image ? '' : ' olymp-card-media--empty'}`}>
                  {o.image ? <img src={o.image} alt="" /> : <span aria-hidden>🏆</span>}
                </div>
                <div className="olym-card-body">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    <h2 className="olym-card-title">{o.title}</h2>
                    {done ? <span className="olym-pill olymp-pill--success">Пройдено</span> : null}
                    {isAdmin ? <span className="olym-pill olymp-pill--accent">Админ</span> : null}
                  </div>
                  <p className="olym-card-text">{o.description}</p>
                  <div className="olym-hero-meta" style={{ marginTop: 0 }}>
                    <span className="olym-pill olymp-pill--muted">Вопросов: {qn}</span>
                  </div>
                  <div className="olym-card-actions">
                    <Link className="olym-btn olymp-btn--primary" to={`/olympiads/${o.id}`}>
                      {done ? 'Мой результат' : isAdmin ? 'Открыть тест' : 'Начать'}
                    </Link>
                    {isAdmin && (
                      <>
                        <Link className="olym-btn olymp-btn--ghost" to={`/admin/olympiads/${o.id}/questions`}>
                          Вопросы
                        </Link>
                        <Link className="olym-btn olymp-btn--ghost" to={`/admin/olympiads/${o.id}/results`}>
                          Результаты
                        </Link>
                        <button type="button" className="olym-btn olymp-btn--danger" onClick={() => handleDelete(o.id)}>
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
