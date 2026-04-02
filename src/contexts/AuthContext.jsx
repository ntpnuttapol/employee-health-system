import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

// Session storage key
const SESSION_KEY = 'health_system_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistSession = (userData) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    setUser(userData);
  };

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
      // Query users table, joining employees and departments
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, email, role, employee_id, is_active, employees(id, first_name, last_name, department_id, departments(id, name))')
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

      persistSession(data);

      return data;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  // NEW: SSO Login from Hub
  const loginWithSSO = async ({ hubUserId, hubMetadata }) => {
    console.log('SSO login attempt from Hub:', hubUserId);

    try {
      // หา user ที่มี hub_user_id ตรงกัน
      const { data: existingUser, error: lookupError } = await supabase
        .from('users')
        .select('id, username, full_name, email, role, employee_id, is_active, hub_user_id, employees(id, first_name, last_name, department_id, departments(id, name))')
        .eq('hub_user_id', hubUserId)
        .eq('is_active', true)
        .single();

      // ถ้าเจอ user ให้ login
      if (existingUser) {
        console.log('SSO login successful:', existingUser.username);

        persistSession(existingUser);
        return existingUser;
      }

      // ถ้าไม่เจอ user ให้แจ้ง error - admin ต้อง link account ด้วยตนเอง
      throw new Error('ไม่พบผู้ใช้งานในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อเชื่อมบัญชี');

    } catch (err) {
      console.error('SSO login error:', err);
      throw err;
    }
  };

  const loginAsDevUser = async (userId) => {
    const isLocalDev =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost';

    if (!isLocalDev) {
      throw new Error('Dev preview login ใช้งานได้เฉพาะ localhost เท่านั้น');
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, username, full_name, email, role, employee_id, is_active, hub_user_id, employees(id, first_name, last_name, department_id, departments(id, name))')
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('ไม่พบผู้ใช้งานสำหรับโหมดทดสอบ');
    }

    console.log('Dev preview login:', data.username);
    persistSession(data);
    return data;
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
      loginWithSSO,
      loginAsDevUser,
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
