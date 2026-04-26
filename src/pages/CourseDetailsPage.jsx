import { useState, useEffect, useCallback, useContext } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
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

function youtubeEmbedSrc(url) {
  if (!url) return '';
  const s = String(url).trim();
  if (s.includes('/embed/')) return s;
  try {
    const u = new URL(s);
    if (u.hostname === 'youtu.be' || u.hostname.endsWith('.youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    /* ignore */
  }
  return s;
}

function syllabusRowState(lesson, selectedLessonId) {
  if (!lesson.isUnlocked) return 'locked';
  if (lesson.isCompleted) return 'completed';
  if (lesson.id === selectedLessonId) return 'current';
  return 'available';
}

function syllabusRowMeta(lesson, selectedLessonId) {
  if (!lesson.isUnlocked) return 'Заблокировано';
  if (lesson.isCompleted) return 'Завершено';
  if (lesson.id === selectedLessonId) return 'Сейчас';
  return 'Доступно';
}

function instructorInitials(name) {
  if (!name || typeof name !== 'string') return '—';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const a = parts[0][0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase() || '?';
}

function formatCourseRating(r) {
  const n = Number(r);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${n.toFixed(1)}`;
}

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { purchaseCourse, enrollFreeCourse, purchasedCourses } = useContext(AppContext);

  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });

  const cid = Number(courseId);
  const inMyLearning = Number.isFinite(cid) && purchasedCourses.includes(cid);
  const hasAccess = enrolled || inMyLearning;

  const [curriculum, setCurriculum] = useState(null);
  const [curriculumError, setCurriculumError] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [courseProgressFromApi, setCourseProgressFromApi] = useState(null);
  const [certBusy, setCertBusy] = useState(false);

  useEffect(() => {
    setCurriculum(null);
    setSelectedLessonId(null);
    setCurriculumError(null);
  }, [courseId]);

  const refreshCourseProgress = useCallback(async () => {
    if (!isAuthenticated || !Number.isFinite(cid)) return;
    try {
      const res = await learningAPI.getMyLearning();
      const row = (res?.data || []).find((x) => Number(x.courseId) === cid);
      setCourseProgressFromApi(row != null ? row.progress : null);
    } catch {
      setCourseProgressFromApi(null);
    }
  }, [isAuthenticated, cid]);

  useEffect(() => {
    if (hasAccess) {
      refreshCourseProgress();
    } else {
      setCourseProgressFromApi(null);
    }
  }, [hasAccess, refreshCourseProgress]);

  useEffect(() => {
    if (!curriculum?.length) return;
    const want = Number(searchParams.get('lesson'));
    if (!Number.isFinite(want)) return;
    const row = curriculum.find((l) => l.id === want && l.isUnlocked);
    if (row) setSelectedLessonId(want);
  }, [searchParams, curriculum]);

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
      const want = Number(searchParams.get('lesson'));
      setSelectedLessonId((prev) => {
        if (Number.isFinite(want) && rows.some((l) => l.id === want && l.isUnlocked)) {
          return want;
        }
        if (prev != null && rows.some((l) => l.id === prev && l.isUnlocked)) {
          return prev;
        }
        const firstOpen = rows.find((l) => l.isUnlocked) || rows[0];
        return firstOpen?.id ?? null;
      });
      await refreshCourseProgress();
    } catch {
      setCurriculum(null);
      setCurriculumError('curriculum');
      if (!Number.isFinite(numericId) || !purchasedCourses.includes(numericId)) {
        setEnrolled(false);
      }
    }
  }, [courseId, isAuthenticated, purchasedCourses, searchParams, refreshCourseProgress]);

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
    if (!isAuthenticated || !hasAccess) return;
    loadCurriculum();
  }, [isAuthenticated, hasAccess, loadCurriculum]);

  const openCurriculumAfterAccess = useCallback(async () => {
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
    } catch {
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
      await refreshCourseProgress();
    } catch (e) {
      alert(e?.message || 'Не удалось отметить урок');
    } finally {
      setCompleting(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (certBusy) return;
    setCertBusy(true);
    try {
      await learningAPI.downloadCourseCertificate(courseId);
    } catch (e) {
      alert(e?.message || 'Не удалось скачать сертификат');
    } finally {
      setCertBusy(false);
    }
  };

  if (loading) {
    return <div className="loading crs-player-loading">Загрузка курса…</div>;
  }

  if (!course) {
    return <div className="error">Курс не найден</div>;
  }

  const outlineLessons = Array.isArray(course.lessons) && course.lessons.length > 0 ? course.lessons : null;
  const activeLesson =
    curriculum && selectedLessonId != null
      ? curriculum.find((l) => l.id === selectedLessonId)
      : null;

  const posterImage = course.image || 'https://via.placeholder.com/800x450?text=Course';
  const lessonVideoUrl =
    hasAccess && activeLesson?.isUnlocked && activeLesson?.videoUrl ? activeLesson.videoUrl : null;
  const primaryVideoUrl = lessonVideoUrl || course.videoUrl || null;
  const usingLessonVideo = Boolean(lessonVideoUrl);
  const categoryTag = [course.level, course.category].filter(Boolean).join(' / ').toUpperCase();
  const showLessonPanel = hasAccess && activeLesson;

  const ctaLabel = !isAuthenticated
    ? 'Войти и получить доступ к урокам'
    : enrolling
      ? 'Открываем доступ…'
      : hasAccess
        ? 'Продолжить обучение'
        : Number(course.price) > 0
          ? 'Купить и открыть 1-й урок'
          : 'Начать бесплатно — 1-й урок';

  return (
    <div className="course-details-page crs-player-page">
      <div className="crs-player-shell">
        <Link className="crs-player-back" to="/courses">
          ← В каталог курсов
        </Link>

        <div className="crs-player-grid">
          <main className="crs-player-main">
            <section className="crs-player-video-card" aria-label="Видео урока">
              <div className="crs-player-video-stage">
                {primaryVideoUrl ? (
                  isYoutubeUrl(primaryVideoUrl) ? (
                    <iframe
                      title={activeLesson?.title || course.title}
                      className="crs-player-iframe"
                      src={youtubeEmbedSrc(primaryVideoUrl)}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      controls
                      className="crs-player-video"
                      src={primaryVideoUrl}
                      poster={posterImage}
                      onEnded={() => {
                        if (
                          usingLessonVideo &&
                          activeLesson &&
                          !activeLesson.isCompleted
                        ) {
                          markLessonComplete(activeLesson.id);
                        }
                      }}
                    />
                  )
                ) : (
                  <div
                    className="crs-player-poster"
                    style={{ backgroundImage: `url(${posterImage})` }}
                  >
                    {!hasAccess ? (
                      <button
                        type="button"
                        className="crs-player-poster-play"
                        onClick={handleGetAccess}
                        aria-label={ctaLabel}
                      >
                        <span className="crs-player-poster-play-inner" aria-hidden>
                          ▶
                        </span>
                      </button>
                    ) : (
                      <div className="crs-player-poster-fallback">
                        <p>Видео для этого урока пока не добавлено.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showLessonPanel && (
                <div className="crs-player-lesson-below">
                  <h2 className="crs-player-lesson-title">{activeLesson.title}</h2>
                  {activeLesson.description ? (
                    <p className="crs-player-lesson-desc">{activeLesson.description}</p>
                  ) : null}

                  {activeLesson.videoUrl && activeLesson.isUnlocked && isYoutubeUrl(activeLesson.videoUrl) && (
                    <>
                      <p className="crs-player-video-note">
                        После просмотра ролика нажмите кнопку ниже, чтобы открыть следующий урок.
                      </p>
                      {!activeLesson.isCompleted && (
                        <button
                          type="button"
                          className="crs-player-btn crs-player-btn--primary"
                          disabled={completing}
                          onClick={() => markLessonComplete(activeLesson.id)}
                        >
                          {completing ? '…' : 'Я просмотрел урок — отметить завершённым'}
                        </button>
                      )}
                    </>
                  )}

                  {activeLesson.isUnlocked &&
                    activeLesson.materials &&
                    activeLesson.materials.length > 0 && (
                      <div className="crs-player-materials">
                        <h3 className="crs-player-materials-title">Материалы</h3>
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
                      className="crs-player-btn crs-player-btn--secondary"
                      disabled={completing}
                      onClick={() => markLessonComplete(activeLesson.id)}
                    >
                      Завершить урок (без видео)
                    </button>
                  )}
                </div>
              )}
            </section>

            <section className="crs-syllabus" id="crs-syllabus" aria-labelledby="crs-syllabus-heading">
              <h2 id="crs-syllabus-heading" className="crs-syllabus-heading">
                Программа курса
              </h2>

              {!isAuthenticated && (
                <p className="crs-syllabus-hint">
                  Войдите в аккаунт. Для бесплатного курса нажмите «Начать бесплатно»; для платного — оплатите в
                  карточке справа — после этого откроется первый урок.
                </p>
              )}

              {isAuthenticated && curriculumError && !hasAccess && (
                <p className="crs-syllabus-hint">
                  Ещё нет доступа к урокам: для платного курса завершите оплату; для бесплатного — нажмите кнопку в
                  боковой панели. Дальше уроки открываются по порядку.
                </p>
              )}

              {isAuthenticated && hasAccess && curriculumError && (
                <p className="crs-syllabus-hint crs-syllabus-hint--warn">
                  Не удалось загрузить программу уроков. Обновите страницу или попробуйте позже.
                </p>
              )}

              {isAuthenticated && hasAccess && curriculum && curriculum.length === 0 && (
                <p className="crs-syllabus-empty">Для этого курса ещё не добавлены уроки. Загляните позже.</p>
              )}

              {isAuthenticated && hasAccess && curriculum && curriculum.length > 0 && (
                <ul className="crs-syllabus-list">
                  {curriculum.map((lesson, idx) => {
                    const rowState = syllabusRowState(lesson, selectedLessonId);
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          className={`crs-syllabus-row crs-syllabus-row--${rowState}`}
                          disabled={!lesson.isUnlocked}
                          onClick={() => {
                            if (!lesson.isUnlocked) return;
                            setSelectedLessonId(lesson.id);
                            setSearchParams((prev) => {
                              const n = new URLSearchParams(prev);
                              n.set('lesson', String(lesson.id));
                              return n;
                            });
                          }}
                        >
                          <span className={`crs-syllabus-icon crs-syllabus-icon--${rowState}`} aria-hidden>
                            {rowState === 'locked' ? '🔒' : rowState === 'completed' ? '✓' : '▶'}
                          </span>
                          <span className="crs-syllabus-text">
                            <span className="crs-syllabus-name">
                              {idx + 1}. {lesson.title}
                            </span>
                            <span className={`crs-syllabus-meta crs-syllabus-meta--${rowState}`}>
                              {syllabusRowMeta(lesson, selectedLessonId)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {hasAccess && isAuthenticated && curriculum === null && !curriculumError && (
                <p className="crs-syllabus-empty">Загрузка программы…</p>
              )}

              {!hasAccess && outlineLessons && (
                <>
                  <p className="crs-syllabus-outline-lead">
                    План курса (после покупки или старта бесплатного курса — доступ с 1-го урока по порядку):
                  </p>
                  <ul className="crs-syllabus-list crs-syllabus-list--outline">
                  {outlineLessons.map((lesson, index) => (
                    <li key={lesson.id}>
                      <div className="crs-syllabus-row crs-syllabus-row--locked crs-syllabus-row--static">
                        <span className="crs-syllabus-icon crs-syllabus-icon--locked" aria-hidden>
                          🔒
                        </span>
                        <span className="crs-syllabus-text">
                          <span className="crs-syllabus-name">
                            {index + 1}. {lesson.title}
                          </span>
                          {lesson.description ? (
                            <span className="crs-syllabus-meta crs-syllabus-meta--locked">{lesson.description}</span>
                          ) : (
                            <span className="crs-syllabus-meta crs-syllabus-meta--locked">После записи</span>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                  </ul>
                </>
              )}

              {!hasAccess && !outlineLessons && course.modules && (
                <ul className="crs-syllabus-list crs-syllabus-list--outline">
                  {course.modules.map((module, index) => (
                    <li key={module.id}>
                      <div className="crs-syllabus-row crs-syllabus-row--locked crs-syllabus-row--static">
                        <span className="crs-syllabus-icon crs-syllabus-icon--locked" aria-hidden>
                          🔒
                        </span>
                        <span className="crs-syllabus-text">
                          <span className="crs-syllabus-name">
                            {index + 1}. {module.title}
                          </span>
                          <span className="crs-syllabus-meta crs-syllabus-meta--locked">
                            {module.lessons} уроков • {module.duration}
                          </span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {course.instructor?.bio ? (
              <section className="crs-player-instructor-bio" aria-labelledby="crs-instructor-heading">
                <h2 id="crs-instructor-heading" className="crs-syllabus-heading">
                  Об инструкторе
                </h2>
                <div className="crs-player-instructor-card">
                  <div className="crs-player-instructor-card-av" aria-hidden>
                    {instructorInitials(course.instructor?.name)}
                  </div>
                  <div>
                    <h3 className="crs-player-instructor-card-name">{course.instructor?.name ?? '—'}</h3>
                    <p>{course.instructor.bio}</p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="crs-player-reviews" id="reviews" aria-labelledby="crs-reviews-heading">
              <h2 id="crs-reviews-heading" className="crs-syllabus-heading">
                Отзывы студентов
              </h2>

              {isAuthenticated && (
                <div className="review-form crs-player-review-form">
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
                    <button type="submit" className="crs-player-btn crs-player-btn--primary">
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
          </main>

          <aside className="crs-player-aside">
            <div className="crs-player-aside-card">
              {categoryTag ? <span className="crs-player-cat-tag">{categoryTag}</span> : null}
              <h1 className="crs-player-aside-title">{course.title}</h1>
              <div className="crs-player-instructor-row">
                <span className="crs-player-instructor-av" aria-hidden>
                  {instructorInitials(course.instructor?.name)}
                </span>
                <span className="crs-player-instructor-name">{course.instructor?.name ?? '—'}</span>
              </div>
              <p className="crs-player-aside-desc">{course.description}</p>

              <button
                type="button"
                onClick={handleGetAccess}
                disabled={enrolling}
                className="crs-player-primary-cta"
              >
                <span className="crs-player-primary-cta-icon" aria-hidden>
                  🎓
                </span>
                {ctaLabel}
              </button>

              {isAuthenticated && hasAccess && courseProgressFromApi === 100 && (
                <button
                  type="button"
                  className="crs-player-btn crs-player-btn--ghost"
                  disabled={certBusy}
                  onClick={handleDownloadCertificate}
                >
                  {certBusy ? '…' : 'Скачать сертификат (PDF)'}
                </button>
              )}

              {!hasAccess && (
                <p className="crs-player-aside-price">
                  {Number(course.price) <= 0 ? 'Бесплатно' : `${course.price.toLocaleString('ru-RU')} ₸`}
                </p>
              )}

              {isAuthenticated && hasAccess && (
                <p className="crs-player-aside-hint">
                  Доступ открыт: первый урок в программе; остальные — после завершения предыдущего.
                </p>
              )}

              <div className="crs-player-aside-stats">
                <span className="crs-player-stat">
                  <span aria-hidden>★</span> {formatCourseRating(course.rating)} рейтинг
                </span>
                <span className="crs-player-stat">
                  <span aria-hidden>🕐</span> {course.duration ?? '—'} всего
                </span>
              </div>
            </div>
          </aside>
        </div>
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
