import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') 
    || localStorage.getItem('token');
  console.log('API INTERCEPTOR - Token found:', !!token);
  console.log('API INTERCEPTOR - Token value:', token?.substring(0, 20));
  console.log('API INTERCEPTOR - Request URL:', config.url);
  console.log('API INTERCEPTOR - Current headers:', config.headers);
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('API INTERCEPTOR - Authorization set:', config.headers.Authorization);
  } else {
    console.log('API INTERCEPTOR - No token found in localStorage');
  }
  return config;
});

// Handle 401 - redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
