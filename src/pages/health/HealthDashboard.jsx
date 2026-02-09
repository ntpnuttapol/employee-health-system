import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { translateRisks, formatDateForPDF } from '../../utils/pdfUtils';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#8ec8e8', '#7dd3c8', '#a8e6cf', '#88d8f5', '#b8d4e8'];

export default function HealthDashboard() {
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // days
  const [stats, setStats] = useState({
    totalRecords: 0,
    avgSystolic: 0,
    avgDiastolic: 0,
    avgHeartRate: 0,
    avgBloodSugar: 0
  });

  useEffect(() => {
    loadHealthData();
  }, [dateRange]);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));
      
      console.log('Fetching health data from:', startDate.toISOString());
      
      const { data, error } = await supabase
        .from('health_records')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            departments (name)
          )
        `)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Health data fetched:', data);
      setHealthData(data || []);
      console.log('Health data loaded:', data?.length || 0, 'records');

      // Calculate stats - use correct field names from database
      if (data && data.length > 0) {
        const validRecords = data.filter(r => r.blood_pressure_systolic || r.heart_rate);
        const avgSystolic = validRecords.reduce((sum, r) => sum + (r.blood_pressure_systolic || 0), 0) / (validRecords.length || 1);
        const avgDiastolic = validRecords.reduce((sum, r) => sum + (r.blood_pressure_diastolic || 0), 0) / (validRecords.length || 1);
        const avgHeartRate = validRecords.reduce((sum, r) => sum + (r.heart_rate || 0), 0) / (validRecords.length || 1);
        const bloodSugarRecords = data.filter(r => r.blood_sugar);
        const avgBloodSugar = bloodSugarRecords.length > 0 
          ? bloodSugarRecords.reduce((sum, r) => sum + (r.blood_sugar || 0), 0) / bloodSugarRecords.length 
          : 0;
        
        setStats({
          totalRecords: data.length,
          avgSystolic: Math.round(avgSystolic),
          avgDiastolic: Math.round(avgDiastolic),
          avgHeartRate: Math.round(avgHeartRate),
          avgBloodSugar: Math.round(avgBloodSugar)
        });
      }
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data by date - use recorded_at timestamp
  const chartData = healthData.reduce((acc, record) => {
    // Extract date from recorded_at timestamp
    const recordedAt = record.recorded_at ? new Date(record.recorded_at) : new Date();
    const date = recordedAt.toISOString().split('T')[0];
    
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.count++;
      existing.systolic = Math.round((existing.systolic + (record.blood_pressure_systolic || 0)) / 2);
      existing.diastolic = Math.round((existing.diastolic + (record.blood_pressure_diastolic || 0)) / 2);
      existing.heartRate = Math.round((existing.heartRate + (record.heart_rate || 0)) / 2);
      existing.bloodSugar = Math.round((existing.bloodSugar + (record.blood_sugar || 0)) / 2);
    } else {
      acc.push({
        date,
        displayDate: recordedAt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        count: 1,
        systolic: record.blood_pressure_systolic || 0,
        diastolic: record.blood_pressure_diastolic || 0,
        heartRate: record.heart_rate || 0,
        bloodSugar: record.blood_sugar || 0
      });
    }
    return acc;
  }, []);

  // Blood pressure status distribution - use correct field names
  const bpStatusData = healthData.reduce((acc, record) => {
    const sys = record.blood_pressure_systolic || 0;
    const dia = record.blood_pressure_diastolic || 0;
    let status = 'ปกติ';
    if (sys >= 140 || dia >= 90) {
      status = 'สูง';
    } else if (sys >= 120 || dia >= 80) {
      status = 'เฝ้าระวัง';
    }
    const existing = acc.find(d => d.name === status);
    if (existing) existing.value++;
    else acc.push({ name: status, value: 1 });
    return acc;
  }, []);

  // Calculate risk score for employees
  const getRiskLevel = (record) => {
    let riskScore = 0;
    const risks = [];
    
    const sys = record.blood_pressure_systolic || 0;
    const dia = record.blood_pressure_diastolic || 0;
    const hr = record.heart_rate || 0;
    const sugar = record.blood_sugar || 0;
    
    // High blood pressure (Hypertension Stage 2)
    if (sys >= 180 || dia >= 120) {
      riskScore += 50;
      risks.push('ความดันสูงมาก (วิกฤต)');
    } else if (sys >= 140 || dia >= 90) {
      riskScore += 30;
      risks.push('ความดันสูง');
    }
    
    // Abnormal heart rate
    if (hr < 50 || hr > 120) {
      riskScore += 25;
      risks.push(hr < 50 ? 'ชีพจรช้าผิดปกติ' : 'ชีพจรเร็วผิดปกติ');
    }
    
    // High blood sugar
    if (sugar >= 200) {
      riskScore += 40;
      risks.push('น้ำตาลสูงมาก');
    } else if (sugar >= 126) {
      riskScore += 20;
      risks.push('น้ำตาลสูง');
    }
    
    return { riskScore, risks };
  };

  // At-risk employees (sorted by risk score descending)
  const atRiskEmployees = healthData
    .map(record => {
      const { riskScore, risks } = getRiskLevel(record);
      return {
        ...record,
        riskScore,
        risks,
        employeeName: record.employees ? 
          `${record.employees.first_name} ${record.employees.last_name}` : 
          'ไม่ระบุ',
        department: record.employees?.departments?.name || '-',
        recordedAt: record.recorded_at
      };
    })
    .filter(r => r.riskScore >= 20) // Only show moderate to high risk
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10); // Show top 10 most at-risk

  // Export to Excel
  const exportToExcel = () => {
    const exportData = atRiskEmployees.map((emp, index) => ({
      'อันดับ': index + 1,
      'ชื่อ-นามสกุล': emp.employeeName,
      'แผนก': emp.department,
      'ความดัน (Systolic)': emp.blood_pressure_systolic,
      'ความดัน (Diastolic)': emp.blood_pressure_diastolic,
      'ชีพจร (bpm)': emp.heart_rate || '-',
      'น้ำตาล (mg/dL)': emp.blood_sugar || '-',
      'ความเสี่ยง': emp.risks.join(', '),
      'วันที่ตรวจ': new Date(emp.recordedAt).toLocaleString('th-TH')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'พนักงานกลุ่มเสี่ยง');
    
    const fileName = `health_risk_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export to PDF using html2canvas for Thai support
  const exportToPDF = async () => {
    // Create a hidden container for rendering
    const container = document.createElement('div');
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; background: white; padding: 20px; font-family: "Sarabun", "Noto Sans Thai", sans-serif; width: 1100px;';
    
    // Build HTML content
    container.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <img src="/pfslogo.png" style="width: 60px; height: 60px; margin-right: 15px;" onerror="this.style.display='none'" />
        <div>
          <h1 style="margin: 0; color: #dc3545; font-size: 24px;">รายงานพนักงานกลุ่มเสี่ยงด้านสุขภาพ</h1>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">Health Risk Report - At-Risk Employees</p>
        </div>
      </div>
      <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
        <span style="margin-right: 30px;"><strong>ช่วงเวลา:</strong> ${dateRange} วันล่าสุด</span>
        <span style="margin-right: 30px;"><strong>จำนวน:</strong> ${atRiskEmployees.length} คน</span>
        <span><strong>วันที่ออกรายงาน:</strong> ${new Date().toLocaleString('th-TH')}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background: #dc3545; color: white;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">#</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">ชื่อ-นามสกุล</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">แผนก</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">ความดัน</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">ชีพจร</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">น้ำตาล</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">ความเสี่ยง</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">วันที่</th>
          </tr>
        </thead>
        <tbody>
          ${atRiskEmployees.map((emp, index) => `
            <tr style="background: ${index % 2 === 0 ? '#fff' : '#fff5f5'};">
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${index === 0 ? '#dc3545' : '#666'};">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${emp.employeeName}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${emp.department}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                <span style="background: ${emp.blood_pressure_systolic >= 140 ? '#dc3545' : '#ffc107'}; color: ${emp.blood_pressure_systolic >= 140 ? 'white' : 'black'}; padding: 2px 8px; border-radius: 4px;">
                  ${emp.blood_pressure_systolic}/${emp.blood_pressure_diastolic}
                </span>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${emp.heart_rate || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${emp.blood_sugar || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">
                ${emp.risks.map(r => `<span style="display: inline-block; background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; margin: 1px; font-size: 11px;">${r}</span>`).join('')}
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">
                ${new Date(emp.recordedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
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
      pdf.save(`health_risk_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      document.body.removeChild(container);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">📈 Health Dashboard</h1>
        </div>
        <div className="card">
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📈 Health Dashboard</h1>
        <p className="page-subtitle">แนวโน้มสุขภาพพนักงาน</p>
        <div className="page-header-actions">
          <select 
            className="form-select" 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="7">7 วันล่าสุด</option>
            <option value="14">14 วันล่าสุด</option>
            <option value="30">30 วันล่าสุด</option>
            <option value="90">90 วันล่าสุด</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{stats.totalRecords}</div>
          <div className="stat-label">บันทึกทั้งหมด</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💓</div>
          <div className="stat-value">{stats.avgSystolic}/{stats.avgDiastolic}</div>
          <div className="stat-label">ความดันเฉลี่ย</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <div className="stat-value">{stats.avgHeartRate}</div>
          <div className="stat-label">ชีพจรเฉลี่ย</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🩸</div>
          <div className="stat-value">{stats.avgBloodSugar}</div>
          <div className="stat-label">น้ำตาลเฉลี่ย</div>
        </div>
      </div>

      {healthData.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-title">ยังไม่มีข้อมูล</div>
            <div className="empty-state-text">ไม่มีบันทึกสุขภาพในช่วงเวลาที่เลือก</div>
          </div>
        </div>
      ) : (
        <>
          {/* At-Risk Employees - Most Dangerous First */}
          {atRiskEmployees.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #ff6b6b' }}>
              <div className="card-header" style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)', color: 'white', margin: '-1rem -1rem 1rem -1rem', padding: '1rem', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="card-title" style={{ color: 'white', margin: 0 }}>⚠️ พนักงานกลุ่มเสี่ยง ({atRiskEmployees.length} คน)</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={exportToExcel} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.5)' }}>
                    📊 Excel
                  </button>
                  <button onClick={exportToPDF} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.5)' }}>
                    📄 PDF
                  </button>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>อันดับ</th>
                      <th>ชื่อ-นามสกุล</th>
                      <th>แผนก</th>
                      <th>ความดัน</th>
                      <th>ชีพจร</th>
                      <th>น้ำตาล</th>
                      <th>ความเสี่ยง</th>
                      <th>วันที่ตรวจ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskEmployees.map((emp, index) => (
                      <tr key={emp.id}>
                        <td>
                          <span style={{ 
                            fontWeight: 'bold', 
                            fontSize: '1.2rem',
                            color: index === 0 ? '#ff4444' : index === 1 ? '#ff7744' : index === 2 ? '#ffaa44' : '#666'
                          }}>
                            #{index + 1}
                          </span>
                        </td>
                        <td><strong>{emp.employeeName}</strong></td>
                        <td>{emp.department}</td>
                        <td>
                          <span className={`badge ${emp.blood_pressure_systolic >= 140 ? 'badge-danger' : 'badge-warning'}`}>
                            {emp.blood_pressure_systolic}/{emp.blood_pressure_diastolic}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${emp.heart_rate < 50 || emp.heart_rate > 120 ? 'badge-danger' : 'badge-info'}`}>
                            {emp.heart_rate || '-'} bpm
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${emp.blood_sugar >= 200 ? 'badge-danger' : emp.blood_sugar >= 126 ? 'badge-warning' : 'badge-success'}`}>
                            {emp.blood_sugar || '-'} mg/dL
                          </span>
                        </td>
                        <td>
                          {emp.risks.map((risk, i) => (
                            <span key={i} className="badge badge-danger" style={{ marginRight: '0.25rem', marginBottom: '0.25rem', display: 'inline-block' }}>
                              {risk}
                            </span>
                          ))}
                        </td>
                        <td>
                          {new Date(emp.recordedAt).toLocaleDateString('th-TH', { 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Blood Pressure Trend */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h2 className="card-title">💓 แนวโน้มความดันโลหิต</h2>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="displayDate" tick={{ fontSize: 12 }} />
                  <YAxis domain={[60, 180]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="systolic" 
                    name="Systolic" 
                    stroke="#8ec8e8" 
                    fill="#8ec8e8" 
                    fillOpacity={0.3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="diastolic" 
                    name="Diastolic" 
                    stroke="#7dd3c8" 
                    fill="#7dd3c8"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {/* Heart Rate Trend */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">❤️ แนวโน้มชีพจร</h2>
              </div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                    <YAxis domain={[50, 120]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="heartRate" 
                      name="Heart Rate" 
                      stroke="#ff8fa3" 
                      strokeWidth={2}
                      dot={{ fill: '#ff8fa3' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Blood Pressure Status Distribution */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📊 สถานะความดันโลหิต</h2>
              </div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={bpStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {bpStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Blood Sugar Trend */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">🩸 แนวโน้มน้ำตาลในเลือด</h2>
              </div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 200]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar 
                      dataKey="bloodSugar" 
                      name="Blood Sugar" 
                      fill="#a8e6cf" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Records per Day */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">📈 จำนวนบันทึกรายวัน</h2>
              </div>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar 
                      dataKey="count" 
                      name="จำนวนบันทึก" 
                      fill="#88d8f5" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
