import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useActivity } from '../../contexts/ActivityContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';

export default function HeaderBar({ onMenuToggle, isMenuOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activities = [] } = useActivity() || {};
  const { employees = [] } = useMasterData() || {};
  const { user, logout, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Safety check for arrays
  const actList = Array.isArray(activities) ? activities : [];
  const empList = Array.isArray(employees) ? employees : [];

  // Get upcoming activities (next 7 days)
  const upcomingActivities = actList.filter(a => {
    if (!a) return false;
    const actDate = new Date(a.date || a.activity_date);
    if (isNaN(actDate.getTime())) return false;
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    today.setHours(0, 0, 0, 0);
    actDate.setHours(0, 0, 0, 0);
    return actDate >= today && actDate <= nextWeek;
  }).sort((a, b) => new Date(a.date || a.activity_date) - new Date(b.date || b.activity_date));

  // Search results
  const searchResults = searchQuery.length >= 2 ? {
    employees: empList.filter(e =>
      e && (`${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 5),
    activities: actList.filter(a =>
      a && ((a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.location || '').toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 5)
  } : { employees: [], activities: [] };

  const hasResults = searchResults.employees.length > 0 || searchResults.activities.length > 0;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date();
    const date = new Date(dateStr);
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'วันนี้';
    if (diff === 1) return 'พรุ่งนี้';
    return `อีก ${diff} วัน`;
  };

  const routeMeta = {
    '/dashboard': { title: 'ภาพรวมระบบ', subtitle: 'ติดตามกิจกรรม สุขภาพ และการเข้าร่วมของพนักงานแบบเรียลไทม์' },
    '/users': { title: 'ผู้ใช้งานระบบ', subtitle: 'จัดการสิทธิ์และข้อมูลผู้เข้าใช้งานในระบบ HR Employee' },
    '/branches': { title: 'ข้อมูลสาขา', subtitle: 'ดูแลโครงสร้างสาขาให้พร้อมใช้งานสำหรับทุกฝ่าย' },
    '/departments': { title: 'ข้อมูลแผนก', subtitle: 'บริหารโครงสร้างหน่วยงานและการเชื่อมโยงข้อมูลพนักงาน' },
    '/positions': { title: 'ข้อมูลตำแหน่ง', subtitle: 'กำหนดตำแหน่งงานและการอ้างอิงในระบบกลาง' },
    '/employees': { title: 'จัดการพนักงาน', subtitle: 'ค้นหา อัปเดต และติดตามสถานะพนักงานได้อย่างรวดเร็ว' },
    '/activities': { title: 'กิจกรรมพนักงาน', subtitle: 'จัดการกิจกรรม ดูผู้เข้าร่วม และติดตามกำหนดการสำคัญ' },
    '/activity-scan': { title: 'สแกนเข้าร่วมกิจกรรม', subtitle: 'เช็กอินหน้างานได้ไวผ่าน QR และลดขั้นตอนงานเอกสาร' },
    '/health-dashboard': { title: 'แดชบอร์ดสุขภาพ', subtitle: 'สรุปแนวโน้มสุขภาพพนักงานในมุมมองเดียว' },
    '/health-entry': { title: 'บันทึกข้อมูลสุขภาพ', subtitle: 'กรอกข้อมูลสุขภาพได้ง่ายและพร้อมตรวจสอบย้อนหลัง' },
    '/health-records': { title: 'ประวัติสุขภาพ', subtitle: 'เรียกดูข้อมูลย้อนหลังและค้นหารายการสำคัญได้สะดวก' },
    '/five-s': { title: 'ตรวจประเมิน 5ส', subtitle: 'บันทึกผลตรวจ 5ส พร้อมติดตามคะแนนแต่ละพื้นที่' },
    '/five-s-vote': { title: 'โหวตคะแนน 5ส', subtitle: 'ให้คะแนนพื้นที่เด่นและกระตุ้นการมีส่วนร่วมของทีม' },
    '/five-s-results': {
      title: 'ผลคะแนน 5ส',
      subtitle: isAdmin()
        ? 'สรุปคะแนน อันดับ และภาพรวมผลการประเมินล่าสุด'
        : 'ดูคะแนน 5ส ที่คุณบันทึกไว้ แยกตามแผนกและวันที่ตรวจ'
    },
    '/profile': { title: 'โปรไฟล์ผู้ใช้งาน', subtitle: 'จัดการข้อมูลส่วนตัวและตรวจสอบสถานะบัญชีของคุณ' }
  };

  const currentRoute = Object.entries(routeMeta).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  )?.[1] || {
    title: 'HR Employee',
    subtitle: 'ระบบจัดการข้อมูลสุขภาพ กิจกรรม และการมีส่วนร่วมของพนักงาน'
  };

  return (
    <div className="header-bar">
      <div className="header-context">
        <div className="header-context-top-mobile">
          <button 
            type="button"
            className="mobile-side-toggle" 
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
          <span className="header-context-label">HR Employee Workspace</span>
        </div>
        <h2 className="header-context-title">{currentRoute.title}</h2>
        <p className="header-context-subtitle">{currentRoute.subtitle}</p>
      </div>

      {/* Global Search */}
      <div className="header-search" ref={searchRef}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="ค้นหาพนักงาน, กิจกรรม..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
          />
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchQuery.length >= 2 && (
          <div className="search-dropdown">
            {!hasResults ? (
              <div className="search-no-results">
                ไม่พบผลลัพธ์สำหรับ "{searchQuery}"
              </div>
            ) : (
              <>
                {searchResults.employees.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">👥 พนักงาน</div>
                    {searchResults.employees.map(emp => (
                      <div
                        key={emp.id}
                        className="search-result-item"
                        onClick={() => {
                          navigate('/employees');
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                      >
                        <span className="badge badge-info">{emp.employee_code}</span>
                        <span>{emp.first_name} {emp.last_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.activities.length > 0 && (
                  <div className="search-section">
                    <div className="search-section-title">📋 กิจกรรม</div>
                    {searchResults.activities.map(act => (
                      <div
                        key={act.id}
                        className="search-result-item"
                        onClick={() => {
                          navigate(`/activities/${act.id}`);
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                      >
                        <span>{act.name}</span>
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {formatDate(act.date || act.activity_date)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="header-meta">
        <div className="header-pill">
          <span className="header-pill-dot success"></span>
          <span>{upcomingActivities.length} กิจกรรมใกล้ถึง</span>
        </div>
        <div className="header-pill">
          <span className="header-pill-dot info"></span>
          <span>{empList.length} พนักงาน</span>
        </div>
      </div>

      {/* Notifications */}
      <div className="header-notifications" ref={notifRef}>
        <button
          className="notification-bell"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          🔔
          {upcomingActivities.length > 0 && (
            <span className="notification-badge">{upcomingActivities.length}</span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <h3>🔔 กิจกรรมที่กำลังจะมาถึง</h3>
            </div>

            {upcomingActivities.length === 0 ? (
              <div className="notifications-empty">
                ไม่มีกิจกรรมใน 7 วันข้างหน้า
              </div>
            ) : (
              <div className="notifications-list">
                {upcomingActivities.map(act => (
                  <div
                    key={act.id}
                    className="notification-item"
                    onClick={() => {
                      navigate(`/activities/${act.id}`);
                      setShowNotifications(false);
                    }}
                  >
                    <div className="notification-icon">📅</div>
                    <div className="notification-content">
                      <div className="notification-title">{act.name}</div>
                      <div className="notification-meta">
                        <span>{formatDate(act.date || act.activity_date)}</span>
                        <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>
                          {getDaysUntil(act.date || act.activity_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="notifications-footer">
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  navigate('/activities');
                  setShowNotifications(false);
                }}
              >
                ดูทั้งหมด
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="header-profile" ref={profileRef} onClick={() => setShowProfileMenu(!showProfileMenu)}>
        <div className="header-profile-avatar">
          {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
        </div>
        <div className="header-user-info-desktop">
          <span className="header-profile-name">{user?.full_name || user?.username || 'ผู้ใช้งาน'}</span>
          <span className="header-profile-role">{user?.role === 'Admin' ? '👑 Admin' : '👤 User'}</span>
        </div>
        <span className="header-profile-caret">{showProfileMenu ? '▴' : '▾'}</span>

        {showProfileMenu && (
          <div className="header-profile-menu" onClick={(e) => e.stopPropagation()}>
            <div
              className="header-profile-menu-item"
              onClick={() => { setShowProfileMenu(false); window.location.href = (import.meta.env.VITE_HUB_URL || 'https://polyfoampfs-hub.vercel.app') + '/dashboard'; }}
            >
              🏠 <span>กลับไป Portal Hub</span>
            </div>
            <div
              className="header-profile-menu-item"
              onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
            >
              ⚙️ <span>โปรไฟล์</span>
            </div>
            <div
              className="header-profile-menu-item danger"
              onClick={() => { setShowProfileMenu(false); logout(); navigate('/login'); }}
            >
              🚪 <span>ออกจากระบบ</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
