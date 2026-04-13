import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Upload, Pencil } from 'lucide-react';
import styles from './AdminPanel.module.css';

const PLACEHOLDER_IMG =
  'https://via.placeholder.com/400x225?text=Course';

const AdminPanel = ({ courses, onAddCourse, onDeleteCourse }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    category: 'beginner',
    price: 0,
  });

  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [materialFiles, setMaterialFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
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
    setVideoFile(null);
    setMaterialFiles([]);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
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
        videoFile: videoFile || undefined,
        materialFiles: materialFiles.length ? materialFiles : undefined,
      });

      setFormData({
        title: '',
        description: '',
        instructor: '',
        category: 'beginner',
        price: 0,
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
              <label className={styles.label}>Видео курса</label>
              <div className={styles.filePickRow}>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  className={styles.fileInputNative}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setVideoFile(f || null);
                  }}
                />
                <span className={styles.fileHint}>
                  {videoFile ? videoFile.name : 'Файл не выбран'}
                </span>
                {videoFile && (
                  <button
                    type="button"
                    className={styles.clearFileBtn}
                    onClick={() => {
                      setVideoFile(null);
                      if (videoInputRef.current) videoInputRef.current.value = '';
                    }}
                  >
                    Сбросить
                  </button>
                )}
              </div>
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
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <Link
                      to={`/admin/courses/${course.id}/edit`}
                      className={styles.editLink}
                      title="Редактировать курс и уроки"
                    >
                      <Pencil size={18} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDeleteCourse(course.id)}
                      className={styles.deleteButton}
                      title="Удалить курс"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
