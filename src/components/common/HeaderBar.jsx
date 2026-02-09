import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivity } from '../../contexts/ActivityContext';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function HeaderBar() {
  const navigate = useNavigate();
  const { activities = [] } = useActivity() || {};
  const { employees = [] } = useMasterData() || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

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

  return (
    <div className="header-bar">
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
    </div>
  );
}
