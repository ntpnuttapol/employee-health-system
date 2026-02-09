import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ onLinkClick }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (onLinkClick) onLinkClick();
  };

  return (
    <>
      <div className="sidebar-logo">
        <img src="/pfslogo.png" alt="Logo" className="sidebar-logo-img" />
        <h1>Polyfoam PFS</h1>
      </div>

      <nav className="sidebar-nav" onClick={handleLinkClick}>
        {/* Main Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">เมนูหลัก</div>
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📊</span>
            แดชบอร์ด
          </NavLink>
        </div>

        {/* Admin Section */}
        {isAdmin() && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">จัดการข้อมูลหลัก</div>
            <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">👤</span>
              ผู้ใช้งาน
            </NavLink>
            <NavLink to="/branches" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">🏢</span>
              สาขา
            </NavLink>
            <NavLink to="/departments" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">🏛️</span>
              แผนก
            </NavLink>
            <NavLink to="/positions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">💼</span>
              ตำแหน่ง
            </NavLink>
            <NavLink to="/employees" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">👥</span>
              พนักงาน
            </NavLink>
          </div>
        )}

        {/* Activity Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">กิจกรรม</div>
          <NavLink to="/activities" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📋</span>
            รายการกิจกรรม
          </NavLink>
          <NavLink to="/activity-scan" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📱</span>
            สแกนเข้าร่วม
          </NavLink>
        </div>

        {/* Health Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">ข้อมูลสุขภาพ</div>
          <NavLink to="/health-dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📊</span>
            แดชบอร์ดสุขภาพ
          </NavLink>
          <NavLink to="/health-entry" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">💉</span>
            บันทึกข้อมูลสุขภาพ
          </NavLink>
          <NavLink to="/health-records" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📋</span>
            ประวัติสุขภาพ
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name || user?.username || 'ผู้ใช้งาน'}</div>
            <div className="sidebar-user-role">{user?.role === 'Admin' ? '👑 Admin' : '👤 User'}</div>
          </div>
        </div>
        <NavLink 
          to="/profile" 
          className={({ isActive }) => `btn btn-secondary ${isActive ? 'active' : ''}`}
          style={{ width: '100%', marginTop: '0.5rem', textAlign: 'center', textDecoration: 'none' }}
        >
          ⚙️ โปรไฟล์
        </NavLink>
        <button
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '0.5rem' }}
          onClick={handleLogout}
        >
          🚪 ออกจากระบบ
        </button>
      </div>
    </>
  );
}

