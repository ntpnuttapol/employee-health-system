import { useState } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function BranchManagement() {
  const { branches, loading, addBranch, updateBranch, deleteBranch } = useMasterData();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ id: null, name: '', address: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Filter branches based on search
  const filteredBranches = branches.filter(branch =>
    branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleDelete = async (branch) => {
    if (window.confirm(`ยืนยันลบสาขา "${branch.name}"?`)) {
      const result = await deleteBranch(branch.id);
      if (!result.success) {
        alert('Error deleting branch: ' + result.error.message);
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
        <div className="search-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาสาขา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ชื่อสาขา</th>
                <th>ที่อยู่</th>
                <th>เบอร์โทรศัพท์</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredBranches.length > 0 ? (
                filteredBranches.map((branch) => (
                  <tr key={branch.id}>
                    <td className="font-medium">{branch.name}</td>
                    <td>{branch.address || '-'}</td>
                    <td>{branch.phone || '-'}</td>
                    <td><span className="badge badge-success">ใช้งาน</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenEdit(branch)}
                        >
                          ✏️ แก้ไข
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(branch)}
                        >
                          🗑️ ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏢</div>
                      <div className="empty-state-title">ไม่พบข้อมูลสาขา</div>
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
                  <textarea
                    className="form-textarea"
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
