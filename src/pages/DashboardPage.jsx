import { useState, useEffect } from 'react';
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">แดชบอร์ด</h1>
        <p className="page-subtitle">
          ยินดีต้อนรับ, {user?.full_name || user?.username || 'ผู้ใช้งาน'} ({user?.role || 'User'})
        </p>
      </div>

      {isLoading && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          กำลังโหลดข้อมูล...
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        {isAdmin() && (
          <>
            <div className="stat-card">
              <div className="stat-icon primary">👥</div>
              <div className="stat-content">
                <div className="stat-value">{stats.employees}</div>
                <div className="stat-label">พนักงานทั้งหมด</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon secondary">🏛️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.departments}</div>
                <div className="stat-label">แผนก</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon accent">🏢</div>
              <div className="stat-content">
                <div className="stat-value">{stats.branches}</div>
                <div className="stat-label">สาขา</div>
              </div>
            </div>
          </>
        )}

        <div className="stat-card">
          <div className="stat-icon warm">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats.activities}</div>
            <div className="stat-label">กิจกรรมทั้งหมด</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary">💉</div>
          <div className="stat-content">
            <div className="stat-value">{stats.healthRecords}</div>
            <div className="stat-label">บันทึกสุขภาพ</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon accent">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.todayAttendance}</div>
            <div className="stat-label">เช็คอินวันนี้</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon secondary">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalAttendance}</div>
            <div className="stat-label">เช็คอินทั้งหมด</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">การดำเนินการด่วน</h2>
        </div>
        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
          <a href="/activity-scan" className="btn btn-primary btn-lg">
            📱 สแกนเข้าร่วมกิจกรรม
          </a>
          <a href="/health-entry" className="btn btn-accent btn-lg">
            💉 บันทึกข้อมูลสุขภาพ
          </a>
          {isAdmin() && (
            <a href="/employees" className="btn btn-secondary btn-lg">
              👥 จัดการพนักงาน
            </a>
          )}
        </div>
      </div>

      {/* Recent Activities from Supabase */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">กิจกรรมล่าสุด</h2>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
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
