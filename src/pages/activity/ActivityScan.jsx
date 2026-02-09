import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useActivity } from '../../contexts/ActivityContext';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function ActivityScan() {
  const { activities, recordAttendance } = useActivity();
  const { employees: dbEmployees } = useMasterData();
  const [mode, setMode] = useState('select'); // 'select', 'scan', 'generate'
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const html5QrCodeRef = useRef(null);

  // Map database employees to expected format
  const employees = dbEmployees.map(emp => ({
    id: emp.id,
    code: emp.employee_code,
    name: `${emp.first_name} ${emp.last_name}`,
    department: emp.departments?.name || '-'
  }));

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScanSuccess(decodedText);
          html5QrCode.stop().catch(console.error);
        },
        (errorMessage) => {
          // Ignore scan errors
        }
      );
    } catch (err) {
      console.error('Camera error:', err);
      setError('ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง');
    }
  };

  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(console.error);
    }
  };

  const handleScanSuccess = async (code) => {
    // Search by employee_code (case-insensitive, trim whitespace)
    const searchCode = code.trim();
    const employee = employees.find(e => 
      e.code.toLowerCase() === searchCode.toLowerCase() ||
      e.code === searchCode
    );
    
    if (employee) {
      setSaving(true);
      setError('');
      
      // Save to database
      const result = await recordAttendance(selectedActivity.id, employee.id, 'QR');
      
      setSaving(false);
      
      if (result.success) {
        const scanData = {
          ...employee,
          activity: selectedActivity.name,
          time: new Date().toLocaleTimeString('th-TH'),
          date: new Date().toLocaleDateString('th-TH')
        };
        setScanResult(scanData);
        setRecentScans(prev => [scanData, ...prev.slice(0, 4)]);
      } else if (result.alreadyCheckedIn) {
        setError('⚠️ พนักงาน ' + employee.name + ' เช็คอินไปแล้ว');
        setScanResult(null);
      } else {
        setError('เกิดข้อผิดพลาด: ' + result.error);
        setScanResult(null);
      }
    } else {
      setError('ไม่พบข้อมูลพนักงาน: ' + code);
      setScanResult(null);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim());
      setManualCode('');
    }
  };

  const selectActivity = (activity) => {
    setSelectedActivity(activity);
    setMode('scan');
    setScanResult(null);
    setError('');
    setRecentScans([]);
  };

  const resetScan = () => {
    setScanResult(null);
    setError('');
  };

  const goBack = () => {
    stopCamera();
    setMode('select');
    setSelectedActivity(null);
    setScanResult(null);
    setError('');
    setRecentScans([]);
  };

  // Filter activities that are today or in the future (available for scanning)
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day
  
  const upcomingActivities = activities.filter(a => {
    const activityDate = new Date(a.date);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate >= today;
  });


  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📱 สแกนเข้าร่วมกิจกรรม</h1>
        <p className="page-subtitle">สแกน QR Code หรือกรอกรหัสพนักงานเพื่อเช็คอิน</p>
      </div>

      {mode === 'select' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">เลือกกิจกรรม</h2>
          </div>
          {upcomingActivities.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {upcomingActivities.map(activity => (
                <div
                  key={activity.id}
                  onClick={() => selectActivity(activity)}
                  style={{
                    padding: '1.5rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    border: '1px solid var(--color-border)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                >
                  <div className="font-semibold" style={{ marginBottom: '0.5rem' }}>
                    {activity.name}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                    📅 {new Date(activity.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {activity.location && <span> • 📍 {activity.location}</span>}
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <span className="badge badge-info">{activity.attendees || 0} คนเข้าร่วมแล้ว</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">ไม่มีกิจกรรมที่กำลังจะมาถึง</div>
              <div className="empty-state-text">ไปที่หน้า "รายการกิจกรรม" เพื่อเพิ่มกิจกรรมใหม่</div>
            </div>
          )}

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <button 
              className="btn btn-secondary btn-lg"
              onClick={() => setMode('generate')}
              style={{ width: '100%' }}
            >
              🔲 สร้าง QR Code สำหรับพนักงาน
            </button>
          </div>
        </div>
      )}

      {mode === 'generate' && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🔲 สร้าง QR Code พนักงาน</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setMode('select')}>
              ← กลับ
            </button>
          </div>
          {employees.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {employees.map(employee => (
                <div
                  key={employee.id}
                  style={{
                    padding: '1.5rem',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                  }}
                >
                  <QRCodeSVG
                    value={employee.code}
                    size={150}
                    bgColor="transparent"
                    fgColor="var(--color-text-primary)"
                    level="M"
                    style={{ marginBottom: '1rem' }}
                  />
                  <div className="font-semibold">{employee.name}</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>{employee.code}</div>
                  <div className="badge badge-info" style={{ marginTop: '0.5rem' }}>{employee.department}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">ไม่มีข้อมูลพนักงาน</div>
              <div className="empty-state-text">ไปที่หน้า "พนักงาน" เพื่อเพิ่มพนักงานใหม่</div>
            </div>
          )}
        </div>
      )}

      {mode === 'scan' && selectedActivity && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">{selectedActivity.name}</h2>
              <div className="card-subtitle">สแกน QR Code หรือกรอกรหัสพนักงาน</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={goBack}>
              ← กลับ
            </button>
          </div>

          <div className="qr-scanner-container">
            {/* QR Scanner Box */}
            <div className="qr-scanner-box">
              <div id="qr-reader" style={{ width: '100%', height: '100%' }}></div>
              {!html5QrCodeRef.current && (
                <div className="qr-scanner-overlay">
                  <button className="btn btn-primary btn-lg" onClick={startCamera}>
                    📷 เปิดกล้อง
                  </button>
                </div>
              )}
            </div>

            {/* Manual Input */}
            <div style={{ width: '100%', maxWidth: '400px' }}>
              <form onSubmit={handleManualSubmit} className="flex gap-md">
                <input
                  type="text"
                  className="form-input"
                  placeholder="กรอกรหัสพนักงาน"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{ flex: 1 }}
                  disabled={saving}
                />
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳' : '✓'} เช็คอิน
                </button>
              </form>
            </div>

            {/* Saving Indicator */}
            {saving && (
              <div style={{
                padding: '1rem',
                background: 'rgba(74, 144, 226, 0.1)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-primary)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
              }}>
                กำลังบันทึก...
              </div>
            )}

            {/* Error Message */}
            {error && !saving && (
              <div style={{
                padding: '1rem',
                background: 'rgba(184, 84, 80, 0.1)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-error)',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            {/* Scan Result */}
            {scanResult && !saving && (
              <div className="scan-result scan-result-success">
                <div className="scan-result-icon">✅</div>
                <div className="scan-result-title">เช็คอินสำเร็จ!</div>
                <div className="scan-result-info">
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '0.5rem' }}>
                    {scanResult.name}
                  </div>
                  <div>รหัส: {scanResult.code}</div>
                  <div>แผนก: {scanResult.department}</div>
                  <div style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                    🕐 {scanResult.time}
                  </div>
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ marginTop: '1rem' }}
                  onClick={resetScan}
                >
                  สแกนต่อไป
                </button>
              </div>
            )}
          </div>

          {/* Recent Scans */}
          {recentScans.length > 0 && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <h3 style={{ marginBottom: '1rem' }}>📋 เช็คอินล่าสุด</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>รหัส</th>
                      <th>ชื่อ</th>
                      <th>แผนก</th>
                      <th>เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((scan, index) => (
                      <tr key={index}>
                        <td><span className="badge badge-info">{scan.code}</span></td>
                        <td>{scan.name}</td>
                        <td>{scan.department}</td>
                        <td>{scan.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
