import { useState } from 'react';
import { useActivity } from '../../contexts/ActivityContext';

export default function ActivityList() {
  const { activities, addActivity, updateActivity, deleteActivity } = useActivity();
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', date: '', startTime: '', endTime: '', location: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingActivity) {
      updateActivity(editingActivity.id, formData);
    } else {
      addActivity(formData);
    }
    closeModal();
  };

  const openAddModal = () => {
    setEditingActivity(null);
    setFormData({ name: '', description: '', date: '', startTime: '', endTime: '', location: '' });
    setShowModal(true);
  };

  const openEditModal = (activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      description: activity.description,
      date: activity.date,
      startTime: activity.startTime,
      endTime: activity.endTime,
      location: activity.location
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingActivity(null);
  };

  const handleDelete = (id) => {
    if (confirm('ต้องการลบกิจกรรมนี้หรือไม่?')) {
      deleteActivity(id);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const isUpcoming = (dateStr) => {
    return new Date(dateStr) >= new Date();
  };

  const filteredActivities = activities.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">รายการกิจกรรม</h1>
        <p className="page-subtitle">จัดการกิจกรรมและดูสถิติผู้เข้าร่วม</p>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openAddModal}>
            ➕ เพิ่มกิจกรรมใหม่
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
              placeholder="ค้นหากิจกรรม..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>กิจกรรม</th>
                <th>วันที่</th>
                <th>เวลา</th>
                <th>สถานที่</th>
                <th>ผู้เข้าร่วม</th>
                <th>สถานะ</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length > 0 ? (
                filteredActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <div className="font-medium">{activity.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>{activity.description}</div>
                    </td>
                    <td>{formatDate(activity.date)}</td>
                    <td>{activity.startTime} - {activity.endTime}</td>
                    <td>{activity.location}</td>
                    <td><span className="badge badge-info">{activity.attendees} คน</span></td>
                    <td>
                      {isUpcoming(activity.date) ? (
                        <span className="badge badge-warning">กำลังมาถึง</span>
                      ) : (
                        <span className="badge badge-success">เสร็จสิ้น</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => window.location.href = `/activities/${activity.id}`}
                          title="ดูรายละเอียด"
                        >
                          👁️
                        </button>
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEditModal(activity)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(activity.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-title">ไม่พบกิจกรรม</div>
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
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingActivity ? '✏️ แก้ไขกิจกรรม' : '➕ เพิ่มกิจกรรมใหม่'}
              </h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label required">ชื่อกิจกรรม</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="กรอกชื่อกิจกรรม"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">รายละเอียด</label>
                  <textarea
                    className="form-textarea"
                    placeholder="กรอกรายละเอียดกิจกรรม"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">วันที่</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">สถานที่</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="สถานที่จัดกิจกรรม"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">เวลาเริ่ม</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">เวลาสิ้นสุด</label>
                    <input
                      type="time"
                      className="form-input"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingActivity ? 'บันทึกการแก้ไข' : 'เพิ่มกิจกรรม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
