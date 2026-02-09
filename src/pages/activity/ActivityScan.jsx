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
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const html5QrCodeRef = useRef(null);
  const searchInputRef = useRef(null);

  // Map database employees to expected format (only active employees)
  const employees = dbEmployees
    .filter(emp => emp.is_active !== false)
    .map(emp => ({
      id: emp.id,
      code: emp.employee_code,
      name: `${emp.first_name} ${emp.last_name}`,
      firstName: emp.first_name,
      lastName: emp.last_name,
      department: emp.departments?.name || '-',
      branch: emp.branches?.name || '-'
    }));

  // Filter employees based on search text
  const filteredEmployees = searchText.trim() 
    ? employees.filter(emp => 
        emp.name.toLowerCase().includes(searchText.toLowerCase()) ||
        emp.firstName.toLowerCase().includes(searchText.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchText.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchText.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
          handleQRScan(decodedText);
          html5QrCode.stop().catch(console.error);
        },
        () => {}
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

  const handleQRScan = async (code) => {
    const employee = employees.find(e => e.code.toLowerCase() === code.trim().toLowerCase());
    if (employee) {
      await recordAndShowResult(employee);
    } else {
      setError('ไม่พบพนักงาน: ' + code);
      setScanResult(null);
    }
  };

  const handleSelectEmployee = async (employee) => {
    setSearchText('');
    setShowDropdown(false);
    await recordAndShowResult(employee);
  };

  const recordAndShowResult = async (employee) => {
    setSaving(true);
    setError('');
    
    const result = await recordAttendance(selectedActivity.id, employee.id, 'Manual');
    setSaving(false);
    
    if (result.success) {
      const scanData = {
        ...employee,
        activity: selectedActivity.name,
        time: new Date().toLocaleTimeString('th-TH'),
        date: new Date().toLocaleDateString('th-TH')
      };
      setScanResult(scanData);
      setRecentScans(prev => [scanData, ...prev.slice(0, 9)]);
    } else if (result.alreadyCheckedIn) {
      setError('⚠️ ' + employee.name + ' เช็คอินไปแล้ว');
      setScanResult(null);
    } else {
      setError('เกิดข้อผิดพลาด: ' + result.error);
      setScanResult(null);
    }
  };

  const selectActivity = (activity) => {
    setSelectedActivity(activity);
    setMode('scan');
    setScanResult(null);
    setError('');
    setRecentScans([]);
    setSearchText('');
  };

  const resetScan = () => {
    setScanResult(null);
    setError('');
    setSearchText('');
  };

  const goBack = () => {
    stopCamera();
    setMode('select');
    setSelectedActivity(null);
    setScanResult(null);
    setError('');
    setRecentScans([]);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingActivities = activities.filter(a => {
    const activityDate = new Date(a.date);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate >= today;
  });

  // Styles
  const cardStyle = {
    background: 'white',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid rgba(126, 184, 220, 0.2)'
  };

  const stepBadgeStyle = {
    background: 'linear-gradient(135deg, #7eb8dc 0%, #5aa8d4 100%)',
    color: 'white',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1rem',
    flexShrink: 0
  };

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem'
        }}>
          📱 เช็คอินกิจกรรม
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
          ระบบบันทึกการเข้าร่วมกิจกรรมของพนักงาน
        </p>
      </div>

      {/* Step 1: Select Activity */}
      {mode === 'select' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={stepBadgeStyle}>1</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>เลือกกิจกรรม</h2>
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                เลือกกิจกรรมที่ต้องการเช็คอิน
              </p>
            </div>
          </div>

          {upcomingActivities.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {upcomingActivities.map(activity => (
                <div
                  key={activity.id}
                  onClick={() => selectActivity(activity)}
                  style={{
                    padding: '1.25rem',
                    background: 'linear-gradient(135deg, #f8fbff 0%, #f0f7fc 100%)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                      {activity.name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      📅 {new Date(activity.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {activity.location && <span> • 📍 {activity.location}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>
                      👥 {activity.attendees || 0}
                    </span>
                    <span style={{ fontSize: '1.5rem', color: 'var(--color-primary)' }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem 1rem',
              background: '#f8f9fa',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>�</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                ไม่มีกิจกรรมที่กำลังจะมาถึง
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                สร้างกิจกรรมใหม่ได้ที่เมนู "รายการกิจกรรม"
              </div>
            </div>
          )}

          <div style={{ 
            marginTop: '1.5rem', 
            paddingTop: '1.5rem', 
            borderTop: '1px dashed var(--color-border)'
          }}>
            <button 
              className="btn btn-secondary"
              onClick={() => setMode('generate')}
              style={{ width: '100%', padding: '1rem' }}
            >
              🔲 สร้าง QR Code ให้พนักงาน
            </button>
          </div>
        </div>
      )}

      {/* QR Code Generator */}
      {mode === 'generate' && (
        <div style={cardStyle}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>🔲 QR Code พนักงาน</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => setMode('select')}>
              ← กลับ
            </button>
          </div>
          
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
            พิมพ์ QR Code แจกพนักงาน เพื่อใช้สแกนเข้าร่วมกิจกรรม
          </p>

          {employees.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
              gap: '1rem' 
            }}>
              {employees.map(emp => (
                <div
                  key={emp.id}
                  style={{
                    padding: '1rem',
                    background: '#fafbfc',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <QRCodeSVG
                    value={emp.code}
                    size={120}
                    bgColor="transparent"
                    fgColor="#333"
                    level="M"
                    style={{ marginBottom: '0.75rem' }}
                  />
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{emp.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {emp.code} • {emp.branch}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              ไม่มีข้อมูลพนักงาน
            </div>
          )}
        </div>
      )}

      {/* Step 2: Scan / Search */}
      {mode === 'scan' && selectedActivity && (
        <div>
          {/* Activity Info Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #7eb8dc 0%, #5aa8d4 100%)',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '16px',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{selectedActivity.name}</div>
              <div style={{ opacity: 0.9, fontSize: '0.85rem' }}>
                📅 {new Date(selectedActivity.date).toLocaleDateString('th-TH')}
                {selectedActivity.location && ` • 📍 ${selectedActivity.location}`}
              </div>
            </div>
            <button 
              onClick={goBack}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              ✕ เปลี่ยน
            </button>
          </div>

          {/* Main Scan Area */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={stepBadgeStyle}>2</div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>เช็คอินพนักงาน</h2>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  ค้นหาชื่อ หรือ สแกน QR Code
                </p>
              </div>
            </div>

            {/* Search Box - Primary Method */}
            <div style={{ marginBottom: '1.5rem', position: 'relative' }} ref={searchInputRef}>
              <div style={{
                background: 'linear-gradient(135deg, #f8fbff 0%, #eef6fc 100%)',
                borderRadius: '16px',
                padding: '1.5rem',
                border: '2px solid var(--color-primary-light)'
              }}>
                <label style={{ 
                  display: 'block', 
                  fontWeight: '600', 
                  marginBottom: '0.75rem',
                  fontSize: '1rem'
                }}>
                  🔍 พิมพ์ชื่อพนักงาน
                </label>
                <input
                  type="text"
                  placeholder="ค้นหา: ชื่อ, นามสกุล หรือ รหัสพนักงาน..."
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setShowDropdown(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => searchText.trim() && setShowDropdown(true)}
                  disabled={saving}
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '1rem 1.25rem',
                    fontSize: '1.1rem',
                    border: '2px solid var(--color-border)',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />

                {/* Dropdown */}
                {showDropdown && filteredEmployees.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: '1.5rem',
                    right: '1.5rem',
                    top: 'calc(100% - 0.5rem)',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    zIndex: 100,
                    maxHeight: '280px',
                    overflowY: 'auto'
                  }}>
                    {filteredEmployees.map((emp, idx) => (
                      <div
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        style={{
                          padding: '1rem 1.25rem',
                          cursor: 'pointer',
                          borderBottom: idx < filteredEmployees.length - 1 ? '1px solid #eee' : 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f9fc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div>
                          <div style={{ fontWeight: '600' }}>{emp.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#888' }}>
                            {emp.department} • {emp.branch}
                          </div>
                        </div>
                        <span style={{ 
                          background: 'var(--color-primary)', 
                          color: 'white',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '500'
                        }}>
                          เช็คอิน
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {showDropdown && searchText.trim() && filteredEmployees.length === 0 && (
                  <div style={{
                    position: 'absolute',
                    left: '1.5rem',
                    right: '1.5rem',
                    top: 'calc(100% - 0.5rem)',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    padding: '1rem',
                    textAlign: 'center',
                    color: '#888',
                    zIndex: 100
                  }}>
                    ❌ ไม่พบพนักงาน "{searchText}"
                  </div>
                )}
              </div>
            </div>

            {/* QR Scanner - Secondary Method */}
            <div style={{
              background: '#fafbfc',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px dashed var(--color-border)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1rem' }}>
                หรือ สแกน QR Code
              </div>
              <div id="qr-reader" style={{ 
                width: '100%', 
                maxWidth: '280px', 
                margin: '0 auto',
                borderRadius: '12px',
                overflow: 'hidden'
              }}></div>
              {!html5QrCodeRef.current && (
                <button className="btn btn-secondary" onClick={startCamera}>
                  📷 เปิดกล้อง
                </button>
              )}
            </div>

            {/* Status Messages */}
            {saving && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(74, 144, 226, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                color: 'var(--color-primary)',
                fontWeight: '500'
              }}>
                ⏳ กำลังบันทึก...
              </div>
            )}

            {error && !saving && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(220, 53, 69, 0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#dc3545',
                fontWeight: '500'
              }}>
                {error}
              </div>
            )}

            {/* Success Result */}
            {scanResult && !saving && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)',
                borderRadius: '16px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#155724' }}>
                  เช็คอินสำเร็จ!
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', marginTop: '0.5rem' }}>
                  {scanResult.name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.25rem' }}>
                  {scanResult.department} • {scanResult.branch}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.5rem' }}>
                  🕐 {scanResult.time}
                </div>
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: '1rem' }}
                  onClick={resetScan}
                >
                  ✓ เช็คอินคนต่อไป
                </button>
              </div>
            )}
          </div>

          {/* Recent Scans */}
          {recentScans.length > 0 && (
            <div style={{ ...cardStyle, marginTop: '1rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>
                📋 เช็คอินแล้ว ({recentScans.length} คน)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentScans.map((scan, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <div>
                      <span style={{ fontWeight: '500' }}>{scan.name}</span>
                      <span style={{ color: '#888', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                        ({scan.branch})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#888' }}>{scan.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
