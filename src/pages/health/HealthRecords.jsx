import { useState } from 'react';
import { useHealth } from '../../contexts/HealthContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatDateTimeForPDF } from '../../utils/pdfUtils';

export default function HealthRecords() {
  const { healthRecords, loading } = useHealth();
  const { departments } = useMasterData();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const filteredRecords = healthRecords.filter(record => {
    const matchesSearch = 
      record.employees?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employees?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employees?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = departmentFilter ? record.employees?.departments?.name === departmentFilter : true;

    return matchesSearch && matchesDept;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (sys, dia) => {
    if (sys >= 140 || dia >= 90) return 'danger';
    if (sys >= 120 || dia >= 80) return 'warning';
    return 'success';
  };

  const calculateBMI = (weight, height) => {
    if (!weight || !height) return '-';
    return (weight / ((height/100) * (height/100))).toFixed(1);
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredRecords.map((record, index) => ({
      '#': index + 1,
      'วันที่': formatDate(record.recorded_at),
      'รหัสพนักงาน': record.employees?.employee_code || '-',
      'ชื่อ-นามสกุล': `${record.employees?.first_name || ''} ${record.employees?.last_name || ''}`,
      'แผนก': record.employees?.departments?.name || '-',
      'ความดัน Systolic': record.blood_pressure_systolic,
      'ความดัน Diastolic': record.blood_pressure_diastolic,
      'ชีพจร (bpm)': record.heart_rate || '-',
      'น้ำตาล (mg/dL)': record.blood_sugar || '-',
      'น้ำหนัก (kg)': record.weight || '-',
      'ส่วนสูง (cm)': record.height || '-',
      'BMI': calculateBMI(record.weight, record.height),
      'หมายเหตุ': record.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Health Records');
    
    const fileName = `health_records_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export to PDF using html2canvas for Thai support
  const exportToPDF = async () => {
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; background: white; padding: 20px; font-family: "Sarabun", "Noto Sans Thai", sans-serif; width: 1200px;';
    
    container.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <img src="/pfslogo.png" style="width: 60px; height: 60px; margin-right: 15px;" onerror="this.style.display='none'" />
        <div>
          <h1 style="margin: 0; color: #3a4a52; font-size: 22px;">รายงานประวัติสุขภาพพนักงาน</h1>
          <p style="margin: 5px 0; color: #666; font-size: 13px;">Health Records Report</p>
        </div>
      </div>
      <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 13px;">
        <span style="margin-right: 30px;"><strong>จำนวนทั้งหมด:</strong> ${filteredRecords.length} รายการ</span>
        ${departmentFilter ? `<span style="margin-right: 30px;"><strong>แผนก:</strong> ${departmentFilter}</span>` : ''}
        <span><strong>วันที่ออกรายงาน:</strong> ${new Date().toLocaleString('th-TH')}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: #8ec8e8; color: #333;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">#</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">รหัส</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ชื่อ-นามสกุล</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">แผนก</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">ความดัน</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">ชีพจร</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">น้ำตาล</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">BMI</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">วันที่</th>
          </tr>
        </thead>
        <tbody>
          ${filteredRecords.slice(0, 50).map((record, index) => `
            <tr style="background: ${index % 2 === 0 ? '#fff' : '#f5faff'};">
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${record.employees?.employee_code || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${record.employees?.first_name || ''} ${record.employees?.last_name || ''}</td>
              <td style="padding: 6px; border: 1px solid #ddd;">${record.employees?.departments?.name || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">
                <span style="background: ${record.blood_pressure_systolic >= 140 ? '#dc3545' : record.blood_pressure_systolic >= 120 ? '#ffc107' : '#28a745'}; color: ${record.blood_pressure_systolic >= 140 || record.blood_pressure_systolic < 120 ? 'white' : 'black'}; padding: 2px 6px; border-radius: 3px; font-size: 10px;">
                  ${record.blood_pressure_systolic}/${record.blood_pressure_diastolic}
                </span>
              </td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${record.heart_rate || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${record.blood_sugar || '-'}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${calculateBMI(record.weight, record.height)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center; font-size: 10px;">
                ${new Date(record.recorded_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${filteredRecords.length > 50 ? `<p style="margin-top: 10px; color: #666; font-size: 12px;">* แสดงเฉพาะ 50 รายการแรก (ทั้งหมด ${filteredRecords.length} รายการ)</p>` : ''}
    `;
    
    document.body.appendChild(container);
    
    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min((pdfWidth - 20) / imgWidth, (pdfHeight - 20) / imgHeight);
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'PNG', 10, 10, finalWidth, finalHeight);
      pdf.save(`health_records_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">📊 ประวัติสุขภาพ</h1>
          <p className="page-subtitle">ดูย้อนหลังและวิเคราะห์แนวโน้มสุขภาพพนักงาน ({filteredRecords.length} รายการ)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={exportToExcel} className="btn btn-secondary">
            📊 Export Excel
          </button>
          <button onClick={exportToPDF} className="btn btn-primary">
            📄 Export PDF
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="flex gap-md" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '250px' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาตามชื่อ หรือรหัสพนักงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '200px' }}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">ทุกแผนก</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
        </div>

        {/* Stats Summary (Calculated from filtered records) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--color-bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
            <div className="text-muted text-sm">รายการทั้งหมด</div>
            <div className="font-bold text-xl">{filteredRecords.length} ครั้ง</div>
          </div>
          <div style={{ background: 'rgba(235, 87, 87, 0.1)', padding: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)' }}>
            <div className="text-sm">ความดันสูง (เสี่ยง)</div>
            <div className="font-bold text-xl">
              {filteredRecords.filter(r => r.blood_pressure_systolic >= 140 || r.blood_pressure_diastolic >= 90).length} คน
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>วันที่ตรวจ</th>
                <th>พนักงาน</th>
                <th>ความดัน (mmHg)</th>
                <th>หัวใจ (bpm)</th>
                <th>น้ำตาล (mg/dL)</th>
                <th>BMI</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดข้อมูล...</td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.recorded_at)}</td>
                    <td>
                      <div className="font-medium">{record.employees?.first_name} {record.employees?.last_name}</div>
                      <div className="text-muted text-sm">{record.employees?.employee_code} • {record.employees?.departments?.name}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${getStatusColor(record.blood_pressure_systolic, record.blood_pressure_diastolic)}`}>
                        {record.blood_pressure_systolic}/{record.blood_pressure_diastolic}
                      </span>
                    </td>
                    <td>{record.heart_rate}</td>
                    <td>{record.blood_sugar || '-'}</td>
                    <td>{calculateBMI(record.weight, record.height)}</td>
                    <td className="text-muted">{record.notes || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <div className="empty-state-icon">📄</div>
                      <div className="empty-state-title">ไม่พบประวัติสุขภาพ</div>
                    </div>
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
