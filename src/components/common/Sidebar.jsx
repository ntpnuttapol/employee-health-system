import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ onLinkClick }) {
  const { user, isAdmin } = useAuth();

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
            <span className="sidebar-link-text">แดชบอร์ด</span>
          </NavLink>
        </div>

        {/* Admin Section */}
        {isAdmin() && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">จัดการข้อมูลหลัก</div>
            <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">👤</span>
              <span className="sidebar-link-text">ผู้ใช้งาน</span>
            </NavLink>
            <NavLink to="/branches" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">🏢</span>
              <span className="sidebar-link-text">สาขา</span>
            </NavLink>
            <NavLink to="/departments" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">🏛️</span>
              <span className="sidebar-link-text">แผนก</span>
            </NavLink>
            <NavLink to="/positions" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">💼</span>
              <span className="sidebar-link-text">ตำแหน่ง</span>
            </NavLink>
            <NavLink to="/employees" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">👥</span>
              <span className="sidebar-link-text">พนักงาน</span>
            </NavLink>
          </div>
        )}

        {/* Activity Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">กิจกรรม</div>
          <NavLink to="/activities" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📋</span>
            <span className="sidebar-link-text">รายการกิจกรรม</span>
          </NavLink>
          <NavLink to="/activity-scan" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📱</span>
            <span className="sidebar-link-text">สแกนเข้าร่วม</span>
          </NavLink>
        </div>

        {/* 5S Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">ตรวจ 5ส</div>
          <NavLink to="/five-s" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">🏆</span>
            <span className="sidebar-link-text">ตรวจประเมิน 5ส</span>
          </NavLink>
          <NavLink to="/five-s-vote" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">🗳️</span>
            <span className="sidebar-link-text">โหวตคะแนน 5ส</span>
          </NavLink>
          {isAdmin() && (
            <NavLink to="/five-s-results" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">📊</span>
              <span className="sidebar-link-text">ผลคะแนน &amp; อันดับ</span>
            </NavLink>
          )}
        </div>

        {/* Health Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">ข้อมูลสุขภาพ</div>
          <NavLink to="/health-dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📊</span>
            <span className="sidebar-link-text">แดชบอร์ดสุขภาพ</span>
          </NavLink>
          <NavLink to="/health-entry" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">💉</span>
            <span className="sidebar-link-text">บันทึกข้อมูลสุขภาพ</span>
          </NavLink>
          <NavLink to="/health-records" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📋</span>
            <span className="sidebar-link-text">ประวัติสุขภาพ</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name || user?.username || 'ผู้ใช้งาน'}</div>
            <div className="sidebar-user-role">
              {user?.employees?.departments?.name || (user?.role === 'Admin' ? 'Administrator' : 'User')}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

