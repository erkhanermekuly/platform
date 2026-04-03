import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { learningAPI } from '../api/courseService';
import '../styles/pages.css';

export default function MyLearningPage() {
  const [myLearning, setMyLearning] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchMyLearning = async () => {
      try {
        const response = await learningAPI.getMyLearning();
        setMyLearning(response.data);
      } catch (error) {
        console.error('Error loading my learning:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyLearning();
  }, []);

  const handleProgressUpdate = async (courseId, newProgress) => {
    try {
      await learningAPI.updateProgress(courseId, 1, newProgress);
      setMyLearning(prev =>
        prev.map(item =>
          item.courseId === courseId ? { ...item, progress: newProgress } : item
        )
      );
    } catch (error) {
      alert('Ошибка при обновлении прогресса');
    }
  };

  const filteredCourses = filter === 'all'
    ? myLearning
    : filter === 'completed'
      ? myLearning.filter(c => c.progress === 100)
      : myLearning.filter(c => c.progress < 100);

  return (
    <div className="my-learning-page">
      <div className="page-header">
        <h1>Мое обучение</h1>
        <p>Продолжайте свой путь обучения</p>
      </div>

      {/* Filter Tabs */}
      <div className="learning-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Все курсы ({myLearning.length})
        </button>
        <button
          className={`filter-btn ${filter === 'progress' ? 'active' : ''}`}
          onClick={() => setFilter('progress')}
        >
          В процессе ({myLearning.filter(c => c.progress < 100).length})
        </button>
        <button
          className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Завершено ({myLearning.filter(c => c.progress === 100).length})
        </button>
      </div>

      {/* Learning List */}
      {loading ? (
        <div className="loading">Загрузка курсов...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>Нет курсов</h2>
          <p>Вы еще не зарегистрировались на курсы</p>
          <Link to="/courses" className="btn btn-primary">
            Обзор курсов
          </Link>
        </div>
      ) : (
        <div className="learning-list">
          {filteredCourses.map(course => (
            <div key={course.id} className="learning-item">
              <img src={course.image} alt={course.title} className="learning-image" />
              
              <div className="learning-info">
                <h3>{course.title}</h3>
                <p className="instructor">Преподаватель: {course.instructor}</p>
                <p className="last-accessed">Последний доступ: {course.lastAccessed}</p>
                
                <div className="progress-section">
                  <div className="progress-header">
                    <span>Прогресс</span>
                    <span className="progress-percent">{course.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="learning-actions">
                {course.progress === 100 ? (
                  <div className="completed-badge">
                    ✓ Завершено
                  </div>
                ) : (
                  <>
                    <Link
                      to={`/course/${course.courseId}`}
                      className="btn btn-primary"
                    >
                      Продолжить
                    </Link>
                    <div className="quick-actions">
                      <button
                        onClick={() => handleProgressUpdate(course.courseId, course.progress + 5)}
                        title="Добавить 5%"
                      >
                        +5%
                      </button>
                      <button
                        onClick={() => handleProgressUpdate(course.courseId, 100)}
                        title="Завершить курс"
                      >
                        ✓
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <section className="learning-stats">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h4>{myLearning.length}</h4>
            <p>Активных курсов</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h4>{Math.round(myLearning.reduce((acc, c) => acc + c.progress, 0) / Math.max(myLearning.length, 1))}%</h4>
            <p>Средний прогресс</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h4>{myLearning.filter(c => c.progress === 100).length}</h4>
            <p>Завершено</p>
          </div>
        </div>
      </section>
    </div>
  );
}
