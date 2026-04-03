# 📚 LearnHub - Платформа Обучения

Современная, красивая и функциональная платформа для онлайн-обучения, разработанная на **React 19** с использованием различных хуков и красивых стилей.

## 🚀 Функции

### ✅ Реализовано на клиенте:
- **Главная страница** с героем, особенности и популярные курсы
- **Каталог курсов** с фильтрацией, поиском и сортировкой
- **Детальная страница курса** с модулями, отзывами и информацией об инструкторе
- **Мое обучение** - отслеживание прогресса по курсам
- **Аутентификация** (вход/регистрация) с Context API
- **Адаптивный дизайн** для всех устройств
- **Красивая навигация** с поддержкой мобильных устройств

### 📚 React Хуки Используемые:
- `useState` - управление локальным состоянием
- `useEffect` - побочные эффекты (загрузка данных)
- `useContext` - глобальное состояние аутентификации
- `useCallback` - оптимизация функций
- `useMemo` - оптимизация вычислений
- `useParams` - получение параметров из URL
- `useNavigate` - навигация между страницами
- `useLocation` - получение информации о текущей странице

## 🏗️ Структура Проекта

```
src/
├── pages/                    # Страницы приложения
│   ├── HomePage.jsx         # Главная страница
│   ├── CoursesPage.jsx      # Каталог курсов
│   ├── CourseDetailsPage.jsx # Детали курса
│   ├── MyLearningPage.jsx   # Мое обучение
│   └── AuthPage.jsx         # Вход/Регистрация
├── components/              # Компоненты
│   └── Navbar.jsx           # Навигационная панель
├── context/
│   └── AuthContext.jsx      # Контекст аутентификации
├── hooks/
│   └── useApi.js            # Кастомные хуки для API
├── api/
│   └── courseService.js     # Stub API сервис
├── styles/
│   ├── global.css           # Глобальные стили
│   ├── pages.css            # Стили страниц
│   └── navbar.css           # Стили навигации
├── App.jsx                  # Основной компонент
└── main.jsx                 # Точка входа
```

## 🔗 REST API Заглушки

API функции находятся в [src/api/courseService.js](src/api/courseService.js) и готовы для подключения к реальному бэкенду.

### Реализованные API методы:

#### **Курсы** (`coursesAPI`)
```javascript
// Получить все курсы с фильтрацией
GET /api/courses
coursesAPI.getAllCourses(filters)

// Получить курс по ID
GET /api/courses/:id
coursesAPI.getCourseById(courseId)

// Поиск курсов
GET /api/courses/search?q=query
coursesAPI.searchCourses(query)
```

#### **Аутентификация** (`authAPI`)
```javascript
// Вход
POST /api/auth/login
authAPI.login(email, password)

// Регистрация
POST /api/auth/register
authAPI.register(name, email, password)

// Выход
POST /api/auth/logout
authAPI.logout()

// Получить текущего пользователя
GET /api/auth/me
authAPI.getCurrentUser()
```

#### **Мое Обучение** (`learningAPI`)
```javascript
// Получить курсы пользователя
GET /api/learning/my-courses
learningAPI.getMyLearning()

// Записаться на курс
POST /api/learning/enroll/:courseId
learningAPI.enrollCourse(courseId)

// Обновить прогресс
PUT /api/learning/progress/:courseId
learningAPI.updateProgress(courseId, lessonId, progress)
```

#### **Отзывы** (`reviewsAPI`)
```javascript
// Получить отзывы курса
GET /api/courses/:id/reviews
reviewsAPI.getCourseReviews(courseId)

// Добавить отзыв
POST /api/courses/:id/reviews
reviewsAPI.addReview(courseId, rating, text)
```

#### **Категории** (`categoriesAPI`)
```javascript
// Получить все категории
GET /api/categories
categoriesAPI.getCategories()
```

## 🎨 Дизайн и Стили

Платформа использует **современный градиентный дизайн** с цветовой схемой:
- **Основной цвет**: `#6366f1` (Индиго)
- **Вторичный цвет**: `#a855f7` (Фиолетовый)
- **Успех**: `#10b981` (Зелень)
- **Ошибка**: `#ef4444` (Красный)

### Адаптивная верстка:
- ✅ Desktop (1024px и выше)
- ✅ Tablet (768px - 1023px)
- ✅ Mobile (свыше 480px)

## 🔑 Ключевые Особенности Кода

### Context API для Аутентификации
```jsx
// Использование в компонентах
const { user, login, register, logout, isAuthenticated } = useAuth();
```

### Кастомные Хуки
```jsx
// Использование хука для загрузки данных
const { data, loading, error, refetch } = useApi(apiFunction);
const { courses, loading, error } = useCourses();
```

### Защита Маршрутов
```jsx
{isAuthenticated && (
  <Link to="/my-learning">Мое обучение</Link>
)}
```

## 📱 Демо Данные

При входе используйте демо-данные:
- **Email**: `demo@example.com`
- **Пароль**: `password`

## 🚀 Запуск Проекта

### Установка зависимостей
```bash
npm install
```

### Запуск dev сервера
```bash
npm run dev
```

### Сборка для production
```bash
npm run build
```

## 📡 Подключение к бэкенду

Для подключения к реальному бэкенду:

1. Отредактируйте `src/api/courseService.js`
2. Замените `simulateNetworkDelay()` на реальные HTTP запросы
3. Используйте `fetch` или `axios`:

```javascript
// Пример с fetch
const response = await fetch(`${API_BASE_URL}/courses`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

4. Обновите `API_BASE_URL`:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

## 🔐 Переменные Окружения

Создайте `.env` файл:
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=LearnHub
```

## 📦 Технологический Стек

- **React 19.2.4** - UI библиотека
- **React Router 6.20.0** - Маршрутизация
- **Vite** - Сборщик и dev сервер
- **CSS3** - Современные стили
- **Context API** - Управление состоянием

## 🎓 Что это дает бэкенду?

✅ **Четкие контракты API** - Все методы задокументированы
✅ **Готовые запросы** - Структура данных определена
✅ **Тестирование** - Можно тестировать с mock данными
✅ **Независимая разработка** - Фронтенд и бэкенд разрабатываются параллельно

## 📝 Примеры Использования API

### Получение курсов
```javascript
import { coursesAPI } from './api/courseService';

const courses = await coursesAPI.getAllCourses();
console.log(courses.data); // Массив курсов
```

### Вход пользователя
```javascript
import { authAPI } from './api/courseService';

const { token, user } = await authAPI.login('email@example.com', 'password');
localStorage.setItem('token', token);
```

### Записаться на курс
```javascript
import { learningAPI } from './api/courseService';

await learningAPI.enrollCourse(courseId);
```

## 🤝 Взаимодействие с Бэкенда

Бэкенд должен реализовать те же API endpoints со следующей структурой ответов:

```javascript
// Успешный ответ
{
  success: true,
  data: { /* данные */ }
}

// Ошибка
{
  success: false,
  message: "Описание ошибки"
}
```

## 📄 Лицензия

MIT

## 👨‍💻 Автор

Создано как полнофункциональная платформа обучения с разделением между фронтенд и бэкенд разработкой.

---

**Готово к разработке бэкенда!** 🚀
