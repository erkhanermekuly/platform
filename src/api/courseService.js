// API Service - Stub/Mock responses для бэкендера

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Симуляция задержки сети
const simulateNetworkDelay = (ms = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));


export const coursesAPI = {
  // Получить все курсы
  getAllCourses: async (filters = {}) => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: [
        {
          id: 1,
          title: 'Основы JavaScript',
          description: 'Полный курс по JavaScript от основ до продвинутых концепций',
          category: 'programming',
          level: 'beginner',
          price: 0,
          image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
          instructor: 'Иван Петров',
          rating: 4.8,
          students: 12540,
          duration: '40 часов'
        },
        {
          id: 2,
          title: 'React для начинающих',
          description: 'Научитесь создавать интерактивные приложения с React',
          category: 'programming',
          level: 'beginner',
          price: 0,
          image: 'https://images.unsplash.com/photo-1633356542981-dfe60bb9a36f?w=500',
          instructor: 'Сергей Иванов',
          rating: 4.9,
          students: 8932,
          duration: '30 часов'
        },
        {
          id: 3,
          title: 'Node.js для профессионалов',
          description: 'Продвинутые техники разработки серверных приложений',
          category: 'programming',
          level: 'advanced',
          price: 299,
          image: 'https://images.unsplash.com/photo-1516321318423-f06f70504c11?w=500',
          instructor: 'Александр Соколов',
          rating: 4.7,
          students: 5420,
          duration: '50 часов'
        },
        {
          id: 4,
          title: 'UI/UX Дизайн',
          description: 'Полное руководство по созданию красивых интерфейсов',
          category: 'design',
          level: 'intermediate',
          price: 199,
          image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500',
          instructor: 'Мария Козлова',
          rating: 4.6,
          students: 7210,
          duration: '35 часов'
        }
      ]
    };
  },

  // Получить курс по ID
  getCourseById: async (courseId) => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: {
        id: courseId,
        title: 'React для начинающих',
        description: 'Полный курс по React с практическими проектами',
        category: 'programming',
        level: 'beginner',
        price: 299,
        image: 'https://images.unsplash.com/photo-1633356542981-dfe60bb9a36f?w=500',
        instructor: {
          id: 1,
          name: 'Сергей Иванов',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
          bio: 'Опытный React разработчик с 10-летним стажем'
        },
        rating: 4.9,
        students: 8932,
        duration: '30 часов',
        modules: [
          {
            id: 1,
            title: 'Введение в React',
            lessons: 5,
            duration: '2 часа'
          },
          {
            id: 2,
            title: 'Компоненты и JSX',
            lessons: 8,
            duration: '4 часа'
          },
          {
            id: 3,
            title: 'Хуки и State Management',
            lessons: 10,
            duration: '6 часов'
          },
          {
            id: 4,
            title: 'Маршрутизация и API',
            lessons: 7,
            duration: '5 часов'
          },
          {
            id: 5,
            title: 'Финальный проект',
            lessons: 3,
            duration: '8 часов'
          }
        ]
      }
    };
  },

  // Поиск курсов
  searchCourses: async (query) => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: [
        {
          id: 1,
          title: 'Основы JavaScript',
          category: 'programming',
          rating: 4.8
        }
      ]
    };
  }
};

// ==================== АУТЕНТИФИКАЦИЯ ====================

export const authAPI = {
  // Логин
  login: async (email, password) => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: {
        token: 'jwt_token_here_' + Date.now(),
        user: {
          id: 1,
          name: 'Иван Иванов',
          email: email,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
        }
      }
    };
  },

  // Регистрация
  register: async (name, email, password) => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: {
        token: 'jwt_token_here_' + Date.now(),
        user: {
          id: 2,
          name: name,
          email: email,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
        }
      }
    };
  },

  // Выход
  logout: async () => {
    await simulateNetworkDelay();
    return { success: true };
  },

  // Получить текущего пользователя
  getCurrentUser: async () => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: {
        id: 1,
        name: 'Иван Иванов',
        email: 'ivan@example.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
      }
    };
  }
};

// ==================== МОЙ ОБУЧЕНИЕ ====================

export const learningAPI = {
  // Получить мои курсы
  getMyLearning: async () => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: [
        {
          id: 1,
          courseId: 1,
          title: 'Основы JavaScript',
          progress: 65,
          lastAccessed: '2024-03-20',
          image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
          instructor: 'Иван Петров'
        },
        {
          id: 2,
          courseId: 2,
          title: 'React для начинающих',
          progress: 45,
          lastAccessed: '2024-03-19',
          image: 'https://images.unsplash.com/photo-1633356542981-dfe60bb9a36f?w=500',
          instructor: 'Сергей Иванов'
        }
      ]
    };
  },

  // Записаться на курс
  enrollCourse: async (courseId) => {
    await simulateNetworkDelay();
    return { success: true, message: 'Успешно зарегистрированы на курс' };
  },

  // Обновить прогресс
  updateProgress: async (courseId, lessonId, progress) => {
    await simulateNetworkDelay();
    return { success: true, progress };
  }
};

// ==================== ОТЗЫВЫ И РЕЙТИНГИ ====================

export const reviewsAPI = {
  // Получить отзывы курса
  getCourseReviews: async (courseId) => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: [
        {
          id: 1,
          user: 'Алексей М.',
          rating: 5,
          text: 'Отличный курс! Очень понятно объяснено',
          date: '2024-03-15'
        },
        {
          id: 2,
          user: 'Ирина К.',
          rating: 4,
          text: 'Хорошее содержание, но хотелось бы больше практики',
          date: '2024-03-10'
        }
      ]
    };
  },

  // Добавить отзыв
  addReview: async (courseId, rating, text) => {
    await simulateNetworkDelay();
    return { success: true, message: 'Отзыв опубликован' };
  }
};

// ==================== КАТЕГОРИИ И ФИЛЬТРЫ ====================

export const categoriesAPI = {
  // Получить все категории
  getCategories: async () => {
    await simulateNetworkDelay();
    return {
      success: true,
      data: [
        { id: 1, name: 'Программирование', slug: 'programming', count: 124 },
        { id: 2, name: 'Дизайн', slug: 'design', count: 87 },
        { id: 3, name: 'Маркетинг', slug: 'marketing', count: 105 },
        { id: 4, name: 'Язык', slug: 'language', count: 200 }
      ]
    };
  }
};
