import { useState } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function DepartmentManagement() {
  const { departments, branches, loading, addDepartment, updateDepartment, deleteDepartment } = useMasterData();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ id: null, name: '', branchId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.branches?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleDelete = async (dept) => {
    if (window.confirm(`ยืนยันลบแผนก "${dept.name}"?`)) {
      const result = await deleteDepartment(dept.id);
      if (!result.success) {
        alert('Error deleting department: ' + result.error.message);
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
        <div className="search-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาแผนก..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
                filteredDepartments.map((dept) => (
                  <tr key={dept.id}>
                    <td className="font-medium">{dept.name}</td>
                    <td><span className="badge badge-info">{dept.branches?.name || '-'}</span></td>
                    <td><span className="badge badge-success">ใช้งาน</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenEdit(dept)}
                        >
                          ✏️ แก้ไข
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(dept)}
                        >
                          🗑️ ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏛️</div>
                      <div className="empty-state-title">ไม่พบข้อมูลแผนก</div>
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
                  <label className="form-label required">สาขา</label>
                  <select
                    className="form-select"
                    value={formData.branchId}
                    onChange={e => setFormData({...formData, branchId: e.target.value})}
                    required
                  >
                    <option value="">-- เลือกสาขา --</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
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
