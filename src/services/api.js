/**
 * API Service для образовательной платформы
 * Интегрируется с ASP.NET Core бэкендом
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Получить все курсы
 */
export const fetchCourses = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/courses`);
    if (!response.ok) throw new Error('Failed to fetch courses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Получить курс по ID
 */
export const fetchCourseById = async (courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`);
    if (!response.ok) throw new Error('Failed to fetch course');
    return await response.json();
  } catch (error) {
    console.error('Error fetching course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Добавить новый курс (Admin only)
 */
export const addCourse = async (courseData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to add course');
    return await response.json();
  } catch (error) {
    console.error('Error adding course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Удалить курс (Admin only)
 */
export const deleteCourse = async (courseId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to delete course');
    return await response.json();
  } catch (error) {
    console.error('Error deleting course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Обновить курс (Admin only)
 */
export const updateCourse = async (courseId, courseData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to update course');
    return await response.json();
  } catch (error) {
    console.error('Error updating course:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Список курсов, созданных текущим пользователем (только admin).
 */
export const fetchMyCourses = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/courses/my-courses`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch my courses');
    return await response.json();
  } catch (error) {
    console.error('Error fetching my courses:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Обработить платеж (создать заказ)
 */
export const processPayment = async (courseId, paymentData, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courseId,
        ...paymentData
      })
    });
    if (!response.ok) throw new Error('Failed to process payment');
    return await response.json();
  } catch (error) {
    console.error('Error processing payment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Проверить статус платежа
 */
export const checkPaymentStatus = async (paymentId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to check payment status');
    return await response.json();
  } catch (error) {
    console.error('Error checking payment status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Загрузить файлы для курса
 */
export const uploadCourseFiles = async (courseId, files, token) => {
  try {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    if (!response.ok) throw new Error('Failed to upload files');
    return await response.json();
  } catch (error) {
    console.error('Error uploading files:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Получить файлы курса
 */
export const fetchCourseFiles = async (courseId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/files`);
    if (!response.ok) throw new Error('Failed to fetch course files');
    return await response.json();
  } catch (error) {
    console.error('Error fetching course files:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Аутентификация - Вход
 */
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error('Login failed');
    return await response.json();
  } catch (error) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Аутентификация - Регистрация
 */
export const register = async (name, email, password, role) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password, role })
    });
    if (!response.ok) throw new Error('Registration failed');
    return await response.json();
  } catch (error) {
    console.error('Error registering:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Получить информацию о пользователе
 */
export const fetchUserProfile = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
  } catch (error) {
    console.error('Error fetching profile:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Выход из системы
 */
export const logout = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Logout failed');
    return await response.json();
  } catch (error) {
    console.error('Error logging out:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Mock functions для демонстрации (используются вместо реального API)
 */
export const mockAPI = {
  /**
   * Получить все курсы (Mock)
   */
  fetchCourses: async () => {
    // Имитируем задержку сети
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [
            {
              id: 1,
              title: 'Мектеп жасына дейінгі білім берудің негіздері',
              description: 'Балабақшада жұмыс бастайтын педагогтерге арналған толық курс',
              instructor: 'Динара Қасымова',
              category: 'beginner',
              isLocked: false,
              price: 0,
              image: 'https://images.unsplash.com/photo-1503672260482-696c7ebc5cb2?w=400'
            }
          ]
        });
      }, 500);
    });
  },

  /**
   * Добавить курс (Mock)
   */
  addCourse: async (courseData) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          data: { ...courseData, id: Date.now() }
        });
      }, 500);
    });
  }
};

export default {
  fetchCourses,
  fetchCourseById,
  addCourse,
  deleteCourse,
  updateCourse,
  fetchMyCourses,
  processPayment,
  checkPaymentStatus,
  uploadCourseFiles,
  fetchCourseFiles,
  login,
  register,
  fetchUserProfile,
  logout,
  mockAPI
};
