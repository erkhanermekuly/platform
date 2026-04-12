import { createContext, useReducer, useCallback, createElement, useEffect } from 'react';
import { coursesAPI, learningAPI } from '../api/courseService';
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
    case 'ADD_COURSE':
      return {
        ...state,
        courses: [
          ...state.courses,
          {
            ...action.payload,
            id: Math.max(0, ...state.courses.map((c) => c.id), 0) + 1,
          },
        ],
      };

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
        const response = await coursesAPI.getAllCourses();
        if (cancelled) return;
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
      } catch (e) {
        if (!cancelled) {
          dispatch({ type: 'SET_COURSES_ERROR', payload: e.message || 'Ошибка сети' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canLoadCourses]);

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

  const addCourse = useCallback((courseData) => {
    dispatch({ type: 'ADD_COURSE', payload: courseData });
  }, []);

  const buyCourse = useCallback((courseId) => {
    dispatch({ type: 'BUY_COURSE', payload: courseId });
  }, []);

  const deleteCourse = useCallback((courseId) => {
    dispatch({ type: 'DELETE_COURSE', payload: courseId });
  }, []);

  const value = {
    courses: state.courses,
    purchasedCourses: state.purchasedCourses,
    coursesLoading: state.coursesLoading,
    coursesError: state.coursesError,
    addCourse,
    buyCourse,
    deleteCourse,
    dispatch,
  };

  return createElement(AppContext.Provider, { value }, children);
};
