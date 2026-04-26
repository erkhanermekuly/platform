import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { olympiadsAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';
import '../styles/olympiads.css';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export default function OlympiadTestPage() {
  const { id } = useParams();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const [qIndex, setQIndex] = useState(0);

  const [locked, setLocked] = useState(false);
  const [olympiadMeta, setOlympiadMeta] = useState(null);
  const [lockedAttempt, setLockedAttempt] = useState(null);

  const [data, setData] = useState(null);
  const [rating, setRating] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [docBusy, setDocBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected({});
    setLocked(false);
    setOlympiadMeta(null);
    setLockedAttempt(null);
    setData(null);
    try {
      const res = await olympiadsAPI.get(id);
      if (!res?.success || !res.data) {
        setError(res?.message || 'Не удалось загрузить олимпиаду');
        return;
      }
      const payload = res.data;
      if (payload.locked && payload.olympiad && payload.attempt) {
        setLocked(true);
        setOlympiadMeta(payload.olympiad);
        setLockedAttempt(payload.attempt);
        try {
          const rat = await olympiadsAPI.getRating(id, 50);
          if (rat?.success && Array.isArray(rat.data)) setRating(rat.data);
        } catch {
          setRating([]);
        }
        return;
      }
      setData(payload);
      try {
        const rat = await olympiadsAPI.getRating(id, 50);
        if (rat?.success && Array.isArray(rat.data)) setRating(rat.data);
      } catch {
        setRating([]);
      }
    } catch (e) {
      setError(e?.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setQIndex(0);
  }, [data]);

  const answeredCount = useMemo(() => {
    if (!data?.questions?.length) return 0;
    return data.questions.filter((q) => (selected[q.id]?.size ?? 0) > 0).length;
  }, [data, selected]);

  const progressPct = useMemo(() => {
    if (!data?.questions?.length) return 0;
    return Math.round((answeredCount / data.questions.length) * 100);
  }, [data, answeredCount]);

  const toggleAnswer = (questionId, answerId) => {
    if (result) return;
    setSelected((prev) => {
      const current = new Set(prev[questionId] || []);
      if (current.has(answerId)) current.delete(answerId);
      else current.add(answerId);
      return { ...prev, [questionId]: current };
    });
  };

  const handleSubmit = async () => {
    if (!data?.questions?.length) return;
    const answers = data.questions.map((q) => ({
      questionId: q.id,
      selectedAnswerIds: Array.from(selected[q.id] || []),
    }));
    setSubmitting(true);
    try {
      const res = await olympiadsAPI.submit(id, answers);
      if (res?.success && res.data) {
        setResult(res.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert(res?.message || 'Не удалось отправить ответы');
      }
    } catch (err) {
      alert(err?.message || 'Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  };

  const resetLocalPreview = () => {
    setResult(null);
    setSelected({});
  };

  const downloadOlympiadDoc = async (kind) => {
    if (!id || docBusy) return;
    setDocBusy(kind);
    try {
      if (kind === 'cert') {
        await olympiadsAPI.downloadParticipationCertificate(id);
      } else {
        await olympiadsAPI.downloadDiploma(id);
      }
    } catch (e) {
      alert(e?.message || 'Не удалось скачать документ');
    } finally {
      setDocBusy(null);
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

  if (error) {
    return (
      <div className="olym-root">
        <div className="olym-shell">
          <p className="olym-error">{error}</p>
          <Link className="olym-back" to="/olympiads">
            ← Назад
          </Link>
        </div>
      </div>
    );
  }

  if (locked && olympiadMeta && lockedAttempt) {
    const pass = lockedAttempt.scorePercent >= 60;
    return (
      <div className="olym-root">
        <div className="olym-shell">
          <Link className="olym-back" to="/olympiads">
            ← К списку олимпиад
          </Link>

          <header className="olym-hero">
            <div className="olym-hero-inner">
              <div className="olym-kicker">Олимпиада завершена</div>
              <h1 className="olym-title">{olympiadMeta.title}</h1>
              <p className="olym-desc">{olympiadMeta.description}</p>
              <div className="olym-hero-meta">
                <span className="olym-pill olymp-pill--accent">Повтор недоступен</span>
                <span className={`olym-pill ${pass ? 'olym-pill--success' : 'olym-pill--muted'}`}>
                  {pass ? 'Зачёт по порогу 60%' : 'Ниже порога 60%'}
                </span>
              </div>
            </div>
          </header>

          <div className={`olym-result-panel ${pass ? 'olym-result-panel--pass' : 'olym-result-panel--fail'}`}>
            <div className="olym-kicker">Ваш результат</div>
            <div className="olym-result-stats">
              <div className="olym-stat-box">
                <div className="olym-stat-val">{lockedAttempt.correctCount}</div>
                <div className="olym-stat-lbl">Верных ответов</div>
              </div>
              <div className="olym-stat-box">
                <div className="olym-stat-val">{lockedAttempt.totalQuestions}</div>
                <div className="olym-stat-lbl">Всего вопросов</div>
              </div>
              <div className="olym-stat-box">
                <div className="olym-stat-val">{lockedAttempt.scorePercent}%</div>
                <div className="olym-stat-lbl">База</div>
              </div>
              <div className="olym-stat-box">
                <div className="olym-stat-val">
                  {lockedAttempt.bonusPoints > 0 ? `+${lockedAttempt.bonusPoints}` : lockedAttempt.bonusPoints}
                </div>
                <div className="olym-stat-lbl">Бонус</div>
              </div>
              <div className="olym-stat-box">
                <div className="olym-stat-val">{lockedAttempt.ratingScore}%</div>
                <div className="olym-stat-lbl">Итог в рейтинге</div>
              </div>
            </div>
            <p className="olym-desc" style={{ marginTop: 16 }}>
              Сдано: {formatDate(lockedAttempt.submittedAtUtc)}
            </p>
            {!isAdmin && (
              <div className="olym-doc-actions">
                <button
                  type="button"
                  className="olym-btn olymp-btn--secondary"
                  disabled={!!docBusy}
                  onClick={() => downloadOlympiadDoc('cert')}
                >
                  {docBusy === 'cert' ? '…' : 'Сертификат об участии (PDF)'}
                </button>
                <button
                  type="button"
                  className="olym-btn olymp-btn--secondary"
                  disabled={!!docBusy}
                  onClick={() => downloadOlympiadDoc('diploma')}
                >
                  {docBusy === 'diploma' ? '…' : 'Диплом (PDF)'}
                </button>
              </div>
            )}
          </div>

          <section className="olym-rating">
            <h2 className="olym-rating-title">Рейтинг олимпиады</h2>
            <p className="olym-rating-sub">Топ участников по итоговому баллу (учитываются бонусы администратора).</p>
            {rating.length === 0 ? (
              <p className="olym-empty">Пока нет других зачётных попыток в рейтинге.</p>
            ) : (
              <div className="olym-table-wrap">
                <table className="olym-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Участник</th>
                      <th>Итог</th>
                      <th>База</th>
                      <th>Бонус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rating.map((row) => (
                      <tr key={`${row.accountId}-${row.rank}`}>
                        <td className="olym-rank">{row.rank}</td>
                        <td>{row.name}</td>
                        <td>
                          <strong>{row.ratingScore}%</strong>
                        </td>
                        <td>{row.scorePercent}%</td>
                        <td>{row.bonusPoints > 0 ? `+${row.bonusPoints}` : row.bonusPoints}</td>
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

  if (!data) return null;

  const nQuestions = data.questions?.length ?? 0;
  const safeQIndex = nQuestions > 0 ? Math.min(Math.max(0, qIndex), nQuestions - 1) : 0;
  const currentQuestion = nQuestions > 0 ? data.questions[safeQIndex] : null;

  const correctById = result
    ? Object.fromEntries(result.results.map((r) => [r.questionId, new Set(r.correctAnswerIds)]))
    : {};
  const isCorrectByQuestion = result
    ? Object.fromEntries(result.results.map((r) => [r.questionId, r.isCorrect]))
    : {};

  const passNow = result && result.scorePercent >= 60;

  const useTestLayout = nQuestions > 0 && !result;

  return (
    <div className={`olym-root${useTestLayout ? ' olymp-test-exp' : ''}`}>
      <div className={`olym-shell${useTestLayout ? ' olymp-test-shell' : ''}`}>
        <Link className={`olym-back${useTestLayout ? ' olymp-test-back' : ''}`} to="/olympiads">
          ← К списку олимпиад
        </Link>

        {isAdmin && (
          <div className="olym-banner">
            Режим администратора: ответы проверяются, но попытка <strong>не сохраняется</strong> в рейтинг и не
            блокирует прохождение.
          </div>
        )}

        {useTestLayout ? (
          <div className="olym-test-pagehead">
            <p className="olym-test-pagehead-kicker">Олимпиада</p>
            <h1 className="olym-test-pagehead-title">{data.title}</h1>
            {data.description ? <p className="olym-test-pagehead-desc">{data.description}</p> : null}
            <div className="olym-test-pagehead-pills">
              <span className="olym-test-pill">Вопросов: {nQuestions}</span>
              <span className="olym-test-pill olymp-test-pill--accent">Одна официальная попытка</span>
            </div>
          </div>
        ) : (
          <header className="olym-hero">
            <div className="olym-hero-inner">
              <div className="olym-kicker">Олимпиада</div>
              <h1 className="olym-title">{data.title}</h1>
              <p className="olym-desc">{data.description}</p>
              <div className="olym-hero-meta">
                <span className="olym-pill olymp-pill--muted">Вопросов: {data.questions.length}</span>
                <span className="olym-pill olymp-pill--accent">Одна официальная попытка</span>
              </div>
            </div>
          </header>
        )}

        {result?.previewOnly ? (
          <div className="olym-banner">Предпросмотр: результат не записан в базу участников.</div>
        ) : null}

        {result && !result.previewOnly ? (
          <div className={`olym-result-panel ${passNow ? 'olym-result-panel--pass' : 'olym-result-panel--fail'}`}>
            <div className="olym-kicker">Итог попытки</div>
            <div className="olym-result-stats">
              <div className="olym-stat-box">
                <div className="olym-stat-val">
                  {result.correctCount}/{result.totalQuestions}
                </div>
                <div className="olym-stat-lbl">Верно</div>
              </div>
              <div className="olym-stat-box">
                <div className="olym-stat-val">{result.scorePercent}%</div>
                <div className="olym-stat-lbl">База</div>
              </div>
              <div className="olym-stat-box">
                <div className="olym-stat-val">{result.ratingScore ?? result.scorePercent}%</div>
                <div className="olym-stat-lbl">В рейтинге</div>
              </div>
            </div>
            <p className="olym-desc" style={{ marginTop: 14 }}>
              Попытка сохранена. Повторное прохождение этой олимпиады недоступно. Итоговый балл в рейтинге может быть
              скорректирован администратором (бонусы).
            </p>
            {result.attemptId ? (
              <div className="olym-doc-actions">
                <button
                  type="button"
                  className="olym-btn olymp-btn--secondary"
                  disabled={!!docBusy}
                  onClick={() => downloadOlympiadDoc('cert')}
                >
                  {docBusy === 'cert' ? '…' : 'Сертификат об участии (PDF)'}
                </button>
                <button
                  type="button"
                  className="olym-btn olymp-btn--secondary"
                  disabled={!!docBusy}
                  onClick={() => downloadOlympiadDoc('diploma')}
                >
                  {docBusy === 'diploma' ? '…' : 'Диплом (PDF)'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {useTestLayout && currentQuestion ? (
          <>
            <div className="olym-test-status">
              <div className="olym-test-status-left">
                <span className="olym-test-olym-kicker">Олимпиада</span>
                <span className="olym-test-olym-name">{data.title}</span>
              </div>
              <div className="olym-test-status-mid">
                <div className="olym-test-status-mid-row">
                  <span className="olym-test-q-pos">
                    Вопрос {safeQIndex + 1} из {nQuestions}
                  </span>
                  <span className="olym-test-q-answered">
                    Отвечено: {answeredCount} / {nQuestions}
                  </span>
                </div>
                <div className="olym-test-progress-track" aria-hidden>
                  <div className="olym-test-progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <div className="olym-test-timer-pill" title="Ограничение по времени не задано">
                <span aria-hidden>🕐</span>
                <span>Без лимита</span>
              </div>
            </div>

            <div className="olym-test-main-card">
              <div className="olym-test-tags">
                <span className="olym-test-tag olymp-test-tag--warm">Логика и практика</span>
                <span className="olym-test-tag olymp-test-tag--muted">Вопрос {safeQIndex + 1}</span>
              </div>
              <h2 className="olym-test-q-title">{currentQuestion.text}</h2>
              <div className="olym-test-opts">
                {currentQuestion.answers.map((a, ai) => {
                  const isSelected = selected[currentQuestion.id]?.has(a.id) ?? false;
                  const letter = LETTERS[ai] ?? '?';
                  const inputId = `olym-a-${currentQuestion.id}-${a.id}`;
                  let optCls = 'olym-test-opt';
                  if (isSelected) optCls += ' olymp-test-opt--sel';
                  return (
                    <label key={a.id} htmlFor={inputId} className={optCls}>
                      <input
                        id={inputId}
                        className="olym-test-check"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAnswer(currentQuestion.id, a.id)}
                      />
                      <span className="olym-test-opt-letter" aria-hidden>
                        {letter}
                      </span>
                      <span className="olym-test-opt-text">{a.text}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <footer className="olym-test-footer">
              <button
                type="button"
                className="olym-test-footer-prev"
                disabled={safeQIndex <= 0}
                onClick={() => setQIndex((i) => Math.max(0, i - 1))}
              >
                ← Назад
              </button>
              <div className="olym-test-dots" role="tablist" aria-label="Номер вопроса">
                {data.questions.map((qDot, i) => (
                  <button
                    key={qDot.id}
                    type="button"
                    role="tab"
                    aria-selected={i === safeQIndex}
                    className={`olym-test-dot${i === safeQIndex ? ' is-active' : ''}`}
                    onClick={() => setQIndex(i)}
                    aria-label={`Вопрос ${i + 1}`}
                  />
                ))}
              </div>
              {safeQIndex >= nQuestions - 1 ? (
                <button
                  type="button"
                  className="olym-test-footer-next olymp-test-footer-next--submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Проверяем…' : 'Завершить →'}
                </button>
              ) : (
                <button
                  type="button"
                  className="olym-test-footer-next"
                  onClick={() => setQIndex((i) => Math.min(nQuestions - 1, i + 1))}
                >
                  Далее →
                </button>
              )}
            </footer>
          </>
        ) : null}

        {data.questions.length === 0 && <p className="olym-empty">В этой олимпиаде пока нет вопросов.</p>}

        {(result || !useTestLayout) && data.questions.length > 0 ? (
          <div className={result ? 'olym-test-results-block' : ''}>
            {data.questions.map((q, idx) => {
              const ok = isCorrectByQuestion[q.id];
              const cardClass = result
                ? ok
                  ? 'olym-test-main-card olymp-test-main-card--ok'
                  : 'olym-test-main-card olymp-test-main-card--bad'
                : 'olym-test-main-card';
              return (
                <div key={q.id} className={cardClass}>
                  <div className="olym-test-tags">
                    <span className="olym-test-tag olymp-test-tag--warm">Логика и практика</span>
                    <span className="olym-test-tag olymp-test-tag--muted">Вопрос {idx + 1}</span>
                  </div>
                  <h2 className="olym-test-q-title">{q.text}</h2>
                  <div className="olym-test-opts">
                    {q.answers.map((a, ai) => {
                      const isSelected = selected[q.id]?.has(a.id) ?? false;
                      const isCorrectAnswer = result && correctById[q.id]?.has(a.id);
                      const showCorrect = result && isCorrectAnswer;
                      const showWrongSelected = result && isSelected && !isCorrectAnswer;
                      const letter = LETTERS[ai] ?? '?';
                      const inputId = `olym-ar-${q.id}-${a.id}`;
                      let optCls = 'olym-test-opt';
                      if (showCorrect) optCls += ' olymp-test-opt--correct';
                      else if (showWrongSelected) optCls += ' olymp-test-opt--wrong';
                      else if (isSelected) optCls += ' olymp-test-opt--sel';
                      return (
                        <label key={a.id} htmlFor={inputId} className={optCls}>
                          <input
                            id={inputId}
                            className="olym-test-check"
                            type="checkbox"
                            checked={isSelected}
                            disabled={!!result}
                            onChange={() => toggleAnswer(q.id, a.id)}
                          />
                          <span className="olym-test-opt-letter" aria-hidden>
                            {letter}
                          </span>
                          <span className="olym-test-opt-text">{a.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {data.questions.length > 0 && !result && !useTestLayout ? (
          <button
            type="button"
            className="olym-btn olymp-btn--primary"
            style={{ width: '100%', marginTop: 8 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Проверяем…' : 'Завершить и отправить'}
          </button>
        ) : null}

        {isAdmin && result ? (
          <button type="button" className="olym-btn olymp-btn--ghost" style={{ marginTop: 14 }} onClick={resetLocalPreview}>
            Сбросить просмотр (ещё раз проверить ответы)
          </button>
        ) : null}

        <section className="olym-rating">
          <h2 className="olym-rating-title">Рейтинг</h2>
          <p className="olym-rating-sub">Актуальная таблица лидеров по этой олимпиаде.</p>
          {rating.length === 0 ? (
            <p className="olym-empty">Пока нет зачётных попыток.</p>
          ) : (
            <div className="olym-table-wrap">
              <table className="olym-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Участник</th>
                    <th>Итог</th>
                    <th>База</th>
                    <th>Бонус</th>
                  </tr>
                </thead>
                <tbody>
                  {rating.map((row) => (
                    <tr key={`${row.accountId}-${row.rank}`}>
                      <td className="olym-rank">{row.rank}</td>
                      <td>{row.name}</td>
                      <td>
                        <strong>{row.ratingScore}%</strong>
                      </td>
                      <td>{row.scorePercent}%</td>
                      <td>{row.bonusPoints > 0 ? `+${row.bonusPoints}` : row.bonusPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {isAdmin ? (
          <div style={{ marginTop: 24 }}>
            <Link className="olym-btn olymp-btn--ghost" to={`/admin/olympiads/${id}/results`}>
              Управление результатами
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
