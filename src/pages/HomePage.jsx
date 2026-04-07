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
          <h1>Добро пожаловать в BilimAll</h1>
          <p>
            Курсы и материалы для педагогов дошкольного образования — в спокойном темпе и в удобное время.
          </p>
          <Link to="/courses" className="btn btn-primary btn-large">
            Начать обучение
          </Link>
        </div>
        <div className="hero-image" aria-hidden>
          <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="heroOrb" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8fd9c8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#5eb8a8" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="heroCard" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e4d5c" />
                <stop offset="100%" stopColor="#0f2744" />
              </linearGradient>
            </defs>
            <circle cx="200" cy="150" r="118" fill="url(#heroOrb)" opacity="0.85" />
            <rect x="138" y="88" width="124" height="124" fill="url(#heroCard)" rx="22" />
            <text
              x="200"
              y="158"
              textAnchor="middle"
              fill="#f0fdf9"
              fontSize="22"
              fontWeight="600"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              BilimAll
            </text>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Почему BilimAll?</h2>
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
