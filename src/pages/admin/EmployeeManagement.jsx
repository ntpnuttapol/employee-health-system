import { useState } from 'react';
import { useMasterData } from '../../contexts/MasterDataContext';

export default function EmployeeManagement() {
  const { employees, branches, departments, positions, loading, addEmployee, updateEmployee, deactivateEmployee, activateEmployee } = useMasterData();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterBranchId, setFilterBranchId] = useState('');
  const [formData, setFormData] = useState({
    id: null, code: '', firstName: '', lastName: '', email: '', phone: '',
    branchId: '', departmentId: '', positionId: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Custom confirm dialog (replaces window.confirm to fix INP blocking issue)
  const [confirmAction, setConfirmAction] = useState(null); // { emp, action, label }

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by active status (default: show only active)
    const isActive = emp.is_active !== false; // treat null/undefined as active
    const matchesStatus = showInactive ? true : isActive;

    // Filter by branch
    const matchesBranch = filterBranchId ? String(emp.branch_id) === String(filterBranchId) : true;

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const handleOpenAdd = () => {
    setFormData({
      id: null, code: '', firstName: '', lastName: '', email: '', phone: '',
      branchId: '', departmentId: '', positionId: ''
    });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleOpenEdit = (emp) => {
    setFormData({
      id: emp.id,
      code: emp.employee_code || '',
      firstName: emp.first_name || '',
      lastName: emp.last_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      branchId: emp.branch_id || '',
      departmentId: emp.department_id || '',
      positionId: emp.position_id || ''
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    let result;
    if (isEditing) {
      result = await updateEmployee(formData.id, formData);
    } else {
      result = await addEmployee(formData);
    }

    setSubmitting(false);

    if (result.success) {
      setShowModal(false);
      setFormData({
        id: null, code: '', firstName: '', lastName: '', email: '', phone: '',
        branchId: '', departmentId: '', positionId: ''
      });
    } else {
      alert('Error: ' + result.error.message);
    }
  };

  // Step 1: Request confirmation (non-blocking — opens custom dialog)
  const handleToggleActive = (emp) => {
    const isCurrentlyActive = emp.is_active !== false;
    setConfirmAction({
      emp,
      isCurrentlyActive,
      label: isCurrentlyActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'
    });
  };

  // Step 2: User clicked Confirm in the custom dialog
  const handleConfirmToggle = async () => {
    if (!confirmAction) return;
    const { emp, isCurrentlyActive } = confirmAction;
    setConfirmAction(null); // close dialog immediately
    const result = isCurrentlyActive
      ? await deactivateEmployee(emp.id)
      : await activateEmployee(emp.id);
    if (!result.success) {
      alert('Error: ' + result.error.message);
    }
  };


  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👥 จัดการพนักงาน (Employees)</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            ➕ เพิ่มพนักงาน
          </button>
        </div>
      </div>

      <div className="card">
        <div className="search-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-input-wrapper" style={{ flex: 1, minWidth: '250px' }}>
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาชื่อ หรือรหัสพนักงาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-select"
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              style={{ minWidth: '180px' }}
            >
              <option value="">-- ทุกสาขา --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            แสดงพนักงานที่ปิดใช้งาน
          </label>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อ-นามสกุล</th>
                <th>ตำแหน่ง/แผนก</th>
                <th>สาขา</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const isActive = emp.is_active !== false;
                  return (
                    <tr key={emp.id} style={{ opacity: isActive ? 1 : 0.6 }}>
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
                        <span
                          className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleActive(emp)}
                        >
                          {isActive ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenEdit(emp)}
                          >
                            ✏️ แก้ไข
                          </button>
                          <button
                            className={`btn btn-sm ${isActive ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => handleToggleActive(emp)}
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
              <h3 className="modal-title">{isEditing ? '✏️ แก้ไขพนักงาน' : '➕ เพิ่มพนักงานใหม่'}</h3>
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
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
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
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">นามสกุล</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">สาขา</label>
                    <select
                      className="form-select"
                      value={formData.branchId}
                      onChange={e => setFormData({ ...formData, branchId: e.target.value })}
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
                      onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
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
                    onChange={e => setFormData({ ...formData, positionId: e.target.value })}
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

      {/* Custom Confirm Dialog — replaces window.confirm (fixes INP blocking) */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setConfirmAction(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '1.5rem',
              maxWidth: '360px', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
            }}
          >
            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '0.75rem' }}>
              {confirmAction.isCurrentlyActive ? '⛔' : '✅'}
            </div>
            <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.05rem' }}>
              ยืนยัน{confirmAction.label}
            </h3>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              {confirmAction.emp.first_name} {confirmAction.emp.last_name}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>ยกเลิก</button>
              <button
                className={`btn ${confirmAction.isCurrentlyActive ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleConfirmToggle}
              >
                {confirmAction.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

