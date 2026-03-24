import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Hub SSO Configuration
const HUB_VALIDATE_URL = 'https://your-hub-url.com/api/sso/validate'; // เปลี่ยนเป็น URL จริงของ Hub
const SYSTEM_ID = 'hr-employee'; // ต้องตรงกับ systemId ใน Hub

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingSSO, setIsProcessingSSO] = useState(false);
  const { login, loginWithSSO, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for SSO token from Hub on page load
  useEffect(() => {
    const ssoToken = searchParams.get('sso_token');
    
    if (ssoToken) {
      handleSSOLogin(ssoToken);
    }
  }, [searchParams]);

  // Auto-redirect when user becomes authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // SSO Login Handler
  const handleSSOLogin = async (token) => {
    setIsProcessingSSO(true);
    setError('');

    try {
      // Validate token with Hub
      const response = await fetch(HUB_VALIDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token,
          systemId: SYSTEM_ID 
        }),
      });

      if (!response.ok) {
        throw new Error('SSO token หมดอายุหรือไม่ถูกต้อง');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('ไม่สามารถยืนยันตัวตนจาก Hub ได้');
      }

      // Login with Hub user data
      await loginWithSSO({
        hubUserId: data.user.hubUserId,
        hubEmail: data.user.hubEmail,
        hubMetadata: data.user.hubUserMetadata,
      });

      // Navigation handled by useEffect
    } catch (err) {
      console.error('SSO error:', err);
      setError(err.message || 'เข้าสู่ระบบผ่าน Hub ล้มเหลว กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้งานและรหัสผ่าน');
      setIsProcessingSSO(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(username, password);
      // Navigation handled by useEffect
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      setIsLoading(false);
    }
  };

  // Show loading state while processing SSO
  if (isProcessingSSO) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <img src="/pfslogo.png" alt="Logo" className="login-logo-img" />
              <h1 className="login-title">กำลังเชื่อมต่อ...</h1>
              <p className="login-subtitle">กำลังเข้าสู่ระบบผ่าน PFS Portal Hub</p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '1rem', color: '#666' }}>กรุณารอสักครู่...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/pfslogo.png" alt="Logo" className="login-logo-img" />
          <h1 className="login-title">เข้าสู่ระบบ</h1>
          <p className="login-subtitle">ระบบจัดการข้อมูลสุขภาพและกิจกรรมพนักงาน</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* SSO Button - แสดงเมื่อไม่ได้เข้ามาจาก Hub */}
        {!searchParams.get('sso_token') && (
          <div style={{ marginBottom: '1.5rem' }}>
            <a 
              href="https://your-hub-url.com/login?redirect=https://pfs-system.vercel.app/login"
              className="btn btn-secondary btn-lg"
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '0.5rem',
                textDecoration: 'none'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              เข้าสู่ระบบผ่าน PFS Portal Hub
            </a>
            <div style={{ 
              textAlign: 'center', 
              margin: '1rem 0',
              color: '#999',
              fontSize: '0.875rem'
            }}>
              หรือ
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">ชื่อผู้ใช้งาน</label>
            <input
              type="text"
              className="form-input"
              placeholder="กรอกชื่อผู้ใช้งาน"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">รหัสผ่าน</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-lg" 
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 Employee Health System</p>
        </div>
      </div>
      </div>
    </div>
  );
}
