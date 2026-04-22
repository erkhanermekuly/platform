import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { coursesSectionPath } from '../auth/roles';
import { learningAPI, notificationsAPI } from '../api/courseService';
import '../styles/pages.css';

function formatNotifAt(at) {
  if (!at) return '';
  const s = String(at);
  return s.includes('T') ? s.replace('T', ' ').slice(0, 16) : s.slice(0, 16);
}

export default function HomePage() {
  const { courses, loading } = useCourses();
  const { userRole } = useAuth();
  const [category, setCategory] = useState('all');
  const [resume, setResume] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);
  const coursesPath = coursesSectionPath(userRole);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [r, n] = await Promise.all([learningAPI.getResume(), notificationsAPI.recent(10)]);
        if (cancelled) return;
        setResume(r?.data?.resume ?? null);
        setNotifications(Array.isArray(n?.data) ? n.data : []);
      } catch {
        if (!cancelled) {
          setResume(null);
          setNotifications([]);
        }
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCourses = category === 'all' 
    ? courses.slice(0, 3)
    : courses.filter(c => c.category === category).slice(0, 3);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Добро пожаловать в UrkerPro</h1>
          <p>
            Все необходимые ресурсы для дошкольных педагогов в одной платформе:
            методические материалы, передовой педагогический опыт и консультации и поддержка.
          </p>
          <Link to={coursesPath} className="btn btn-primary btn-large">
            Перейти к курсам
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

      <section className="home-live-dash" aria-label="Обучение и уведомления">
        <div className="home-live-card">
          <h2>Продолжить обучение</h2>
          {dashLoading ? (
            <p className="muted">Загрузка…</p>
          ) : resume ? (
            <>
              <p className="muted" style={{ marginBottom: 4 }}>
                <strong>{resume.courseTitle}</strong>
                {typeof resume.progress === 'number' ? ` · прогресс ${resume.progress}%` : ''}
              </p>
              <Link to={resume.continuePath || `/course/${resume.courseId}`} className="home-resume-link">
                Перейти к урокам →
              </Link>
            </>
          ) : (
            <p className="muted">Пока нет курсов в обучении. Выберите курс в разделе «Курсы».</p>
          )}
        </div>
        <div className="home-live-card">
          <h2>Последние события</h2>
          {dashLoading ? (
            <p className="muted">Загрузка…</p>
          ) : notifications.length === 0 ? (
            <p className="muted">Пока нет платежей и попыток — здесь появятся оплаты, олимпиады и напоминания о доступе.</p>
          ) : (
            <ul className="home-notifications-list">
              {notifications.slice(0, 8).map((item) => {
                const key = `${item.type}-${item.id}`;
                const label =
                  item.type === 'payment'
                    ? 'Оплата'
                    : item.type === 'olympiad'
                      ? 'Олимпиада'
                      : item.type === 'access'
                        ? 'Доступ'
                        : item.type;
                const href =
                  item.type === 'access' && item.courseId
                    ? `/course/${item.courseId}`
                    : item.type === 'olympiad'
                      ? '/olympiads'
                      : null;
                return (
                  <li key={key}>
                    <span className="home-notif-badge">{label}</span>
                    <span>{item.detail || '—'}</span>
                    {item.status ? (
                      <span className="muted" style={{ marginLeft: 6 }}>
                        ({item.status})
                      </span>
                    ) : null}
                    <span className="muted" style={{ marginLeft: 6 }}>
                      · {formatNotifAt(item.at)}
                    </span>
                    {href ? (
                      <>
                        {' '}
                        <Link to={href}>Открыть</Link>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2>Материалы для ежедневной работы педагога</h2>
        <div className="features-grid">
          <Link to="/resources/documents" className="feature-card-link">
            <div className="feature-card">
              <div className="feature-icon">📘</div>
              <h3>Методические материалы</h3>
              <p>Быстрый доступ к основным требованиям и регламентам для дошкольных организаций.</p>
            </div>
          </Link>
          <Link to="/resources/scenarios" className="feature-card-link">
            <div className="feature-card">
              <div className="feature-icon">🧩</div>
              <h3>Передовой педагогический опыт</h3>
              <p>Передовой педагогический опыт и лучшие практики в дошкольном образовании.</p>
            </div>
          </Link>
          <Link to="/resources/materials" className="feature-card-link">
            <div className="feature-card">
              <div className="feature-icon">🗂️</div>
              <h3>Консультации и поддержка</h3>
              <p>Карточки, шаблоны и методические наработки для занятий и планирования.</p>
            </div>
          </Link>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Единая платформа</h3>
            <p>Все ресурсы и обучение собраны в одном месте без лишнего поиска по разным сайтам.</p>
          </div>
        </div>
      </section>

      <section className="resources-section">
        <h2>Главные разделы</h2>
        <div className="resources-grid">
          <Link to="/resources/documents" className="resource-card">
            <h3>Методические материалы</h3>
            <p>Актуальные документы и памятки, которые нужны в повседневной работе педагогов.</p>
            <span className="resource-badge">Открыть раздел</span>
          </Link>
          <Link to="/resources/scenarios" className="resource-card">
            <h3>Передовой педагогический опыт</h3>
            <p>Подборка сценариев для утренников, открытых занятий и календарных праздников.</p>
            <span className="resource-badge">Открыть раздел</span>
          </Link>
          <Link to="/resources/materials" className="resource-card">
            <h3>Консультации и поддержка</h3>
            <p>Практические файлы и шаблоны для быстрого запуска занятий с детьми.</p>
            <span className="resource-badge">Открыть раздел</span>
          </Link>
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
          <Link to={coursesPath} className="btn btn-secondary">
            Смотреть все курсы
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat">
          <h3>1 платформа</h3>
          <p>для дошкольных педагогов</p>
        </div>
        <div className="stat">
          <h3>3 ключевых раздела</h3>
          <p>документы, сценарии, материалы</p>
        </div>
        <div className="stat">
          <h3>Курсы</h3>
          <p>как дополнительное платное обучение</p>
        </div>
        <div className="stat">
          <h3>24/7</h3>
          <p>доступ к ресурсам</p>
        </div>
      </section>
    </div>
  );
}
