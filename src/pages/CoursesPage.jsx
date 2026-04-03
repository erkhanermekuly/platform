import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../hooks/useApi';
import '../styles/pages.css';

export default function CoursesPage() {
  const { courses, loading } = useCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  const filteredAndSortedCourses = useMemo(() => {
    let result = courses;

    // Фильтр по поиску
    if (searchQuery) {
      result = result.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Фильтр по категориям
    if (selectedCategory !== 'all') {
      result = result.filter(course => course.category === selectedCategory);
    }

    // Фильтр по уровню
    if (selectedLevel !== 'all') {
      result = result.filter(course => course.level === selectedLevel);
    }

    // Сортировка
    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => b.students - a.students);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        result.sort((a, b) => b.id - a.id);
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    return result;
  }, [courses, searchQuery, selectedCategory, selectedLevel, sortBy]);

  return (
    <div className="courses-page">
      <div className="courses-container">
        {/* Sidebar with Filters */}
        <aside className="courses-sidebar">
          <div className="filters">
            <h3>Фильтры</h3>

            {/* Search */}
            <div className="filter-section">
              <label>Поиск</label>
              <input
                type="text"
                placeholder="Введите название курса..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Category Filter */}
            <div className="filter-section">
              <label>Категория</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">Все категории</option>
                <option value="programming">Программирование</option>
                <option value="design">Дизайн</option>
                <option value="marketing">Маркетинг</option>
                <option value="language">Языки</option>
              </select>
            </div>

            {/* Level Filter */}
            <div className="filter-section">
              <label>Уровень</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="filter-select"
              >
                <option value="all">Все уровни</option>
                <option value="beginner">Начинающий</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
              </select>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedLevel('all');
                setSortBy('popular');
              }}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Очистить фильтры
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="courses-main">
          {/* Header */}
          <div className="courses-header">
            <h1>Все курсы</h1>
            <div className="sort-controls">
              <label>Сортировка:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="popular">Популярные</option>
                <option value="rating">По рейтингу</option>
                <option value="newest">Новые</option>
                <option value="price-low">Цена: от дешевых</option>
                <option value="price-high">Цена: от дорогих</option>
              </select>
            </div>
          </div>

          {/* Courses Grid */}
          {loading ? (
            <div className="loading">Загрузка курсов...</div>
          ) : filteredAndSortedCourses.length === 0 ? (
            <div className="no-results">
              <p>Курсы не найдены. Попробуйте изменить фильтры.</p>
            </div>
          ) : (
            <>
              <p className="results-count">Найдено курсов: {filteredAndSortedCourses.length}</p>
              <div className="courses-grid">
                {filteredAndSortedCourses.map(course => (
                  <Link
                    key={course.id}
                    to={`/course/${course.id}`}
                    className="course-card-link"
                  >
                    <div className="course-card large">
                      <div className="course-image-wrapper">
                        <img src={course.image} alt={course.title} />
                        <span className="course-badge">{course.level}</span>
                      </div>
                      <div className="course-info">
                        <div className="course-meta">
                          <span className="category-badge">{course.category}</span>
                          <span className="rating">⭐ {course.rating}</span>
                        </div>
                        <h3>{course.title}</h3>
                        <p className="description">{course.description}</p>
                        <p className="instructor">👨‍🏫 {course.instructor}</p>
                        <div className="course-footer">
                          <div className="stats">
                            <span>📚 {course.students.toLocaleString()}</span>
                            <span>⏱️ {course.duration}</span>
                          </div>
                          <span className="price">
                            {course.price === 0 ? 'Бесплатно' : `$${course.price}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
