import { useState } from 'react';
import { useHealth } from '../../contexts/HealthContext';
import { useMasterData } from '../../contexts/MasterDataContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatDateTimeForPDF } from '../../utils/pdfUtils';

export default function HealthRecords() {
  const { healthRecords, loading, updateHealthRecord } = useHealth();
  const { departments, branches } = useMasterData();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    bpSystolic: '', bpDiastolic: '', heartRate: '', bloodSugar: '', weight: '', height: '', notes: ''
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editStatus, setEditStatus] = useState({ type: '', message: '' });

  const filteredRecords = healthRecords.filter(record => {
    // Search by name or employee code
    const matchesSearch = !searchTerm || 
      record.employees?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employees?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employees?.employee_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by department
    const matchesDept = !departmentFilter || record.employees?.departments?.name === departmentFilter;
    
    // Filter by branch
    const matchesBranch = !branchFilter || record.employees?.branches?.id === parseInt(branchFilter);
    
    // Filter by date range
    const recordDate = record.recorded_at ? new Date(record.recorded_at) : null;
    const matchesStartDate = !startDate || (recordDate && recordDate >= new Date(startDate));
    const matchesEndDate = !endDate || (recordDate && recordDate <= new Date(endDate + 'T23:59:59'));

    return matchesSearch && matchesDept && matchesBranch && matchesStartDate && matchesEndDate;
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
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">น้ำหนัก</th>
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
              <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${record.weight || '-'}</td>
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

  const handleEditClick = (record) => {
    setEditingRecord(record);
    setEditFormData({
      bpSystolic: record.blood_pressure_systolic || '',
      bpDiastolic: record.blood_pressure_diastolic || '',
      heartRate: record.heart_rate || '',
      bloodSugar: record.blood_sugar || '',
      weight: record.weight || '',
      height: record.height || '',
      notes: record.notes || ''
    });
    setEditStatus({ type: '', message: '' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditStatus({ type: '', message: '' });

    const payload = {
      employeeId: editingRecord.employee_id,
      ...editFormData
    };

    const result = await updateHealthRecord(editingRecord.id, payload);

    if (result.success) {
      setEditStatus({ type: 'success', message: 'อัปเดตข้อมูลเรียบร้อยแล้ว' });
      setTimeout(() => setEditingRecord(null), 1500);
    } else {
      setEditStatus({ type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึก: ' + (result.error?.message || 'Unknown error') });
    }
    setEditSubmitting(false);
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
        {/* Filters - Row 1: Branch and Date Range */}
        <div className="flex gap-md" style={{ marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '180px', marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>🏢 สาขา</label>
            <select
              className="form-select"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">ทุกสาขา</option>
              {(branches || []).map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group" style={{ flex: 1, minWidth: '180px', marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>🏛️ แผนก</label>
            <select
              className="form-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">ทุกแผนก</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ minWidth: '140px', marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>📅 ตั้งแต่</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ minWidth: '140px', marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>📅 ถึง</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Filters - Row 2: Search and Clear */}
        <div className="flex gap-md" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
          {(branchFilter || departmentFilter || startDate || endDate || searchTerm) && (
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setBranchFilter('');
                setDepartmentFilter('');
                setStartDate('');
                setEndDate('');
                setSearchTerm('');
              }}
              style={{ whiteSpace: 'nowrap' }}
            >
              🗑️ ล้างตัวกรอง
            </button>
          )}
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
                <th>น้ำหนัก (kg)</th>
                <th>BMI</th>
                <th>หมายเหตุ</th>
                <th style={{ textAlign: 'center' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดข้อมูล...</td>
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
                    <td>{record.weight || '-'}</td>
                    <td>{calculateBMI(record.weight, record.height)}</td>
                    <td className="text-muted">{record.notes || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleEditClick(record)}
                        title="แก้ไขข้อมูล"
                      >
                        ✏️ แก้ไข
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">
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

      {/* Edit Form Modal */}
      {editingRecord && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="page-header" style={{ marginBottom: '1rem' }}>
              <div>
                <h3 className="card-title">✏️ แก้ไขข้อมูลสุขภาพ</h3>
                <p className="card-subtitle mt-1">
                  {editingRecord.employees?.first_name} {editingRecord.employees?.last_name} ({formatDate(editingRecord.recorded_at)})
                </p>
              </div>
              <button 
                className="btn btn-secondary btn-icon" 
                onClick={() => setEditingRecord(null)}
                style={{ fontSize: '1.2rem', padding: '0.2rem' }}
              >
                ✕
              </button>
            </div>

            {editStatus.message && (
              <div className={`alert alert-${editStatus.type}`} style={{ marginBottom: '1rem' }}>
                {editStatus.type === 'success' ? '✅' : '⚠️'} {editStatus.message}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label required">ความดัน Systolic</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editFormData.bpSystolic}
                    onChange={(e) => setEditFormData({ ...editFormData, bpSystolic: e.target.value })}
                    required min="50" max="250"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label required">ความดัน Diastolic</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editFormData.bpDiastolic}
                    onChange={(e) => setEditFormData({ ...editFormData, bpDiastolic: e.target.value })}
                    required min="30" max="150"
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label required">ชีพจร (bpm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editFormData.heartRate}
                    onChange={(e) => setEditFormData({ ...editFormData, heartRate: e.target.value })}
                    required min="30" max="200"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label">น้ำตาลในเลือด</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Optional"
                    value={editFormData.bloodSugar}
                    onChange={(e) => setEditFormData({ ...editFormData, bloodSugar: e.target.value })}
                    min="50" max="500"
                  />
                </div>
              </div>

              <div className="form-row" style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label required">น้ำหนัก (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={editFormData.weight}
                    onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })}
                    required min="20" max="200"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '0' }}>
                  <label className="form-label required">ส่วนสูง (cm)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editFormData.height}
                    onChange={(e) => setEditFormData({ ...editFormData, height: e.target.value })}
                    required min="100" max="250"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">หมายเหตุ</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingRecord(null)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
