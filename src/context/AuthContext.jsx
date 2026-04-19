import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { authAPI } from '../api/courseService';

const AuthContext = createContext();

// Ключ для хранения идентификатора запуска проекта.
// При каждом старте Vite (и сборке) в код инжектится новый __BUILD_ID__.
// Если сохранённый в localStorage ID не совпадает с текущим — значит проект
// был перезапущен, и пользователя нужно разлогинить.
const BUILD_ID_KEY = 'app_build_id';
const CURRENT_BUILD_ID =
  typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

function ensureFreshBuild() {
  try {
    const storedId = localStorage.getItem(BUILD_ID_KEY);
    if (storedId !== CURRENT_BUILD_ID) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem(BUILD_ID_KEY, CURRENT_BUILD_ID);
      return true;
    }
  } catch {
    // localStorage может быть недоступен — игнорируем
  }
  return false;
}

// Выполняем проверку как можно раньше, до инициализации состояния провайдера.
const BUILD_CHANGED = ensureFreshBuild();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (BUILD_CHANGED) return null;
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(() =>
    BUILD_CHANGED ? null : localStorage.getItem('token')
  );

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(email, password);
      if (response?.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      }
      const msg = response?.message || 'Вход не выполнен';
      setError(msg);
      throw new Error(msg);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.register(name, email, password);
      if (response?.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
      }
      const msg = response?.message || 'Регистрация не выполнена';
      setError(msg);
      throw new Error(msg);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const t = localStorage.getItem('token');
      if (t) {
        await authAPI.logout().catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    token,
    isAuthenticated: !!token,
    userRole: user?.role || null,
    login,
    register,
    logout,
    hasRole: useMemo(() => (role) => user?.role === role, [user])
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен быть использован внутри AuthProvider');
  }
  return context;
};
