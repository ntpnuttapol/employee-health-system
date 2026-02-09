import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    display_name: user?.display_name || '',
    email: user?.email || ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: profileData.display_name,
          email: profileData.email,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' });
      setIsSaving(false);
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      setIsSaving(false);
      return;
    }
    
    try {
      // Verify current password first
      const { data: userData, error: verifyError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .single();
      
      if (verifyError) throw verifyError;
      
      // Simple password check (in production, use proper hashing)
      if (userData.password_hash !== passwordData.currentPassword) {
        setMessage({ type: 'error', text: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        setIsSaving(false);
        return;
      }
      
      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordData.newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      setMessage({ type: 'success', text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">👤 โปรไฟล์ของฉัน</h1>
        <p className="page-subtitle">จัดการข้อมูลส่วนตัวและรหัสผ่าน</p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: 'white'
          }}>
            {user?.display_name?.charAt(0)?.toUpperCase() || '👤'}
          </div>
          <div>
            <h2 className="card-title" style={{ marginBottom: '0.25rem' }}>{user?.display_name || user?.username}</h2>
            <span className={`badge ${user?.role === 'admin' ? 'badge-error' : 'badge-info'}`}>
              {user?.role === 'admin' ? '👑 Admin' : '👤 User'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
          <button 
            className={`btn ${activeTab === 'info' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('info')}
          >
            📝 ข้อมูลส่วนตัว
          </button>
          <button 
            className={`btn ${activeTab === 'password' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('password')}
          >
            🔐 เปลี่ยนรหัสผ่าน
          </button>
        </div>

        {message.text && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
          </div>
        )}

        {/* Personal Info Tab */}
        {activeTab === 'info' && (
          <div>
            <div className="form-group">
              <label className="form-label">ชื่อผู้ใช้งาน (Username)</label>
              <input
                type="text"
                className="form-input"
                value={user?.username || ''}
                disabled
                style={{ background: 'var(--color-bg-secondary)' }}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>ไม่สามารถเปลี่ยนแปลงได้</small>
            </div>

            <div className="form-group">
              <label className="form-label">ชื่อที่แสดง (Display Name)</label>
              <input
                type="text"
                className="form-input"
                value={profileData.display_name}
                onChange={(e) => setProfileData({ ...profileData, display_name: e.target.value })}
                disabled={!isEditing}
                placeholder="กรอกชื่อที่ต้องการแสดง"
              />
            </div>

            <div className="form-group">
              <label className="form-label">อีเมล</label>
              <input
                type="email"
                className="form-input"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                disabled={!isEditing}
                placeholder="example@email.com"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              {!isEditing ? (
                <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                  ✏️ แก้ไขข้อมูล
                </button>
              ) : (
                <>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleProfileSave}
                    disabled={isSaving}
                  >
                    {isSaving ? 'กำลังบันทึก...' : '💾 บันทึก'}
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setIsEditing(false);
                      setProfileData({
                        display_name: user?.display_name || '',
                        email: user?.email || ''
                      });
                    }}
                  >
                    ยกเลิก
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label className="form-label">รหัสผ่านปัจจุบัน</label>
              <input
                type="password"
                className="form-input"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">รหัสผ่านใหม่</label>
              <input
                type="password"
                className="form-input"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <small style={{ color: 'var(--color-text-muted)' }}>ต้องมีอย่างน้อย 6 ตัวอักษร</small>
            </div>

            <div className="form-group">
              <label className="form-label">ยืนยันรหัสผ่านใหม่</label>
              <input
                type="password"
                className="form-input"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
              style={{ marginTop: '1rem' }}
            >
              {isSaving ? 'กำลังบันทึก...' : '🔐 เปลี่ยนรหัสผ่าน'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
