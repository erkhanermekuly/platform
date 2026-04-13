import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { coursesAPI, learningAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';
import { isLessonUnlocked, sortLessons } from '../services/lessonProgress';
import '../styles/pages.css';

export default function LessonPlayerPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [completedIds, setCompletedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [enrollmentOk, setEnrollmentOk] = useState(null);
  const [completing, setCompleting] = useState(false);

  const lid = Number(lessonId);
  const cid = Number(courseId);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setProgressLoaded(false);
    try {
      const res = await coursesAPI.getCourseById(courseId);
      setCourse(res?.data ?? null);
      if (isAuthenticated) {
        try {
          const pr = await learningAPI.getLessonProgress(cid);
          setCompletedIds(pr?.data?.completedLessonIds ?? []);
          setEnrollmentOk(true);
        } catch {
          setCompletedIds([]);
          setEnrollmentOk(false);
        }
      } else {
        setCompletedIds([]);
        setEnrollmentOk(null);
      }
    } catch (e) {
      console.error(e);
      setCourse(null);
    } finally {
      setLoading(false);
      setProgressLoaded(true);
    }
  }, [courseId, cid, isAuthenticated]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sortedLessons = useMemo(() => sortLessons(course?.lessons), [course?.lessons]);
  const lesson = sortedLessons.find((l) => l.id === lid);

  const unlocked = useMemo(() => {
    if (!lesson || !sortedLessons.length) return false;
    if (!isAuthenticated || enrollmentOk !== true) return false;
    return isLessonUnlocked(sortedLessons, lid, completedIds);
  }, [lesson, sortedLessons, lid, completedIds, isAuthenticated, enrollmentOk]);

  const handleVideoEnded = async () => {
    if (!unlocked || completing) return;
    setCompleting(true);
    try {
      await learningAPI.completeLesson(lid);
      setCompletedIds((prev) => (prev.includes(lid) ? prev : [...prev, lid]));
    } catch (e) {
      alert(e?.message || 'Не удалось сохранить прогресс');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка урока…</div>;
  }

  if (!course || !lesson) {
    return (
      <div className="error" style={{ padding: 40 }}>
        <p>Урок не найден</p>
        <Link to={`/course/${courseId}`}>← К курсу</Link>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
        <h1>{lesson.title}</h1>
        <p>Войдите и запишитесь на курс, чтобы смотреть уроки по порядку.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
          Войти
        </button>
        <Link to={`/course/${courseId}`} style={{ marginLeft: 16 }}>
          К странице курса
        </Link>
      </div>
    );
  }

  if (!progressLoaded) {
    return <div className="loading">Проверка доступа…</div>;
  }

  if (isAuthenticated && enrollmentOk === false) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
        <h1>{lesson.title}</h1>
        <p>Чтобы проходить уроки по порядку, сначала запишитесь на курс.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate(`/course/${courseId}`)}>
          Перейти к курсу
        </button>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
        <h1>{lesson.title}</h1>
        <p style={{ color: '#b45309' }}>
          Этот урок пока недоступен. Завершите предыдущий урок (досмотрите видео до конца), чтобы открыть следующий.
        </p>
        <Link to={`/course/${courseId}`}>← К программе курса</Link>
      </div>
    );
  }

  const v = lesson.videoUrl;
  const isYoutube =
    v && (String(v).includes('youtube.com') || String(v).includes('youtu.be'));

  return (
    <div className="course-details-page" style={{ paddingBottom: 48 }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <nav style={{ marginBottom: 16, fontSize: 14 }}>
          <Link to={`/course/${courseId}`}>← {course.title}</Link>
        </nav>
        <h1 style={{ marginBottom: 8 }}>{lesson.title}</h1>
        <p style={{ color: '#4b5563', marginBottom: 24 }}>{lesson.description}</p>

        {v ? (
          <div style={{ marginBottom: 28 }}>
            {isYoutube ? (
              <iframe
                title={lesson.title}
                src={v}
                style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 12 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                controls
                src={v}
                style={{ width: '100%', maxHeight: 480, borderRadius: 12, background: '#111' }}
                onEnded={handleVideoEnded}
              />
            )}
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>Видео к этому уроку ещё не загружено.</p>
        )}

        {isYoutube && (
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Для YouTube нажмите «Завершить урок» после просмотра.
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: 12 }}
              disabled={completing || completedIds.includes(lid)}
              onClick={handleVideoEnded}
            >
              {completedIds.includes(lid) ? 'Урок завершён' : 'Завершить урок'}
            </button>
          </p>
        )}

        {Array.isArray(lesson.materials) && lesson.materials.length > 0 && (
          <section>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>Материалы к уроку</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {lesson.materials.map((m) => (
                <li key={m.id} style={{ marginBottom: 8 }}>
                  <a href={m.url} download className="btn btn-secondary" style={{ display: 'inline-block' }}>
                    ⬇ {m.name}
                  </a>
                  <span style={{ marginLeft: 8, fontSize: 13, color: '#6b7280' }}>{m.type}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
