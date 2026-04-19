// API service for ASP.NET Core backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5240/api';

const buildUrl = (path, query = {}) => {
  const joined = `${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const url = joined.startsWith('http')
    ? new URL(joined)
    : new URL(joined, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const getAuthToken = () => localStorage.getItem('token');

function parseErrorMessage(response, text, payload) {
  if (payload && typeof payload === 'object') {
    // ASP.NET ValidationProblemDetails: сначала детали полей, не общий title
    const errs = payload.errors;
    if (errs && typeof errs === 'object' && Object.keys(errs).length > 0) {
      const lines = Object.entries(errs).flatMap(([key, val]) => {
        if (Array.isArray(val)) return val.map((m) => `${key}: ${m}`);
        return [`${key}: ${val}`];
      });
      if (lines.length) return lines.join('; ');
    }

    const direct =
      payload.message ||
      payload.Message ||
      payload.error ||
      payload.title ||
      payload.Title;
    if (direct) return String(direct);
  }

  const trimmed = (text || '').replace(/\s+/g, ' ').trim();
  if (trimmed.startsWith('<')) {
    return `Сервер вернул страницу ошибки (${response.status}), а не JSON — проверьте лог dotnet и что API слушает порт 5240.`;
  }
  if (trimmed.length > 0 && trimmed.length < 400) return trimmed;

  return `Запрос не выполнен (${response.status} ${response.statusText || ''}).`.trim();
}

const request = async (path, options = {}, query = {}) => {
  const token = getAuthToken();
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...options,
      headers,
    });
  } catch (e) {
    const msg =
      e?.name === 'TypeError' && String(e?.message || '').includes('fetch')
        ? 'Нет связи с API. Запустите сервер: dotnet run в папке server (порт 5240) и оставьте Vite-прокси на /api.'
        : e?.message || 'Сетевая ошибка';
    throw new Error(msg);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new Error(parseErrorMessage(response, text, payload));
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

  createCourse: async (dto) =>
    request('/courses', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  deleteCourse: async (courseId) =>
    request(`/courses/${courseId}`, { method: 'DELETE' }),

  updateCourse: async (courseId, dto) =>
    request(`/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    }),
};

const assertNumericCourseId = (courseId, action) => {
  const n = Number(courseId);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Некорректный id курса для ${action}. Обновите страницу и выберите курс снова.`);
  }
  return n;
};

export const lessonsAPI = {
  list: async (courseId) => {
    const id = assertNumericCourseId(courseId, 'списка уроков');
    return request(`/courses/${id}/lessons`);
  },

  create: async (courseId, body) => {
    const id = assertNumericCourseId(courseId, 'создания урока');
    return request(`/courses/${id}/lessons`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  update: async (courseId, lessonId, body) => {
    const cid = assertNumericCourseId(courseId, 'обновления урока');
    return request(`/courses/${cid}/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete: async (courseId, lessonId) => {
    const cid = assertNumericCourseId(courseId, 'удаления урока');
    return request(`/courses/${cid}/lessons/${lessonId}`, { method: 'DELETE' });
  },
};

export const authAPI = {
  login: async (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: async (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
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

  getCourseCurriculum: async (courseId) =>
    request(`/learning/course/${courseId}/curriculum`),

  completeLesson: async (lessonId) =>
    request(`/learning/lessons/${lessonId}/complete`, { method: 'POST' }),
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

export const resourcesAPI = {
  documents: {
    list: async () => request('/resources/documents'),
    create: async (body) =>
      request('/resources/documents', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: async (id, body) =>
      request(`/resources/documents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: async (id) => request(`/resources/documents/${id}`, { method: 'DELETE' }),
  },
  scenarios: {
    list: async () => request('/resources/scenarios'),
    create: async (body) =>
      request('/resources/scenarios', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: async (id, body) =>
      request(`/resources/scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: async (id) => request(`/resources/scenarios/${id}`, { method: 'DELETE' }),
  },
  materials: {
    list: async () => request('/resources/materials'),
    create: async (body) =>
      request('/resources/materials', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: async (id, body) =>
      request(`/resources/materials/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    remove: async (id) => request(`/resources/materials/${id}`, { method: 'DELETE' }),
  },
};

export const olympiadsAPI = {
  list: async () => request('/olympiads'),

  get: async (id) => request(`/olympiads/${id}`),

  create: async (body) =>
    request('/olympiads', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: async (id, body) =>
    request(`/olympiads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  remove: async (id) => request(`/olympiads/${id}`, { method: 'DELETE' }),

  listQuestions: async (id) => request(`/olympiads/${id}/questions`),

  createQuestion: async (id, body) =>
    request(`/olympiads/${id}/questions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateQuestion: async (id, questionId, body) =>
    request(`/olympiads/${id}/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteQuestion: async (id, questionId) =>
    request(`/olympiads/${id}/questions/${questionId}`, { method: 'DELETE' }),

  submit: async (id, answers) =>
    request(`/olympiads/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
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

  uploadCourseFiles: async (courseId, files, options = {}) => {
    const formData = new FormData();
    if (options.lessonId != null) {
      formData.append('lessonId', String(options.lessonId));
    }
    files.forEach((file) => formData.append('files', file));
    return request(`/courses/${courseId}/files`, { method: 'POST', body: formData });
  },
};

