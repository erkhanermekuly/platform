import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { lessonsAPI } from '../../api/courseService';
import styles from './AdminPanel.module.css';

/**
 * Блок на главной админке: добавление уроков и краткий список без перехода на отдельную страницу.
 */
export default function AdminCourseLessonsInline({ courseId, isOpen, onLessonsChanged }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await lessonsAPI.list(courseId);
    const list = Array.isArray(res?.data) ? res.data : [];
    setLessons(list);
    const maxOrder = list.reduce((m, l) => Math.max(m, Number(l.sortOrder) || 0), 0);
    setSortOrder(maxOrder + 1);
  }, [courseId]);

  useEffect(() => {
    if (!isOpen || !courseId) {
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    load()
      .catch(() => {
        if (!cancelled) setLessons([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, courseId, load]);

  if (!isOpen) {
    return null;
  }

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Укажите название урока');
      return;
    }
    setBusy(true);
    try {
      await lessonsAPI.create(courseId, {
        title: title.trim(),
        description: description.trim(),
        sortOrder: Number(sortOrder) || 0,
        videoUrl: videoUrl.trim() || undefined,
      });
      setTitle('');
      setDescription('');
      setVideoUrl('');
      await load();
      onLessonsChanged?.();
    } catch (err) {
      alert(err?.message || 'Не удалось создать урок');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (lessonId) => {
    if (!window.confirm('Удалить этот урок?')) return;
    setBusy(true);
    try {
      await lessonsAPI.delete(courseId, lessonId);
      await load();
      onLessonsChanged?.();
    } catch (err) {
      alert(err?.message || 'Не удалось удалить урок');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.inlineLessons}>
      <p className={styles.inlineLessonsIntro}>
        Добавьте уроки к этому курсу. Видео — только ссылка YouTube (embed). Материалы к уроку можно прикрепить на
        отдельной странице.
      </p>

      {loading ? (
        <p className={styles.inlineMuted}>Загрузка списка уроков…</p>
      ) : (
        <form onSubmit={handleAdd} className={styles.inlineLessonForm}>
          <span className={styles.inlineLessonsFormTitle}>Новый урок</span>
          <input
            className={styles.input}
            placeholder="Название (например: Урок 1. Введение)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
          />
          <textarea
            className={styles.textarea}
            placeholder="Описание урока"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
          />
          <div className={styles.inlineLessonRow2}>
            <input
              type="url"
              className={styles.input}
              placeholder="YouTube embed URL (необязательно)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={busy}
            />
            <input
              type="number"
              min={0}
              className={styles.input}
              style={{ maxWidth: 100 }}
              title="Порядок"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={busy}
            />
          </div>
          <button type="submit" className={styles.inlineAddLessonBtn} disabled={busy}>
            {busy ? 'Сохранение…' : '➕ Добавить урок'}
          </button>
        </form>
      )}

      {!loading && lessons.length > 0 && (
        <div className={styles.inlineLessonListWrap}>
          <span className={styles.inlineLessonsFormTitle}>Уроков в курсе: {lessons.length}</span>
          <ul className={styles.inlineLessonList}>
            {lessons.map((l) => (
              <li key={l.id} className={styles.inlineLessonListItem}>
                <span className={styles.inlineLessonOrder}>{l.sortOrder}.</span>
                <span className={styles.inlineLessonTitle}>{l.title}</span>
                <button
                  type="button"
                  className={styles.inlineLessonDelete}
                  title="Удалить урок"
                  disabled={busy}
                  onClick={() => handleDelete(l.id)}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && lessons.length === 0 && (
        <p className={styles.inlineMuted}>Пока нет уроков — добавьте первый через форму выше.</p>
      )}

      <div className={styles.inlineLessonsFooter}>
        <Link to={`/admin/courses/${courseId}/lessons`} className={styles.lessonsLinkFull}>
          Полное управление: правка текста, материалы →
        </Link>
      </div>
    </div>
  );
}
