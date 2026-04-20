import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { olympiadsAPI } from '../api/courseService';
import '../styles/olympiads.css';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOlympiadResultsPage() {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [rating, setRating] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bonusDraft, setBonusDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [infoRes, attRes, ratRes] = await Promise.all([
        olympiadsAPI.get(id),
        olympiadsAPI.adminListAttempts(id),
        olympiadsAPI.getRating(id, 100),
      ]);
      if (infoRes?.success && infoRes?.data && !infoRes.data.locked) {
        setTitle(infoRes.data.title || 'Олимпиада');
      } else if (infoRes?.success && infoRes?.data?.olympiad) {
        setTitle(infoRes.data.olympiad.title || 'Олимпиада');
      } else {
        setTitle('Олимпиада');
      }
      setAttempts(Array.isArray(attRes?.data) ? attRes.data : []);
      setRating(Array.isArray(ratRes?.data) ? ratRes.data : []);
    } catch (e) {
      setError(e?.message || 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVoid = async (attemptId) => {
    if (!window.confirm('Аннулировать эту попытку? Участник сможет пройти олимпиаду заново.')) return;
    try {
      await olympiadsAPI.adminVoidAttempt(id, attemptId);
      await load();
    } catch (e) {
      alert(e?.message || 'Ошибка');
    }
  };

  const handleBonus = async (attemptId) => {
    const raw = bonusDraft[attemptId];
    const points = Number.parseInt(String(raw ?? '0'), 10);
    if (!Number.isFinite(points) || points === 0) {
      alert('Введите ненулевое число баллов (можно отрицательное).');
      return;
    }
    try {
      await olympiadsAPI.adminAddBonus(id, attemptId, points);
      setBonusDraft((prev) => ({ ...prev, [attemptId]: '' }));
      await load();
    } catch (e) {
      alert(e?.message || 'Ошибка');
    }
  };

  if (loading) {
    return (
      <div className="olym-root">
        <div className="olym-shell">
          <p className="olym-empty">Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="olym-root">
      <div className="olym-shell">
        <Link className="olym-back" to="/olympiads">
          ← К олимпиадам
        </Link>

        <header className="olym-hero">
          <div className="olym-hero-inner">
            <div className="olym-kicker">Администрирование</div>
            <h1 className="olym-title">{title}</h1>
            <p className="olym-desc">
              Результаты участников, рейтинг по итоговому баллу (база + бонусы), аннулирование попыток и
              корректировка бонусных баллов.
            </p>
            <div className="olym-hero-meta">
              <span className="olym-pill olymp-pill--accent">Попыток в базе: {attempts.length}</span>
              <span className="olym-pill olymp-pill--success">В рейтинге: {rating.length}</span>
            </div>
          </div>
        </header>

        {error ? <p className="olym-error">{error}</p> : null}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <Link className="olym-btn olymp-btn--ghost" to={`/olympiads/${id}`}>
            Страница олимпиады
          </Link>
          <Link className="olym-btn olymp-btn--ghost" to={`/admin/olympiads/${id}/questions`}>
            Редактор вопросов
          </Link>
        </div>

        <section className="olym-rating">
          <h2 className="olym-rating-title">Рейтинг</h2>
          <p className="olym-rating-sub">
            Учитываются только неаннулированные попытки. Итог: базовый процент + бонусы (0–100).
          </p>
          {rating.length === 0 ? (
            <p className="olym-empty">Пока нет зачётных попыток.</p>
          ) : (
            <div className="olym-table-wrap">
              <table className="olym-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Участник</th>
                    <th>База %</th>
                    <th>Бонус</th>
                    <th>Итог</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {rating.map((row) => (
                    <tr key={`${row.accountId}-${row.rank}`}>
                      <td className="olym-rank">{row.rank}</td>
                      <td>{row.name}</td>
                      <td>{row.scorePercent}%</td>
                      <td>{row.bonusPoints > 0 ? `+${row.bonusPoints}` : row.bonusPoints}</td>
                      <td>
                        <strong>{row.ratingScore}%</strong>
                      </td>
                      <td style={{ color: 'var(--olym-muted)' }}>{formatDate(row.submittedAtUtc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="olym-rating" style={{ marginTop: 40 }}>
          <h2 className="olym-rating-title">Все попытки</h2>
          <p className="olym-rating-sub">Аннулирование снимает попытку с рейтинга и открывает повторное прохождение.</p>
          {attempts.length === 0 ? (
            <p className="olym-empty">Попыток нет.</p>
          ) : (
            <div className="olym-table-wrap">
              <table className="olym-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Участник</th>
                    <th>Email</th>
                    <th>Результат</th>
                    <th>Бонус</th>
                    <th>Итог</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.id}</td>
                      <td>{a.name}</td>
                      <td style={{ color: 'var(--olym-muted)', fontSize: 13 }}>{a.email}</td>
                      <td>
                        {a.correctCount}/{a.totalQuestions} ({a.scorePercent}%)
                      </td>
                      <td>{a.bonusPoints > 0 ? `+${a.bonusPoints}` : a.bonusPoints}</td>
                      <td>
                        <strong>{a.ratingScore}%</strong>
                      </td>
                      <td>
                        {a.isVoided ? (
                          <span className="olym-pill olymp-pill--muted">Аннулировано</span>
                        ) : (
                          <span className="olym-pill olymp-pill--success">Зачёт</span>
                        )}
                      </td>
                      <td>
                        <div className="olym-admin-row-actions">
                          {!a.isVoided ? (
                            <button type="button" className="olym-btn olymp-btn--danger" onClick={() => handleVoid(a.id)}>
                              Аннулировать
                            </button>
                          ) : null}
                          <div className="olym-admin-bonus-form">
                            <input
                              className="olym-admin-bonus-input"
                              type="number"
                              placeholder="±"
                              disabled={a.isVoided}
                              value={bonusDraft[a.id] ?? ''}
                              onChange={(e) => setBonusDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            />
                            <button
                              type="button"
                              className="olym-btn olymp-btn--ghost"
                              disabled={a.isVoided}
                              onClick={() => handleBonus(a.id)}
                            >
                              Баллы
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
