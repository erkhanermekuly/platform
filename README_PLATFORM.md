# 📚 Образовательная платформа для учителей дошкольного образования

## 🎯 Обзор проекта

Современная веб-платформа для преподавателей дошкольного образования с системой управления курсами, двухуровневым доступом (admin и teacher) и интеграцией с платежной системой Kaspi.

## 🏗️ Архитектура

### Структура папок

```
src/
├── components/
│   ├── CourseCard/              # Карточка курса
│   │   ├── CourseCard.jsx
│   │   └── CourseCard.module.css
│   ├── AdminPanel/              # Панель администратора
│   │   ├── AdminPanel.jsx
│   │   └── AdminPanel.module.css
│   ├── PaymentModal/            # Модальное окно оплаты
│   │   ├── PaymentModal.jsx
│   │   └── PaymentModal.module.css
│   └── Navbar.jsx
│
├── context/
│   ├── AppContext.js            # 🆕 Глобальное состояние приложения
│   └── AuthContext.jsx          # Контекст аутентификации
│
├── services/
│   └── api.js                   # 🆕 API интеграция с C#
│
├── pages/
│   ├── CoursesPage.jsx          # 🔄 Обновлена
│   ├── HomePage.jsx
│   ├── CourseDetailsPage.jsx
│   ├── MyLearningPage.jsx
│   └── AuthPage.jsx
│
├── styles/
│   ├── global.css
│   └── pages.css
│
├── App.jsx                      # 🔄 Обновлена - добавлен AppProvider
└── main.jsx
```

---

## 🎨 Компоненты

### 1. **CourseCard** компонент

Красивая карточка курса с поддержкой заблокированных/разблокированных состояний.

**Props:**
```jsx
<CourseCard
  course={{
    id: number,
    title: string,
    description: string,
    image: string,
    instructor: string,
    category: 'beginner' | 'intermediate' | 'advanced',
    isLocked: boolean,
    price: number,
    videoUrl: string,
    files: array
  }}
  onUnlock={(course) => {}} // Клик на кнопку для разблокировки
  onView={(course) => {}}    // Клик на кнопку просмотра
  isOwned={boolean}          // Владеет ли пользователь курсом
/>
```

**Дизайн:**
- Пастельные цвета и мягкие тени
- 20px border radius на главном контейнере
- Overlay с иконкой Lock для заблокированных курсов
- Иконка CheckCircle для доступных курсов
- Градиент фона (бирюза → мята)

### 2. **PaymentModal** компонент

Модальное окно для обработки платежей через Kaspi QR.

**Props:**
```jsx
<PaymentModal
  isOpen={boolean}
  course={courseObject}
  onClose={() => {}}      // Закрыть модаль
  onConfirm={(courseId) => {}} // Подтвердить платеж
/>
```

**Функциональность:**
- SVG-заглушка Kaspi QR кода
- Инструкции по оплате
- Кнопка "Подтвердить оплату" с анимацией загрузки
- При подтверждении курс становится доступным

### 3. **AdminPanel** компонент

Панель администратора для управления курсами.

**Props:**
```jsx
<AdminPanel
  courses={array}                    // Массив всех курсов
  onAddCourse={(courseData) => {}}   // Добавить курс
  onDeleteCourse={(courseId) => {}}  // Удалить курс
/>
```

**Функции:**
- Форма добавления курса (название, описание, ссылка на видео, цена)
- Upload/добавление файлов к курсу
- Просмотр всех курсов
- Удаление курсов

---

## 🔄 Context API - AppContext

Глобальное состояние управляется через **useReducer**.

### Структура состояния:

```javascript
{
  courses: [
    {
      id: number,
      title: string,
      description: string,
      instructor: string,
      category: string,
      isLocked: boolean,
      price: number,
      image: string,
      videoUrl: string,
      files: array
    }
  ],
  userRole: 'teacher' | 'admin',        // Роль пользователя
  purchasedCourses: array                // IDs оплаченных курсов
}
```

### Actions (dispatch):

```javascript
// Добавить курс (Admin)
dispatch({ type: 'ADD_COURSE', payload: courseData });

// Купить курс (Teacher)
dispatch({ type: 'BUY_COURSE', payload: courseId });

// Переключить роль
dispatch({ type: 'TOGGLE_ROLE' });

// Удалить курс (Admin)
dispatch({ type: 'DELETE_COURSE', payload: courseId });
```

### Использование в компонентах:

```jsx
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

function MyComponent() {
  const { courses, userRole, purchasedCourses, addCourse, buyCourse, toggleRole } = useContext(AppContext);

  return (
    <>
      <p>Роль: {userRole}</p>
      <p>Всего курсов: {courses.length}</p>
    </>
  );
}
```

---

## 🔗 API Integration (services/api.js)

Готовая интеграция с C# ASP.NET Core бэкендом.

### Основные функции:

```javascript
// Получить все курсы
await fetchCourses();

// Получить курс по ID
await fetchCourseById(courseId);

// Добавить курс (требует token)
await addCourse(courseData, token);

// Удалить курс (требует token)
await deleteCourse(courseId, token);

// Обновить курс
await updateCourse(courseId, courseData, token);

// Обработить платеж
await processPay

ment(courseId, paymentData, token);

// Загрузить файлы
await uploadCourseFiles(courseId, files, token);

// Аутентификация
await login(email, password);
await register(name, email, password, role);
```

### Структура API URL:

```
GET    /api/courses              # Получить все курсы
GET    /api/courses/{id}         # Получить курс
POST   /api/courses              # Добавить курс (Admin)
PUT    /api/courses/{id}         # Обновить курс (Admin)
DELETE /api/courses/{id}         # Удалить курс (Admin)

GET    /api/courses/{id}/files   # Получить файлы курса
POST   /api/courses/{id}/files   # Загрузить файлы

POST   /api/payments/process     # Обработить платеж
GET    /api/payments/{id}/status # Статус платежа

POST   /api/auth/login           # Вход
POST   /api/auth/register        # Регистрация
GET    /api/auth/profile         # Профиль пользователя
```

---

## 🎨 Дизайн система

### Цветовая палитра:

```css
/* Primary colors */
--primary: #8b5cf6 (purple for buttons)
--secondary: #ec4899 (pink for accents)
--success: #10b981 (green for positive actions)
--warning: #f59e0b (orange)
--danger: #ef4444 (red)

/* Pastels */
--mint: #a8e4d8 (для кнопок доступа)
--pink: #fca5a5 (для кнопок блокировки)
--light-bg: #f0f9ff (бирюза)
--gradient: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)
```

### Border radius:

```css
20px  /* Главные контейнеры */
16px  /* Карточки элементы */
12px  /* Инпуты, кнопки */
```

### Shadows:

```css
0 4px 20px rgba(0, 0, 0, 0.08)   /* sm */
0 10px 30px rgba(0, 0, 0, 0.1)   /* md */
0 20px 60px rgba(0, 0, 0, 0.2)   /* lg */
```

---

## 👥 Две роли пользователей

### 👨‍🏫 Роль "Учитель" (Teacher)

- Просмотр всех курсов
- Покупка платных курсов через Kaspi QR
- Просмотр содержимого курсов (видео + файлы)
- Загрузка файлов с курса

### 🔐 Роль "Администратор" (Admin)

- Добавление новых курсов
- Редактирование курсов
- Удаление курсов
- Просмотр всех пользователей
- Управление платежами

### Переключение ролей:

```jsx
// Кнопка есть на CoursesPage
<button onClick={toggleRole}>
  Переключиться на роль "{newRole}"
</button>
```

---

## 🔒 Система доступа

### isLocked флаг:

```javascript
{
  id: 1,
  title: "Бесплатный курс",
  price: 0,
  isLocked: false,  // ✅ Доступен сразу
}

{
  id: 2,
  title: "Платный курс",
  price: 2999,
  isLocked: true,   // 🔒 Требует оплаты
}
```

### Логика отображения:

```jsx
{course.isLocked && !isOwned && (
  <>
    <div className={styles.overlay}>
      <Lock size={48} /> // Иконка замка
    </div>
    <button onClick={() => onUnlock(course)}>
      Разблокировать
    </button>
  </>
)}

{(!course.isLocked || isOwned) && (
  <>
    <div className={styles.badge}>
      <CheckCircle size={20} /> // Иконка галочки
    </div>
    <button onClick={() => onView(course)}>
      Смотреть
    </button>
  </>
)}
```

---

## 💳 Система оплаты Kaspi

### Процесс оплаты:

1. Учитель нажимает кнопку "Разблокировать"
2. Открывается модальное окно с Kaspi QR
3. Инструкция: "Отсканируйте QR в приложении Kaspi"
4. Демонстрация: кнопка "Подтвердить оплату"
5. При подтверждении:
   - Статус курса меняется с `isLocked: true` → `isLocked: false`
   - Курс добавляется в `purchasedCourses`
   - Отображается CheckCircle вместо Lock

### PaymentModal компонент:

```jsx
const [isPaymentOpen, setIsPaymentOpen] = useState(false);
const [selectedCourse, setSelectedCourse] = useState(null);

const handleUnlock = (course) => {
  setSelectedCourse(course);
  setIsPaymentOpen(true);
};

const handlePaymentConfirm = (courseId) => {
  buyCourse(courseId); // Меняет isLocked на false
  alert('✅ Спасибо за покупку!');
};

<PaymentModal
  isOpen={isPaymentOpen}
  course={selectedCourse}
  onClose={() => setIsPaymentOpen(false)}
  onConfirm={handlePaymentConfirm}
/>
```

---

## 📂 Хранение файлов курса

Каждый курс может иметь список файлов:

```javascript
{
  id: 1,
  title: "Мой курс",
  files: [
    { id: 1, name: "Методические рекомендации.pdf", type: "pdf" },
    { id: 2, name: "Шаблон плана занятия.docx", type: "docx" }
  ]
}
```

### Загрузка файлов (Admin):

```jsx
// В AdminPanel форме
<input
  type="text"
  placeholder="Название файла (мы.pdf, lesson.docx)"
  onChange={(e) => setFileInput(e.target.value)}
/>
<button onClick={handleAddFile}>Добавить файл</button>

// Файлы хранятся в formData.files
```

### Скачивание файлов (Teacher):

```jsx
{course.files.map(file => (
  <div key={file.id}>
    <Download size={14} />
    <span>{file.name}</span>
  </div>
))}
```

---

## 🚀 Как начать

### 1️⃣ Установить зависимости

```bash
npm install
```

### 2️⃣ Запустить приложение

```bash
npm run dev
```

### 3️⃣ Переключаться между ролями

- На странице /courses есть кнопка переключения ролей
- Роль "Учитель" (по умолчанию) - просмотр курсов
- Роль "Администратор" - управление курсами

---

## 📝 Примеры использования

### Добавнение курса (Admin)

```javascript
const courseData = {
  title: "Творческие занятия",
  description: "Интерактивные методы обучения",
  instructor: "Ольга Иванова",
  category: "intermediate",
  price: 1999,
  videoUrl: "https://www.youtube.com/embed/...",
  image: "https://...",
  files: [
    { id: 1, name: "Материалы.pdf", type: "pdf" }
  ]
};

addCourse(courseData);
```

### Покупка курса (Teacher)

```javascript
// Статус меняется в AppContext
buyCourse(courseId);

// Курс добавляется в purchasedCourses
// и isLocked меняется на false
```

---

## 🔧 Интеграция с C# Backend

### Требуемые endpoints:

```csharp
[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    [HttpGet]
    public IActionResult GetAllCourses() { }

    [HttpGet("{id}")]
    public IActionResult GetCourse(int id) { }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public IActionResult AddCourse(Coursedto course) { }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public IActionResult UpdateCourse(int id, CourseDto course) { }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public IActionResult DeleteCourse(int id) { }
}

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    [HttpPost("process")]
    [Authorize]
    public IActionResult ProcessPayment(PaymentDto payment) { }

    [HttpGet("{id}/status")]
    [Authorize]
    public IActionResult CheckPaymentStatus(int id) { }
}
```

### Модели C#:

```csharp
public class CourseDto
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public string Instructor { get; set; }
    public string Category { get; set; }
    public bool IsLocked { get; set; }
    public decimal Price { get; set; }
    public string Image { get; set; }
    public string VideoUrl { get; set; }
    public List<CourseFileDto> Files { get; set; }
}

public class PaymentDto
{
    public int CourseId { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } // "kaspi_qr"
}
```

---

## 📦 Установленные зависимости

- React 19.2.4
- React Router Dom 6.20.0
- Lucide React (иконки)

---

## 🐛 Troubleshooting

**Q: Курсы не появляются?**
A: Проверьте, что AppProvider обернут вокруг приложения в App.jsx

**Q: PaymentModal не открывается?**
A: Убедитесь, что isOpen={true} и course !== null

**Q: Файлы не добавляются?**
A: Нажмите Enter или кнопку "Добавить файл". Файл должен быть в формате "name.ext"

---

## 🎓 Следующие шаги

- ✅ Интеграция с реальным C# API
- ✅ Система аутентификации с JWT токенами
- ✅ Загрузка видео на сервер
- ✅ Прямая загрузка файлов
- ✅ Статистика и прогресс обучения
- ✅ Email уведомления
- ✅ Рейтинговая система

---

**Версия**: 1.0.0  
**Дата**: 2026-04-06  
**Автор**: Senior Frontend Developer
