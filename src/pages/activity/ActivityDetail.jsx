import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useActivity } from '../../contexts/ActivityContext';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activities } = useActivity();
  const [activity, setActivity] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityDetail();
  }, [id, activities]);

  const loadActivityDetail = async () => {
    setLoading(true);
    
    const foundActivity = activities.find(a => a.id === parseInt(id));
    if (foundActivity) {
      setActivity(foundActivity);
    }

    try {
      const { data, error } = await supabase
        .from('activity_attendance')
        .select(`
          id,
          check_in_time,
          check_in_method,
          employees (
            id,
            employee_code,
            first_name,
            last_name,
            departments (
              name
            )
          )
        `)
        .eq('activity_id', id)
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setAttendees(data || []);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    return new Date(dateTimeStr).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = attendees.map((a, index) => ({
      'ลำดับ': index + 1,
      'รหัสพนักงาน': a.employees?.employee_code || '-',
      'ชื่อ': a.employees?.first_name || '-',
      'นามสกุล': a.employees?.last_name || '-',
      'แผนก': a.employees?.departments?.name || '-',
      'เวลาเช็คอิน': formatDateTime(a.check_in_time),
      'วิธีการ': a.check_in_method === 'QR' ? 'QR Code' : 'Manual'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ผู้เข้าร่วม');
    
    // Auto-fit columns
    const colWidths = [
      { wch: 8 },  // ลำดับ
      { wch: 15 }, // รหัสพนักงาน
      { wch: 15 }, // ชื่อ
      { wch: 15 }, // นามสกุล
      { wch: 20 }, // แผนก
      { wch: 25 }, // เวลาเช็คอิน
      { wch: 12 }  // วิธีการ
    ];
    ws['!cols'] = colWidths;

    const fileName = `${activity?.name || 'activity'}_attendees_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export to PDF
  const exportToPDF = async () => {
    // Use landscape for wider table
    const doc = new jsPDF('landscape');
    
    // Load logo
    try {
      const logoImg = new Image();
      logoImg.src = '/pfslogo.png';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        setTimeout(resolve, 1000); // Fallback timeout
      });
      
      // Add logo if loaded
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        doc.addImage(logoImg, 'PNG', 14, 10, 30, 30);
      }
    } catch (e) {
      console.log('Logo not loaded');
    }
    
    doc.setFont('helvetica');
    
    // Title (shifted right for logo)
    doc.setFontSize(18);
    doc.setTextColor(58, 74, 82);
    doc.text(`Activity Report: ${activity?.name || 'Activity'}`, 50, 20);
    
    // Info section (shifted right for logo)
    doc.setFontSize(11);
    doc.setTextColor(95, 122, 133);
    
    const activityDate = activity?.date || activity?.activity_date;
    const dateStr = activityDate ? new Date(activityDate).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    }) : '-';
    
    doc.text(`Date: ${dateStr}`, 50, 28);
    doc.text(`Time: ${activity?.startTime || activity?.start_time || '-'} - ${activity?.endTime || activity?.end_time || '-'}`, 50, 35);
    doc.text(`Location: ${activity?.location || '-'}`, 150, 28);
    doc.text(`Total Attendees: ${attendees.length} persons`, 150, 35);
    
    // Generated timestamp
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const nowStr = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Generated: ${nowStr}`, 50, 42);

    // Table data with better date formatting
    const tableData = attendees.map((a, index) => {
      const checkInDate = a.check_in_time ? new Date(a.check_in_time).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }) : '-';
      
      return [
        index + 1,
        a.employees?.employee_code || '-',
        `${a.employees?.first_name || ''} ${a.employees?.last_name || ''}`.trim() || '-',
        a.employees?.departments?.name || '-',
        checkInDate,
        a.check_in_method === 'QR' ? 'QR Code' : 'Manual'
      ];
    });

    // AutoTable with better styling
    autoTable(doc, {
      startY: 50,
      head: [['No.', 'Employee Code', 'Full Name', 'Department', 'Check-in Time', 'Method']],
      body: tableData,
      styles: { 
        fontSize: 10,
        cellPadding: 4
      },
      headStyles: { 
        fillColor: [142, 200, 232],
        textColor: [58, 74, 82],
        fontStyle: 'bold'
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] 
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 50 },
        3: { cellWidth: 45 },
        4: { cellWidth: 50 },
        5: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: 14, right: 14 }
    });

    const fileName = `${activity?.name || 'activity'}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">กำลังโหลด...</h1>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">ไม่พบกิจกรรม</h1>
        </div>
        <div className="card">
          <p>ไม่พบกิจกรรมที่คุณต้องการ</p>
          <button className="btn btn-secondary" onClick={() => navigate('/activities')}>
            ← กลับไปหน้ารายการกิจกรรม
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📋 {activity.name}</h1>
        <p className="page-subtitle">รายละเอียดกิจกรรมและผู้เข้าร่วม</p>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/activities')}>
            ← กลับ
          </button>
        </div>
      </div>

      {/* Activity Information Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">ข้อมูลกิจกรรม</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              📅 วันที่จัด
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500' }}>
              {formatDate(activity.date || activity.activity_date)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              🕐 เวลา
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500' }}>
              {activity.startTime || activity.start_time || '-'} - {activity.endTime || activity.end_time || '-'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              📍 สถานที่
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500' }}>
              {activity.location || '-'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              👥 จำนวนผู้เข้าร่วม
            </div>
            <div style={{ fontSize: '1rem', fontWeight: '500' }}>
              <span className="badge badge-info" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                {attendees.length} คน
              </span>
            </div>
          </div>
        </div>

        {activity.description && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              📝 รายละเอียด
            </div>
            <div style={{ color: 'var(--color-text-secondary)' }}>
              {activity.description}
            </div>
          </div>
        )}
      </div>

      {/* Attendees List Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">รายชื่อผู้เข้าร่วม ({attendees.length} คน)</h2>
          {attendees.length > 0 && (
            <div className="flex gap-sm">
              <button className="btn btn-sm btn-accent" onClick={exportToExcel}>
                📊 Export Excel
              </button>
              <button className="btn btn-sm btn-primary" onClick={exportToPDF}>
                📄 Export PDF
              </button>
            </div>
          )}
        </div>

        {attendees.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>รหัสพนักงาน</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>แผนก</th>
                  <th>เวลาเช็คอิน</th>
                  <th>วิธีการ</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((attendee, index) => (
                  <tr key={attendee.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="badge badge-info">
                        {attendee.employees?.employee_code || '-'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      {attendee.employees?.first_name} {attendee.employees?.last_name}
                    </td>
                    <td>{attendee.employees?.departments?.name || '-'}</td>
                    <td>{formatDateTime(attendee.check_in_time)}</td>
                    <td>
                      <span className={`badge ${attendee.check_in_method === 'QR' ? 'badge-success' : 'badge-warning'}`}>
                        {attendee.check_in_method === 'QR' ? '📱 QR Code' : '✍️ Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">ยังไม่มีผู้เข้าร่วม</div>
            <div className="empty-state-text">เริ่มสแกนเพื่อบันทึกผู้เข้าร่วมกิจกรรม</div>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1rem' }}
              onClick={() => navigate('/activity-scan')}
            >
              📱 ไปหน้าสแกน
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
