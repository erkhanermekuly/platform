import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, reviewsAPI, learningAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';
import { AppContext } from '../context/AppContext';
import PaymentModal from '../components/PaymentModal/PaymentModal';
import '../styles/pages.css';

function isYoutubeUrl(url) {
  if (!url) return false;
  const s = String(url);
  return s.includes('youtube.com') || s.includes('youtu.be');
}

function instructorInitials(name) {
  if (!name || typeof name !== 'string') return '—';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const a = parts[0][0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase() || '?';
}

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { purchaseCourse, enrollFreeCourse, purchasedCourses } = useContext(AppContext);

  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [activeTab, setActiveTab] = useState('overview');

  const cid = Number(courseId);
  const inMyLearning = Number.isFinite(cid) && purchasedCourses.includes(cid);
  const hasAccess = enrolled || inMyLearning;

  const [curriculum, setCurriculum] = useState(null);
  const [curriculumError, setCurriculumError] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setCurriculum(null);
    setSelectedLessonId(null);
    setCurriculumError(null);
  }, [courseId]);

  const loadCurriculum = useCallback(async () => {
    if (!isAuthenticated) {
      setCurriculum(null);
      setCurriculumError(null);
      return;
    }
    const numericId = Number(courseId);
    try {
      const res = await learningAPI.getCourseCurriculum(courseId);
      const rows = Array.isArray(res?.data) ? res.data : [];
      setCurriculum(rows);
      setCurriculumError(null);
      setEnrolled(true);
      setSelectedLessonId((prev) => {
        if (prev != null && rows.some((l) => l.id === prev)) {
          return prev;
        }
        const firstOpen = rows.find((l) => l.isUnlocked) || rows[0];
        return firstOpen?.id ?? null;
      });
    } catch {
      setCurriculum(null);
      setCurriculumError('curriculum');
      if (!Number.isFinite(numericId) || !purchasedCourses.includes(numericId)) {
        setEnrolled(false);
      }
    }
  }, [courseId, isAuthenticated, purchasedCourses]);

  useEffect(() => {
    if (!isAuthenticated) {
      setEnrolled(false);
      return;
    }
    let cancelled = false;
    const numericId = Number(courseId);
    learningAPI
      .getCourseCurriculum(courseId)
      .then(() => {
        if (!cancelled) setEnrolled(true);
      })
      .catch(() => {
        if (
          !cancelled &&
          (!Number.isFinite(numericId) || !purchasedCourses.includes(numericId))
        ) {
          setEnrolled(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, courseId, purchasedCourses]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const courseData = await coursesAPI.getCourseById(courseId);
        const reviewsData = await reviewsAPI.getCourseReviews(courseId);

        setCourse(courseData.data);
        setReviews(reviewsData.data);
      } catch (error) {
        console.error('Error loading course:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  useEffect(() => {
    if (activeTab === 'curriculum' && isAuthenticated) {
      loadCurriculum();
    }
  }, [activeTab, isAuthenticated, loadCurriculum]);

  const openCurriculumAfterAccess = useCallback(async () => {
    setActiveTab('curriculum');
    await loadCurriculum();
  }, [loadCurriculum]);

  const handleGetAccess = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (hasAccess) {
      await openCurriculumAfterAccess();
      return;
    }

    const isFree = !course || Number(course.price) <= 0;
    if (isFree) {
      setEnrolling(true);
      try {
        await enrollFreeCourse(courseId);
        setEnrolled(true);
        await openCurriculumAfterAccess();
      } catch (e) {
        alert(e?.message || 'Не удалось открыть доступ к урокам');
      } finally {
        setEnrolling(false);
      }
      return;
    }

    setPaymentOpen(true);
  };

  const handlePaymentConfirm = async (paidCourse) => {
    if (!paidCourse) return;
    await purchaseCourse(paidCourse.id, paidCourse.price);
    setEnrolled(true);
    setPaymentOpen(false);
    await openCurriculumAfterAccess();
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await reviewsAPI.addReview(courseId, newReview.rating, newReview.text);
      setNewReview({ rating: 5, text: '' });
      alert('Отзыв успешно добавлен!');

      const updatedReviews = await reviewsAPI.getCourseReviews(courseId);
      setReviews(updatedReviews.data);
    } catch (error) {
      alert('Ошибка при добавлении отзыва');
    }
  };

  const markLessonComplete = async (lessonId) => {
    if (!lessonId || completing) return;
    setCompleting(true);
    try {
      await learningAPI.completeLesson(lessonId);
      const res = await learningAPI.getCourseCurriculum(courseId);
      setCurriculum(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      alert(e?.message || 'Не удалось отметить урок');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка курса...</div>;
  }

  if (!course) {
    return <div className="error">Курс не найден</div>;
  }

  const outlineLessons = Array.isArray(course.lessons) && course.lessons.length > 0 ? course.lessons : null;
  const activeLesson =
    curriculum && selectedLessonId != null
      ? curriculum.find((l) => l.id === selectedLessonId)
      : null;

  return (
    <div className="course-details-page">
      <div className="course-header-section">
        <div className="course-header-content">
          <img
            src={course.image || 'https://via.placeholder.com/400x225?text=Course'}
            alt={course.title}
            className="course-hero-image"
          />
          <div className="course-header-info">
            <div className="course-breadcrumb">
              <span className="badge">{course.level}</span>
              <span className="badge">{course.category}</span>
            </div>
            <h1>{course.title}</h1>
            <p className="course-description">{course.description}</p>

            <div className="course-meta-info">
              <div className="meta-item">
                <span className="label">Преподаватель</span>
                <span className="value">👨‍🏫 {course.instructor?.name ?? '—'}</span>
              </div>
              <div className="meta-item">
                <span className="label">Рейтинг</span>
                <span className="value">
                  ⭐ {course.rating} ({course.students?.toLocaleString?.() ?? 0} студентов)
                </span>
              </div>
              <div className="meta-item">
                <span className="label">Длительность</span>
                <span className="value">⏱️ {course.duration ?? '—'}</span>
              </div>
              <div className="meta-item">
                <span className="label">Цена</span>
                <span className="value price">{course.price === 0 ? 'Бесплатно' : `${course.price} ₸`}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGetAccess}
              disabled={enrolling}
              className={`btn ${hasAccess ? 'btn-success' : 'btn-primary'} btn-large`}
            >
              {!isAuthenticated
                ? 'Войти и получить доступ к урокам'
                : enrolling
                  ? 'Открываем доступ…'
                  : hasAccess
                    ? 'К программе и урокам'
                    : Number(course.price) > 0
                      ? 'Купить и открыть 1-й урок'
                      : 'Начать бесплатно — 1-й урок'}
            </button>
            {isAuthenticated && hasAccess && (
              <p className="curriculum-hint" style={{ marginTop: 12 }}>
                Доступ открыт: в программе доступен 1-й урок; остальные — после завершения предыдущего.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="course-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Обзор
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
          onClick={() => setActiveTab('curriculum')}
        >
          Программа
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Отзывы
        </button>
      </div>

      <div className="course-content">
        {activeTab === 'overview' && (
          <section className="tab-content">
            <h2>О курсе</h2>
            <p>{course.description}</p>

            {course.videoUrl && (
              <div style={{ margin: '24px 0' }}>
                <h3>Вводное видео</h3>
                {isYoutubeUrl(course.videoUrl) ? (
                  <iframe
                    title="Превью курса"
                    src={course.videoUrl}
                    style={{
                      width: '100%',
                      maxWidth: 720,
                      aspectRatio: '16/9',
                      border: 0,
                      borderRadius: 12,
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    controls
                    src={course.videoUrl}
                    style={{ width: '100%', maxWidth: 720, borderRadius: 12 }}
                  />
                )}
              </div>
            )}

            <h3>Об инструкторе</h3>
            <div className="instructor-card">
              <div className="instructor-card__initials" aria-hidden>
                {instructorInitials(course.instructor?.name)}
              </div>
              <div>
                <h4>{course.instructor?.name ?? '—'}</h4>
                <p>{course.instructor?.bio ?? ''}</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'curriculum' && (
          <section className="tab-content">
            <h2>Программа курса</h2>

            {!isAuthenticated && (
              <p className="curriculum-hint">
                Войдите в аккаунт. Для бесплатного курса нажмите «Начать бесплатно»; для платного — оплатите на
                странице курса — после этого сразу откроется первый урок.
              </p>
            )}

            {isAuthenticated && curriculumError && !hasAccess && (
              <p className="curriculum-hint">
                Ещё нет доступа к урокам: для платного курса завершите оплату; для бесплатного — нажмите «Начать
                бесплатно» в шапке страницы. Дальше уроки открываются по порядку.
              </p>
            )}

            {isAuthenticated && hasAccess && curriculum && curriculum.length === 0 && (
              <p>Для этого курса ещё не добавлены уроки. Загляните позже.</p>
            )}

            {isAuthenticated && hasAccess && curriculum && curriculum.length > 0 && (
              <div className="curriculum-layout">
                <div className="curriculum-sidebar">
                  <h3 className="curriculum-sidebar-title">Уроки</h3>
                  <ul className="curriculum-lesson-list">
                    {curriculum.map((lesson, idx) => (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          className={`curriculum-lesson-btn ${selectedLessonId === lesson.id ? 'active' : ''} ${
                            !lesson.isUnlocked ? 'locked' : ''
                          }`}
                          disabled={!lesson.isUnlocked}
                          onClick={() => lesson.isUnlocked && setSelectedLessonId(lesson.id)}
                        >
                          <span className="lesson-num">{idx + 1}.</span>
                          <span className="lesson-ti">{lesson.title}</span>
                          {!lesson.isUnlocked && <span className="lock-tag">🔒</span>}
                          {lesson.isCompleted && <span className="done-tag">✓</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="curriculum-main">
                  {activeLesson && (
                    <>
                      <h3>{activeLesson.title}</h3>
                      <p className="lesson-desc">{activeLesson.description}</p>

                      {activeLesson.videoUrl && activeLesson.isUnlocked && (
                        <div className="lesson-video-wrap">
                          {isYoutubeUrl(activeLesson.videoUrl) ? (
                            <>
                              <iframe
                                title={activeLesson.title}
                                src={activeLesson.videoUrl}
                                style={{
                                  width: '100%',
                                  maxWidth: 720,
                                  aspectRatio: '16/9',
                                  border: 0,
                                  borderRadius: 12,
                                }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                              <p className="video-note">
                                После просмотра ролика нажмите кнопку ниже, чтобы открыть следующий урок.
                              </p>
                              {!activeLesson.isCompleted && (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  disabled={completing}
                                  onClick={() => markLessonComplete(activeLesson.id)}
                                >
                                  {completing ? '…' : 'Я просмотрел урок — отметить завершённым'}
                                </button>
                              )}
                            </>
                          ) : (
                            <video
                              controls
                              src={activeLesson.videoUrl}
                              style={{ width: '100%', maxWidth: 720, borderRadius: 12 }}
                              onEnded={() => {
                                if (!activeLesson.isCompleted) {
                                  markLessonComplete(activeLesson.id);
                                }
                              }}
                            />
                          )}
                        </div>
                      )}

                      {activeLesson.isUnlocked &&
                        activeLesson.materials &&
                        activeLesson.materials.length > 0 && (
                          <div className="lesson-materials">
                            <h4>Материалы</h4>
                            <ul>
                              {activeLesson.materials.map((m) => (
                                <li key={m.id}>
                                  <a href={m.url} target="_blank" rel="noreferrer">
                                    {m.name}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {activeLesson.isUnlocked && !activeLesson.videoUrl && !activeLesson.isCompleted && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={completing}
                          onClick={() => markLessonComplete(activeLesson.id)}
                        >
                          Завершить урок (без видео)
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {!hasAccess && outlineLessons && (
              <div className="modules-list">
                <p style={{ marginBottom: 16, color: '#6b7280' }}>
                  План курса (после покупки или старта бесплатного курса — доступ с 1-го урока по порядку):
                </p>
                {outlineLessons.map((lesson, index) => (
                  <div key={lesson.id} className="module">
                    <div className="module-header">
                      <h3>
                        {index + 1}. {lesson.title}
                      </h3>
                    </div>
                    {lesson.description && <p className="lesson-desc-preview">{lesson.description}</p>}
                  </div>
                ))}
              </div>
            )}

            {!hasAccess && !outlineLessons && course.modules && (
              <div className="modules-list">
                {course.modules.map((module, index) => (
                  <div key={module.id} className="module">
                    <div className="module-header">
                      <h3>
                        {index + 1}. {module.title}
                      </h3>
                      <span className="module-info">
                        {module.lessons} уроков • {module.duration}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'reviews' && (
          <section className="tab-content">
            <h2>Отзывы студентов</h2>

            {isAuthenticated && (
              <div className="review-form">
                <h3>Оставить отзыв</h3>
                <form onSubmit={handleAddReview}>
                  <div className="form-group">
                    <label htmlFor="review-rating">Рейтинг</label>
                    <select
                      id="review-rating"
                      value={newReview.rating}
                      onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ Отличный курс</option>
                      <option value="4">⭐⭐⭐⭐ Хороший курс</option>
                      <option value="3">⭐⭐⭐ Нормальный курс</option>
                      <option value="2">⭐⭐ Плохой курс</option>
                      <option value="1">⭐ Очень плохой курс</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="review-text">Ваш отзыв</label>
                    <textarea
                      id="review-text"
                      value={newReview.text}
                      onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                      placeholder="Поделитесь своим мнением о курсе..."
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    Отправить отзыв
                  </button>
                </form>
              </div>
            )}

            <div className="reviews-list">
              {reviews.map((review) => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <span className="reviewer-name">{review.user}</span>
                    <span className="review-rating">{'⭐'.repeat(review.rating)}</span>
                  </div>
                  <p className="review-text">{review.text}</p>
                  <span className="review-date">{review.date}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <PaymentModal
        isOpen={paymentOpen}
        course={course}
        onClose={() => setPaymentOpen(false)}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
