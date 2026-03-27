import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Hub SSO Configuration
const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://pfs-portal-hub.vercel.app';
const HUB_VALIDATE_URL = `${HUB_URL}/api/sso/validate`;
const SYSTEM_ID = 'hr-employee';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingSSO, setIsProcessingSSO] = useState(false);
  const { login, loginWithSSO, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasSSOToken = Boolean(searchParams.get('sso_token'));

  // Define Hub Login URL with dynamic redirect
  const getHubLoginUrl = () => {
    const redirectUrl = encodeURIComponent(window.location.origin + '/login');
    return `${HUB_URL}/login?redirect=${redirectUrl}`;
  };

  // Check for SSO token from Hub on page load
  useEffect(() => {
    const ssoToken = searchParams.get('sso_token');
    
    if (ssoToken) {
      handleSSOLogin(ssoToken);
    }
  }, [searchParams]);

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
        hubMetadata: data.user.hubUserMetadata,
      });

      // Navigation handled by useEffect below
    } catch (err) {
      console.error('SSO error:', err);
      setError(err.message || 'เข้าสู่ระบบผ่าน Hub ล้มเหลว กรุณาเข้าสู่ระบบด้วยชื่อผู้ใช้งานและรหัสผ่าน');
      setIsProcessingSSO(false);
    }
  };

  // Auto-redirect when user becomes authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

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
        <div className="login-shell">
          <div className="login-showcase">
            <div className="login-showcase-card">
              <span className="login-badge">PFS Portal Hub</span>
              <h1 className="login-showcase-title">กำลังเชื่อมต่อบัญชีของคุณ</h1>
              <p className="login-showcase-text">ระบบกำลังยืนยันสิทธิ์จาก Hub และเตรียม workspace ของ HR Employee ให้พร้อมใช้งาน</p>
              <div className="login-feature-list compact">
                <div className="login-feature-item">
                  <span className="login-feature-icon">🔐</span>
                  <div>
                    <strong>ตรวจสอบสิทธิ์แบบรวมศูนย์</strong>
                    <p>ลดการเข้าสู่ระบบซ้ำหลายระบบ</p>
                  </div>
                </div>
                <div className="login-feature-item">
                  <span className="login-feature-icon">⚡</span>
                  <div>
                    <strong>กำลังโหลดข้อมูลส่วนตัว</strong>
                    <p>เตรียมสิทธิ์และเมนูที่เกี่ยวข้องกับคุณ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="login-container">
            <div className="login-card">
              <div className="login-header">
                <img src="/pfslogo.png" alt="Logo" className="login-logo-img" />
                <h1 className="login-title">กำลังเชื่อมต่อ...</h1>
                <p className="login-subtitle">กำลังเข้าสู่ระบบผ่าน PFS Portal Hub</p>
              </div>
              <div className="login-processing">
                <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                <p className="login-processing-text">กรุณารอสักครู่ ระบบจะพาคุณเข้าสู่หน้าหลักโดยอัตโนมัติ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-showcase">
          <div className="login-showcase-card">
            <span className="login-badge">Employee Wellness Platform</span>
            <h1 className="login-showcase-title">ดูแลข้อมูลสุขภาพและกิจกรรมพนักงานในที่เดียว</h1>
            <p className="login-showcase-text">จัดการพนักงาน เช็กอินกิจกรรม บันทึกข้อมูลสุขภาพ และติดตามผล 5ส ผ่านหน้าจอที่ใช้งานง่ายขึ้น</p>
            <div className="login-feature-list">
              <div className="login-feature-item">
                <span className="login-feature-icon">👥</span>
                <div>
                  <strong>ข้อมูลพนักงานครบถ้วน</strong>
                  <p>ค้นหา อัปเดต และติดตามสถานะได้เร็วขึ้น</p>
                </div>
              </div>
              <div className="login-feature-item">
                <span className="login-feature-icon">📅</span>
                <div>
                  <strong>กิจกรรมและการเข้าร่วม</strong>
                  <p>ดูตารางกิจกรรมและจำนวนผู้เข้าร่วมแบบทันที</p>
                </div>
              </div>
              <div className="login-feature-item">
                <span className="login-feature-icon">💚</span>
                <div>
                  <strong>ข้อมูลสุขภาพพร้อมใช้งาน</strong>
                  <p>บันทึกและเรียกดูประวัติย้อนหลังได้สะดวก</p>
                </div>
              </div>
            </div>
            <div className="login-highlights">
              <span className="login-highlight-pill">SSO พร้อมใช้งาน</span>
              <span className="login-highlight-pill">รองรับงาน HR ประจำวัน</span>
              <span className="login-highlight-pill">เชื่อมต่อ PFS Portal</span>
            </div>
          </div>
        </div>
        <div className="login-container">
          <div className="login-card">
            <div className="login-header">
              <img src="/pfslogo.png" alt="Logo" className="login-logo-img" />
              <span className="login-card-badge">HR Employee</span>
              <h1 className="login-title">เข้าสู่ระบบ</h1>
              <p className="login-subtitle">ระบบจัดการข้อมูลสุขภาพและกิจกรรมพนักงาน</p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
                ⚠️ {error}
              </div>
            )}

            {!hasSSOToken && (
              <div className="login-sso-section">
                <a 
                  href={getHubLoginUrl()}
                  className="btn btn-secondary btn-lg login-sso-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  เข้าสู่ระบบผ่าน PFS Portal Hub
                </a>
                <div className="login-divider">
                  <span>หรือเข้าสู่ระบบด้วยบัญชีภายใน</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
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
                className="btn btn-primary btn-lg login-submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <div className="login-footer">
              <p>© 2026 Employee Health System</p>
              <span>เชื่อมต่อผ่าน PFS Portal Hub ได้ตลอดเวลา</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
