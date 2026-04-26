import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { olympiadsAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';
import '../styles/olympiads.css';

const emptyForm = { title: '', description: '' };


function textMatchesCategory(o, catId) {
  if (catId === 'all') return true;
  const hay = `${o.title || ''} ${o.description || ''}`.toLowerCase();
  const keywords = {
    math: ['math', 'матем', 'алгебр', 'геометр', 'числ', 'sigma', 'парадокс', 'арифмет'],
    science: ['science', 'наук', 'физик', 'хими', 'био', 'эко', 'космос', 'space', 'вселен', 'лаборатор'],
    logic: ['logic', 'логик', 'головоломк', 'puzzle', 'загадк', 'рассужден'],
    language: ['language', 'язык', 'лингв', 'граммат', 'abc', 'букв', 'письм', 'чтен'],
    coding: ['code', 'код', 'програм', 'byte', 'hackathon', 'айти', 'it ', ' it', 'алгоритм'],
    history: ['history', 'истор', 'прошл', 'хронолог'],
  };
  const list = keywords[catId] || [];
  return list.some((k) => hay.includes(k));
}

function formatOlympiadDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OlympiadsPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

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

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((o) => {
      if (!textMatchesCategory(o, category)) return false;
      if (!q) return true;
      const hay = `${o.title || ''} ${o.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, category]);

  const featuredPrimary = filteredItems[0];
  const featuredSecondary = filteredItems[1];
  const catalogRest = filteredItems.slice(2);

  return (
    <div className="olym-root olymp-catalog">
      <div className="olym-shell olymp-catalog-shell">
        <header className="olym-cat-header">
          <div>
            <p className="olym-cat-brand">UrkerPro</p>
            <h1 className="olym-cat-title">Олимпиады</h1>
            <p className="olym-cat-lead">
              Раскройте потенциал через задания и соревнования: выбирайте олимпиады по математике,
              естествознанию и логике — всё в одном месте для дошкольных педагогов и обучения.
            </p>
          </div>
          {isAdmin ? (
            <button type="button" className="olym-cat-admin-new" onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? 'Закрыть' : '+ Новая олимпиада'}
            </button>
          ) : null}
        </header>

        <div className="olym-cat-search-row">
          <div className="olym-cat-search">
            <span className="olym-cat-search-icon" aria-hidden>🔍</span>
            <input
              type="search"
              placeholder="Найти олимпиаду..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Поиск по олимпиадам"
            />
          </div>
        </div>


        {isAdmin && formOpen ? (
          <form className="olym-form-panel olymp-cat-admin-form" onSubmit={handleCreate}>
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
            <button type="submit" className="olym-btn olymp-btn--primary" disabled={creating} style={{ justifySelf: 'start' }}>
              {creating ? 'Создаём…' : 'Создать'}
            </button>
          </form>
        ) : null}

        {loading && <p className="olym-empty">Загрузка…</p>}
        {error && <p className="olym-error">Ошибка: {error}</p>}

        {!loading && !error && filteredItems.length === 0 && (
          <p className="olym-empty">
            {items.length === 0
              ? `Пока нет ни одной олимпиады.${isAdmin ? ' Создайте первую через кнопку выше.' : ''}`
              : 'Ничего не найдено. Измените поиск или категорию.'}
          </p>
        )}

        {!loading && !error && filteredItems.length > 0 && (
          <>
            <section className="olym-cat-featured">
              {featuredPrimary ? (
                <Link className="olym-cat-hero" to={`/olympiads/${featuredPrimary.id}`}>
                  <div className="olym-cat-hero-bg" />
                  <div className="olym-cat-hero-overlay" />
                  <div className="olym-cat-hero-inner">
                    <div className="olym-cat-hero-badges">
                      <span className="olym-cat-badge">Олимпиада</span>
                      <span className="olym-cat-badge olymp-cat-badge--accent">В фокусе</span>
                    </div>
                    <h2 className="olym-cat-hero-title">{featuredPrimary.title}</h2>
                    <p className="olym-cat-hero-desc">{featuredPrimary.description}</p>
                    <div className="olym-cat-hero-meta">
                      <span>📅 {formatOlympiadDate(featuredPrimary.createdAtUtc)}</span>
                      <span>❓ Вопросов: {featuredPrimary.questionsCount ?? 0}</span>
                      <span>{featuredPrimary.myCompleted ? '✓ Пройдено' : 'Участие бесплатно'}</span>
                    </div>
                  </div>
                </Link>
              ) : null}

              {featuredSecondary ? (
                <aside className="olym-cat-side">
                  <div className="olym-cat-side-icon" aria-hidden>∑</div>
                  <p className="olym-cat-side-kicker">Логика и математика</p>
                  <h3 className="olym-cat-side-title">{featuredSecondary.title}</h3>
                  <p className="olym-cat-side-desc">{featuredSecondary.description}</p>
                  <dl className="olym-cat-side-dl">
                    <div>
                      <dt>Дата</dt>
                      <dd>{formatOlympiadDate(featuredSecondary.createdAtUtc)}</dd>
                    </div>
                    <div>
                      <dt>Участие</dt>
                      <dd>Бесплатно</dd>
                    </div>
                  </dl>
                  <Link className="olym-cat-side-cta" to={`/olympiads/${featuredSecondary.id}`}>
                    Зарегистрироваться
                  </Link>
                </aside>
              ) : (
                <div className="olym-cat-side olymp-cat-side--placeholder" aria-hidden />
              )}
            </section>

            {catalogRest.length > 0 ? (
              <div className="olym-cat-grid">
                {catalogRest.map((o) => {
                  const done = !!o.myCompleted && !isAdmin;
                  const qn = o.questionsCount ?? 0;
                  return (
                    <article key={o.id} className="olym-cat-card">
                      <Link to={`/olympiads/${o.id}`} className="olym-cat-card-link">
                        <div className="olym-cat-card-media olymp-cat-card-media--empty">
                          <span aria-hidden>🏆</span>
                        </div>
                        <div className="olym-cat-card-body">
                          <p className="olym-cat-card-cat">Олимпиада</p>
                          <h2 className="olym-cat-card-title">{o.title}</h2>
                          <div className="olym-cat-card-footer">
                            <span>Вопросов: {qn}</span>
                            <span className="olym-cat-card-price">{done ? 'Готово' : 'Бесплатно'}</span>
                          </div>
                        </div>
                      </Link>
                      {isAdmin ? (
                        <div className="olym-cat-card-admin">
                          <Link className="olym-cat-card-admin-link" to={`/admin/olympiads/${o.id}/questions`}>
                            Вопросы
                          </Link>
                          <Link className="olym-cat-card-admin-link" to={`/admin/olympiads/${o.id}/results`}>
                            Результаты
                          </Link>
                          <button type="button" className="olym-cat-card-admin-del" onClick={() => handleDelete(o.id)}>
                            Удалить
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </div>

      {isAdmin ? (
        <button
          type="button"
          className="olym-cat-fab"
          onClick={() => setFormOpen(true)}
          aria-label="Создать олимпиаду"
          title="Новая олимпиада"
        >
          +
        </button>
      ) : null}
    </div>
  );
}
