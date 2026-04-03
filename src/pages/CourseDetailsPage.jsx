import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, reviewsAPI, learningAPI } from '../api/courseService';
import { useAuth } from '../context/AuthContext';
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

  return (
    <div className="course-details-page">
      {/* Course Header */}
      <div className="course-header-section">
        <div className="course-header-content">
          <img src={course.image} alt={course.title} className="course-hero-image" />
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
            
            <h3>Об инструкторе</h3>
            <div className="instructor-card">
              <img src={course.instructor.avatar} alt={course.instructor.name} />
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
            <div className="modules-list">
              {course.modules.map((module, index) => (
                <div key={module.id} className="module">
                  <div className="module-header">
                    <h3>{index + 1}. {module.title}</h3>
                    <span className="module-info">
                      {module.lessons} уроков • {module.duration}
                    </span>
                  </div>
                  <div className="module-lessons">
                    {Array.from({ length: module.lessons }).map((_, i) => (
                      <div key={i} className="lesson">
                        <span className="lesson-icon">📹</span>
                        <span>Урок {i + 1}: Название урока</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
