import { useState } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function BranchManagement() {
  const { branches, loading, addBranch, updateBranch, deactivateBranch, activateBranch } = useMasterData();
  const [showModal, setShowModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', address: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filter branches by active status
  const filteredBranches = branches.filter(b => {
    const isActive = b.is_active !== false;
    return showInactive ? true : isActive;
  });

  const handleOpenAdd = () => {
    setFormData({ id: null, name: '', address: '', phone: '' });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleOpenEdit = (branch) => {
    setFormData({ 
      id: branch.id, 
      name: branch.name, 
      address: branch.address || '', 
      phone: branch.phone || '' 
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    let result;
    if (isEditing) {
      result = await updateBranch(formData.id, formData.name, formData.address, formData.phone);
    } else {
      result = await addBranch(formData.name, formData.address, formData.phone);
    }
    
    setSubmitting(false);

    if (result.success) {
      setShowModal(false);
      setFormData({ id: null, name: '', address: '', phone: '' });
    } else {
      alert('Error: ' + result.error.message);
    }
  };

  const handleToggleActive = async (branch) => {
    const isCurrentlyActive = branch.is_active !== false;
    const action = isCurrentlyActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน';
    
    if (window.confirm(`ยืนยัน${action}สาขา "${branch.name}"?`)) {
      const result = isCurrentlyActive 
        ? await deactivateBranch(branch.id)
        : await activateBranch(branch.id);
        
      if (!result.success) {
        alert('Error: ' + result.error.message);
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏢 จัดการสาขา (Branches)</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            ➕ เพิ่มสาขา
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
            แสดงสาขาที่ปิดใช้งาน
          </label>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ชื่อสาขา</th>
                <th>ที่อยู่</th>
                <th>โทรศัพท์</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredBranches.length > 0 ? (
                filteredBranches.map((branch) => {
                  const isActive = branch.is_active !== false;
                  return (
                    <tr key={branch.id} style={{ opacity: isActive ? 1 : 0.6 }}>
                      <td className="font-medium">{branch.name}</td>
                      <td>{branch.address || '-'}</td>
                      <td>{branch.phone || '-'}</td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {isActive ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenEdit(branch)}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button 
                            className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => handleToggleActive(branch)}
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
                  <td colSpan="5">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏢</div>
                      <div className="empty-state-title">ไม่มีข้อมูลสาขา</div>
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
              <h3 className="modal-title">{isEditing ? '✏️ แก้ไขสาขา' : '➕ เพิ่มสาขาใหม่'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">ชื่อสาขา</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ที่อยู่</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
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
