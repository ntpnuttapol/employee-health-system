import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useEffect } from 'react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { employees } = useMasterData();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'User',
    employee_id: '',
    is_active: true
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, employees(first_name, last_name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const userData = {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email || null,
        role: formData.role,
        employee_id: formData.employee_id || null,
        is_active: formData.is_active
      };

      if (editingUser) {
        // Update existing user
        if (formData.password) {
          userData.password = formData.password;
        }
        
        const { error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', editingUser.id);

        if (error) throw error;
      } else {
        // Create new user
        userData.password = formData.password;
        
        const { error } = await supabase
          .from('users')
          .insert([userData]);

        if (error) throw error;
      }

      await fetchUsers();
      closeModal();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถบันทึกข้อมูลได้'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('ต้องการลบผู้ใช้งานนี้หรือไม่?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('เกิดข้อผิดพลาด: ' + (error.message || 'ไม่สามารถลบข้อมูลได้'));
    }
  };

  const toggleActive = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      role: 'User',
      employee_id: '',
      is_active: true
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role,
      employee_id: user.employee_id || '',
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👤 จัดการผู้ใช้งาน (Users)</h1>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            ➕ เพิ่มผู้ใช้งาน
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
              placeholder="ค้นหาชื่อผู้ใช้..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>ชื่อ-สกุล</th>
                <th>Role</th>
                <th>พนักงาน</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center">กำลังโหลดข้อมูล...</td></tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td><span className="font-medium">{user.username}</span></td>
                    <td>{user.full_name || '-'}</td>
                    <td>
                      <span className={`badge ${user.role === 'Admin' ? 'badge-warning' : 'badge-info'}`}>
                        {user.role === 'Admin' ? '👑 Admin' : '👤 User'}
                      </span>
                    </td>
                    <td>
                      {user.employees ? (
                        `${user.employees.first_name} ${user.employees.last_name}`
                      ) : '-'}
                    </td>
                    <td>
                      <span 
                        className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleActive(user.id, user.is_active)}
                      >
                        {user.is_active ? '✓ เปิดใช้งาน' : '✗ ปิดใช้งาน'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEditModal(user)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(user.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon">👤</div>
                      <div className="empty-state-title">ไม่พบข้อมูลผู้ใช้งาน</div>
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? '✏️ แก้ไขผู้ใช้งาน' : '➕ เพิ่มผู้ใช้งานใหม่'}
              </h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    รหัสผ่าน
                    {editingUser && <span className="text-muted" style={{ fontSize: '0.8rem' }}>(เว้นว่างถ้าไม่ต้องการเปลี่ยน)</span>}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                    placeholder={editingUser ? '••••••••' : 'กรอกรหัสผ่าน'}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อ-สกุล</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                  />
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
                    <label className="form-label required">Role</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="User">👤 User</option>
                      <option value="Admin">👑 Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">เชื่อมโยงพนักงาน</label>
                    <select
                      className="form-select"
                      value={formData.employee_id}
                      onChange={e => setFormData({...formData, employee_id: e.target.value})}
                    >
                      <option value="">-- ไม่เชื่อมโยง --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    />
                    เปิดใช้งาน
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>ยกเลิก</button>
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
