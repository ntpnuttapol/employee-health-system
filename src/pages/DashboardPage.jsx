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
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Count today's check-ins
        const { count: todayCount, error: todayError } = await supabase
          .from('activity_attendance')
          .select('*', { count: 'exact', head: true })
          .gte('check_in_time', today + 'T00:00:00')
          .lt('check_in_time', today + 'T23:59:59');
        
        if (!todayError) {
          setTodayAttendance(todayCount || 0);
        }

        // Count total check-ins
        const { count: totalCount, error: totalError } = await supabase
          .from('activity_attendance')
          .select('*', { count: 'exact', head: true });
        
        if (!totalError) {
          setTotalAttendance(totalCount || 0);
        }
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
      }
    }

    fetchAttendanceStats();
  }, []);

  // Calculate real statistics from context data
  const stats = {
    employees: employees.length,
    departments: departments.length,
    branches: branches.length,
    activities: activities.length,
    healthRecords: healthRecords.length,
    todayAttendance: todayAttendance,
    totalAttendance: totalAttendance
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const adminMode = isAdmin();
  const upcomingActivities = [...activities]
    .filter((activity) => {
      const activityDate = activity.date || activity.activity_date;
      if (!activityDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(activityDate) >= today;
    })
    .sort((a, b) => new Date(a.date || a.activity_date) - new Date(b.date || b.activity_date))
    .slice(0, 4);

  const statCards = [
    ...(adminMode ? [
      { key: 'employees', icon: '👥', value: stats.employees, label: 'พนักงานทั้งหมด', tone: 'primary' },
      { key: 'departments', icon: '🏛️', value: stats.departments, label: 'แผนก', tone: 'secondary' },
      { key: 'branches', icon: '🏢', value: stats.branches, label: 'สาขา', tone: 'accent' }
    ] : []),
    { key: 'activities', icon: '📋', value: stats.activities, label: 'กิจกรรมทั้งหมด', tone: 'warm' },
    { key: 'healthRecords', icon: '💉', value: stats.healthRecords, label: 'บันทึกสุขภาพ', tone: 'primary' },
    { key: 'todayAttendance', icon: '✅', value: stats.todayAttendance, label: 'เช็กอินวันนี้', tone: 'accent' },
    { key: 'totalAttendance', icon: '📊', value: stats.totalAttendance, label: 'เช็กอินทั้งหมด', tone: 'secondary' }
  ];

  const quickActions = [
    { to: '/activity-scan', title: 'สแกนเข้าร่วมกิจกรรม', text: 'เช็กอินหน้างานได้ไว ลดขั้นตอนการลงทะเบียน', icon: '📱', variant: 'primary' },
    { to: '/health-entry', title: 'บันทึกข้อมูลสุขภาพ', text: 'อัปเดตข้อมูลสุขภาพประจำวันหรือประจำกิจกรรม', icon: '💚', variant: 'accent' },
    { to: '/activities', title: 'จัดการกิจกรรม', text: 'ดูตารางกิจกรรมล่าสุดและติดตามการเข้าร่วม', icon: '📅', variant: 'secondary' },
    ...(adminMode ? [{ to: '/employees', title: 'จัดการพนักงาน', text: 'แก้ไขข้อมูลพนักงานและตรวจสอบสถานะได้ทันที', icon: '👥', variant: 'warm' }] : [])
  ];

  return (
    <div>
      <div className="dashboard-hero">
        <div className="dashboard-hero-main">
          <span className="dashboard-hero-badge">HR Employee Overview</span>
          <h1 className="dashboard-hero-title">สวัสดี, {user?.full_name || user?.username || 'ผู้ใช้งาน'}</h1>
          <p className="dashboard-hero-text">
            ติดตามข้อมูลพนักงาน กิจกรรม สุขภาพ และการเข้าร่วมได้จากมุมมองเดียว พร้อมทางลัดสำหรับงานที่ใช้ทุกวัน
          </p>
          <div className="dashboard-hero-actions">
            {quickActions.slice(0, 2).map((action) => (
              <Link key={action.to} to={action.to} className={`btn btn-lg ${action.variant === 'accent' ? 'btn-accent' : 'btn-primary'}`}>
                <span>{action.icon}</span>
                <span>{action.title}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="dashboard-hero-summary">
          <div className="dashboard-summary-item">
            <span className="dashboard-summary-label">บทบาทของคุณ</span>
            <strong className="dashboard-summary-value">{user?.role || 'User'}</strong>
          </div>
          <div className="dashboard-summary-item">
            <span className="dashboard-summary-label">กิจกรรมใกล้ถึง</span>
            <strong className="dashboard-summary-value">{upcomingActivities.length}</strong>
          </div>
          <div className="dashboard-summary-item">
            <span className="dashboard-summary-label">เช็กอินวันนี้</span>
            <strong className="dashboard-summary-value">{stats.todayAttendance}</strong>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          กำลังโหลดข้อมูล...
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((item) => (
          <div className="stat-card" key={item.key}>
            <div className={`stat-icon ${item.tone}`}>{item.icon}</div>
            <div className="stat-content">
              <div className="stat-value">{item.value}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">การดำเนินการด่วน</h2>
              <p className="card-subtitle">เข้าถึงงานที่ใช้บ่อยได้เร็วขึ้นจากหน้าเดียว</p>
            </div>
          </div>
          <div className="dashboard-action-grid">
            {quickActions.map((action) => (
              <Link key={action.to} to={action.to} className={`dashboard-action-card ${action.variant}`}>
                <span className="dashboard-action-icon">{action.icon}</span>
                <div>
                  <div className="dashboard-action-title">{action.title}</div>
                  <div className="dashboard-action-text">{action.text}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
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
                  <div className="dashboard-upcoming-meta">{activity.location || 'ยังไม่ระบุสถานที่'} · {activity.startTime || activity.start_time || '-'} - {activity.endTime || activity.end_time || '-'}</div>
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
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">กิจกรรมล่าสุด</h2>
            <p className="card-subtitle">สรุปรายการกิจกรรมและจำนวนผู้เข้าร่วมล่าสุด</p>
          </div>
        </div>
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
              {activities.length > 0 ? (
                activities.slice(0, 5).map((activity) => (
                  <tr key={activity.id}>
                    <td>{activity.name}</td>
                    <td>{formatDate(activity.date || activity.activity_date)}</td>
                    <td>{activity.startTime || activity.start_time || '-'} - {activity.endTime || activity.end_time || '-'}</td>
                    <td>{activity.location || '-'}</td>
                    <td>
                      <span className="badge badge-info">{activity.attendees || 0} คน</span>
                    </td>
                    <td>
                      <span className={`badge ${new Date(activity.date || activity.activity_date) >= new Date(new Date().setHours(0, 0, 0, 0)) ? 'badge-warning' : 'badge-success'}`}>
                        {new Date(activity.date || activity.activity_date) >= new Date(new Date().setHours(0, 0, 0, 0)) ? 'กำลังจะมาถึง' : 'เสร็จสิ้น'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
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
