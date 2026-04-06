import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import styles from './AdminPanel.module.css';

const AdminPanel = ({ courses, onAddCourse, onDeleteCourse }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    category: 'beginner',
    price: 0,
    videoUrl: '',
    image: '',
    files: []
  });

  const [fileInput, setFileInput] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const handleAddFile = () => {
    if (fileInput.trim()) {
      const newFile = {
        id: Date.now(),
        name: fileInput,
        type: fileInput.split('.').pop()
      };
      setFormData(prev => ({
        ...prev,
        files: [...prev.files, newFile]
      }));
      setFileInput('');
    }
  };

  const handleRemoveFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      alert('Заполните обязательные поля');
      return;
    }

    onAddCourse({
      ...formData,
      isLocked: formData.price > 0,
      image: formData.image || 'https://via.placeholder.com/400x225?text=Course'
    });

    // Reset form
    setFormData({
      title: '',
      description: '',
      instructor: '',
      category: 'beginner',
      price: 0,
      videoUrl: '',
      image: '',
      files: []
    });
  };

  return (
    <div className={styles.adminPanel}>
      <div className={styles.container}>
        {/* Form Section */}
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>📝 Добавить новый курс</h2>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Title */}
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

            {/* Description */}
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

            {/* Instructor */}
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

            {/* Category */}
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

            {/* Price */}
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

            {/* Video URL */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Ссылка на видео</label>
              <input
                type="url"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleInputChange}
                placeholder="https://www.youtube.com/embed/..."
                className={styles.input}
              />
            </div>

            {/* Image URL */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Ссылка на изображение</label>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="https://..."
                className={styles.input}
              />
            </div>

            {/* Files */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Загрузить файлы</label>
              <div className={styles.fileInputWrapper}>
                <input
                  type="text"
                  value={fileInput}
                  onChange={(e) => setFileInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFile())}
                  placeholder="Название файла (мы.pdf, lesson.docx)"
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={handleAddFile}
                  className={styles.addFileButton}
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Files List */}
              {formData.files.length > 0 && (
                <div className={styles.filesList}>
                  {formData.files.map(file => (
                    <div key={file.id} className={styles.fileItem}>
                      <span className={styles.fileName}>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        className={styles.removeFileButton}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button type="submit" className={styles.submitButton}>
              ➕ Добавить курс
            </button>
          </form>
        </div>

        {/* Courses List Section */}
        <div className={styles.listSection}>
          <h2 className={styles.sectionTitle}>📚 Все курсы ({courses.length})</h2>
          
          <div className={styles.coursesList}>
            {courses.length === 0 ? (
              <p className={styles.emptyMessage}>Нет курсов. Добавьте первый курс!</p>
            ) : (
              courses.map(course => (
                <div key={course.id} className={styles.courseItem}>
                  <img src={course.image} alt={course.title} className={styles.courseThumbnail} />
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
                  <button
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
    </div>
  );
};

export default AdminPanel;
