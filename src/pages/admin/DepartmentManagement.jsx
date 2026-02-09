import { useState } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function DepartmentManagement() {
  const { departments, branches, loading, addDepartment, updateDepartment, deactivateDepartment, activateDepartment } = useMasterData();
  const [showModal, setShowModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', branchId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filter only active branches for dropdown
  const activeBranches = branches.filter(b => b.is_active !== false);

  // Filter departments by active status
  const filteredDepartments = departments.filter(d => {
    const isActive = d.is_active !== false;
    return showInactive ? true : isActive;
  });

  const handleOpenAdd = () => {
    setFormData({ id: null, name: '', branchId: '' });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleOpenEdit = (dept) => {
    setFormData({ 
      id: dept.id, 
      name: dept.name, 
      branchId: dept.branch_id || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    let result;
    if (isEditing) {
      result = await updateDepartment(formData.id, formData.name, formData.branchId);
    } else {
      result = await addDepartment(formData.name, formData.branchId);
    }
    
    setSubmitting(false);

    if (result.success) {
      setShowModal(false);
      setFormData({ id: null, name: '', branchId: '' });
    } else {
      alert('Error: ' + result.error.message);
    }
  };

  const handleToggleActive = async (dept) => {
    const isCurrentlyActive = dept.is_active !== false;
    const action = isCurrentlyActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
    
    if (window.confirm(`ยืนยัน${action}แผนก "${dept.name}"?`)) {
      const result = isCurrentlyActive 
        ? await deactivateDepartment(dept.id)
        : await activateDepartment(dept.id);
        
      if (!result.success) {
        alert('Error: ' + result.error.message);
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏛️ จัดการแผนก (Departments)</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            ➕ เพิ่มแผนก
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            แสดงแผนกที่ปิดใช้งาน
          </label>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ชื่อแผนก</th>
                <th>สาขา</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept) => {
                  const isActive = dept.is_active !== false;
                  return (
                    <tr key={dept.id} style={{ opacity: isActive ? 1 : 0.6 }}>
                      <td className="font-medium">{dept.name}</td>
                      <td>{dept.branches?.name || '-'}</td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {isActive ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenEdit(dept)}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button 
                            className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => handleToggleActive(dept)}
                          >
                            {isActive ? '🚫 ปิด' : '✓ เปิด'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏛️</div>
                      <div className="empty-state-title">ไม่มีข้อมูลแผนก</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{isEditing ? '✏️ แก้ไขแผนก' : '➕ เพิ่มแผนกใหม่'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">ชื่อแผนก</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">สังกัดสาขา</label>
                  <select
                    className="form-select"
                    value={formData.branchId}
                    onChange={e => setFormData({...formData, branchId: e.target.value})}
                    required
                  >
                    <option value="">-- เลือกสาขา --</option>
                    {activeBranches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
