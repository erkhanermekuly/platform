import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { olympiadsAPI } from '../api/courseService';

export default function OlympiadTestPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // { [questionId]: Set<answerId> }
  const [selected, setSelected] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected({});
    try {
      const res = await olympiadsAPI.get(id);
      if (res?.success && res.data) {
        setData(res.data);
      } else {
        setError(res?.message || 'Не удалось загрузить олимпиаду');
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

  const toggleAnswer = (questionId, answerId) => {
    setSelected((prev) => {
      const current = new Set(prev[questionId] || []);
      if (current.has(answerId)) {
        current.delete(answerId);
      } else {
        current.add(answerId);
      }
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

  if (loading) {
    return <StatusLayout>Загрузка теста…</StatusLayout>;
  }
  if (error) {
    return <StatusLayout error>Ошибка: {error}</StatusLayout>;
  }
  if (!data) return null;

  const correctById = result
    ? Object.fromEntries(
        result.results.map((r) => [r.questionId, new Set(r.correctAnswerIds)])
      )
    : {};
  const isCorrectByQuestion = result
    ? Object.fromEntries(result.results.map((r) => [r.questionId, r.isCorrect]))
    : {};

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(160deg, #e8eef9 0%, #f0f4ff 45%, #e9ecf5 100%)',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Link
          to="/olympiads"
          style={{ color: '#2b52b5', textDecoration: 'none', fontWeight: 600 }}
        >
          ← К списку олимпиад
        </Link>

        <h1
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: '#1f2937',
            margin: '14px 0 6px',
          }}
        >
          {data.title}
        </h1>
        <p style={{ color: '#6b7280', marginTop: 0 }}>{data.description}</p>

        {result && (
          <div
            style={{
              background:
                result.scorePercent >= 60 ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${
                result.scorePercent >= 60 ? '#a7f3d0' : '#fecaca'
              }`,
              borderRadius: 16,
              padding: 20,
              marginTop: 20,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: result.scorePercent >= 60 ? '#065f46' : '#991b1b',
              }}
            >
              Результат: {result.correctCount} / {result.totalQuestions} (
              {result.scorePercent}%)
            </h3>
            <button
              onClick={load}
              style={{
                marginTop: 12,
                padding: '8px 14px',
                borderRadius: 10,
                border: 'none',
                background: '#2b52b5',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Пройти ещё раз
            </button>
          </div>
        )}

        {data.questions.length === 0 && (
          <p style={{ color: '#6b7280', marginTop: 30 }}>
            В этой олимпиаде пока нет вопросов.
          </p>
        )}

        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          {data.questions.map((q, idx) => {
            const questionResultKnown = result !== null;
            const questionCorrect = isCorrectByQuestion[q.id];
            return (
              <div
                key={q.id}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
                  borderLeft: questionResultKnown
                    ? `4px solid ${questionCorrect ? '#10b981' : '#ef4444'}`
                    : '4px solid transparent',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: '#0f2744',
                    fontSize: 16,
                    marginBottom: 12,
                  }}
                >
                  {idx + 1}. {q.text}
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {q.answers.map((a) => {
                    const isSelected = selected[q.id]?.has(a.id) ?? false;
                    const isCorrectAnswer =
                      result && correctById[q.id]?.has(a.id);
                    const showCorrect = result && isCorrectAnswer;
                    const showWrongSelected =
                      result && isSelected && !isCorrectAnswer;

                    let bg = '#f8fafc';
                    let borderColor = '#e5e7eb';
                    if (showCorrect) {
                      bg = '#ecfdf5';
                      borderColor = '#10b981';
                    } else if (showWrongSelected) {
                      bg = '#fef2f2';
                      borderColor = '#ef4444';
                    } else if (isSelected) {
                      bg = '#eef2ff';
                      borderColor = '#2b52b5';
                    }

                    return (
                      <label
                        key={a.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: bg,
                          border: `1px solid ${borderColor}`,
                          cursor: result ? 'default' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!!result}
                          onChange={() => toggleAnswer(q.id, a.id)}
                        />
                        <span style={{ color: '#1f2937' }}>{a.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {data.questions.length > 0 && !result && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '14px 18px',
              borderRadius: 12,
              border: 'none',
              background:
                'linear-gradient(180deg, #4e7ee8 0%, #2b52b5 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Проверяем…' : 'Завершить и проверить'}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusLayout({ children, error }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        color: error ? '#b91c1c' : '#6b7280',
      }}
    >
      {children}
    </div>
  );
}
