// Token management utilities
export const getAuthToken = () => {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      // Fallback to sessionStorage for security
      return sessionStorage.getItem('accessToken');
    }
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    localStorage.setItem('accessToken', token);
    sessionStorage.setItem('accessToken', token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
};

export const removeAuthToken = () => {
  try {
    localStorage.removeItem('accessToken');
    sessionStorage.removeItem('accessToken');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};
