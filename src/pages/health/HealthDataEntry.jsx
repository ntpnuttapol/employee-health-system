import { useState, useEffect } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useHealth } from '../../contexts/HealthContext';

export default function HealthDataEntry() {
  const { employees, branches, loading: masterLoading } = useMasterData();
  const { addHealthRecord, healthRecords } = useHealth();
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]); // Allow backdating
  const [formData, setFormData] = useState({
    bpSystolic: '', bpDiastolic: '', heartRate: '', bloodSugar: '', weight: '', height: '', notes: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [heightAutoFilled, setHeightAutoFilled] = useState(false);

  // Filter employees by branch
  const filteredEmployees = selectedBranch 
    ? employees.filter(e => e.branch_id === parseInt(selectedBranch))
    : employees;

  // Auto-fill height from the employee's most recent health record
  useEffect(() => {
    if (!selectedEmployee) {
      setHeightAutoFilled(false);
      return;
    }

    // healthRecords is already sorted by recorded_at DESC
    const latestRecord = healthRecords.find(
      (r) => String(r.employee_id) === String(selectedEmployee) && r.height
    );

    if (latestRecord && latestRecord.height) {
      setFormData((prev) => ({ ...prev, height: String(latestRecord.height) }));
      setHeightAutoFilled(true);
    } else {
      setHeightAutoFilled(false);
    }
  }, [selectedEmployee, healthRecords]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setStatus({ type: 'error', message: 'กรุณาเลือกพนักงาน' });
      return;
    }

    setSubmitting(true);
    setStatus({ type: '', message: '' });

    const record = {
      employeeId: selectedEmployee,
      recordDate: recordDate, // Custom date for retroactive entry
      ...formData
    };

    const result = await addHealthRecord(record);

    if (result.success) {
      setStatus({ type: 'success', message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
      setFormData({
        bpSystolic: '', bpDiastolic: '', heartRate: '', bloodSugar: '', weight: '', height: '', notes: ''
      });
      setHeightAutoFilled(false);
      setSelectedEmployee('');
      setRecordDate(new Date().toISOString().split('T')[0]); // Reset to today
      // Scroll to top
      window.scrollTo(0, 0);
    } else {
      setStatus({ type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + result.error?.message });
    }
    setSubmitting(false);
  };

  const getBPStatus = (sys, dia) => {
    if (!sys || !dia) return null;
    if (sys < 120 && dia < 80) return { label: 'ปกติ', color: 'success' };
    if (sys >= 140 || dia >= 90) return { label: 'สูง', color: 'danger' };
    return { label: 'ค่อนข้างสูง', color: 'warning' };
  };

  const getBMI = (w, h) => {
    if (!w || !h) return null;
    return (w / ((h / 100) * (h / 100))).toFixed(1);
  };

  const bpStatus = getBPStatus(formData.bpSystolic, formData.bpDiastolic);
  const bmi = getBMI(formData.weight, formData.height);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">📝 บันทึกข้อมูลสุขภาพ</h1>
        <p className="page-subtitle">กรอกข้อมูลสุขภาพประจำวันของพนักงาน</p>
      </div>

      {status.message && (
        <div className={`alert alert-${status.type}`} style={{ marginBottom: '1.5rem' }}>
          {status.type === 'success' ? '✅' : '⚠️'} {status.message}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Employee Selection */}
          <div className="form-section">
            <h3 className="form-section-title">ข้อมูลพนักงาน</h3>
            
            <div className="form-row">
              {/* Branch Filter */}
              <div className="form-group">
                <label className="form-label">สาขา (กรองพนักงาน)</label>
                <select
                  className="form-select"
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setSelectedEmployee(''); // Reset employee when branch changes
                  }}
                  disabled={masterLoading}
                >
                  <option value="">-- ทุกสาขา --</option>
                  {(branches || []).map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Record Date */}
              <div className="form-group">
                <label className="form-label required">วันที่บันทึก</label>
                <input
                  type="date"
                  className="form-input"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <div className="text-muted text-sm mt-1">สามารถเลือกวันย้อนหลังได้</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label required">เลือกพนักงาน</label>
              <select
                className="form-select"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                required
                disabled={masterLoading}
              >
                <option value="">-- กรุณาเลือก ({filteredEmployees.length} คน) --</option>
                {filteredEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code} - {emp.first_name} {emp.last_name} ({emp.departments?.name || '-'})
                  </option>
                ))}
              </select>
              {masterLoading && <div className="text-muted text-sm mt-1">กำลังโหลดรายชื่อพนักงาน...</div>}
            </div>
          </div>

          {/* Vitals */}
          <div className="form-section">
            <h3 className="form-section-title">สัญญาณชีพ (Vital Signs)</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">ความดันตัวบน (Systolic)</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="120"
                    value={formData.bpSystolic}
                    onChange={(e) => setFormData({ ...formData, bpSystolic: e.target.value })}
                    required
                    min="50"
                    max="250"
                  />
                  <span className="input-group-text">mmHg</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label required">ความดันตัวล่าง (Diastolic)</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="80"
                    value={formData.bpDiastolic}
                    onChange={(e) => setFormData({ ...formData, bpDiastolic: e.target.value })}
                    required
                    min="30"
                    max="150"
                  />
                  <span className="input-group-text">mmHg</span>
                </div>
              </div>
            </div>
            {bpStatus && (
              <div className={`badge badge-${bpStatus.color}`} style={{ marginBottom: '1rem', display: 'inline-block' }}>
                สถานะความดัน: {bpStatus.label}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label required">อัตราการเต้นหัวใจ (Heart Rate)</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-input"
                  placeholder="70"
                  value={formData.heartRate}
                  onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                  required
                  min="30"
                  max="200"
                />
                <span className="input-group-text">bpm</span>
              </div>
            </div>
          </div>

          {/* Body Composition & Others */}
          <div className="form-section">
            <h3 className="form-section-title">ข้อมูลร่างกายและอื่นๆ</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">น้ำหนัก</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="60.0"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    required
                    min="20"
                    max="200"
                  />
                  <span className="input-group-text">kg</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label required">ส่วนสูง</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-input"
                    placeholder="170"
                    value={formData.height}
                    onChange={(e) => {
                      setFormData({ ...formData, height: e.target.value });
                      if (heightAutoFilled) setHeightAutoFilled(false);
                    }}
                    required
                    min="100"
                    max="250"
                  />
                  <span className="input-group-text">cm</span>
                </div>
                {heightAutoFilled && (
                  <div className="text-muted text-sm mt-1" style={{ color: 'var(--apple-blue, #007aff)' }}>
                    ✅ ดึงค่าส่วนสูงจากบันทึกครั้งล่าสุดอัตโนมัติ
                  </div>
                )}
              </div>
            </div>
            {bmi && (
               <div className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                 BMI: <strong>{bmi}</strong>
               </div>
            )}

            <div className="form-group">
              <label className="form-label">ระดับน้ำตาลในเลือด (Blood Sugar)</label>
              <div className="input-group">
                <input
                  type="number"
                  className="form-input"
                  placeholder="Optional"
                  value={formData.bloodSugar}
                  onChange={(e) => setFormData({ ...formData, bloodSugar: e.target.value })}
                  min="50"
                  max="500"
                />
                <span className="input-group-text">mg/dL</span>
              </div>
              <div className="text-muted text-sm mt-1">ค่าปกติ (อดอาหาร): 70 - 100 mg/dL</div>
            </div>

            <div className="form-group">
              <label className="form-label">หมายเหตุเพิ่มเติม</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="อาการอื่นๆ หรือข้อควรระวัง"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%' }}
              disabled={submitting || masterLoading}
            >
              {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
