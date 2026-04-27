import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import CourseCard from '../components/CourseCard/CourseCard';
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
    buyCourse,
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

  if (userRole === 'admin' && location.pathname === '/courses') {
    return <Navigate to="/admin/courses" replace />;
  }

  const handleUnlock = (course) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setSelectedCourse(course);
    setIsPaymentOpen(true);
  };

  const handleView = (course) => {
    navigate(`/course/${course.id}`);
  };

  const handlePaymentConfirm = (courseId) => {
    buyCourse(courseId);
    alert('✅ Спасибо за покупку! Курс разблокирован.');
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

      {/* Courses Grid */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        {courses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            onUnlock={handleUnlock}
            onView={handleView}
            isOwned={purchasedCourses.includes(course.id)}
          />
        ))}
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
