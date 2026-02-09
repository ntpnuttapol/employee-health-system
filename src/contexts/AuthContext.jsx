import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

// Session storage key
const SESSION_KEY = 'health_system_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session in localStorage
    const checkSession = () => {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const userData = JSON.parse(savedSession);
          setUser(userData);
          console.log('Session restored for:', userData.username);
        }
      } catch (err) {
        console.error('Error restoring session:', err);
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (username, password) => {
    console.log('Login attempt:', username);
    
    try {
      // Query users table
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, email, role, employee_id, is_active')
        .eq('username', username)
        .eq('password', password)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Login query error:', error);
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      if (!data) {
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      console.log('Login successful:', data.username);
      
      // Save to localStorage
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setUser(data);
      
      return data;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    console.log('User logged out');
  };

  const isAdmin = () => user?.role === 'Admin';
  const isAuthenticated = () => !!user;

  // Update user data (for profile updates)
  const updateUserSession = (newData) => {
    const updatedUser = { ...user, ...newData };
    setUser(updatedUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAdmin, 
      isAuthenticated, 
      loading,
      updateUserSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
