import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar({ onLinkClick }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

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

        {/* 5S Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">ตรวจ 5ส</div>
          <NavLink to="/five-s" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">🏆</span>
            ตรวจประเมิน 5ส
          </NavLink>
          {isAdmin() && (
            <NavLink to="/five-s-results" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">📊</span>
              ผลคะแนน &amp; อันดับ
            </NavLink>
          )}
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
    </>
  );
}

