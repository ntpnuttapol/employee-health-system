import { useState } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function EmployeeManagement() {
  const { employees, branches, departments, positions, loading, addEmployee } = useMasterData();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    code: '', firstName: '', lastName: '', email: '', phone: '',
    branchId: '', departmentId: '', positionId: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter employees
  const filteredEmployees = employees.filter(emp =>
    emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await addEmployee(formData);
    setSubmitting(false);

    if (result.success) {
      setShowModal(false);
      setFormData({
        code: '', firstName: '', lastName: '', email: '', phone: '',
        branchId: '', departmentId: '', positionId: ''
      });
    } else {
      alert('Error adding employee: ' + result.error.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👥 จัดการพนักงาน (Employees)</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ เพิ่มพนักงาน
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
              placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ตำแหน่ง/แผนก</th>
                <th>สาขา</th>
                <th>เบอร์โทร/อีเมล</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id}>
                    <td><span className="badge badge-secondary">{emp.employee_code}</span></td>
                    <td>
                      <div className="font-medium">{emp.first_name} {emp.last_name}</div>
                    </td>
                    <td>
                      <div className="text-sm">{emp.positions?.name}</div>
                      <div className="text-muted text-xs">{emp.departments?.name}</div>
                    </td>
                    <td>{emp.branches?.name}</td>
                    <td>
                      <div className="text-sm">{emp.phone}</div>
                      <div className="text-muted text-xs">{emp.email}</div>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-secondary">✏️</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon">👨‍💼</div>
                      <div className="empty-state-title">ไม่พบข้อมูลพนักงาน</div>
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
          <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">➕ เพิ่มพนักงานใหม่</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">รหัสพนักงาน</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">ชื่อ</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">นามสกุล</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">อีเมล</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">สาขา</label>
                    <select
                      className="form-select"
                      value={formData.branchId}
                      onChange={e => setFormData({...formData, branchId: e.target.value})}
                      required
                    >
                      <option value="">-- เลือกสาขา --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">แผนก</label>
                    <select
                      className="form-select"
                      value={formData.departmentId}
                      onChange={e => setFormData({...formData, departmentId: e.target.value})}
                      required
                    >
                      <option value="">-- เลือกแผนก --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.branches?.name})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">ตำแหน่ง</label>
                  <select
                    className="form-select"
                    value={formData.positionId}
                    onChange={e => setFormData({...formData, positionId: e.target.value})}
                    required
                  >
                    <option value="">-- เลือกตำแหน่ง --</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
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
