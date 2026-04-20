import { createContext, useReducer, useCallback, createElement, useEffect } from 'react';
import { coursesAPI, learningAPI, filesAPI, paymentsAPI } from '../api/courseService';
import { useAuth } from './AuthContext';
import { hasCourseAccess } from '../auth/roles';

export const AppContext = createContext();

const initialState = {
  courses: [],
  purchasedCourses: [],
  coursesLoading: true,
  coursesError: null,
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_COURSES':
      return { ...state, courses: action.payload, coursesLoading: false, coursesError: null };
    case 'SET_COURSES_ERROR':
      return { ...state, coursesLoading: false, coursesError: action.payload };
    case 'SET_PURCHASED':
      return { ...state, purchasedCourses: action.payload };

    case 'BUY_COURSE':
      return {
        ...state,
        purchasedCourses: state.purchasedCourses.includes(action.payload)
          ? state.purchasedCourses
          : [...state.purchasedCourses, action.payload],
        courses: state.courses.map((course) =>
          course.id === action.payload ? { ...course, isLocked: false } : course
        ),
      };

    case 'DELETE_COURSE':
      return {
        ...state,
        courses: state.courses.filter((c) => c.id !== action.payload),
      };

    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const { isAuthenticated, userRole } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);
  const canLoadCourses = isAuthenticated && hasCourseAccess(userRole);

  const fetchCoursesFromApi = useCallback(async () => {
    const response = await coursesAPI.getAllCourses();
    if (response.success && Array.isArray(response.data)) {
      const courses = response.data.map((c) => ({
        ...c,
        files: c.files ?? [],
      }));
      dispatch({ type: 'SET_COURSES', payload: courses });
    } else {
      dispatch({
        type: 'SET_COURSES_ERROR',
        payload: response.message || 'Не удалось загрузить курсы',
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!canLoadCourses) {
      dispatch({ type: 'SET_COURSES', payload: [] });
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        await fetchCoursesFromApi();
      } catch (e) {
        if (!cancelled) {
          dispatch({ type: 'SET_COURSES_ERROR', payload: e.message || 'Ошибка сети' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoadCourses, fetchCoursesFromApi]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !hasCourseAccess(userRole)) {
      dispatch({ type: 'SET_PURCHASED', payload: [] });
      return undefined;
    }
    (async () => {
      try {
        const response = await learningAPI.getMyLearning();
        if (cancelled) return;
        if (response.success && Array.isArray(response.data)) {
          const ids = response.data.map((row) => row.courseId);
          dispatch({ type: 'SET_PURCHASED', payload: ids });
        }
      } catch {
        if (!cancelled) dispatch({ type: 'SET_PURCHASED', payload: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userRole]);

  const addCourse = useCallback(
    async (courseData) => {
      if (userRole !== 'admin') {
        throw new Error('Создавать курсы может только администратор');
      }
      const videoUrlStr = courseData.videoUrl?.trim?.() || '';
      const baseDto = {
        title: courseData.title,
        description: courseData.description,
        category: courseData.category,
        level: courseData.level,
        price: courseData.price ?? 0,
        isLocked: courseData.isLocked,
        instructor: courseData.instructor || undefined,
        videoUrl: videoUrlStr || undefined,
      };

      const created = await coursesAPI.createCourse(baseDto);
      const id = created?.data?.id;
      if (!id) {
        throw new Error('Сервер не вернул id курса');
      }

      let imageUrl;
      if (courseData.imageFile) {
        const up = await filesAPI.uploadCourseFiles(id, [courseData.imageFile]);
        const list = Array.isArray(up?.data) ? up.data : [];
        imageUrl = list[0]?.url;
      }

      if (imageUrl) {
        await coursesAPI.updateCourse(id, {
          ...baseDto,
          image: imageUrl,
        });
      }

      if (courseData.materialFiles?.length) {
        await filesAPI.uploadCourseFiles(id, courseData.materialFiles);
      }

      await fetchCoursesFromApi();
    },
    [fetchCoursesFromApi, userRole]
  );

  const syncPurchasedFromServer = useCallback(async () => {
    const response = await learningAPI.getMyLearning();
    if (response.success && Array.isArray(response.data)) {
      dispatch({ type: 'SET_PURCHASED', payload: response.data.map((row) => row.courseId) });
    }
  }, []);

  /** Платный курс: фиксирует оплату на сервере, создаёт доступ к урокам, обновляет список «Моё обучение». */
  const purchaseCourse = useCallback(
    async (courseId, amount) => {
      const id = Number(courseId);
      await paymentsAPI.processPayment(id, amount);
      dispatch({ type: 'BUY_COURSE', payload: id });
      await syncPurchasedFromServer();
    },
    [syncPurchasedFromServer]
  );

  /** Бесплатный курс: одна запись на сервере — сразу открывается 1-й урок (без отдельного шага «оплата»). */
  const enrollFreeCourse = useCallback(
    async (courseId) => {
      const id = Number(courseId);
      await learningAPI.enrollCourse(id);
      dispatch({ type: 'BUY_COURSE', payload: id });
      await syncPurchasedFromServer();
    },
    [syncPurchasedFromServer]
  );

  const deleteCourse = useCallback(
    async (courseId) => {
      if (userRole !== 'admin') {
        throw new Error('Удалять курсы может только администратор');
      }
      await coursesAPI.deleteCourse(courseId);
      dispatch({ type: 'DELETE_COURSE', payload: courseId });
    },
    [userRole]
  );

  const value = {
    courses: state.courses,
    purchasedCourses: state.purchasedCourses,
    coursesLoading: state.coursesLoading,
    coursesError: state.coursesError,
    addCourse,
    purchaseCourse,
    enrollFreeCourse,
    deleteCourse,
    refreshCourses: fetchCoursesFromApi,
    dispatch,
  };

  return createElement(AppContext.Provider, { value }, children);
};
