import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesAPI, lessonsAPI, filesAPI } from '../api/courseService';
import { sortLessons } from '../services/lessonProgress';
import '../styles/pages.css';

const emptyNewLesson = () => ({
  title: '',
  description: '',
});

export default function AdminCourseEditPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const cid = Number(courseId);

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingCourse, setSavingCourse] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    instructor: '',
    category: 'beginner',
    price: 0,
  });
  const [newLesson, setNewLesson] = useState(emptyNewLesson);
  const [lessonBusy, setLessonBusy] = useState({});

  const reload = useCallback(async () => {
    const res = await coursesAPI.getCourseById(courseId);
    const c = res?.data;
    setCourse(c);
    if (c) {
      setForm({
        title: c.title ?? '',
        description: c.description ?? '',
        instructor: c.instructor?.name ?? '',
        category: c.category ?? 'beginner',
        price: c.price ?? 0,
      });
    }
  }, [courseId]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        await reload();
      } catch {
        if (!cancel) setCourse(null);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [reload]);

  const setBusy = (key, v) => setLessonBusy((prev) => ({ ...prev, [key]: v }));

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!course) return;
    setSavingCourse(true);
    try {
      await coursesAPI.updateCourse(cid, {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        level: course.level,
        price: Number(form.price) || 0,
        isLocked: Number(form.price) > 0,
        instructor: form.instructor.trim() || undefined,
        videoUrl: course.videoUrl ?? null,
        image: course.image ?? null,
        duration: course.duration ?? null,
      });
      await reload();
      alert('Курс сохранён');
    } catch (err) {
      alert(err?.message || 'Ошибка сохранения');
    } finally {
      setSavingCourse(false);
    }
  };

  const nextSortOrder = () => {
    const list = sortLessons(course?.lessons);
    if (!list.length) return 1;
    return Math.max(...list.map((l) => l.sortOrder ?? 0), 0) + 1;
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.title.trim() || !newLesson.description.trim()) {
      alert('Название и описание урока обязательны');
      return;
    }
    setBusy('add', true);
    try {
      await lessonsAPI.create(cid, {
        title: newLesson.title.trim(),
        description: newLesson.description.trim(),
        sortOrder: nextSortOrder(),
      });
      setNewLesson(emptyNewLesson());
      await reload();
    } catch (err) {
      alert(err?.message || 'Не удалось создать урок');
    } finally {
      setBusy('add', false);
    }
  };

  const handleUpdateLesson = async (lesson) => {
    setBusy(`save-${lesson.id}`, true);
    try {
      await lessonsAPI.update(cid, lesson.id, {
        title: lesson.title.trim(),
        description: lesson.description.trim(),
        sortOrder: lesson.sortOrder,
      });
      await reload();
    } catch (err) {
      alert(err?.message || 'Ошибка');
    } finally {
      setBusy(`save-${lesson.id}`, false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm('Удалить урок?')) return;
    setBusy(`del-${lessonId}`, true);
    try {
      await lessonsAPI.delete(cid, lessonId);
      await reload();
    } catch (err) {
      alert(err?.message || 'Ошибка удаления');
    } finally {
      setBusy(`del-${lessonId}`, false);
    }
  };

  const handleLessonVideo = async (lessonId, file) => {
    if (!file) return;
    setBusy(`vid-${lessonId}`, true);
    try {
      await lessonsAPI.uploadVideo(cid, lessonId, file);
      await reload();
    } catch (err) {
      alert(err?.message || 'Ошибка загрузки видео');
    } finally {
      setBusy(`vid-${lessonId}`, false);
    }
  };

  const handleLessonMaterials = async (lessonId, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setBusy(`mat-${lessonId}`, true);
    try {
      await filesAPI.uploadCourseFiles(cid, files, { lessonId });
      await reload();
    } catch (err) {
      alert(err?.message || 'Ошибка загрузки файлов');
    } finally {
      setBusy(`mat-${lessonId}`, false);
    }
  };

  if (loading) {
    return <div className="loading" style={{ padding: 48 }}>Загрузка…</div>;
  }

  if (!course) {
    return (
      <div style={{ padding: 40 }}>
        <p>Курс не найден</p>
        <Link to="/admin/courses">← Назад</Link>
      </div>
    );
  }

  const lessons = sortLessons(course.lessons);

  return (
    <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', minHeight: '100vh', padding: '32px 20px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/courses')}>
            ← Все курсы
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          <h1 style={{ marginTop: 0 }}>Редактировать курс</h1>
          <form onSubmit={handleSaveCourse}>
            <div className="form-group">
              <label>Название</label>
              <input
                className="input-like"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
            <div className="form-group">
              <label>Содержание / описание</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
                rows={5}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
            <div className="form-group">
              <label>Преподаватель</label>
              <input
                value={form.instructor}
                onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
            <div className="form-group">
              <label>Категория</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
              >
                <option value="beginner">Начальный</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>
            <div className="form-group">
              <label>Цена (₸)</label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingCourse}>
              {savingCourse ? 'Сохранение…' : 'Сохранить курс'}
            </button>
          </form>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 8px 24px rgba(0,0,0,.08)' }}>
          <h2 style={{ marginTop: 0 }}>Уроки курса</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            Видео и материалы для каждого урока. Студенты открывают уроки по порядку: следующий доступен после просмотра предыдущего до конца.
          </p>

          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              busy={lessonBusy}
              onSave={handleUpdateLesson}
              onDelete={handleDeleteLesson}
              onVideo={(f) => handleLessonVideo(lesson.id, f)}
              onMaterials={(fl) => handleLessonMaterials(lesson.id, fl)}
            />
          ))}

          <form onSubmit={handleAddLesson} style={{ marginTop: 24, paddingTop: 24, borderTop: '1px dashed #e5e7eb' }}>
            <h3>Новый урок</h3>
            <div className="form-group">
              <label>Название</label>
              <input
                value={newLesson.title}
                onChange={(e) => setNewLesson((n) => ({ ...n, title: e.target.value }))}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
            <div className="form-group">
              <label>Описание урока</label>
              <textarea
                value={newLesson.description}
                onChange={(e) => setNewLesson((n) => ({ ...n, description: e.target.value }))}
                rows={3}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={lessonBusy.add}>
              {lessonBusy.add ? 'Добавление…' : 'Добавить урок'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function LessonCard({ lesson, busy, onSave, onDelete, onVideo, onMaterials }) {
  const [draft, setDraft] = useState({
    title: lesson.title,
    description: lesson.description,
    sortOrder: lesson.sortOrder,
  });

  useEffect(() => {
    setDraft({
      title: lesson.title,
      description: lesson.description,
      sortOrder: lesson.sortOrder,
    });
  }, [lesson.id, lesson.title, lesson.description, lesson.sortOrder]);

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        background: '#fafafa',
      }}
    >
      <div className="form-group">
        <label>Название урока</label>
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
        />
      </div>
      <div className="form-group">
        <label>Описание</label>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          rows={3}
          style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
        />
      </div>
      <div className="form-group">
        <label>Порядок (номер в цепочке)</label>
        <input
          type="number"
          min={1}
          value={draft.sortOrder}
          onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) || 1 }))}
          style={{ width: 120, padding: 8, borderRadius: 8, border: '1px solid #d1d5db' }}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy[`save-${lesson.id}`]}
          onClick={() => onSave({ ...lesson, ...draft })}
        >
          {busy[`save-${lesson.id}`] ? '…' : 'Сохранить урок'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy[`del-${lesson.id}`]}
          onClick={() => onDelete(lesson.id)}
        >
          Удалить
        </button>
      </div>
      <div className="form-group">
        <label>Видео урока (файл mp4 / webm / mov)</label>
        <input
          type="file"
          accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
          disabled={busy[`vid-${lesson.id}`]}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            onVideo(f);
          }}
        />
        {lesson.videoUrl && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Текущее: {lesson.videoUrl}</div>
        )}
      </div>
      <div className="form-group">
        <label>Доп. материалы к уроку</label>
        <input
          type="file"
          multiple
          disabled={busy[`mat-${lesson.id}`]}
          onChange={(e) => {
            onMaterials(e.target.files);
            e.target.value = '';
          }}
        />
        {Array.isArray(lesson.materials) && lesson.materials.length > 0 && (
          <ul style={{ fontSize: 13, margin: '8px 0 0', paddingLeft: 18 }}>
            {lesson.materials.map((m) => (
              <li key={m.id}>{m.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
