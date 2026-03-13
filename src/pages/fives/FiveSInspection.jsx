import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import heic2any from 'heic2any';

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
  const [showInspectedList, setShowInspectedList] = useState(false);

  // Photo states
  const [photos, setPhotos] = useState([]); // { file, preview }
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    department_id: '',
    inspector_department_id: '',
    inspector_employee_id: '',
    inspector_name: '',
    inspection_date: new Date().toISOString().split('T')[0],
    score_improvement: '',
    score_cleanliness: '',
    score_innovation: '',
    notes: ''
  });

  const { user } = useAuth();

  // Auto-fill inspector details based on logged-in user if linked to employee
  useEffect(() => {
    if (user && user.employees) {
      setFormData(prev => ({
        ...prev,
        inspector_department_id: user.employees.department_id || '',
        inspector_employee_id: String(user.employees.id || ''),
        inspector_name: `${user.employees.first_name || ''} ${user.employees.last_name || ''}`.trim()
      }));
    }
  }, [user]);

  // กรองพนักงานตามแผนกที่เลือก
  const inspectorList = formData.inspector_department_id
    ? activeEmployees.filter(e => String(e.department_id) === String(formData.inspector_department_id))
    : [];

  // ดึงข้อมูลการตรวจของวันที่เลือก
  const selectedDate = formData.inspection_date || '';
  useEffect(() => {
    if (!selectedDate) return;
    const fetchDayData = async () => {
      const { data } = await supabase
        .from('five_s_inspections')
        .select('id, department_id, inspector_name, inspector_employee_id, departments(name)')
        .eq('inspection_date', selectedDate);
      
      // Filter out exact duplicates based on department_id and inspector for the state
      const uniqueData = (data || []).reduce((acc, current) => {
        const x = acc.find(item => item.department_id === current.department_id && 
                                   (item.inspector_employee_id === current.inspector_employee_id || 
                                    item.inspector_name === current.inspector_name));
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);
      
      setMonthInspections(uniqueData);
    };
    fetchDayData();
  }, [selectedDate]);

  const myInspections = monthInspections.filter(ins => {
    if (!formData.inspector_employee_id && !formData.inspector_name) return false;
    const sameInspector = formData.inspector_employee_id
      ? String(ins.inspector_employee_id) === String(formData.inspector_employee_id)
      : ins.inspector_name === formData.inspector_name;
    return sameInspector;
  });

  // Ensure unique departments in the displayed list
  const uniqueInspectedDepartments = myInspections.reduce((acc, current) => {
    const x = acc.find(item => item.department_id === current.department_id);
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []);

  const inspectedDepartmentIds = uniqueInspectedDepartments.map(ins => String(ins.department_id));

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

  // ---- Photo Handlers ----
  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const remaining = 20 - photos.length;
    if (remaining <= 0) {
      alert('แนบรูปได้สูงสุด 20 รูป');
      return;
    }
    const selected = files.slice(0, remaining);
    const toAdd = [];
    for (const file of selected) {
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
        || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
      let finalFile = file;
      if (isHeic) {
        try {
          const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
          finalFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
        } catch (err) {
          console.error('HEIC conversion failed:', err);
        }
      }
      toAdd.push({
        file: finalFile,
        preview: URL.createObjectURL(finalFile),
        id: `${Date.now()}-${Math.random()}`
      });
    }
    setPhotos(prev => [...prev, ...toAdd]);
    // Reset input value so same file can be re-selected
    if (e.target) e.target.value = '';
  };

  const removePhoto = (id) => {
    setPhotos(prev => {
      const removed = prev.find(p => p.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const uploadPhotos = async () => {
    if (!photos.length) return { urls: [], uploadError: null };
    setUploadingPhotos(true);
    const urls = [];
    let uploadError = null;
    for (const photo of photos) {
      const ext = photo.file.name.split('.').pop();
      const fileName = `five-s/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('five-s-images')
        .upload(fileName, photo.file, { upsert: false });
      if (!error) {
        const { data: urlData } = supabase.storage
          .from('five-s-images')
          .getPublicUrl(fileName);
        if (urlData?.publicUrl) urls.push(urlData.publicUrl);
      } else {
        console.error('Upload error:', error);
        uploadError = error.message || JSON.stringify(error);
      }
    }
    setUploadingPhotos(false);
    return { urls, uploadError };
  };

  // ---- Submit ----
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

    // เช็คซ้ำ (ใช้ employee ID ถ้ามี ไม่งั้นใช้ชื่อ)
    const isDuplicate = monthInspections.some(ins => {
      const sameInspector = formData.inspector_employee_id
        ? String(ins.inspector_employee_id) === String(formData.inspector_employee_id)
        : ins.inspector_name === formData.inspector_name;
      return sameInspector && String(ins.department_id) === String(formData.department_id);
    });
    if (isDuplicate) {
      const deptName = filteredDepartments.find(d => String(d.id) === String(formData.department_id))?.name || '';
      setStatus({ type: 'error', message: `"${formData.inspector_name}" ให้คะแนนแผนก "${deptName}" ในเดือนนี้แล้ว` });
      return;
    }

    setSubmitting(true);
    setStatus({ type: '', message: '' });

    // อัพโหลดรูปก่อน
    const { urls: photoUrls, uploadError } = await uploadPhotos();

    if (uploadError) {
      setStatus({ type: 'error', message: `❌ อัปโหลดรูปไม่สำเร็จ: ${uploadError}` });
      setSubmitting(false);
      return;
    }

    const insertData = {
      department_id: parseInt(formData.department_id),
      inspector_name: formData.inspector_name,
      inspector_employee_id: formData.inspector_employee_id ? parseInt(formData.inspector_employee_id) : null,
      inspection_date: formData.inspection_date,
      score_improvement: scores[0],
      score_cleanliness: scores[1],
      score_innovation: scores[2],
      total_score: scores[0] + scores[1] + scores[2],
      notes: formData.notes || null,
      photo_urls: photoUrls.length > 0 ? photoUrls : null
    };

    const { data, error } = await supabase.from('five_s_inspections').insert([insertData]).select();

    if (!error) {
      setStatus({ type: 'success', message: `บันทึกผลการตรวจ 5ส เรียบร้อยแล้ว${photoUrls.length > 0 ? ` (แนบรูป ${photoUrls.length} รูป)` : ''}` });
      
      // Update monthInspections state, avoiding duplicates
      setMonthInspections(prev => {
        const isAlreadyInPrev = prev.some(item => 
          item.department_id === insertData.department_id && 
          (item.inspector_employee_id === insertData.inspector_employee_id || 
           item.inspector_name === insertData.inspector_name)
        );
        if (isAlreadyInPrev) return prev;
        
        return [...prev, {
          id: data?.[0]?.id,
          department_id: insertData.department_id,
          inspector_name: insertData.inspector_name,
          inspector_employee_id: insertData.inspector_employee_id,
          departments: { name: filteredDepartments.find(d => d.id === insertData.department_id)?.name }
        }];
      });
      
      // Reset form
      setFormData({
        department_id: '',
        inspector_department_id: user?.employees?.department_id || '',
        inspector_employee_id: user?.employees?.id ? String(user.employees.id) : '',
        inspector_name: user?.employees ? `${user.employees.first_name || ''} ${user.employees.last_name || ''}`.trim() : '',
        inspection_date: formData.inspection_date,
        score_improvement: '',
        score_cleanliness: '',
        score_innovation: '',
        notes: ''
      });
      // Clear photos
      photos.forEach(p => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      window.scrollTo(0, 0);
    } else {
      setStatus({ type: 'error', message: 'เกิดข้อผิดพลาด: ' + error.message });
    }
    setSubmitting(false);
  };

  const rank = getRankLabel(totalScore);

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
          {/* Department + Date */}
          <div className="form-section">
            <div className="form-row">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label required" style={{ marginBottom: 0 }}>แผนกที่ตรวจ</label>
                  <button 
                    type="button" 
                    onClick={() => setShowInspectedList(!showInspectedList)}
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '0.25rem 0.5rem', 
                      backgroundColor: '#e5e7eb', 
                      color: '#374151',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {showInspectedList ? 'ซ่อน' : `🔍 ดูแผนกที่ตรวจแล้ว (${uniqueInspectedDepartments.length})`}
                  </button>
                </div>
                {showInspectedList && (
                  <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#4b5563' }}>✅ แผนกที่คุณตรวจแล้ววันที่ {selectedDate}:</strong>
                    {uniqueInspectedDepartments.length > 0 ? (
                      <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0, color: '#10b981' }}>
                        {uniqueInspectedDepartments.map(ins => (
                          <li key={ins.id || ins.department_id} style={{ marginBottom: '0.25rem' }}>{ins.departments?.name || 'ไม่ทราบแผนก'}</li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ color: '#6b7280', marginTop: '0.5rem' }}>ยังไม่ได้ตรวจแผนกใดเลย</div>
                    )}
                  </div>
                )}
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
                    .filter(dept => !inspectedDepartmentIds.includes(String(dept.id))) // กรองเฉพาะแผนกที่ผู้ตรวจคนนี้เคยตรวจไปแล้ว
                    .filter(dept => !dept.name.toLowerCase().includes('safety')) // Exclude Safety department
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
                  disabled={masterLoading || !!user?.employees?.department_id}
                >
                  <option value="">-- เลือกแผนกผู้ตรวจ --</option>
                  {filteredDepartments
                    .filter(dept => !formData.department_id || String(dept.id) !== String(formData.department_id))
                    .map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
                {user?.employees?.department_id && formData.inspector_department_id === String(user.employees.department_id) && (
                  <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.25rem' }}>✓ เลือกจากข้อมูลของคุณอัตโนมัติ</div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label required">ชื่อผู้ตรวจ</label>
                <select
                  className="form-select"
                  value={formData.inspector_employee_id}
                  onChange={(e) => {
                    const selected = inspectorList.find(emp => String(emp.id) === e.target.value);
                    setFormData({
                      ...formData,
                      inspector_employee_id: e.target.value,
                      inspector_name: selected ? `${selected.first_name} ${selected.last_name}`.trim() : ''
                    });
                  }}
                  required
                  disabled={!formData.inspector_department_id || !!user?.employees?.department_id}
                >
                  <option value="">{formData.inspector_department_id ? '-- เลือกผู้ตรวจ --' : '-- เลือกแผนกก่อน --'}</option>
                  {inspectorList.map(emp => (
                    <option key={emp.id} value={String(emp.id)}>
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
              <div className="score-row">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.score_improvement || 0}
                  onChange={(e) => setFormData({ ...formData, score_improvement: e.target.value })}
                  className="score-range"
                />
                <div className="score-number-wrap">
                  <input
                    type="number"
                    className="form-input score-number-input"
                    value={formData.score_improvement}
                    onChange={(e) => setFormData({ ...formData, score_improvement: e.target.value })}
                    min="0"
                    max="10"
                    required
                  />
                  <span className="score-unit">/10</span>
                </div>
              </div>
            </div>

            {/* Score 2: Cleanliness */}
            <div className="form-group">
              <label className="form-label required">2. ความสะอาด (Cleanliness)</label>
              <div className="score-row">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.score_cleanliness || 0}
                  onChange={(e) => setFormData({ ...formData, score_cleanliness: e.target.value })}
                  className="score-range"
                />
                <div className="score-number-wrap">
                  <input
                    type="number"
                    className="form-input score-number-input"
                    value={formData.score_cleanliness}
                    onChange={(e) => setFormData({ ...formData, score_cleanliness: e.target.value })}
                    min="0"
                    max="10"
                    required
                  />
                  <span className="score-unit">/10</span>
                </div>
              </div>
            </div>

            {/* Score 3: Innovation */}
            <div className="form-group">
              <label className="form-label required">3. ความท้าทายแปลกใหม่ (Innovation)</label>
              <div className="score-row">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={formData.score_innovation || 0}
                  onChange={(e) => setFormData({ ...formData, score_innovation: e.target.value })}
                  className="score-range"
                />
                <div className="score-number-wrap">
                  <input
                    type="number"
                    className="form-input score-number-input"
                    value={formData.score_innovation}
                    onChange={(e) => setFormData({ ...formData, score_innovation: e.target.value })}
                    min="0"
                    max="10"
                    required
                  />
                  <span className="score-unit">/10</span>
                </div>
              </div>
            </div>

            {/* Total Score Display */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1.25rem',
              borderRadius: '12px',
              background: rank.bg,
              border: `2px solid ${rank.color}`,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>คะแนนรวม</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: rank.color }}>
                {totalScore} <span style={{ fontSize: '1rem' }}>/ 30</span>
              </div>
              <div style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '0.25rem 1rem',
                borderRadius: '9999px',
                background: rank.color,
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '0.95rem'
              }}>
                {rank.label}
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

          {/* Photo Upload Section */}
          <div className="form-section">
            <h3 className="form-section-title">📷 แนบรูปภาพหลักฐาน</h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              แนบรูปภาพได้สูงสุด 5 รูป (JPEG, PNG, HEIC) — คลิกหรือถ่ายจากกล้อง
            </p>

            {/* Upload Area */}
            <div
              className="photo-upload-area"
              onClick={() => photos.length < 20 && fileInputRef.current?.click()}
              style={{ cursor: photos.length >= 20 ? 'not-allowed' : 'pointer' }}
            >
              <div className="photo-upload-icon">📷</div>
              <div className="photo-upload-text">
                {photos.length >= 20
                  ? 'ครบ 20 รูปแล้ว'
                  : `แตะเพื่อเลือกรูป หรือถ่ายรูป (${photos.length}/20)`}
              </div>
              <div className="photo-upload-hint">รองรับ JPG, PNG, HEIC</div>
            </div>

            {/* Hidden File Input — รองรับกล้องมือถือด้วย */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              style={{ display: 'none' }}
              onChange={handlePhotoSelect}
            />

            {/* Also a gallery-style select button that doesn't force camera */}
            {photos.length < 20 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    // Create a temp input without capture for gallery mode
                    const inp = document.createElement('input');
                    inp.type = 'file';
                    inp.accept = 'image/*';
                    inp.multiple = true;
                    inp.onchange = handlePhotoSelect;
                    inp.click();
                  }}
                >
                  🖼️ เลือกจากคลัง
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📸 ถ่ายรูป (กล้อง)
                </button>
              </div>
            )}

            {/* Photo Preview Grid */}
            {photos.length > 0 && (
              <div className="photo-preview-grid">
                {photos.map(photo => (
                  <div key={photo.id} className="photo-thumb">
                    <img
                      src={photo.preview}
                      alt="preview"
                      className="photo-thumb-img"
                      onClick={() => setLightboxUrl(photo.preview)}
                    />
                    <button
                      type="button"
                      className="photo-thumb-remove"
                      onClick={() => removePhoto(photo.id)}
                      title="ลบรูป"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={submitting || masterLoading || uploadingPhotos}
            >
              {submitting
                ? (uploadingPhotos ? `⏳ กำลังอัพโหลดรูป (${photos.length} รูป)...` : 'กำลังบันทึก...')
                : '💾 บันทึกผลการตรวจ 5ส'}
            </button>
          </div>
        </form>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="photo-lightbox"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="photo-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button
              className="photo-lightbox-close"
              onClick={() => setLightboxUrl(null)}
            >✕</button>
            <img src={lightboxUrl} alt="ขยาย" className="photo-lightbox-img" />
          </div>
        </div>
      )}
    </div>
  );
}
