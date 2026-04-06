import { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import CourseCard from '../components/CourseCard/CourseCard';
import PaymentModal from '../components/PaymentModal/PaymentModal';
import AdminPanel from '../components/AdminPanel/AdminPanel';
import '../styles/pages.css';

export default function CoursesPage() {
  const { courses, userRole, purchasedCourses, buyCourse, addCourse, deleteCourse, toggleRole } = useContext(AppContext);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const handleUnlock = (course) => {
    setSelectedCourse(course);
    setIsPaymentOpen(true);
  };

  const handleView = (course) => {
    console.log('View course:', course.id);
    // Можно добавить переход на страницу курса
  };

  const handlePaymentConfirm = (courseId) => {
    buyCourse(courseId);
    alert('✅ Спасибо за покупку! Курс разблокирован.');
  };

  const handleAddCourse = (courseData) => {
    addCourse(courseData);
    alert('✅ Курс успешно добавлен!');
  };

  const handleDeleteCourse = (courseId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот курс?')) {
      deleteCourse(courseId);
      alert('✅ Курс удален.');
    }
  };

  // Admin Panel
  if (userRole === 'admin') {
    return (
      <div style={{ minHeight: '100vh' }}>
        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', marginBottom: '20px' }}>
          <button
            onClick={toggleRole}
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              padding: '12px 20px',
              background: 'white',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              color: '#1f2937',
              fontSize: '14px'
            }}
          >
            👉 Переключиться на роль "Учитель"
          </button>
        </div>
        <AdminPanel
          courses={courses}
          onAddCourse={handleAddCourse}
          onDeleteCourse={handleDeleteCourse}
        />
      </div>
    );
  }

  // Teacher View
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', padding: '40px 20px' }}>
      {/* Header */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: '0 0 12px' }}>
          📚 Наши курсы
        </h1>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 20px' }}>
          Выбери курс и начни обучение
        </p>
        <button
          onClick={toggleRole}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          🔐 Переключиться на роль "Администратор"
        </button>
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

      {/* Payment Modal */}
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
