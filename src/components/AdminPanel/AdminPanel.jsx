import { useState, useRef, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Upload } from 'lucide-react';
import { AppContext } from '../../context/AppContext';
import { coursesAPI } from '../../api/courseService';
import styles from './AdminPanel.module.css';

const PLACEHOLDER_IMG =
  'https://via.placeholder.com/400x225?text=Course';

const AdminPanel = ({ courses, onAddCourse, onDeleteCourse }) => {
  const { refreshCourses } = useContext(AppContext);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    category: 'beginner',
    price: 0,
    videoUrl: '',
  });

  const [imageFile, setImageFile] = useState(null);
  const [materialFiles, setMaterialFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageInputRef = useRef(null);
  const materialsInputRef = useRef(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value,
    }));
  };

  const clearFileInputs = () => {
    setImageFile(null);
    setMaterialFiles([]);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (materialsInputRef.current) materialsInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      alert('Заполните обязательные поля');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddCourse({
        ...formData,
        isLocked: formData.price > 0,
        imageFile: imageFile || undefined,
        materialFiles: materialFiles.length ? materialFiles : undefined,
      });

      setFormData({
        title: '',
        description: '',
        instructor: '',
        category: 'beginner',
        price: 0,
        videoUrl: '',
      });
      clearFileInputs();
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMaterialAt = (index) => {
    setMaterialFiles((prev) => prev.filter((_, i) => i !== index));
    if (materialsInputRef.current) materialsInputRef.current.value = '';
  };

  const openEdit = (course) => {
    setEditingCourse(course);
    setEditTitle(course.title);
    setEditDescription(course.description);
  };

  const saveEdit = async () => {
    if (!editingCourse) return;
    if (!editTitle.trim() || !editDescription.trim()) {
      alert('Заполните название и описание');
      return;
    }
    setEditSaving(true);
    try {
      await coursesAPI.updateCourse(editingCourse.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editingCourse.category,
        level: editingCourse.level,
        price: editingCourse.price,
        isLocked: editingCourse.isLocked ?? editingCourse.price > 0,
        instructor: editingCourse.instructor,
        image: editingCourse.image ?? null,
        videoUrl: editingCourse.videoUrl ?? null,
      });
      await refreshCourses();
      setEditingCourse(null);
      alert('Курс обновлён');
    } catch (e) {
      alert(e?.message || 'Не удалось сохранить');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className={styles.adminPanel}>
      <div className={styles.container}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>📝 Добавить новый курс</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Название курса *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Введите название курса"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Описание *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Введите описание курса"
                className={styles.textarea}
                rows="4"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Преподаватель</label>
              <input
                type="text"
                name="instructor"
                value={formData.instructor}
                onChange={handleInputChange}
                placeholder="Имя преподавателя"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Категория</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="beginner">Начальный уровень</option>
                <option value="intermediate">Средний уровень</option>
                <option value="advanced">Продвинутый уровень</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Цена (₸)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Обложка курса</label>
              <div className={styles.filePickRow}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  className={styles.fileInputNative}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setImageFile(f || null);
                  }}
                />
                <span className={styles.fileHint}>
                  {imageFile ? imageFile.name : 'Файл не выбран'}
                </span>
                {imageFile && (
                  <button
                    type="button"
                    className={styles.clearFileBtn}
                    onClick={() => {
                      setImageFile(null);
                      if (imageInputRef.current) imageInputRef.current.value = '';
                    }}
                  >
                    Сбросить
                  </button>
                )}
              </div>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Предпросмотр обложки"
                  className={styles.imagePreview}
                />
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Вводное видео (YouTube)</label>
              <input
                type="url"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleInputChange}
                placeholder="https://www.youtube.com/embed/…"
                className={styles.input}
              />
              <p className={styles.fieldHelp}>
                Только ссылка: видео хранится на YouTube, в базе — короткая строка URL, без файлов на сервере.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Материалы курса (файлы с компьютера)</label>
              <div className={styles.filePickRow}>
                <input
                  ref={materialsInputRef}
                  type="file"
                  multiple
                  className={styles.fileInputNative}
                  onChange={(e) => {
                    const list = Array.from(e.target.files || []);
                    if (list.length) {
                      setMaterialFiles((prev) => [...prev, ...list]);
                    }
                    if (materialsInputRef.current) materialsInputRef.current.value = '';
                  }}
                />
                <span className={styles.fileHint}>
                  <Upload size={16} aria-hidden style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Добавить файлы
                </span>
              </div>

              {materialFiles.length > 0 && (
                <div className={styles.filesList}>
                  {materialFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className={styles.fileItem}>
                      <span className={styles.fileName}>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeMaterialAt(index)}
                        className={styles.removeFileButton}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Сохранение…' : '➕ Добавить курс'}
            </button>
          </form>
        </div>

        <div className={styles.listSection}>
          <h2 className={styles.sectionTitle}>📚 Все курсы ({courses.length})</h2>

          <div className={styles.coursesList}>
            {courses.length === 0 ? (
              <p className={styles.emptyMessage}>Нет курсов. Добавьте первый курс!</p>
            ) : (
              courses.map((course) => (
                <div key={course.id} className={styles.courseItem}>
                  <img
                    src={course.image || PLACEHOLDER_IMG}
                    alt={course.title}
                    className={styles.courseThumbnail}
                  />
                  <div className={styles.courseInfo}>
                    <h4 className={styles.courseTitle}>{course.title}</h4>
                    <p className={styles.courseDesc}>{course.description}</p>
                    <div className={styles.courseFooter}>
                      <span className={styles.courseMeta}>
                        👨‍🏫 {course.instructor || 'No instructor'}
                      </span>
                      <span className={`${styles.courseMeta} ${styles.price}`}>
                        {course.price > 0 ? `${course.price} ₸` : 'Бесплатно'}
                      </span>
                    </div>
                    <div className={styles.courseRowActions}>
                      <button type="button" className={styles.textAction} onClick={() => openEdit(course)}>
                        Редактировать
                      </button>
                      <Link to={`/admin/courses/${course.id}/lessons`} className={styles.lessonsLink}>
                        Уроки →
                      </Link>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCourse(course.id)}
                    className={styles.deleteButton}
                    title="Удалить курс"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {editingCourse && (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => !editSaving && setEditingCourse(null)}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-course-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="edit-course-title" className={styles.modalTitle}>
              Редактировать курс
            </h3>
            <label className={styles.label}>Название</label>
            <input
              className={styles.input}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <label className={styles.label}>Содержание (описание)</label>
            <textarea
              className={styles.textarea}
              rows={5}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.submitButton} disabled={editSaving} onClick={saveEdit}>
                {editSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
              <button
                type="button"
                className={styles.modalCancel}
                disabled={editSaving}
                onClick={() => setEditingCourse(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
