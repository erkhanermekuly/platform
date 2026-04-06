import { createContext, useReducer, useCallback, createElement } from 'react';

export const AppContext = createContext();

const initialState = {
  courses: [
    {
      id: 1,
      title: 'Основы дошкольного образования',
      description: 'Полный курс для учителей, начинающих работать в детском саду',
      instructor: 'Елена Петрова',
      category: 'beginner',
      isLocked: false,
      price: 0,
      image: 'https://images.unsplash.com/photo-1503672260482-696c7ebc5cb2?w=400',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      files: [
        { id: 1, name: 'Методические рекомендации.pdf', type: 'pdf' },
        { id: 2, name: 'Шаблон плана занятия.docx', type: 'docx' }
      ]
    },
    {
      id: 2,
      title: 'Развитие речи у дошкольников',
      description: 'Продвинутые техники работы с развитием речи',
      instructor: 'Максим Кулаков',
      category: 'advanced',
      isLocked: true,
      price: 2999,
      image: 'https://images.unsplash.com/photo-1516534775068-bb61e764cd12?w=400',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      files: [
        { id: 1, name: 'Упражнения для развития речи.docx', type: 'docx' }
      ]
    },
    {
      id: 3,
      title: 'Творческие занятия и арт-терапия',
      description: 'Интерактивные методы обучения через искусство',
      instructor: 'Ольга Иванова',
      category: 'intermediate',
      isLocked: true,
      price: 1999,
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      files: []
    }
  ],
  userRole: 'teacher', // 'teacher' или 'admin'
  purchasedCourses: [1], // IDs курсов, оплачено
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_COURSE':
      return {
        ...state,
        courses: [...state.courses, { ...action.payload, id: Math.max(...state.courses.map(c => c.id)) + 1 }]
      };
    
    case 'BUY_COURSE':
      return {
        ...state,
        purchasedCourses: [...state.purchasedCourses, action.payload],
        courses: state.courses.map(course =>
          course.id === action.payload ? { ...course, isLocked: false } : course
        )
      };
    
    case 'TOGGLE_ROLE':
      return {
        ...state,
        userRole: state.userRole === 'admin' ? 'teacher' : 'admin'
      };
    
    case 'DELETE_COURSE':
      return {
        ...state,
        courses: state.courses.filter(c => c.id !== action.payload)
      };
    
    default:
      return state;
  }
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addCourse = useCallback((courseData) => {
    dispatch({ type: 'ADD_COURSE', payload: courseData });
  }, []);

  const buyCourse = useCallback((courseId) => {
    dispatch({ type: 'BUY_COURSE', payload: courseId });
  }, []);

  const toggleRole = useCallback(() => {
    dispatch({ type: 'TOGGLE_ROLE' });
  }, []);

  const deleteCourse = useCallback((courseId) => {
    dispatch({ type: 'DELETE_COURSE', payload: courseId });
  }, []);

  const value = {
    courses: state.courses,
    userRole: state.userRole,
    purchasedCourses: state.purchasedCourses,
    addCourse,
    buyCourse,
    toggleRole,
    deleteCourse,
    dispatch
  };

  return createElement(AppContext.Provider, { value }, children);
};
