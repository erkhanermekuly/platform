// API service for ASP.NET Core backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5240/api';

const buildUrl = (path, query = {}) => {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const getAuthToken = () => localStorage.getItem('token');

const request = async (path, options = {}, query = {}) => {
  const token = getAuthToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const serverMessage = payload?.message || payload?.error || 'Request failed';
    throw new Error(serverMessage);
  }

  return payload;
};

export const coursesAPI = {
  getAllCourses: async (filters = {}) =>
    request('/courses', { method: 'GET' }, {
      search: filters.search,
      category: filters.category,
      level: filters.level,
    }),

  getCourseById: async (courseId) => request(`/courses/${courseId}`),

  searchCourses: async (query) => request('/courses/search', { method: 'GET' }, { query }),
};

export const authAPI = {
  login: async (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: async (name, email, password, role = 'teacher') =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),

  logout: async () => request('/auth/logout', { method: 'POST' }),

  getCurrentUser: async () => request('/auth/me'),
};

export const learningAPI = {
  getMyLearning: async () => request('/learning/my'),

  enrollCourse: async (courseId) =>
    request(`/learning/enroll/${courseId}`, { method: 'POST' }),

  updateProgress: async (courseId, lessonId, progress) =>
    request(`/learning/progress/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify({ lessonId, progress }),
    }),
};

export const reviewsAPI = {
  getCourseReviews: async (courseId) => request(`/reviews/course/${courseId}`),

  addReview: async (courseId, rating, text) =>
    request(`/reviews/course/${courseId}`, {
      method: 'POST',
      body: JSON.stringify({ rating, text }),
    }),
};

export const categoriesAPI = {
  getCategories: async () => request('/categories'),
};

export const paymentsAPI = {
  processPayment: async (courseId, amount) =>
    request('/payments/process', {
      method: 'POST',
      body: JSON.stringify({ courseId, amount }),
    }),

  checkPaymentStatus: async (paymentId) => request(`/payments/${paymentId}/status`),
};

export const filesAPI = {
  getCourseFiles: async (courseId) => request(`/courses/${courseId}/files`),

  uploadCourseFiles: async (courseId, files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return request(`/courses/${courseId}/files`, { method: 'POST', body: formData });
  },
};

