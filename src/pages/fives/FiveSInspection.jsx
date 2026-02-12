import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function FiveSInspection() {
  const { departments, branches, employees, loading: masterLoading } = useMasterData();

  // ล็อกเฉพาะสาขาสุวรรณภูมิ
  const suvarnabhumiBranch = (branches || []).find(b => b.name.includes('สุวรรณภูมิ'));
  const filteredDepartments = (departments || []).filter(
    d => d.is_active !== false && suvarnabhumiBranch && d.branch_id === suvarnabhumiBranch.id
  );

  // รายชื่อพนักงาน (active + สาขาสุวรรณภูมิ)
  const activeEmployees = (employees || []).filter(
    e => e.is_active !== false && suvarnabhumiBranch && e.branch_id === suvarnabhumiBranch.id
  );

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [monthInspections, setMonthInspections] = useState([]);

  const [formData, setFormData] = useState({
    department_id: '',
    inspector_department_id: '',
    inspector_name: '',
    inspection_date: new Date().toISOString().split('T')[0],
    score_improvement: '',
    score_cleanliness: '',
    score_innovation: '',
    notes: ''
  });

  // กรองพนักงานตามแผนกที่เลือก
  const inspectorList = formData.inspector_department_id
    ? activeEmployees.filter(e => String(e.department_id) === String(formData.inspector_department_id))
    : [];

  // ดึงข้อมูลการตรวจของเดือนที่เลือก
  const selectedMonth = formData.inspection_date ? formData.inspection_date.substring(0, 7) : '';
  useEffect(() => {
    if (!selectedMonth) return;
    const fetchMonthData = async () => {
      const startDate = `${selectedMonth}-01`;
      const [y, m] = selectedMonth.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      const { data } = await supabase
        .from('five_s_inspections')
        .select('id, department_id, inspector_name, departments(name)')
        .gte('inspection_date', startDate)
        .lte('inspection_date', endDate);
      setMonthInspections(data || []);
    };
    fetchMonthData();
  }, [selectedMonth]);

  const totalScore = (
    (parseInt(formData.score_improvement) || 0) +
    (parseInt(formData.score_cleanliness) || 0) +
    (parseInt(formData.score_innovation) || 0)
  );

  const getRankLabel = (score) => {
    if (score >= 27) return { label: 'ดีเยี่ยม', color: '#10b981', bg: '#ecfdf5' };
    if (score >= 21) return { label: 'ดี', color: '#3b82f6', bg: '#eff6ff' };
    if (score >= 15) return { label: 'ปานกลาง', color: '#f59e0b', bg: '#fffbeb' };
    return { label: 'ต้องปรับปรุง', color: '#ef4444', bg: '#fef2f2' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.department_id) {
      setStatus({ type: 'error', message: 'กรุณาเลือกแผนก' });
      return;
    }

    const scores = [
      parseInt(formData.score_improvement),
      parseInt(formData.score_cleanliness),
      parseInt(formData.score_innovation)
    ];

    for (const s of scores) {
      if (isNaN(s) || s < 0 || s > 10) {
        setStatus({ type: 'error', message: 'คะแนนแต่ละหัวข้อต้องอยู่ระหว่าง 0-10' });
        return;
      }
    }

    // เช็คซ้ำ: คนเดียวกัน + แผนกเดียวกัน + เดือนเดียวกัน
    const isDuplicate = monthInspections.some(
      ins => ins.inspector_name === formData.inspector_name
        && String(ins.department_id) === String(formData.department_id)
    );
    if (isDuplicate) {
      const deptName = filteredDepartments.find(d => String(d.id) === String(formData.department_id))?.name || '';
      setStatus({ type: 'error', message: `"${formData.inspector_name}" ให้คะแนนแผนก "${deptName}" ในเดือนนี้แล้ว` });
      return;
    }

    setSubmitting(true);
    setStatus({ type: '', message: '' });

    const insertData = {
      department_id: parseInt(formData.department_id),
      inspector_name: formData.inspector_name,
      inspection_date: formData.inspection_date,
      score_improvement: scores[0],
      score_cleanliness: scores[1],
      score_innovation: scores[2],
      total_score: scores[0] + scores[1] + scores[2],
      notes: formData.notes || null
    };

    console.log('5S Insert data:', insertData);
    const { data, error } = await supabase.from('five_s_inspections').insert([insertData]).select();
    console.log('5S Insert result:', { data, error });

    if (!error) {
      setStatus({ type: 'success', message: 'บันทึกผลการตรวจ 5ส เรียบร้อยแล้ว' });
      // อัพเดทข้อมูลเดือนหลังบันทึกสำเร็จ
      setMonthInspections(prev => [...prev, {
        id: data?.[0]?.id,
        department_id: insertData.department_id,
        inspector_name: insertData.inspector_name,
        departments: { name: filteredDepartments.find(d => d.id === insertData.department_id)?.name }
      }]);
      setFormData({
        department_id: '',
        inspector_department_id: '',
        inspector_name: '',
        inspection_date: formData.inspection_date,
        score_improvement: '',
        score_cleanliness: '',
        score_innovation: '',
        notes: ''
      });
      window.scrollTo(0, 0);
    } else {
      setStatus({ type: 'error', message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
    setSubmitting(false);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">🏆 ตรวจประเมิน 5ส</h1>
        <p className="page-subtitle">กรอกคะแนนการตรวจ 5ส (3 หัวข้อ หัวข้อละ 10 คะแนน รวม 30 คะแนน)</p>
      </div>

      {status.message && (
        <div className={`alert alert-${status.type}`} style={{ marginBottom: '1.5rem' }}>
          {status.type === 'success' ? '✅' : '⚠️'} {status.message}
        </div>
      )}

      {/* Score Entry Form */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>📝 กรอกผลการตรวจ</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">แผนกที่ตรวจ</label>
                <select
                  className="form-select"
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  required
                  disabled={masterLoading}
                >
                  <option value="">-- เลือกแผนก (สาขาสุวรรณภูมิ) --</option>
                  {filteredDepartments
                    .filter(dept => !formData.inspector_department_id || String(dept.id) !== String(formData.inspector_department_id))
                    .map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">วันที่ตรวจ</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.inspection_date}
                  onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">แผนกผู้ตรวจ</label>
                <select
                  className="form-select"
                  value={formData.inspector_department_id}
                  onChange={(e) => setFormData({ ...formData, inspector_department_id: e.target.value, inspector_name: '' })}
                  required
                  disabled={masterLoading}
                >
                  <option value="">-- เลือกแผนกผู้ตรวจ --</option>
                  {filteredDepartments
                    .filter(dept => !formData.department_id || String(dept.id) !== String(formData.department_id))
                    .map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">ชื่อผู้ตรวจ</label>
                <select
                  className="form-select"
                  value={formData.inspector_name}
                  onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                  required
                  disabled={!formData.inspector_department_id}
                >
                  <option value="">{formData.inspector_department_id ? '-- เลือกผู้ตรวจ --' : '-- เลือกแผนกก่อน --'}</option>
                  {inspectorList.map(emp => (
                    <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                      {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scoring Section */}
          <div className="form-section">
            <h3 className="form-section-title">คะแนนการตรวจ (แต่ละหัวข้อ 0-10 คะแนน)</h3>

            {/* Score 1: Improvement */}
            <div className="form-group">
              <label className="form-label required">1. การเปลี่ยนแปลงที่ดีขึ้น (Improvement)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.score_improvement || 0}
                  onChange={(e) => setFormData({ ...formData, score_improvement: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}
                  value={formData.score_improvement}
                  onChange={(e) => setFormData({ ...formData, score_improvement: e.target.value })}
                  min="0"
                  max="10"
                  required
                />
                <span style={{ color: '#6b7280', minWidth: '30px' }}>/10</span>
              </div>
            </div>

            {/* Score 2: Cleanliness */}
            <div className="form-group">
              <label className="form-label required">2. ความสะอาด (Cleanliness)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.score_cleanliness || 0}
                  onChange={(e) => setFormData({ ...formData, score_cleanliness: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}
                  value={formData.score_cleanliness}
                  onChange={(e) => setFormData({ ...formData, score_cleanliness: e.target.value })}
                  min="0"
                  max="10"
                  required
                />
                <span style={{ color: '#6b7280', minWidth: '30px' }}>/10</span>
              </div>
            </div>

            {/* Score 3: Innovation */}
            <div className="form-group">
              <label className="form-label required">3. ความท้าทายแปลกใหม่ (Innovation)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.score_innovation || 0}
                  onChange={(e) => setFormData({ ...formData, score_innovation: e.target.value })}
                  style={{ flex: 1 }}
                />
                <input
                  type="number"
                  className="form-input"
                  style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}
                  value={formData.score_innovation}
                  onChange={(e) => setFormData({ ...formData, score_innovation: e.target.value })}
                  min="0"
                  max="10"
                  required
                />
                <span style={{ color: '#6b7280', minWidth: '30px' }}>/10</span>
              </div>
            </div>

            {/* Total Score Display */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1.25rem',
              borderRadius: '12px',
              background: getRankLabel(totalScore).bg,
              border: `2px solid ${getRankLabel(totalScore).color}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>คะแนนรวม</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: getRankLabel(totalScore).color }}>
                {totalScore} <span style={{ fontSize: '1rem' }}>/ 30</span>
              </div>
              <div style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.25rem 1rem',
                borderRadius: '9999px',
                background: getRankLabel(totalScore).color,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}>
                {getRankLabel(totalScore).label}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">หมายเหตุ / ข้อเสนอแนะ</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="บันทึกข้อเสนอแนะหรือสิ่งที่ต้องปรับปรุง"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={submitting || masterLoading}
            >
              {submitting ? 'กำลังบันทึก...' : '💾 บันทึกผลการตรวจ 5ส'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
