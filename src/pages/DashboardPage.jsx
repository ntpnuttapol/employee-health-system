import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { useActivity } from '../contexts/ActivityContext';
import { useHealth } from '../contexts/HealthContext';
import { supabase } from '../lib/supabaseClient';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { employees, departments, branches, loading: masterLoading } = useMasterData();
  const { activities, loading: activityLoading } = useActivity();
  const { healthRecords, loading: healthLoading } = useHealth();
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [totalAttendance, setTotalAttendance] = useState(0);

  const isLoading = masterLoading || activityLoading || healthLoading;

  // Fetch attendance statistics
  useEffect(() => {
    async function fetchAttendanceStats() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount, error: todayError } = await supabase
          .from('activity_attendance')
          .select('*', { count: 'exact', head: true })
          .gte('check_in_time', today + 'T00:00:00')
          .lt('check_in_time', today + 'T23:59:59');
        if (!todayError) setTodayAttendance(todayCount || 0);

        const { count: totalCount, error: totalError } = await supabase
          .from('activity_attendance')
          .select('*', { count: 'exact', head: true });
        if (!totalError) setTotalAttendance(totalCount || 0);
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
      }
    }
    fetchAttendanceStats();
  }, []);

  const stats = {
    employees: employees.length,
    departments: departments.length,
    branches: branches.length,
    activities: activities.length,
    healthRecords: healthRecords.length,
    todayAttendance,
    totalAttendance,
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const adminMode = isAdmin();
  const upcomingActivities = [...activities]
    .filter((a) => {
      const d = a.date || a.activity_date;
      if (!d) return false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return new Date(d) >= today;
    })
    .sort((a, b) => new Date(a.date || a.activity_date) - new Date(b.date || b.activity_date))
    .slice(0, 4);

  // ── Status cards (Main Status grid) ─────────────────────────────────────
  const statusCards = [
    {
      key: 'healthRecords',
      num: stats.healthRecords,
      label: 'บันทึกสุขภาพ',
      iconClass: 'icon-teal',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      chart: (
        <svg className="db-mini-chart" viewBox="0 0 180 50" fill="none">
          <defs>
            <linearGradient id="g-teal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3b0" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#22d3b0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="0,38 20,30 40,35 60,18 80,22 100,10 120,15 140,8 160,12 180,5 180,50 0,50" fill="url(#g-teal)" />
          <polyline points="0,38 20,30 40,35 60,18 80,22 100,10 120,15 140,8 160,12 180,5" stroke="#22d3b0" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      key: 'todayAttendance',
      num: stats.todayAttendance,
      label: 'เช็คอินวันนี้',
      iconClass: 'icon-green',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 2v4M15 2v4" />
        </svg>
      ),
      chart: (
        <svg className="db-mini-chart" viewBox="0 0 180 50" fill="none">
          <line x1="0" y1="42" x2="180" y2="42" stroke="#c8d8f0" strokeWidth="2" />
        </svg>
      ),
    },
    {
      key: 'totalAttendance',
      num: stats.totalAttendance,
      label: 'เช็คอินทั้งหมด',
      iconClass: 'icon-blue',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      chart: (
        <svg className="db-mini-chart" viewBox="0 0 180 50" fill="none">
          <rect x="10" y="30" width="18" height="20" rx="3" fill="#c7d8ff" />
          <rect x="38" y="20" width="18" height="30" rx="3" fill="#a5beff" />
          <rect x="66" y="35" width="18" height="15" rx="3" fill="#c7d8ff" />
          <rect x="94" y="15" width="18" height="35" rx="3" fill="#4a7cff" />
          <rect x="122" y="25" width="18" height="25" rx="3" fill="#c7d8ff" />
          <rect x="150" y="10" width="18" height="40" rx="3" fill="#7aa0ff" />
        </svg>
      ),
    },
    ...(adminMode ? [
      {
        key: 'employees',
        num: stats.employees,
        label: 'พนักงานทั้งหมด',
        iconClass: 'icon-purple',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
        chart: (
          <svg className="db-mini-chart" viewBox="0 0 180 50" fill="none">
            <defs>
              <linearGradient id="g-purple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points="0,40 40,38 80,36 100,34 140,30 180,20 180,50 0,50" fill="url(#g-purple)" />
            <polyline points="0,40 40,38 80,36 100,34 140,30 180,20" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        key: 'departments',
        num: stats.departments,
        label: 'แผนก / สาขา',
        iconClass: 'icon-orange',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21V9l9-6 9 6v12" /><path d="M9 21V13h6v8" />
          </svg>
        ),
        chart: (
          <svg className="db-mini-chart" viewBox="0 0 180 50" fill="none">
            <defs>
              <linearGradient id="g-orange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points="0,40 30,35 60,38 90,25 120,30 150,18 180,22 180,50 0,50" fill="url(#g-orange)" />
            <polyline points="0,40 30,35 60,38 90,25 120,30 150,18 180,22" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" />
          </svg>
        ),
      },
    ] : []),
    {
      key: 'activities',
      num: stats.activities,
      label: 'กิจกรรมทั้งหมด',
      iconClass: 'icon-purple2',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
      chart: (
        <svg className="db-mini-chart" viewBox="0 0 180 50" fill="none">
          <rect x="10" y="25" width="18" height="25" rx="3" fill="#ddd6fe" />
          <rect x="38" y="35" width="18" height="15" rx="3" fill="#ddd6fe" />
          <rect x="66" y="18" width="18" height="32" rx="3" fill="#8b5cf6" />
          <rect x="94" y="30" width="18" height="20" rx="3" fill="#ddd6fe" />
          <rect x="122" y="22" width="18" height="28" rx="3" fill="#c4b5fd" />
          <rect x="150" y="28" width="18" height="22" rx="3" fill="#ddd6fe" />
        </svg>
      ),
    },
  ];

  // ── Quick Stats numbers (top-left card) ─────────────────────────────────
  const quickNums = [
    {
      value: stats.employees,
      label: 'พนักงานทั้งหมด',
      color: '#22d3b0',
      sparkPoints: '0,22 10,18 20,20 30,10 40,12 50,6 60,4',
    },
    {
      value: stats.departments,
      label: 'แผนก',
      color: '#4a7cff',
      sparkPoints: '0,20 10,16 20,18 30,14 40,16 50,12 60,10',
    },
    {
      value: stats.branches,
      label: 'สาขา',
      color: '#4a7cff',
      sparkPoints: '0,22 10,14 20,18 30,12 40,16 50,10 60,14',
    },
    {
      value: stats.activities,
      label: 'กิจกรรมทั้งหมด',
      color: '#a78bfa',
      sparkPoints: '0,20 10,22 20,18 30,20 40,15 50,18 60,14',
    },
  ];

  return (
    <div className="db-wrapper">

      {/* ── QUICK STATS ROW ─────────────────────────────────── */}
      <div className="db-section-title">Quick Stats</div>
      <div className="db-quick-stats-row">

        {/* Numbers Card */}
        <div className="db-glass-card">
          <div className="db-nums-grid">
            {quickNums.map((item) => (
              <div className="db-num-item" key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="db-num-value">{item.value}</div>
                    <div className="db-num-label">{item.label}</div>
                  </div>
                  <svg className="db-sparkline" viewBox="0 0 60 28" fill="none">
                    <polyline points={item.sparkPoints} stroke={item.color} strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Welcome Card */}
        <div className="db-welcome-card">
          <div>
            <div className="db-welcome-text">
              <h2>สวัสดี,<br />{user?.full_name || user?.username || 'ผู้ใช้งาน'}</h2>
              <p className="db-welcome-role">{adminMode ? 'ผู้ดูแลระบบ' : 'พนักงาน'}</p>
            </div>
            <div className="db-welcome-btns">
              <Link to="/activity-scan" className="db-btn-blue">แสกนเข้าร่วมกิจกรรม</Link>
              <Link to="/health-entry" className="db-btn-teal">บันทึกข้อมูลสุขภาพ</Link>
            </div>
          </div>
          {/* SVG Illustration */}
          <svg width="110" height="90" viewBox="0 0 110 90" fill="none" className="db-welcome-illus">
            <rect x="10" y="65" width="90" height="6" rx="3" fill="#c7d8f8" />
            <rect x="30" y="38" width="36" height="26" rx="4" fill="#7baaf7" />
            <rect x="33" y="41" width="30" height="18" rx="2" fill="#b8d0ff" />
            <rect x="45" y="64" width="6" height="6" rx="1" fill="#7baaf7" />
            <rect x="40" y="70" width="16" height="3" rx="1" fill="#a0bef8" />
            <circle cx="72" cy="38" r="8" fill="#f4c2a1" />
            <rect x="64" y="46" width="16" height="20" rx="5" fill="#4a7cff" />
            <rect x="58" y="50" width="8" height="3" rx="1.5" fill="#f4c2a1" />
            <rect x="74" y="50" width="8" height="3" rx="1.5" fill="#f4c2a1" />
            <circle cx="30" cy="40" r="7" fill="#fdd0a8" />
            <rect x="23" y="47" width="14" height="18" rx="4" fill="#22d3b0" />
            <rect x="76" y="22" width="28" height="14" rx="6" fill="#e0eaff" />
            <polygon points="82,36 86,42 90,36" fill="#e0eaff" />
            <rect x="80" y="27" width="6" height="2" rx="1" fill="#7baaf7" />
            <rect x="80" y="31" width="10" height="2" rx="1" fill="#7baaf7" />
          </svg>
        </div>
      </div>

      {/* ── MAIN STATUS GRID ─────────────────────────────────── */}
      <div className="db-section-title" style={{ marginTop: '1.5rem' }}>Main Status</div>
      <div className="db-status-grid">
        {statusCards.map((card, i) => (
          <div className="db-status-card" key={card.key} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="db-status-card-header">
              <div>
                <div className="db-status-num">{card.num}</div>
                <div className="db-status-label">{card.label}</div>
              </div>
              <div className={`db-status-icon ${card.iconClass}`}>
                {card.icon}
              </div>
            </div>
            {card.chart}
          </div>
        ))}
      </div>

      {/* ── UPCOMING ACTIVITIES ──────────────────────────────── */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">กิจกรรมที่กำลังจะมาถึง</h2>
            <p className="card-subtitle">สิ่งที่ควรติดตามในลำดับถัดไป</p>
          </div>
          <Link to="/activities" className="btn btn-secondary btn-sm">ดูทั้งหมด</Link>
        </div>
        <div className="dashboard-upcoming-list">
          {upcomingActivities.length > 0 ? upcomingActivities.map((activity) => (
            <div className="dashboard-upcoming-item" key={activity.id}>
              <div className="dashboard-upcoming-date">{formatDate(activity.date || activity.activity_date)}</div>
              <div className="dashboard-upcoming-content">
                <div className="dashboard-upcoming-title">{activity.name}</div>
                <div className="dashboard-upcoming-meta">
                  {activity.location || 'ยังไม่ระบุสถานที่'} · {activity.startTime || activity.start_time || '-'} - {activity.endTime || activity.end_time || '-'}
                </div>
              </div>
              <Link to={`/activities/${activity.id}`} className="btn btn-secondary btn-sm">เปิด</Link>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">ยังไม่มีกิจกรรมที่กำลังจะมาถึง</div>
              <div className="empty-state-text">เมื่อมีกิจกรรมใหม่ ระบบจะแสดงไว้ที่นี่เพื่อให้ติดตามได้ง่ายขึ้น</div>
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT ACTIVITIES TABLE ──────────────────────────── */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">กิจกรรมล่าสุด</h2>
            <p className="card-subtitle">สรุปรายการกิจกรรมและจำนวนผู้เข้าร่วมล่าสุด</p>
          </div>
        </div>
        {isLoading && (
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>กำลังโหลดข้อมูล...</div>
        )}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ชื่อกิจกรรม</th>
                <th>วันที่</th>
                <th>เวลา</th>
                <th>สถานที่</th>
                <th>ผู้เข้าร่วม</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {activities.length > 0 ? activities.slice(0, 5).map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.name}</td>
                  <td>{formatDate(activity.date || activity.activity_date)}</td>
                  <td>{activity.startTime || activity.start_time || '-'} - {activity.endTime || activity.end_time || '-'}</td>
                  <td>{activity.location || '-'}</td>
                  <td><span className="badge badge-info">{activity.attendees || 0} คน</span></td>
                  <td>
                    <span className={`badge ${new Date(activity.date || activity.activity_date) >= new Date(new Date().setHours(0, 0, 0, 0)) ? 'badge-warning' : 'badge-success'}`}>
                      {new Date(activity.date || activity.activity_date) >= new Date(new Date().setHours(0, 0, 0, 0)) ? 'กำลังจะมาถึง' : 'เสร็จสิ้น'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    {activityLoading ? 'กำลังโหลด...' : 'ไม่พบข้อมูลกิจกรรม'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
