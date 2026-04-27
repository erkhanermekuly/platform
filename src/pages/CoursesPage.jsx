import { useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PaymentModal from '../components/PaymentModal/PaymentModal';
import AdminPanel from '../components/AdminPanel/AdminPanel';
import announcementImage from '../assets/courses-announcement.jpg';
import announcementSchoolsRu from '../assets/courses-announcement-schools-ru.png';
import announcementTvoc from '../assets/courses-announcement-tvoc.png';
import announcementPreschool from '../assets/courses-announcement-preschool.png';
import announcementSchoolsKk from '../assets/courses-announcement-schools-kk.png';
import '../styles/pages.css';

const COURSES_WHATSAPP_URL = 'https://wa.me/77774063396';

function categoryTone(category) {
  const s = (category || '').toLowerCase();
  if (/матем|math|алгебр|геометр|числ|арифмет|логик|puzzle/.test(s)) return 'amber';
  if (/физик|хими|наук|science|bio|космос|природ|естеств/.test(s)) return 'green';
  if (/искусств|творч|art|рисован|дизайн|музык/.test(s)) return 'pink';
  if (/програм|код|code|it|айти|алгоритм|byte/.test(s)) return 'violet';
  if (/язык|англ|лингв|литератур|чтен|письм/.test(s)) return 'sky';
  if (/истор|обществ|географ|право/.test(s)) return 'orange';
  return 'slate';
}

function formatRating(r) {
  const n = Number(r);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${n.toFixed(1)}/5`;
}

export default function CoursesPage() {
  const {
    courses,
    purchasedCourses,
    purchaseCourse,
    addCourse,
    deleteCourse,
    coursesLoading,
    coursesError,
  } = useContext(AppContext);
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [search, _setSearch] = useState('');
  const [categoryKey, _setCategoryKey] = useState('all');

  const handleUnlock = (course) => {
    setSelectedCourse(course);
    setIsPaymentOpen(true);
  };

  const handleView = (course) => {
    navigate(`/course/${course.id}`);
  };

  const _categoryChips = useMemo(() => {
    const seen = new Map();
    for (const c of courses) {
      const raw = (c.category || '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (!seen.has(key)) seen.set(key, raw);
    }
    const sorted = [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ru'));
    return [{ key: 'all', label: 'Все курсы' }, ...sorted.map(([key, label]) => ({ key, label }))];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return courses.filter((c) => {
      if (categoryKey !== 'all') {
        const cat = (c.category || '').trim().toLowerCase();
        if (cat !== categoryKey) return false;
      }
      if (!q) return true;
      const hay = `${c.title || ''} ${c.description || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [courses, search, categoryKey]);

  const featuredPrimary = filteredCourses[0];
  const featuredSecondary = filteredCourses[1];
  const catalogRest = filteredCourses.slice(2);

  const openCourse = (course) => {
    if (!course) return;
    const owned = purchasedCourses.includes(course.id);
    const needsPayment = course.isLocked && !owned;
    if (needsPayment) handleUnlock(course);
    else handleView(course);
  };

  if (userRole === 'admin' && location.pathname === '/courses') {
    return <Navigate to="/admin/courses" replace />;
  }

  const handlePaymentConfirm = async (course) => {
    if (!course) return;
    try {
      await purchaseCourse(course.id, course.price);
      alert('✅ Оплата принята. Откройте курс — в программе доступен первый урок.');
    } catch (e) {
      alert(e?.message || 'Не удалось провести оплату');
    }
  };

  const handleAddCourse = async (courseData) => {
    try {
      await addCourse(courseData);
      alert('✅ Курс успешно добавлен!');
    } catch (e) {
      alert(e?.message || 'Не удалось создать курс');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот курс?')) return;
    try {
      await deleteCourse(courseId);
      alert('✅ Курс удален.');
    } catch (e) {
      alert(e?.message || 'Не удалось удалить курс');
    }
  };

  // Admin Panel
  if (userRole === 'admin') {
    if (coursesLoading) {
      return (
        <div style={{ minHeight: '100vh', padding: 40, textAlign: 'center' }}>
          <p>Загрузка курсов с сервера…</p>
        </div>
      );
    }
    if (coursesError) {
      return (
        <div style={{ minHeight: '100vh', padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#b91c1c' }}>Не удалось загрузить курсы: {coursesError}</p>
          <Link to="/api-check" style={{ marginTop: 12, display: 'inline-block' }}>
            Проверить API
          </Link>
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100vh' }}>
        <AdminPanel
          courses={courses}
          onAddCourse={handleAddCourse}
          onDeleteCourse={handleDeleteCourse}
        />
      </div>
    );
  }

  // Каталог для студентов и прочих ролей (не админ)
  if (coursesLoading) {
    return (
      <div style={{ minHeight: '100vh', padding: 40, textAlign: 'center' }}>
        <p>Загрузка курсов с сервера…</p>
      </div>
    );
  }

  if (coursesError) {
    return (
      <div style={{ minHeight: '100vh', padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#b91c1c' }}>Не удалось загрузить курсы: {coursesError}</p>
        <Link to="/api-check" style={{ marginTop: 12, display: 'inline-block' }}>
          Проверить API
        </Link>
      </div>
    );
  }

  const courseTone = (c) => categoryTone(c?.category);

  return (
    <div className="crs-catalog-root">
      <div className="crs-catalog-shell">
        <header className="crs-cat-header">
          <div>
            <p className="crs-cat-brand">UrkerPro</p>
            <h1 className="crs-cat-title">Каталог курсов</h1>
            {/* <p className="crs-cat-lead">
              Выберите направление: математика, естествознание, логика и языки — уроки с яркими
              обложками и понятной структурой. Фильтруйте по категории или найдите курс по названию.
            </p> */}
          </div>
        </header>

        <div className="crs-announcements">
          <a
            className="crs-announcement"
            href={COURSES_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Открыть WhatsApp: +7 777 406 3396"
          >
            <img
              src={announcementImage}
              alt="Білім бағдарламаларының тізімі"
              className="crs-announcement-image"
            />
            <span className="crs-announcement-cta">WhatsApp: +7 777 406 3396</span>
          </a>
          <a
            className="crs-announcement"
            href={COURSES_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp: образовательные программы для школ (RU)"
          >
            <img
              src={announcementSchoolsRu}
              alt="Список образовательных программ для педагогов общеобразовательных школ"
              className="crs-announcement-image crs-announcement-image--flyer"
            />
            <span className="crs-announcement-cta">WhatsApp: +7 777 406 3396</span>
          </a>
          <a
            className="crs-announcement"
            href={COURSES_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp: программы для ТиПО"
          >
            <img
              src={announcementTvoc}
              alt="Бағдарламалар техникалық және кәсіптік білім беру педагогтеріне"
              className="crs-announcement-image crs-announcement-image--flyer"
            />
            <span className="crs-announcement-cta">WhatsApp: +7 777 406 3396</span>
          </a>
          <a
            className="crs-announcement"
            href={COURSES_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp: программы для дошкольных организаций"
          >
            <img
              src={announcementPreschool}
              alt="Бағдарламалар мектепке дейінгі білім беру ұйымдарына"
              className="crs-announcement-image crs-announcement-image--flyer"
            />
            <span className="crs-announcement-cta">WhatsApp: +7 777 406 3396</span>
          </a>
          <a
            className="crs-announcement"
            href={COURSES_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp: тізімі бағдарламалар жалпы білім беретін мектептер"
          >
            <img
              src={announcementSchoolsKk}
              alt="Білім бағдарламаларының тізімі — жалпы білім беретін мектептер"
              className="crs-announcement-image crs-announcement-image--flyer"
            />
            <span className="crs-announcement-cta">WhatsApp: +7 777 406 3396</span>
          </a>
        </div>

        {/* <div className="crs-cat-search-row">
          <div className="crs-cat-search">
            <span className="crs-cat-search-icon" aria-hidden>🔍</span>
            <input
              type="search"
              placeholder="Найти курс..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Поиск по курсам"
            />
          </div>
        </div> */}

        {/* <div className="crs-cat-chips" role="tablist" aria-label="Категории курсов">
          {categoryChips.map((c) => (
            <button
              key={c.key}
              type="button"
              role="tab"
              aria-selected={categoryKey === c.key}
              className={`crs-cat-chip${categoryKey === c.key ? ' is-active' : ''}`}
              onClick={() => setCategoryKey(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div> */}

        {filteredCourses.length === 0 ? (
          courses.length === 0 ? null : (
            <p className="crs-cat-empty">Ничего не найдено. Измените поиск или категорию.</p>
          )
        ) : (
          <>
            <section className="crs-cat-featured">
              {featuredPrimary ? (
                <button
                  type="button"
                  className="crs-cat-hero"
                  onClick={() => openCourse(featuredPrimary)}
                >
                  <div
                    className="crs-cat-hero-bg"
                    style={
                      featuredPrimary.image
                        ? { backgroundImage: `url(${featuredPrimary.image})` }
                        : undefined
                    }
                  />
                  <div className="crs-cat-hero-overlay" />
                  <span className="crs-cat-hero-play" aria-hidden>▶</span>
                  <div className="crs-cat-hero-inner">
                    <div className="crs-cat-hero-badges">
                      <span className={`crs-cat-badge crs-cat-badge--${courseTone(featuredPrimary)}`}>
                        {(featuredPrimary.category || 'Курс').toUpperCase()}
                      </span>
                      {purchasedCourses.includes(featuredPrimary.id) ? (
                        <span className="crs-cat-badge crs-cat-badge--accent">У вас есть доступ</span>
                      ) : null}
                    </div>
                    <h2 className="crs-cat-hero-title">{featuredPrimary.title}</h2>
                    <p className="crs-cat-hero-desc">{featuredPrimary.description}</p>
                    <div className="crs-cat-hero-meta">
                      <span className="crs-cat-hero-pill">
                        🕐 {featuredPrimary.duration || 'Гибкий график'}
                      </span>
                      <span className="crs-cat-hero-pill">★ {formatRating(featuredPrimary.rating)}</span>
                    </div>
                  </div>
                </button>
              ) : null}

              {featuredSecondary ? (
                <button
                  type="button"
                  className="crs-cat-side crs-cat-side--stack"
                  onClick={() => openCourse(featuredSecondary)}
                >
                  <div
                    className={`crs-cat-side-top${featuredSecondary.image ? '' : ' crs-cat-side-top--empty'}`}
                    style={
                      featuredSecondary.image
                        ? { backgroundImage: `url(${featuredSecondary.image})` }
                        : undefined
                    }
                  >
                    <span className={`crs-cat-side-tag crs-cat-badge--${courseTone(featuredSecondary)}`}>
                      {(featuredSecondary.category || 'Курс').toUpperCase()}
                    </span>
                  </div>
                  <div className="crs-cat-side-bottom">
                    <h3 className="crs-cat-side-title">{featuredSecondary.title}</h3>
                    <p className="crs-cat-side-desc">{featuredSecondary.description}</p>
                    <div className="crs-cat-side-foot">
                      <div className="crs-cat-inst">
                        <span className="crs-cat-inst-av" aria-hidden>
                          {(featuredSecondary.instructor || '?').trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="crs-cat-inst-name">{featuredSecondary.instructor || 'Преподаватель'}</span>
                      </div>
                      <span className="crs-cat-side-arrow" aria-hidden>
                        →
                      </span>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="crs-cat-side crs-cat-side--placeholder" aria-hidden />
              )}
            </section>

            <div className="crs-cat-grid">
              {catalogRest.map((course) => {
                const locked = course.isLocked && !purchasedCourses.includes(course.id);
                const tone = courseTone(course);
                return (
                  <article key={course.id} className="crs-cat-card">
                    <button type="button" className="crs-cat-card-link" onClick={() => openCourse(course)}>
                      <div className={`crs-cat-card-media${course.image ? '' : ' crs-cat-card-media--empty'}`}>
                        {course.image ? <img src={course.image} alt="" /> : <span aria-hidden>📘</span>}
                        {locked ? <span className="crs-cat-card-lock" aria-hidden>🔒</span> : null}
                      </div>
                      <div className="crs-cat-card-body">
                        <p className={`crs-cat-card-cat crs-cat-card-cat--${tone}`}>
                          {(course.category || 'Курс').toUpperCase()}
                        </p>
                        <h2 className="crs-cat-card-title">{course.title}</h2>
                        <p className="crs-cat-card-blurb">{course.description}</p>
                        <div className="crs-cat-card-footer">
                          <span>{course.duration || 'Гибкий график'}</span>
                          <span className="crs-cat-card-meta">
                            ★ {formatRating(course.rating)}
                            {course.price > 0 ? ` · ${course.price.toLocaleString('ru-RU')} ₸` : ''}
                          </span>
                        </div>
                      </div>
                    </button>
                  </article>
                );
              })}
              <aside className="crs-cat-cta">
                <div className="crs-cat-cta-icon" aria-hidden>🚀</div>
                <h2 className="crs-cat-cta-title">Ежедневный челлендж</h2>
                <p className="crs-cat-cta-desc">
                  Закрепите знания короткими испытаниями в олимпиадах — награды за серию верных ответов.
                </p>
                <Link className="crs-cat-cta-btn" to="/olympiads">
                  Играть сейчас
                </Link>
              </aside>
            </div>
          </>
        )}
      </div>

      <PaymentModal
        isOpen={isPaymentOpen}
        course={selectedCourse}
        onClose={() => {
          setIsPaymentOpen(false);
          setSelectedCourse(null);
        }}
        onConfirm={handlePaymentConfirm}
      />
    </div>
  );
}
