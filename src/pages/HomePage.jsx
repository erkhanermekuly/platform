import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../hooks/useApi';
import '../styles/pages.css';

export default function HomePage() {
  const { courses, loading } = useCourses();
  const [category, setCategory] = useState('all');

  const filteredCourses = category === 'all' 
    ? courses.slice(0, 3)
    : courses.filter(c => c.category === category).slice(0, 3);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Добро пожаловать на LearnHub</h1>
          <p>Обучайтесь новым навыкам в удобное время</p>
          <Link to="/courses" className="btn btn-primary btn-large">
            Начать обучение
          </Link>
        </div>
        <div className="hero-image">
          <svg width="400" height="300" viewBox="0 0 400 300">
            <circle cx="200" cy="150" r="120" fill="#e0e7ff" />
            <rect x="150" y="100" width="100" height="100" fill="#6366f1" rx="10" />
            <text x="200" y="160" textAnchor="middle" fill="white" fontSize="24" fontWeight="bold">
              Learn
            </text>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Почему LearnHub?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3>500+ курсов</h3>
            <p>Обучающие курсы на разные темы</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👨‍🏫</div>
            <h3>Опытные преподаватели</h3>
            <p>Лучшие специалисты в своей области</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏆</div>
            <h3>Сертификаты</h3>
            <p>Получите признанные сертификаты</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏰</div>
            <h3>Своя скорость</h3>
            <p>Учитесь в удобном для вас темпе</p>
          </div>
        </div>
      </section>

      {/* Popular Courses Section */}
      <section className="popular-courses-section">
        <h2>Популярные курсы</h2>
        
        {loading ? (
          <div className="loading">Загрузка курсов...</div>
        ) : (
          <div className="courses-grid">
            {filteredCourses.map(course => (
              <Link 
                key={course.id} 
                to={`/course/${course.id}`}
                className="course-card-link"
              >
                <div className="course-card">
                  <img src={course.image} alt={course.title} />
                  <div className="course-info">
                    <span className="course-category">{course.category}</span>
                    <h3>{course.title}</h3>
                    <p className="instructor">👨‍🏫 {course.instructor}</p>
                    <div className="course-stats">
                      <span className="rating">⭐ {course.rating}</span>
                      <span className="students">{course.students.toLocaleString()} студентов</span>
                    </div>
                    <div className="course-price">
                      {course.price === 0 ? 'Бесплатно' : `$${course.price}`}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="view-all">
          <Link to="/courses" className="btn btn-secondary">
            Смотреть все курсы
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat">
          <h3>500,000+</h3>
          <p>Студентов</p>
        </div>
        <div className="stat">
          <h3>1000+</h3>
          <p>Курсов</p>
        </div>
        <div className="stat">
          <h3>95%</h3>
          <p>Довольны обучением</p>
        </div>
        <div className="stat">
          <h3>50+</h3>
          <p>Стран</p>
        </div>
      </section>
    </div>
  );
}
