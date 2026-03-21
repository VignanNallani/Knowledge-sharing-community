import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner, ErrorState } from '../components/UIStates';

// Custom hook for safe API calls with loading and error states
export const useSafeApi = (apiCall, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      console.error('API Error:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const retry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, retry };
};

// HOC for components with API calls
export const withApiSafety = (Component, apiCall, dependencies = []) => {
  return function SafeComponent(props) {
    const { data, loading, error, retry } = useSafeApi(() => apiCall(props), dependencies);

    if (loading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <ErrorState
          message="Failed to load data"
          onRetry={retry}
          error={error}
        />
      );
    }

    if (!data) {
      return (
        <div className="flex items-center justify-center p-8">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }

    return <Component {...props} data={data} />;
  };
};

// Safe data access utilities
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    const result = path.split('.').reduce((current, key) => current?.[key], obj);
    return result !== undefined ? result : defaultValue;
  } catch {
    return defaultValue;
  }
};

export const safeMap = (array, renderFn, fallback = null) => {
  if (!Array.isArray(array)) {
    return fallback;
  }
  
  try {
    return array.map(renderFn);
  } catch (error) {
    console.error('SafeMap error:', error);
    return fallback;
  }
};

export const safeRender = (condition, component, fallback = null) => {
  try {
    return condition ? component : fallback;
  } catch (error) {
    console.error('SafeRender error:', error);
    return fallback;
  }
};
