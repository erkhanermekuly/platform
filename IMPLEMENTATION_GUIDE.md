# 🎓 Руководство по реализации платформы

## ✅ Что уже было создано

### 1. **Компоненты:**

#### CourseCard.jsx / CourseCard.module.css
- ✅ Красивые карточки курсов с пастельными цветами
- ✅ Overlay с Lock иконкой для заблокированных курсов
- ✅ CheckCircle иконка для доступных курсов
- ✅ Отображение информации о преподавателе
- ✅ Список скачиваемых файлов
- ✅ Кнопки "Смотреть" / "Разблокировать"
- ✅ Адаптивный дизайн (20px border radius, пастельные цвета)

#### PaymentModal.jsx / PaymentModal.module.css
- ✅ Модальное окно для Kaspi QR
- ✅ SVG-заглушка QR кода
- ✅ Инструкции по оплате
- ✅ Кнопка "Подтвердить оплату" с анимацией
- ✅ Обработка платежа (демонстрация на фронте)
- ✅ Smooth animations и transitions

#### AdminPanel.jsx / AdminPanel.module.css
- ✅ Форма добавления курса (все поля)
- ✅ Управление файлами (добавление/удаление)
- ✅ Список всех курсов с функцией удаления
- ✅ Двухколоночный layout
- ✅ Красивый дизайн с градиентами

### 2. **Context API:**

#### AppContext.js
- ✅ useReducer для управления состоянием
- ✅ Initial state с mock курсами
- ✅ Actions: ADD_COURSE, BUY_COURSE, TOGGLE_ROLE, DELETE_COURSE
- ✅ Функции: addCourse, buyCourse, toggleRole, deleteCourse
- ✅ Поддержка двух ролей: admin, teacher
- ✅ Отслеживание purchasedCourses

### 3. **API Integration:**

#### services/api.js
- ✅ Функции для всех CRUD операций с курсами
- ✅ Функции для платежей
- ✅ Функции для загрузки файлов
- ✅ Функции для аутентификации
- ✅ Mock функции для демонстрации
- ✅ Готовность к подключению реального C# API

### 4. **Обновлены файлы:**

- ✅ App.jsx - добавлен AppProvider
- ✅ CoursesPage.jsx - полностью переписана с использованием новых компонентов
- ✅ Интеграция PaymentModal в CoursesPage

---

## 🚀 Как запустить проект

### Шаг 1: Установить зависимости

```bash
cd c:\Users\Admin\Documents\GitHub\platform
npm install
```

### Шаг 2: Запустить разработчик-сервер

```bash
npm run dev
```

Приложение запустится на `http://localhost:5173`

### Шаг 3: Перейти на страницу курсов

```
http://localhost:5173/courses
```

### Шаг 4: Протестировать функциональность

#### Режим "Учитель" (Teacher)
1. Вы видите все курсы в виде карточек
2. Бесплатные курсы (price: 0) сразу доступны
3. Платные курсы (price > 0) заблокированы с иконкой Lock
4. Нажимаете "Разблокировать" → открывается PaymentModal с Kaspi QR
5. Нажимаете "Подтвердить оплату" → курс разблокируется и появляется CheckCircle

#### Режим "Администратор" (Admin)
1. Вы видите AdminPanel с двумя секциями:
   - Левая: Форма добавления курса
   - Правая: Список всех курсов
2. Заполняете форму:
   - Название курса
   - Описание
   - Преподаватель
   - Категория (beginner/intermediate/advanced)
   - Цена (0 = бесплатный)
   - Ссылка на видео
   - Ссылка на изображение
   - Добавляете файлы (название + расширение)
3. Нажимаете "Добавить курс"
4. Курс появляется в списке справа
5. Можете удалить курс кнопкой Trash

#### Переключение ролей
- На CoursesPage есть кнопка переключения между ролями
- Текущая роль отображается в UI
- При переключении меняется отображение контента

---

## 📁 Структура файлов

```
src/
├── components/
│   ├── CourseCard/
│   │   ├── CourseCard.jsx           # Компонент карточки курса
│   │   └── CourseCard.module.css    # CSS Modules стили
│   ├── AdminPanel/
│   │   ├── AdminPanel.jsx           # Панель администратора
│   │   └── AdminPanel.module.css    # CSS Modules стили
│   ├── PaymentModal/
│   │   ├── PaymentModal.jsx         # Модаль оплаты
│   │   └── PaymentModal.module.css  # CSS Modules стили
│   ├── Navbar.jsx                   # (существующий)
│   └── ... другие компоненты
│
├── context/
│   ├── AppContext.js                # ✨ 🆕 Глобальное состояние
│   └── AuthContext.jsx              # (существующий)
│
├── services/
│   └── api.js                       # ✨ 🆕 API функции
│
├── pages/
│   ├── CoursesPage.jsx              # ✨ 🔄 Обновлена
│   └── ... другие страницы
│
├── styles/
│   ├── global.css
│   └── pages.css
│
├── App.jsx                          # ✨ 🔄 Обновлен (AppProvider)
├── main.jsx
└── index.css
```

---

## 🎯 Использование компонентов в коде

### Импорт CourseCard:

```jsx
import CourseCard from '../components/CourseCard/CourseCard';

function MyComponent() {
  const course = {
    id: 1,
    title: "Основы дошкольного образования",
    description: "Полный курс для учителей",
    image: "https://images.unsplash.com/...",
    instructor: "Елена Петрова",
    category: "beginner",
    isLocked: false,
    price: 0,
    videoUrl: "https://www.youtube.com/embed/...",
    files: [
      { id: 1, name: "Рекомендации.pdf", type: "pdf" }
    ]
  };

  return (
    <CourseCard
      course={course}
      onUnlock={(course) => console.log('Unlock:', course)}
      onView={(course) => console.log('View:', course)}
      isOwned={false}
    />
  );
}
```

### Импорт AdminPanel:

```jsx
import AdminPanel from '../components/AdminPanel/AdminPanel';
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

function AdminPage() {
  const { courses, addCourse, deleteCourse } = useContext(AppContext);

  return (
    <AdminPanel
      courses={courses}
      onAddCourse={addCourse}
      onDeleteCourse={deleteCourse}
    />
  );
}
```

### Импорт PaymentModal:

```jsx
import PaymentModal from '../components/PaymentModal/PaymentModal';
import { useState } from 'react';

function Shop() {
  const [isOpen, setIsOpen] = useState(false);
  const [course, setCourse] = useState(null);

  const handleBuy = (selectedCourse) => {
    setCourse(selectedCourse);
    setIsOpen(true);
  };

  const handleConfirm = (courseId) => {
    console.log('Payment confirmed for course:', courseId);
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => handleBuy(course1)}>Buy Course</button>
      <PaymentModal
        isOpen={isOpen}
        course={course}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
```

### Использование AppContext:

```jsx
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

function MyComponent() {
  const { 
    courses,           // array - все курсы
    userRole,          // 'admin' или 'teacher'
    purchasedCourses,  // array - IDs купленных курсов
    addCourse,         // function
    buyCourse,         // function
    toggleRole,        // function
    deleteCourse       // function
  } = useContext(AppContext);

  return (
    <div>
      <p>Текущая роль: {userRole}</p>
      <p>Всего курсов: {courses.length}</p>
      <p>Купленные курсы: {purchasedCourses.length}</p>
      <button onClick={toggleRole}>Переключить роль</button>
    </div>
  );
}
```

### Использование API:

```jsx
import api from '../services/api';

// Получить все курсы
const courses = await api.fetchCourses();

// Добавить курс (требует token)
const newCourse = await api.addCourse(courseData, token);

// Обработать платеж
const payment = await api.processPay

ment(courseId, paymentData, token);

// Правильное использование с try-catch
try {
  const response = await api.fetchCourses();
  if (response.success) {
    console.log('Courses:', response.data);
  } else {
    console.error('Error:', response.error);
  }
} catch (error) {
  console.error('Exception:', error);
}
```

---

## 🎨 Пастельные цвета и стили

### Используемые цвета:

```css
/* Основные цвета */
#8b5cf6 /* Purple - основной цвет кнопок */
#ec4899 /* Pink - акценты */
#10b981 /* Green - добавление */
#ef4444 /* Red - удаление */

/* Пастельные цвета фонов */
#f0f9ff /* Light blue */
#ecfdf5 /* Mint green */
#fef3c7 /* Amber */
#fff5f7 /* Light pink */

/* Специальные цвета для кнопок */
#a8e4d8 /* Mint - для "Смотреть" */
#fca5a5 /* Light red - для "Разблокировать" */
```

### Border Radius:

```css
20px  /* Главные контейнеры */
16px  /* Модальные окна */
12px  /* Инпуты, маленькие кнопки */
```

### Shadows:

Все компоненты используют красивые тени:
```css
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
```

---

## 🔐 Логика Lock/Unlock

### Как работает система доступа:

1. **Бесплатные курсы** (`price: 0`):
   - `isLocked: false`
   - Сразу доступны
   - Карточка имеет полную непрозрачность
   - Кнопка: "Смотреть"

2. **Платные курсы для не-владельцев**:
   - `isLocked: true`
   - Карточка полупрозрачна (opacity: 0.7)
   - Overlay с иконкой Lock
   - Кнопка: "Разблокировать"
   - При клике открывается PaymentModal

3. **Платные курсы для владельцев**:
   - `isLocked: false` (после оплаты)
   - `purchasedCourses` содержит ID
   - Карточка полностью видна
   - Иконка CheckCircle
   - Кнопка: "Смотреть"

### Процесс покупки:

```
Клик на "Разблокировать"
    ↓
onUnlock() → setIsPaymentOpen(true)
    ↓
PaymentModal открывается
    ↓
Пользователь видит Kaspi QR
    ↓
Клик на "Подтвердить оплату"
    ↓
handlePaymentConfirm() → buyCourse(courseId)
    ↓
В AppContext:
  - isLocked меняется на false
  - courseId добавляется в purchasedCourses
    ↓
CourseCard перерендеривается с новым статусом
    ↓
Появляется CheckCircle, кнопка "Смотреть"
```

---

## 📊 Mock Data

В AppContext.js уже есть 3 готовых курса:

```javascript
1. "Основы дошкольного образования" - БЕСПЛАТНЫЙ (isLocked: false)
2. "Развитие речи у дошкольников" - ПЛАТНЫЙ 2999₸ (isLocked: true)
3. "Творческие занятия и арт-терапия" - ПЛАТНЫЙ 1999₸ (isLocked: true)
```

Вы можете добавить свои курсы через AdminPanel (в режиме Admin).

---

## 🔧 Интеграция с C# API

Когда вы будете готовы подключить реальный бэкенд:

1. **Установить переменную окружения:**

```bash
# .env файл
VITE_API_URL=http://localhost:5000/api
```

2. **Заменить mock данные на реальные запросы:**

```jsx
// Вместо mock data из AppContext
const { data: courses } = await api.fetchCourses();

// Для добавления курса
await api.addCourse(courseData, token);

// Для оплаты
await api.processPay

ment(courseId, paymentData, token);
```

3. **Структура API endpoints готова в services/api.js**

---

## ✨ Ключевые особенности

- ✅ 100% CSS Modules (никакого inline CSS)
- ✅ Лучшие практики React (useContext, useCallback, usaMemo)
- ✅ Lucide React иконки интегрированы
- ✅ Полная адаптивность (мобиль, планшет, десктоп)
- ✅ Красивые анимации и transitions
- ✅ Две роли пользователей с разными интерфейсами
- ✅ Система Kaspi QR (заглушка с демонстрацией)
- ✅ Mock API и готовность к реальной интеграции

---

## 📞 Часто задаваемые вопросы

**Q: Как добавить новый курс?**
A: В режиме Admin заполните форму в AdminPanel и нажмите "Добавить курс".

**Q: Как тестировать оплату?**
A: Нажмите "Разблокировать" на платном курсе → откроется PaymentModal → нажмите "Подтвердить оплату".

**Q: Где хранятся файлы?**
A: На фронте это просто список названий. На бэкенде нужна загрузка на сервер.

**Q: Как подключить реальный Kaspi API?**
A: Используйте services/api.js в функции processPay

ment() с реальными параметрами.

**Q: Где сохраняются изменения?**
A: Только в памяти браузера (в AppContext). Для сохранения нужна БД.

---

## 🚀 Следующие этапы

1. Подключить реальный ASP.NET Core API
2. Добавить аутентификацию с JWT токенами
3. Загрузку видео и файлов на сервер
4. Прогресс-трекинг обучения
5. Email уведомления
6. Рейтинговую систему

---

**Проект готов к использованию!** 🎉

Версия: 1.0.0  
Дата: 2026-04-06  
Статус: ✅ ПОЛНОСТЬЮ РЕАЛИЗОВАН
