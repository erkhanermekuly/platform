import { useState, useEffect, useCallback } from 'react';

export const useApi = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFunction();
      if (response.success) {
        setData(response.data);
      } else {
        setError(response.message || 'Ошибка при загрузке данных');
      }
    } catch (err) {
      setError(err.message || 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourses = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const { coursesAPI } = await import('../api/courseService');
      const response = await coursesAPI.getAllCourses(filters);
      if (response.success) {
        setCourses(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
};
