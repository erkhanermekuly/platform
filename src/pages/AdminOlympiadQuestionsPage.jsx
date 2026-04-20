import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { olympiadsAPI } from '../api/courseService';

const blankAnswer = () => ({ text: '', isCorrect: false });
const blankQuestion = () => ({
  text: '',
  sortOrder: 0,
  answers: [blankAnswer(), blankAnswer()],
});

export default function AdminOlympiadQuestionsPage() {
  const { id } = useParams();
  const [olympiad, setOlympiad] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [draft, setDraft] = useState(blankQuestion());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metaRes, questionsRes] = await Promise.all([
        olympiadsAPI.get(id),
        olympiadsAPI.listQuestions(id),
      ]);
      if (metaRes?.success) setOlympiad(metaRes.data);
      if (questionsRes?.success && Array.isArray(questionsRes.data)) {
        setQuestions(questionsRes.data);
      } else if (!metaRes?.success) {
        setError(metaRes?.message || 'Не удалось загрузить данные');
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

  const updateDraftAnswer = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      answers: prev.answers.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  };

  const addAnswer = () => {
    setDraft((prev) => ({ ...prev, answers: [...prev.answers, blankAnswer()] }));
  };

  const removeAnswer = (index) => {
    setDraft((prev) => ({
      ...prev,
      answers:
        prev.answers.length <= 2
          ? prev.answers
          : prev.answers.filter((_, i) => i !== index),
    }));
  };

  const resetDraft = () => {
    setDraft(blankQuestion());
    setEditingId(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const title = draft.text.trim();
    if (!title) {
      alert('Введите текст вопроса');
      return;
    }
    const answers = draft.answers
      .map((a) => ({ ...a, text: a.text.trim() }))
      .filter((a) => a.text.length > 0);

    if (answers.length < 2) {
      alert('Нужно минимум два непустых варианта ответа');
      return;
    }
    if (!answers.some((a) => a.isCorrect)) {
      alert('Отметьте хотя бы один правильный ответ');
      return;
    }

    setSaving(true);
    try {
      const body = {
        text: title,
        sortOrder: draft.sortOrder || questions.length + 1,
        answers: answers.map((a, idx) => ({
          text: a.text,
          isCorrect: a.isCorrect,
          sortOrder: idx,
        })),
      };

      if (editingId) {
        await olympiadsAPI.updateQuestion(id, editingId, body);
      } else {
        await olympiadsAPI.createQuestion(id, body);
      }
      resetDraft();
      await load();
    } catch (err) {
      alert(err?.message || 'Не удалось сохранить вопрос');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (q) => {
    setEditingId(q.id);
    setDraft({
      text: q.text,
      sortOrder: q.sortOrder,
      answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm('Удалить вопрос?')) return;
    try {
      await olympiadsAPI.deleteQuestion(id, questionId);
      await load();
    } catch (err) {
      alert(err?.message || 'Не удалось удалить вопрос');
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
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <Link
            to="/olympiads"
            style={{ color: '#2b52b5', textDecoration: 'none', fontWeight: 600 }}
          >
            ← К списку олимпиад
          </Link>
          <Link
            to={`/admin/olympiads/${id}/results`}
            style={{ color: '#2b52b5', textDecoration: 'none', fontWeight: 600 }}
          >
            Результаты и рейтинг →
          </Link>
        </div>

        <h1 style={{ margin: '14px 0 6px', color: '#0f2744' }}>
          Вопросы — {olympiad?.title ?? ''}
        </h1>
        <p style={{ color: '#6b7280', marginTop: 0 }}>
          Управление вопросами и правильными ответами.
        </p>

        {loading && <p style={{ color: '#6b7280' }}>Загрузка…</p>}
        {error && <p style={{ color: '#b91c1c' }}>Ошибка: {error}</p>}

        <form
          onSubmit={handleSave}
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
            marginBottom: 28,
            display: 'grid',
            gap: 12,
          }}
        >
          <h3 style={{ margin: 0, color: '#0f2744' }}>
            {editingId ? 'Редактирование вопроса' : 'Новый вопрос'}
          </h3>

          <textarea
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            placeholder="Текст вопроса"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 600, color: '#1f2937' }}>
              Варианты ответа (отметьте правильные):
            </div>
            {draft.answers.map((a, idx) => (
              <div
                key={idx}
                style={{ display: 'flex', gap: 8, alignItems: 'center' }}
              >
                <input
                  type="checkbox"
                  checked={a.isCorrect}
                  onChange={(e) =>
                    updateDraftAnswer(idx, { isCorrect: e.target.checked })
                  }
                  title="Правильный ответ"
                />
                <input
                  type="text"
                  value={a.text}
                  onChange={(e) =>
                    updateDraftAnswer(idx, { text: e.target.value })
                  }
                  placeholder={`Вариант ${idx + 1}`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => removeAnswer(idx)}
                  disabled={draft.answers.length <= 2}
                  title="Удалить вариант"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    background: '#fff',
                    color: '#b91c1c',
                    cursor:
                      draft.answers.length <= 2 ? 'not-allowed' : 'pointer',
                    opacity: draft.answers.length <= 2 ? 0.4 : 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAnswer}
              style={{
                justifySelf: 'start',
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px dashed #93c5fd',
                background: '#eef2ff',
                color: '#2b52b5',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Вариант
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background: '#2b52b5',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving
                ? 'Сохраняем…'
                : editingId
                ? 'Сохранить изменения'
                : 'Добавить вопрос'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetDraft}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Отмена
              </button>
            )}
          </div>
        </form>

        <h3 style={{ margin: '0 0 12px', color: '#0f2744' }}>
          Существующие вопросы ({questions.length})
        </h3>

        <div style={{ display: 'grid', gap: 12 }}>
          {questions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: 16,
                boxShadow: '0 8px 20px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'start',
                }}
              >
                <div style={{ fontWeight: 600, color: '#0f2744' }}>
                  {idx + 1}. {q.text}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => handleEdit(q)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      color: '#374151',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid #fecaca',
                      background: '#fff',
                      color: '#b91c1c',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              <ul
                style={{
                  margin: '10px 0 0',
                  paddingLeft: 18,
                  color: '#374151',
                }}
              >
                {q.answers.map((a) => (
                  <li
                    key={a.id}
                    style={{
                      color: a.isCorrect ? '#065f46' : '#374151',
                      fontWeight: a.isCorrect ? 600 : 400,
                    }}
                  >
                    {a.isCorrect ? '✓ ' : ''}
                    {a.text}
                  </li>
                ))}
              </ul>
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
