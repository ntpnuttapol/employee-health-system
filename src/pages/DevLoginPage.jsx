import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function DevLoginPage() {
  const navigate = useNavigate();
  const { user, loginAsDevUser, logout } = useAuth();
  const [devUsers, setDevUsers] = useState([]);
  const [devUserId, setDevUserId] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isLocalDev =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost';

  useEffect(() => {
    if (!isLocalDev) return;

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      setError('');

      const { data, error: usersError } = await supabase
        .from('users')
        .select('id, username, full_name, role, employees(first_name, last_name, departments(name))')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (usersError) {
        setError(usersError.message || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
        setDevUsers([]);
      } else {
        setDevUsers(data || []);
        if ((data || []).length > 0) {
          setDevUserId(String(data[0].id));
        }
      }

      setIsLoadingUsers(false);
    };

    fetchUsers();
  }, [isLocalDev]);

  const currentUserLabel = useMemo(() => {
    if (!user) return '';
    return user.full_name || user.username || 'ผู้ใช้งานปัจจุบัน';
  }, [user]);

  const handleDevLogin = async () => {
    if (!devUserId) return;

    setIsSubmitting(true);
    setError('');

    try {
      await loginAsDevUser(devUserId);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Dev login error:', err);
      setError(err.message || 'เข้าสู่ระบบโหมดทดสอบไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLocalDev) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background:
          'linear-gradient(135deg, #eff6ff 0%, #f8fafc 40%, #eef2ff 100%)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(255,255,255,0.96)',
          border: '1px solid rgba(191,219,254,0.9)',
          borderRadius: '28px',
          boxShadow: '0 24px 60px rgba(15,23,42,0.12)',
          padding: '2rem'
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '0.45rem 0.9rem',
              borderRadius: '999px',
              background: '#dbeafe',
              color: '#1d4ed8',
              fontWeight: 700,
              fontSize: '0.82rem',
              marginBottom: '1rem'
            }}
          >
            DEV LOGIN
          </div>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.1, marginBottom: '0.5rem', color: '#0f172a' }}>
            เลือก user เพื่อทดสอบหน้า HR Employee
          </h1>
          <p style={{ color: '#475569', lineHeight: 1.6 }}>
            หน้านี้ใช้ได้เฉพาะ `localhost` สำหรับดูภาพรวมก่อน commit โดยไม่ต้องผ่าน SSO
          </p>
        </div>

        {user && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: '18px',
              background: '#ecfeff',
              border: '1px solid #a5f3fc',
              color: '#0f766e'
            }}
          >
            กำลังถือ session ของ <strong>{currentUserLabel}</strong>
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.9rem 1rem',
              borderRadius: '18px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c'
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
              User สำหรับทดสอบ
            </label>
            <select
              className="form-select"
              value={devUserId}
              onChange={(e) => setDevUserId(e.target.value)}
              disabled={isLoadingUsers || isSubmitting || devUsers.length === 0}
              style={{ width: '100%', background: '#fff' }}
            >
              {devUsers.length === 0 ? (
                <option value="">{isLoadingUsers ? 'กำลังโหลดผู้ใช้...' : 'ไม่พบผู้ใช้งานสำหรับทดสอบ'}</option>
              ) : (
                devUsers.map((devUser) => {
                  const displayName = devUser.full_name
                    || (devUser.employees ? `${devUser.employees.first_name} ${devUser.employees.last_name}` : '')
                    || devUser.username;
                  const departmentName = devUser.employees?.departments?.name || 'ไม่ระบุแผนก';

                  return (
                    <option key={devUser.id} value={devUser.id}>
                      {displayName} ({devUser.role} • {departmentName})
                    </option>
                  );
                })
              )}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDevLogin}
              disabled={!devUserId || isLoadingUsers || isSubmitting}
            >
              {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบโหมดทดสอบ'}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/dashboard')}
              disabled={!user}
            >
              ไปที่ Dashboard
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={logout}
              disabled={!user}
            >
              ล้าง session ปัจจุบัน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
