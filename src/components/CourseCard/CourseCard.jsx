import { Lock, CheckCircle, Download, User, FolderOpen } from 'lucide-react';
import styles from './CourseCard.module.css';

const CourseCard = ({ course, onUnlock, onView, isOwned }) => {
  const isAccessible = !course.isLocked || isOwned;
  const needsPayment = course.isLocked && !isOwned;

  const handleViewClick = () => {
    if (needsPayment) {
      onUnlock(course);
    } else {
      onView(course);
    }
  };

  return (
    <article
      className={`${styles.courseCard} ${needsPayment ? styles.locked : ''}`}
      aria-label={course.title}
    >
      <div className={styles.imageWrap}>
        <img
          src={course.image || 'https://via.placeholder.com/400x225?text=Course'}
          alt=""
          className={styles.image}
        />

        {needsPayment && (
          <div className={styles.overlay} aria-hidden>
            <div className={styles.lockCircle}>
              <Lock size={36} strokeWidth={2} className={styles.lockIcon} />
            </div>
          </div>
        )}

        {isAccessible && (
          <div className={styles.statusBadge} title="Доступно">
            <CheckCircle size={22} strokeWidth={2} className={styles.checkIcon} />
          </div>
        )}

        {course.price > 0 && (
          <div className={styles.priceBadge}>
            {course.price.toLocaleString('ru-RU')} ₸
          </div>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{course.title}</h3>
        <p className={styles.description}>{course.description}</p>

        <div className={styles.meta}>
          <span className={styles.metaRow}>
            <User size={14} className={styles.metaIcon} aria-hidden />
            <span>{course.instructor}</span>
          </span>
          <span className={styles.category}>{course.category}</span>
        </div>

        {course.files && course.files.length > 0 && (
          <div className={styles.filesBlock}>
            <h4 className={styles.filesHeading}>
              <FolderOpen size={14} className={styles.filesHeadingIcon} aria-hidden />
              Материалы
            </h4>
            <ul className={styles.filesList}>
              {course.files.map((file) => (
                <li key={file.id} className={styles.fileRow}>
                  <Download size={14} className={styles.fileIcon} aria-hidden />
                  <span>{file.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleViewClick}
          className={`${styles.cta} ${needsPayment ? styles.ctaLocked : styles.ctaOpen}`}
        >
          Смотреть
        </button>
      </div>
    </article>
  );
};

export default CourseCard;
