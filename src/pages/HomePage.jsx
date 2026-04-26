import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { coursesSectionPath } from '../auth/roles';
import { learningAPI, notificationsAPI } from '../api/courseService';
import '../styles/pages.css';

function _formatNotifAt(at) {
  if (!at) return '';
  const s = String(at);
  return s.includes('T') ? s.replace('T', ' ').slice(0, 16) : s.slice(0, 16);
}

export default function HomePage() {
  const { courses, loading: _loading } = useCourses();
  const { userRole } = useAuth();
  const [category, _setCategory] = useState('all');
  const [_resume, setResume] = useState(null);
  const [_notifications, setNotifications] = useState([]);
  const [_dashLoading, setDashLoading] = useState(true);
  const [newsSlide, setNewsSlide] = useState(0);
  const coursesPath = coursesSectionPath(userRole);
  const homeNews = [
    {
      id: 'news-1',
      tag: 'Обновление',
      title: 'Запущен новый модуль по подготовке к аттестации',
      text: 'Добавлены практические чек-листы, видеоразборы и шаблоны документов для педагогов.',
      link: coursesPath,
      linkText: 'Открыть модуль',
    },
    {
      id: 'news-2',
      tag: 'Вебинар',
      title: 'Открыта регистрация на методический вебинар',
      text: 'Встреча посвящена современным игровым подходам и требованиям к учебным программам.',
      link: '/resources/scenarios',
      linkText: 'Зарегистрироваться',
    },
    {
      id: 'news-3',
      tag: 'Олимпиады',
      title: 'Стартовал новый сезон педагогических олимпиад',
      text: 'Участвуйте в республиканском этапе и повышайте показатели для аттестационного портфолио.',
      link: '/olympiads',
      linkText: 'Перейти к олимпиадам',
    },
  ];

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

  useEffect(() => {
    const timer = setInterval(() => {
      setNewsSlide((prev) => (prev + 1) % homeNews.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [homeNews.length]);

  const _filteredCourses = category === 'all'
    ? courses.slice(0, 3)
    : courses.filter((c) => c.category === category).slice(0, 3);

  return (
    <div className="home-page home-v2-page">
      <section className="home-v2-shell">
        <header className="home-v2-hero">
          <p className="home-v2-kicker">UrkerPro</p>
          <h1>
            Цифровая экосистема для дошкольного
            <span> образования</span>
          </h1>
          <p>
            Платформа объединяет материалы по приказу №175, передовые педагогические практики
            и инструменты для прохождения аттестации в одном рабочем пространстве.
          </p>
        </header>

        <section className="home-v2-grid">
          <Link to="/methodical-materials" className="home-v2-card home-v2-card--docs">
            <div className="home-v2-icon">📘</div>
            <h3>Методические материалы</h3>
            <p>Шаблоны документов, методические пособия и готовые материалы для работы.</p>
          </Link>

          <Link to="/resources/scenarios" className="home-v2-card home-v2-card--pedagogy">
            <div className="home-v2-icon">✨</div>
            <h3>Передовая педагогика</h3>
            <p>Лучшие практики, современные подходы и интерактивные методики для занятий.</p>
          </Link>

          <Link to="/normative-documents" className="home-v2-card home-v2-card--support">
            <div className="home-v2-icon">🩺</div>
            <h3>Нормативные документы</h3>
            <p>Официальные положения и файлы платформы — список ведётся администратором в базе данных.</p>
          </Link>

          <Link to={coursesPath} className="home-v2-card home-v2-card--courses">
            <div className="home-v2-icon">🎓</div>
            <h3>Курсы для аттестации</h3>
            <p>Полное соответствие приказу №175 для повышения квалификации.</p>
            <span className="home-v2-cta">Перейти к курсам</span>
          </Link>

          <Link to="/consultations" className="home-v2-card home-v2-card--npa">
            <div className="home-v2-icon">🗂️</div>
            <h3>Консультации</h3>
            <p>Экспертные разборы, рекомендации и ответы на практические вопросы педагогов.</p>
            <div className="home-v2-mini-list">
            </div>
          </Link>

          <Link to="/olympiads" className="home-v2-card home-v2-card--olympiad">
            <div className="home-v2-icon">🏆</div>
            <h3>Конкурсы и олимпиады</h3>
            <p>Повышайте результаты аттестации через участие в республиканских конкурсах.</p>
            <div className="home-v2-date-wrap">
            </div>
          </Link>
        </section>

        <section className="home-v2-news" aria-label="Новости">
          <div className="home-v2-news-head">
            <h2>Новости</h2>
            <div className="home-v2-news-controls">
              <button
                type="button"
                className="home-v2-news-btn"
                onClick={() => setNewsSlide((prev) => (prev - 1 + homeNews.length) % homeNews.length)}
                aria-label="Предыдущая новость"
              >
                ←
              </button>
              <button
                type="button"
                className="home-v2-news-btn"
                onClick={() => setNewsSlide((prev) => (prev + 1) % homeNews.length)}
                aria-label="Следующая новость"
              >
                →
              </button>
            </div>
          </div>

          <article className="home-v2-news-slide" key={homeNews[newsSlide].id}>
            <p className="home-v2-news-tag">{homeNews[newsSlide].tag}</p>
            <h3>{homeNews[newsSlide].title}</h3>
            <p>{homeNews[newsSlide].text}</p>
            <Link to={homeNews[newsSlide].link}>{homeNews[newsSlide].linkText}</Link>
          </article>

          <div className="home-v2-news-dots" role="tablist" aria-label="Слайды новостей">
            {homeNews.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`home-v2-news-dot${idx === newsSlide ? ' is-active' : ''}`}
                onClick={() => setNewsSlide(idx)}
                aria-label={`Перейти к новости ${idx + 1}`}
                aria-selected={idx === newsSlide}
              />
            ))}
          </div>
        </section>

        {/* <section className="home-v2-partners" aria-label="Партнеры">
          <span>MINISTRY.EDU</span>
          <span>GLOBALPEDAGOGY</span>
          <span>ACADEMIA.UA</span>
          <span>TECHLEARN.PRO</span>
        </section> */}
{/* 
        <section className="home-v2-banner">
          <div className="home-v2-banner-copy">
            <p className="home-v2-banner-tag">ОБНОВЛЕНИЕ · ВАЖНО</p>
            <h2>Открыт летний этап сертификации</h2>
            <p>Подайте заявку до 15 июня, чтобы зафиксировать льготные условия на осенний цикл аттестации 2024.</p>
            <Link to={coursesPath}>Читать полное объявление</Link>
          </div>
          <div className="home-v2-banner-image" aria-hidden />
        </section> */}

        <footer className="home-v2-footer">
          <div>
            <h4>UrkerPro</h4>
            <p>Единый стандарт цифровой инфраструктуры и профессионального роста педагогов.</p>
          </div>
          <div>
            <h4>Ресурсы</h4>
            <Link to="/normative-documents">Нормативные документы</Link>
            <Link to="/methodical-materials">Материалы</Link>
            <Link to="/consultations">Консультации</Link>
          </div>
          <div>
            <h4>Компания</h4>
            <Link to="/home">О нас</Link>
            <Link to="/profile">Политика конфиденциальности</Link>
            <Link to="/profile">Условия использования</Link>
          </div>
          <div>
            <h4>Рассылка</h4>
            <p>Получайте обновления по приказу №175.</p>
            <div className="home-v2-newsletter">Эл. почта</div>
          </div>
        </footer>
      </section>
    </div>
  );
}
