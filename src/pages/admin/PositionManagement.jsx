import { useState } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function PositionManagement() {
  const { positions, loading, addPosition, updatePosition, deletePosition } = useMasterData();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ id: null, name: '', level: 'ปฏิบัติการ' });
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const filteredPositions = positions.filter(pos =>
    pos.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pos.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setFormData({ id: null, name: '', level: 'ปฏิบัติการ' });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleOpenEdit = (pos) => {
    setFormData({ 
      id: pos.id, 
      name: pos.name, 
      level: pos.level || 'ปฏิบัติการ'
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    let result;
    if (isEditing) {
      result = await updatePosition(formData.id, formData.name, formData.level);
    } else {
      result = await addPosition(formData.name, formData.level);
    }
    
    setSubmitting(false);

    if (result.success) {
      setShowModal(false);
      setFormData({ id: null, name: '', level: 'ปฏิบัติการ' });
    } else {
      alert('Error: ' + result.error.message);
    }
  };

  const handleDelete = async (pos) => {
    if (window.confirm(`ยืนยันลบตำแหน่ง "${pos.name}"?`)) {
      const result = await deletePosition(pos.id);
      if (!result.success) {
        alert('Error deleting position: ' + result.error.message);
      }
    }
  };

  const getLevelBadge = (level) => {
    switch (level) {
      case 'บริหาร': return 'badge-primary';
      case 'ปฏิบัติการ': return 'badge-info';
      case 'ฝึกงาน': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">💼 จัดการตำแหน่ง (Positions)</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            ➕ เพิ่มตำแหน่ง
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
              placeholder="ค้นหาตำแหน่ง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ชื่อตำแหน่ง</th>
                <th>ระดับ</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredPositions.length > 0 ? (
                filteredPositions.map((pos) => (
                  <tr key={pos.id}>
                    <td className="font-medium">{pos.name}</td>
                    <td><span className={`badge ${getLevelBadge(pos.level)}`}>{pos.level}</span></td>
                    <td><span className="badge badge-success">ใช้งาน</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenEdit(pos)}
                        >
                          ✏️ แก้ไข
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(pos)}
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
                      <div className="empty-state-icon">💼</div>
                      <div className="empty-state-title">ไม่พบข้อมูลตำแหน่ง</div>
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
              <h3 className="modal-title">{isEditing ? '✏️ แก้ไขตำแหน่ง' : '➕ เพิ่มตำแหน่งใหม่'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">ชื่อตำแหน่ง</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">ระดับ</label>
                  <select
                    className="form-select"
                    value={formData.level}
                    onChange={e => setFormData({...formData, level: e.target.value})}
                    required
                  >
                    <option value="บริหาร">บริหาร</option>
                    <option value="ปฏิบัติการ">ปฏิบัติการ</option>
                    <option value="ฝึกงาน">ฝึกงาน</option>
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
