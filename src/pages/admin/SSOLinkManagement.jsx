import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://pfs-portal-hub.vercel.app';

export default function SSOLinkManagement() {
  const [users, setUsers] = useState([]);
  const [hubUsers, setHubUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHub, setLoadingHub] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [linkingUserId, setLinkingUserId] = useState(null);
  const [selectedHubId, setSelectedHubId] = useState('');
  const [manualHubId, setManualHubId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch Hr-Employee users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, email, role, is_active, hub_user_id')
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Hub users via API
  const fetchHubUsers = async () => {
    setLoadingHub(true);
    try {
      const response = await fetch(`${HUB_URL}/api/sso/users`);
      if (response.ok) {
        const data = await response.json();
        setHubUsers(data.users || []);
      } else {
        console.error('Failed to fetch hub users');
        setHubUsers([]);
      }
    } catch (error) {
      console.error('Error fetching hub users:', error);
      setHubUsers([]);
    } finally {
      setLoadingHub(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchHubUsers();
  }, []);

  // Link Hub user to Hr-Employee user
  const handleLink = async (userId) => {
    const hubId = showManualInput ? manualHubId : selectedHubId;

    if (!hubId) {
      setMessage({ type: 'error', text: 'กรุณาเลือก Hub User หรือกรอก Hub User ID' });
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ hub_user_id: hubId })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'เชื่อมต่อ Hub User สำเร็จ!' });
      setLinkingUserId(null);
      setSelectedHubId('');
      setManualHubId('');
      setShowManualInput(false);
      await fetchUsers();
    } catch (error) {
      console.error('Error linking user:', error);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + error.message });
    }
  };

  // Unlink Hub user
  const handleUnlink = async (userId) => {
    if (!confirm('ต้องการยกเลิกการเชื่อมต่อ Hub User หรือไม่?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ hub_user_id: null })
        .eq('id', userId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'ยกเลิกการเชื่อมต่อสำเร็จ!' });
      await fetchUsers();
    } catch (error) {
      console.error('Error unlinking user:', error);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + error.message });
    }
  };

  // Get linked Hub user info
  const getHubUserInfo = (hubUserId) => {
    const hubUser = hubUsers.find(u => u.id === hubUserId);
    return hubUser ? `${hubUser.username || hubUser.email}` : hubUserId?.substring(0, 8) + '...';
  };

  // Get available (unlinked) Hub users
  const getAvailableHubUsers = () => {
    const linkedHubIds = users.filter(u => u.hub_user_id).map(u => u.hub_user_id);
    return hubUsers.filter(u => !linkedHubIds.includes(u.id));
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.full_name && u.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const linkedCount = users.filter(u => u.hub_user_id).length;
  const unlinkedCount = users.filter(u => !u.hub_user_id && u.is_active).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔗 เชื่อมต่อ Hub SSO</h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={fetchHubUsers} disabled={loadingHub}>
            {loadingHub ? '⏳ กำลังโหลด...' : '🔄 โหลด Hub Users'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{linkedCount}</div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>✅ เชื่อมต่อแล้ว</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{unlinkedCount}</div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>⚠️ ยังไม่เชื่อมต่อ</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>{hubUsers.length}</div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>🏠 Hub Users ทั้งหมด</div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`card`} style={{
          padding: '1rem',
          marginBottom: '1rem',
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`,
          borderRadius: '0.5rem',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.type === 'success' ? '✅' : '❌'} {message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="search-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาผู้ใช้งาน..."
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
                <th>สถานะ Hub SSO</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center">กำลังโหลดข้อมูล...</td></tr>
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
                      {user.hub_user_id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-success">✅ เชื่อมต่อแล้ว</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {getHubUserInfo(user.hub_user_id)}
                          </span>
                        </div>
                      ) : (
                        <span className="badge badge-danger">❌ ยังไม่เชื่อมต่อ</span>
                      )}
                    </td>
                    <td>
                      {linkingUserId === user.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '250px' }}>
                          {!showManualInput ? (
                            <>
                              <select
                                className="form-select"
                                value={selectedHubId}
                                onChange={(e) => setSelectedHubId(e.target.value)}
                                style={{ fontSize: '0.85rem' }}
                              >
                                <option value="">-- เลือก Hub User --</option>
                                {getAvailableHubUsers().map(hu => (
                                  <option key={hu.id} value={hu.id}>
                                    {hu.username || hu.email} ({hu.email})
                                  </option>
                                ))}
                              </select>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setShowManualInput(true)}
                                style={{ fontSize: '0.75rem' }}
                              >
                                📝 กรอก UUID เอง
                              </button>
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="กรอก Hub User UUID..."
                                value={manualHubId}
                                onChange={(e) => setManualHubId(e.target.value)}
                                style={{ fontSize: '0.85rem' }}
                              />
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => { setShowManualInput(false); setManualHubId(''); }}
                                style={{ fontSize: '0.75rem' }}
                              >
                                📋 เลือกจากรายการ
                              </button>
                            </>
                          )}
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleLink(user.id)}
                            >
                              ✅ เชื่อมต่อ
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => { setLinkingUserId(null); setSelectedHubId(''); setManualHubId(''); setShowManualInput(false); }}
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="table-actions">
                          {user.hub_user_id ? (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleUnlink(user.id)}
                              title="ยกเลิกการเชื่อมต่อ"
                            >
                              🔓 ยกเลิก
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => { setLinkingUserId(user.id); fetchHubUsers(); }}
                              title="เชื่อมต่อ Hub User"
                            >
                              🔗 เชื่อมต่อ
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <div className="empty-state-icon">🔗</div>
                      <div className="empty-state-title">ไม่พบข้อมูลผู้ใช้งาน</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
