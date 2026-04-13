import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { coursesAPI, lessonsAPI, filesAPI } from '../api/courseService';
import { Trash2, ArrowLeft } from 'lucide-react';
import styles from './AdminCourseLessonsPage.module.css';

function LessonEditor({ courseId, lesson, onSaved, onDeleted }) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description || '');
  const [sortOrder, setSortOrder] = useState(lesson.sortOrder);
  const [videoUrlText, setVideoUrlText] = useState(lesson.videoUrl || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(lesson.title);
    setDescription(lesson.description || '');
    setSortOrder(lesson.sortOrder);
    setVideoUrlText(lesson.videoUrl || '');
  }, [
    lesson.id,
    lesson.title,
    lesson.description,
    lesson.sortOrder,
    lesson.videoUrl,
  ]);

  const saveTextFields = async () => {
    setSaving(true);
    try {
      await lessonsAPI.update(courseId, lesson.id, {
        title: title.trim(),
        description: description.trim(),
        sortOrder: Number(sortOrder) || 0,
        videoUrl: videoUrlText.trim() || null,
      });
      await onSaved();
    } catch (e) {
      alert(e?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const addMaterials = async (e) => {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    if (!list.length) return;
    setSaving(true);
    try {
      await filesAPI.uploadCourseFiles(courseId, list, { lessonId: lesson.id });
      await onSaved();
    } catch (err) {
      alert(err?.message || 'Ошибка загрузки файлов');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Удалить урок?')) return;
    try {
      await lessonsAPI.delete(courseId, lesson.id);
      await onDeleted();
    } catch (err) {
      alert(err?.message || 'Ошибка удаления');
    }
  };

  return (
    <div className={styles.lessonCard}>
      <div className={styles.lessonGrid}>
        <label className={styles.field}>
          <span>Название</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={styles.input} />
        </label>
        <label className={styles.field}>
          <span>Порядок</span>
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={styles.input}
          />
        </label>
        <label className={`${styles.field} ${styles.full}`}>
          <span>Описание урока</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={styles.textarea}
          />
        </label>
        <label className={`${styles.field} ${styles.full}`}>
          <span>Видео урока (ссылка YouTube)</span>
          <input
            type="url"
            value={videoUrlText}
            onChange={(e) => setVideoUrlText(e.target.value)}
            className={styles.input}
            placeholder="https://www.youtube.com/embed/…"
          />
          <p className={styles.embedHint}>
            Укажите embed-ссылку (вставка → «Поделиться» → «Встроить»). В БД сохраняется только текст ссылки, без
            видеофайлов.
          </p>
        </label>
        <div className={styles.fileRow}>
          <span className={styles.fileLabel}>Материалы к уроку</span>
          <input type="file" multiple onChange={addMaterials} disabled={saving} />
        </div>
      </div>
      {lesson.materials?.length > 0 && (
        <ul className={styles.matList}>
          {lesson.materials.map((m) => (
            <li key={m.id}>
              <a href={m.url} target="_blank" rel="noreferrer">
                {m.name}
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.lessonActions}>
        <button type="button" className={styles.btnPrimary} onClick={saveTextFields} disabled={saving}>
          Сохранить урок
        </button>
        <button type="button" className={styles.btnDanger} onClick={remove}>
          <Trash2 size={16} /> Удалить урок
        </button>
      </div>
    </div>
  );
}

export default function AdminCourseLessonsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState('');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newOrder, setNewOrder] = useState(1);

  const load = useCallback(async () => {
    const [cRes, lRes] = await Promise.all([
      coursesAPI.getCourseById(courseId),
      lessonsAPI.list(courseId),
    ]);
    setCourseTitle(cRes?.data?.title || '');
    setLessons(Array.isArray(lRes?.data) ? lRes.data : []);
    const nextOrder =
      (Array.isArray(lRes?.data) && lRes.data.length > 0
        ? Math.max(...lRes.data.map((x) => x.sortOrder)) + 1
        : 1);
    setNewOrder(nextOrder);
  }, [courseId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) alert(e?.message || 'Не удалось загрузить');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const addLesson = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Введите название урока');
      return;
    }
    try {
      await lessonsAPI.create(courseId, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        sortOrder: Number(newOrder) || 0,
        videoUrl: newVideoUrl.trim() || undefined,
      });
      setNewTitle('');
      setNewDesc('');
      setNewVideoUrl('');
      await load();
    } catch (err) {
      alert(err?.message || 'Ошибка создания');
    }
  };

  if (loading) {
    return <div className={styles.page}>Загрузка…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={() => navigate('/admin/courses')}>
          <ArrowLeft size={18} /> Назад к курсам
        </button>
        <h1 className={styles.title}>Уроки: {courseTitle}</h1>
      </div>
      <p className={styles.hint}>
        Уроки открываются по очереди: следующий доступен только после просмотра предыдущего видео до конца.
      </p>

      <section className={styles.section}>
        <h2>Новый урок</h2>
        <form onSubmit={addLesson} className={styles.newForm}>
          <input
            placeholder="Название (например: Урок 1. Введение)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className={styles.input}
          />
          <textarea
            placeholder="Описание"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className={styles.textarea}
            rows={2}
          />
          <input
            type="url"
            placeholder="YouTube embed URL (необязательно)"
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            className={styles.input}
          />
          <input
            type="number"
            min={0}
            value={newOrder}
            onChange={(e) => setNewOrder(e.target.value)}
            className={styles.inputSmall}
          />
          <button type="submit" className={styles.btnPrimary}>
            Добавить урок
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2>Все уроки ({lessons.length})</h2>
        <div className={styles.lessonList}>
          {lessons.map((lesson) => (
            <LessonEditor
              key={lesson.id}
              courseId={courseId}
              lesson={lesson}
              onSaved={load}
              onDeleted={load}
            />
          ))}
        </div>
      </section>

      <div className={styles.footerLink}>
        <Link to="/admin/courses">← К списку курсов</Link>
      </div>
    </div>
  );
}
