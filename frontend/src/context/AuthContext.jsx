import { createContext, useContext, useState, 
         useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem('accessToken') || null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    if (!token) { 
      setLoading(false); 
      return; 
    }
    try {
      const res = await api.get('/users/me');
      // Backend returns: { success: true, message: "Profile fetched", data: user }
      setUser(res.data.data || res.data);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { 
        email, 
        password 
      });
      
      console.log('Full login response:', 
        JSON.stringify(res.data));
      
      // Handle all possible response structures
      const d = res.data;
      const payload = d.message || d.data || d;
      const token = payload.accessToken 
        || payload.token
        || d.accessToken
        || d.token;
      const user = payload.user || payload;

      console.log('Token found:', !!token);
      console.log('User found:', !!user);

      if (!token) {
        throw new Error('No token in response');
      }

      console.log('Setting user:', user);
      console.log('User ID:', user?.id);
      
      // Set token and user state IMMEDIATELY
      setToken(token);
      setUser(user);
      
      // Also store in localStorage
      localStorage.setItem('accessToken', token);
      localStorage.setItem('user', 
        JSON.stringify(user));
      
      return { token, user };
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const register = async (name, email, 
                          password, role) => {
    const res = await api.post('/auth/register', 
      { name, email, password, role });
    
    // Backend returns: 
    // { success: true, message: "User registered successfully", data: { accessToken, user } }
    const payload = res.data.data || res.data;
    const accessToken = payload.accessToken || payload.token;
    const user = payload.user;
    
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      setToken(accessToken);
      setUser(user);
    }
    
    return payload;
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, 
      login, register, logout,
      isAuthenticated: !!token 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
