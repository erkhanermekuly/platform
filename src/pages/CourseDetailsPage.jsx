import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { coursesAPI, reviewsAPI, learningAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';
import { sortLessons, isLessonUnlocked } from '../services/lessonProgress';
import '../styles/pages.css';

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, text: '' });
  const [activeTab, setActiveTab] = useState('overview');
  const [completedLessonIds, setCompletedLessonIds] = useState([]);

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
    if (!isAuthenticated || !courseId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const pr = await learningAPI.getLessonProgress(Number(courseId));
        if (!cancelled) {
          setEnrolled(true);
          setCompletedLessonIds(pr?.data?.completedLessonIds ?? []);
        }
      } catch {
        if (!cancelled) {
          setCompletedLessonIds([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, courseId, activeTab]);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setEnrolling(true);
    try {
      const result = await learningAPI.enrollCourse(courseId);
      if (result.success) {
        setEnrolled(true);
        setCompletedLessonIds([]);
        alert('Вы успешно зарегистрировались на курс!');
      }
    } catch (error) {
      alert('Ошибка при регистрации на курс');
    } finally {
      setEnrolling(false);
    }
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
      
      // Reload reviews
      const updatedReviews = await reviewsAPI.getCourseReviews(courseId);
      setReviews(updatedReviews.data);
    } catch (error) {
      alert('Ошибка при добавлении отзыва');
    }
  };

  if (loading) {
    return <div className="loading">Загрузка курса...</div>;
  }

  if (!course) {
    return <div className="error">Курс не найден</div>;
  }

  const sortedLessons = sortLessons(course.lessons);

  return (
    <div className="course-details-page">
      {/* Course Header */}
      <div className="course-header-section">
        <div className="course-header-content">
          <img
            src={course.image || 'https://via.placeholder.com/800x400?text=Course'}
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
                <span className="value">👨‍🏫 {course.instructor.name}</span>
              </div>
              <div className="meta-item">
                <span className="label">Рейтинг</span>
                <span className="value">⭐ {course.rating} ({course.students.toLocaleString()} студентов)</span>
              </div>
              <div className="meta-item">
                <span className="label">Длительность</span>
                <span className="value">⏱️ {course.duration}</span>
              </div>
              <div className="meta-item">
                <span className="label">Цена</span>
                <span className="value price">{course.price === 0 ? 'Бесплатно' : `$${course.price}`}</span>
              </div>
            </div>

            <button
              onClick={handleEnroll}
              disabled={enrolling || enrolled}
              className={`btn ${enrolled ? 'btn-success' : 'btn-primary'} btn-large`}
            >
              {enrolled ? '✓ Вы записаны' : enrolling ? 'Записание...' : 'Записаться на курс'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="course-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Обзор
        </button>
        <button
          className={`tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
          onClick={() => setActiveTab('curriculum')}
        >
          Программа
        </button>
        <button
          className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Отзывы
        </button>
      </div>

      <div className="course-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <section className="tab-content">
            <h2>О курсе</h2>
            <p>{course.description}</p>

            {course.videoUrl && (
              <div style={{ margin: '24px 0' }}>
                <h3>Видео</h3>
                {String(course.videoUrl).includes('youtube.com') ||
                String(course.videoUrl).includes('youtu.be') ? (
                  <iframe
                    title="Превью курса"
                    src={course.videoUrl}
                    style={{ width: '100%', maxWidth: 720, aspectRatio: '16/9', border: 0, borderRadius: 12 }}
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
              <img
                src={course.instructor.avatar || 'https://via.placeholder.com/120?text=?'}
                alt={course.instructor.name}
              />
              <div>
                <h4>{course.instructor.name}</h4>
                <p>{course.instructor.bio}</p>
              </div>
            </div>
          </section>
        )}

        {/* Curriculum Tab */}
        {activeTab === 'curriculum' && (
          <section className="tab-content">
            <h2>Программа курса</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, maxWidth: 720 }}>
              Уроки открываются по порядку: следующий станет доступен после того, как вы досмотрите видео предыдущего урока до конца
              (для роликов с YouTube нажмите «Завершить урок» на странице урока).
            </p>
            <div className="modules-list">
              {sortedLessons.length === 0 ? (
                <p style={{ color: '#6b7280' }}>Список уроков скоро появится.</p>
              ) : (
                sortedLessons.map((lesson, index) => {
                  const open = enrolled && isLessonUnlocked(sortedLessons, lesson.id, completedLessonIds);
                  const done = completedLessonIds.includes(lesson.id);
                  return (
                    <div key={lesson.id} className="module">
                      <div className="module-header">
                        <h3>
                          {index + 1}. {lesson.title}
                          {done && <span style={{ marginLeft: 8, fontSize: 14 }}>✓</span>}
                          {!open && enrolled && <span style={{ marginLeft: 8, fontSize: 14 }}>🔒</span>}
                        </h3>
                      </div>
                      <p style={{ color: '#4b5563', marginBottom: 12 }}>{lesson.description}</p>
                      {open ? (
                        <Link className="btn btn-primary" to={`/course/${courseId}/lesson/${lesson.id}`}>
                          Перейти к уроку
                        </Link>
                      ) : enrolled ? (
                        <span style={{ color: '#b45309' }}>Сначала завершите предыдущий урок</span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>Запишитесь на курс, чтобы проходить уроки</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <section className="tab-content">
            <h2>Отзывы студентов</h2>

            {/* Add Review Form */}
            {isAuthenticated && (
              <div className="review-form">
                <h3>Оставить отзыв</h3>
                <form onSubmit={handleAddReview}>
                  <div className="form-group">
                    <label>Рейтинг</label>
                    <select
                      value={newReview.rating}
                      onChange={(e) => setNewReview({ ...newReview, rating: e.target.value })}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ Отличный курс</option>
                      <option value="4">⭐⭐⭐⭐ Хороший курс</option>
                      <option value="3">⭐⭐⭐ Нормальный курс</option>
                      <option value="2">⭐⭐ Плохой курс</option>
                      <option value="1">⭐ Очень плохой курс</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ваш отзыв</label>
                    <textarea
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

            {/* Reviews List */}
            <div className="reviews-list">
              {reviews.map(review => (
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
    </div>
  );
}
