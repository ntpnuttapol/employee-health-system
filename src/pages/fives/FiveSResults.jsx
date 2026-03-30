import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import confetti from 'canvas-confetti';

export default function FiveSResults() {
  const { departments, branches, employees, loading: masterLoading } = useMasterData();
  const { isAdmin, user } = useAuth();

  // ล็อกเฉพาะสาขาสุวรรณภูมิ
  const suvarnabhumiBranch = (branches || []).find(b => b.name.includes('สุวรรณภูมิ'));
  const filteredDepartments = (departments || []).filter(
    d => d.is_active !== false && suvarnabhumiBranch && d.branch_id === suvarnabhumiBranch.id
  );
  const activeEmployees = (employees || []).filter(
    e => e.is_active !== false && suvarnabhumiBranch && e.branch_id === suvarnabhumiBranch.id
  );
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default ให้เป็นวันที่ปัจจุบัน YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(todayStr);

  const [searchName, setSearchName] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [showRankingPopup, setShowRankingPopup] = useState(false);
  const [podiumPhase, setPodiumPhase] = useState(-1);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [galleryPhotos, setGalleryPhotos] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [votes, setVotes] = useState([]);
  const [showVoteResults, setShowVoteResults] = useState(false);
  const [voteRevealIndex, setVoteRevealIndex] = useState(-1); // -1 = not started
  const [showVoteStatus, setShowVoteStatus] = useState(false);
  const [voteDetails, setVoteDetails] = useState([]);
  const [loadingVoteDetails, setLoadingVoteDetails] = useState(false);

  // Edit Window State
  const [editWindow, setEditWindow] = useState(null); // current active edit window for filterDate
  const [editWindowLoading, setEditWindowLoading] = useState(false);

  // Check if edit window is currently open for the selected date
  const isEditWindowOpen = editWindow && editWindow.is_active && new Date(editWindow.expires_at) > new Date();

  // Fetch edit window for the selected date
  const fetchEditWindow = useCallback(async (date) => {
    if (!date) { setEditWindow(null); return; }
    setEditWindowLoading(true);
    const { data, error } = await supabase
      .from('five_s_edit_windows')
      .select('*')
      .eq('inspection_date', date)
      .eq('is_active', true)
      .order('opened_at', { ascending: false })
      .limit(1);
    if (!error && data && data.length > 0) {
      // Check if still within time window
      const win = data[0];
      if (new Date(win.expires_at) > new Date()) {
        setEditWindow(win);
      } else {
        // Expired — auto-deactivate
        await supabase.from('five_s_edit_windows').update({ is_active: false }).eq('id', win.id);
        setEditWindow(null);
      }
    } else {
      setEditWindow(null);
    }
    setEditWindowLoading(false);
  }, []);

  useEffect(() => {
    if (filterDate) fetchEditWindow(filterDate);
  }, [filterDate, fetchEditWindow]);

  // Admin: Open edit window (24 hours)
  const openEditWindow = async () => {
    if (!user || !filterDate) return;
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hrs
    const { data, error } = await supabase
      .from('five_s_edit_windows')
      .insert({
        inspection_date: filterDate,
        opened_by: user.id,
        opened_at: now.toISOString(),
        expires_at: expires.toISOString(),
        is_active: true
      })
      .select();
    if (!error && data) {
      setEditWindow(data[0]);
    } else {
      alert('เกิดข้อผิดพลาดในการเปิดสิทธิ์: ' + (error?.message || ''));
    }
  };

  // Admin: Close edit window early
  const closeEditWindow = async () => {
    if (!editWindow) return;
    await supabase.from('five_s_edit_windows').update({ is_active: false }).eq('id', editWindow.id);
    setEditWindow(null);
  };

  // Audit Log: บันทึกการแก้ไข
  const logEdit = async (inspectionId, fieldChanged, oldValue, newValue, editType = 'score_edit') => {
    if (String(oldValue) === String(newValue)) return; // No change
    await supabase.from('five_s_edit_log').insert({
      inspection_id: inspectionId,
      edited_by: user?.id || 0,
      field_changed: fieldChanged,
      old_value: String(oldValue ?? ''),
      new_value: String(newValue ?? ''),
      edit_type: editType
    });
  };

  const fetchVotes = useCallback(async (date) => {
    if (!date) {
      setVotes([]);
      return;
    }
    const { data, error } = await supabase
      .from('five_s_votes')
      .select('*')
      .eq('inspection_date', date);
    if (!error) {
      setVotes(data || []);
    }
  }, []);

  // ดึงข้อมูลรายละเอียดผู้โหวต (สำหรับ Admin)
  const fetchVoteDetails = useCallback(async (date) => {
    if (!date) return;
    setLoadingVoteDetails(true);
    // ดึง votes พร้อม join ข้อมูล user → employee → department
    const { data, error } = await supabase
      .from('five_s_votes')
      .select('*, departments(name)')
      .eq('inspection_date', date)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // ดึง voter user info
      const voterIds = [...new Set(data.map(v => v.voter_id).filter(Boolean))];
      let usersMap = {};
      if (voterIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, username, full_name, employee_id, employees(first_name, last_name, department_id, departments(name))')
          .in('id', voterIds);
        if (usersData) {
          usersData.forEach(u => { usersMap[String(u.id)] = u; });
        }
      }
      // Enrich votes with voter info
      const enriched = data.map(v => {
        const voterUser = usersMap[String(v.voter_id)];
        return {
          ...v,
          voterName: voterUser?.employees
            ? `${voterUser.employees.first_name} ${voterUser.employees.last_name}`
            : voterUser?.full_name || voterUser?.username || `ID: ${v.voter_id}`,
          voterDeptName: voterUser?.employees?.departments?.name || '-',
          votedDeptName: v.departments?.name || `Dept ${v.department_id}`,
        };
      });
      setVoteDetails(enriched);
    }
    setLoadingVoteDetails(false);
  }, []);

  useEffect(() => {
    if (filterDate) {
      fetchVotes(filterDate);
    }
  }, [filterDate, fetchVotes]);

  // พลุ
  const fireConfetti = useCallback(() => {
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#7B68EE', '#32CD32'];
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
    };
    const timer = setInterval(frame, 30);
    setTimeout(() => { clearInterval(timer); confetti.reset(); }, 4000);
  }, []);

  // Podium animation — flat timeline
  // Phase: -1=idle, 5/4/3/2/1=countdown, 10=label3rd, 11=reveal3rd, 20=label2nd, 21=reveal2nd, 30=label1st, 31=reveal1st, 99=done
  useEffect(() => {
    if (!showPodium) { setPodiumPhase(-1); return; }

    const seq = [
      [500, 5], [1000, 4], [1000, 3], [1000, 2], [1000, 1],
      [1000, 10], [1500, 11],
      [2000, 20], [1500, 21],
      [2000, 30], [1500, 31],
      [500, 99],
    ];

    const timers = [];
    let elapsed = 0;
    seq.forEach(([delay, phase]) => {
      elapsed += delay;
      timers.push(setTimeout(() => {
        setPodiumPhase(phase);
        if (phase === 31) setTimeout(fireConfetti, 300);
      }, elapsed));
    });

    return () => timers.forEach(clearTimeout);
  }, [showPodium, fireConfetti]);

  // ออกรีพอร์ต PDF (Premium Modern Table)
  const printReport = () => {
    const dateLabel = filterDate
      ? new Date(filterDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'ทั้งหมด';

    const total = departmentRanking.length;

    // Helper: กำหนดสถานะตามอันดับ
    const getStatus = (rank) => {
      if (rank <= 3) return 'excellent';
      if (rank <= Math.ceil(total * 0.6)) return 'good';
      if (rank <= Math.ceil(total * 0.8)) return 'warning';
      return 'danger';
    };

    // Helper: สีจุดสถานะ
    const getStatusDotStyle = (status) => {
      switch(status) {
        case 'excellent': return 'background:#10b981;box-shadow:0 0 6px rgba(16,185,129,0.5);';
        case 'good': return 'background:#3b82f6;';
        case 'warning': return 'background:#f59e0b;';
        case 'danger': return 'background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.5);';
        default: return 'background:#94a3b8;';
      }
    };

    // Helper: สี progress bar
    const getBarColor = (status) => {
      switch(status) {
        case 'excellent': return '#10b981';
        case 'good': return '#3b82f6';
        case 'warning': return '#f59e0b';
        case 'danger': return '#ef4444';
        default: return '#94a3b8';
      }
    };

    // Helper: ไอคอนอันดับ
    const getRankIcon = (rank) => {
      if (rank === 1) return '🏆';
      if (rank === 2) return '🥈';
      if (rank === 3) return '🥉';
      return `<span style="font-weight:700;color:#64748b;">${rank}</span>`;
    };

    const rows = departmentRanking.map((dept, idx) => {
      const rank = idx + 1;
      const status = getStatus(rank);
      const maxScore = dept.count * 50;
      const pct = maxScore > 0 ? Math.round((dept.totalScore / maxScore) * 100) : 0;
      const hoverBg = rank % 2 === 0 ? '#fafbfc' : '#fff';

      return `<tr style="background:${hoverBg};border-bottom:1px solid #f1f5f9;">
        <!-- อันดับ -->
        <td style="padding:14px 10px;text-align:center;font-size:18px;">${getRankIcon(rank)}</td>
        <!-- แผนก + จุดสถานะ -->
        <td style="padding:14px 12px;font-weight:600;color:#1e293b;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;${getStatusDotStyle(status)}"></span>
            <span>${dept.name}</span>
          </div>
        </td>
        <!-- คะแนนย่อย -->
        <td style="padding:14px 10px;text-align:center;color:#475569;">${dept.totalImprovement}</td>
        <td style="padding:14px 10px;text-align:center;color:#475569;">${dept.totalCleanliness}</td>
        <td style="padding:14px 10px;text-align:center;color:#475569;">${dept.totalInnovation}</td>
        <td style="padding:14px 10px;text-align:center;color:#475569;">${dept.totalCooperation}</td>
        <td style="padding:14px 10px;text-align:center;color:#475569;">${dept.totalHelpfulness}</td>
        <!-- โหวต -->
        <td style="padding:14px 10px;text-align:center;color:#94a3b8;">${dept.voteCount > 0 ? dept.voteCount : '-'}</td>
        <!-- ครั้ง -->
        <td style="padding:14px 10px;text-align:center;color:#475569;">${dept.count}</td>
        <!-- คะแนนรวม (ไฮไลท์) -->
        <td style="padding:14px 16px;text-align:center;background:#f8fafc;">
          <span style="font-size:20px;font-weight:900;color:#1e293b;">${dept.totalScore}</span>
        </td>
        <!-- ประสิทธิภาพ -->
        <td style="padding:14px 12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:13px;font-weight:700;color:#334155;width:36px;text-align:right;">${pct}%</span>
            <div style="flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;border:1px solid rgba(0,0,0,0.04);">
              <div style="width:${pct}%;height:100%;background:${getBarColor(status)};border-radius:3px;"></div>
            </div>
          </div>
        </td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>รายงานสรุปผลคะแนนการตรวจ 5ส</title>
<style>
  @media print { 
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; padding: 0; margin: 0; }
    .report-container { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border: none !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun', 'Segoe UI', 'Helvetica Neue', sans-serif; padding: 0; margin: 0; color: #0f172a; font-size: 14px; background: #f1f5f9; }
  table { width: 100%; border-collapse: collapse; }
</style></head><body>
<div class="report-container" style="max-width:960px;margin:24px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.06);border-radius:16px;border:1px solid #e2e8f0;padding:32px 40px;">
  
  <!-- HEADER -->
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:32px;padding-bottom:20px;border-bottom:1px solid #f1f5f9;">
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="width:48px;height:48px;background:#ecfdf5;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;border:1px solid rgba(16,185,129,0.15);">🏢</div>
      <div>
        <h1 style="margin:0 0 3px;font-size:20px;font-weight:800;color:#0f172a;">รายงานสรุปผลคะแนนการตรวจ 5ส</h1>
        <p style="margin:0;font-size:13px;color:#64748b;font-weight:500;">Polyfoam PFS — สาขาสุวรรณภูมิ</p>
      </div>
    </div>
    <div style="text-align:right;font-size:13px;color:#64748b;">
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:4px;">
        <span>📅</span><span>วันที่ตรวจ: <strong style="color:#334155;">${dateLabel}</strong></span>
      </div>
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
        <span>📋</span><span>จำนวน: <strong style="color:#334155;">${total} แผนก</strong></span>
      </div>
    </div>
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr style="border-bottom:2px solid #e2e8f0;">
        <th style="padding:12px 10px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;width:50px;">อันดับ</th>
        <th style="padding:12px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">แผนก</th>
        <th style="padding:12px 10px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">เปลี่ยนแปลง</th>
        <th style="padding:12px 10px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">สะอาด</th>
        <th style="padding:12px 10px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">ท้าทาย</th>
        <th style="padding:12px 10px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">ร่วมมือ</th>
        <th style="padding:12px 10px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">ช่วยเหลือ</th>
        <th style="padding:12px 10px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">โหวต</th>
        <th style="padding:12px 10px;text-align:center;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">ครั้ง</th>
        <th style="padding:12px 16px;text-align:center;font-size:10px;font-weight:800;color:#059669;text-transform:uppercase;letter-spacing:0.5px;background:#f8fafc;border-radius:8px 8px 0 0;">คะแนนรวม</th>
        <th style="padding:12px 12px;text-align:left;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;width:140px;">ประสิทธิภาพ</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- LEGEND -->
  <div style="margin-top:24px;display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:center;font-size:11px;color:#64748b;border-top:1px solid #f1f5f9;padding-top:16px;">
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;box-shadow:0 0 6px rgba(16,185,129,0.5);"></span>
      <span>ดีเยี่ยม (Top 3)</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="width:8px;height:8px;border-radius:50%;background:#3b82f6;display:inline-block;"></span>
      <span>มาตรฐาน</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>
      <span>เฝ้าระวัง</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px;">
      <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block;box-shadow:0 0 6px rgba(239,68,68,0.5);"></span>
      <span>ต้องปรับปรุงด่วน</span>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="margin-top:16px;text-align:center;font-size:11px;color:#94a3b8;">
    พิมพ์จากระบบประเมิน 5ส • ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
  </div>
</div>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.print(); };
  };

  // ออกรีพอร์ตรูปภาพและหมายเหตุแยกตามแผนก (Premium Design)
  const printPhotoReport = () => {
    // จัดกลุ่มการตรวจที่มีรูปภาพหรือหมายเหตุ ตามชื่อแผนก (กรองตามวันที่)
    const dataToReport = filterDate ? filtered : inspections;
    const allWithPhotosOrNotes = dataToReport.filter(ins => (ins.photos && ins.photos.length > 0) || (ins.photo_urls && ins.photo_urls.length > 0) || (ins.notes && ins.notes.trim() !== ''));
    if (allWithPhotosOrNotes.length === 0) {
      alert('ยังไม่มีรูปภาพหรือหมายเหตุในระบบ กรุณาอัปโหลดก่อนออกรายงาน');
      return;
    }

    // group by department name
    const grouped = {};
    allWithPhotosOrNotes.forEach(ins => {
      const deptName = ins.departments?.name || `แผนก ${ins.department_id}`;
      if (!grouped[deptName]) grouped[deptName] = [];
      grouped[deptName].push(ins);
    });

    const dateLabel = filterDate
      ? new Date(filterDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'ทั้งหมด';

    // Helper: สร้าง score card พร้อม progress bar
    const makeScoreCard = (emoji, label, value, max, barColor) => {
      const pct = Math.round((value / max) * 100);
      return `<div style="flex:1;min-width:80px;background:#f9fafb;border:1px solid #f0f0f0;border-radius:8px;padding:8px 6px;text-align:center;position:relative;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:center;gap:3px;margin-bottom:4px;">
          <span style="font-size:11px;">${emoji}</span>
          <span style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;">${label}</span>
        </div>
        <div style="font-size:15px;font-weight:900;color:#1f2937;">${value}<span style="font-size:10px;font-weight:400;color:#9ca3af;margin-left:1px;">/${max}</span></div>
        <div style="position:absolute;bottom:0;left:0;width:100%;height:3px;background:#e5e7eb;">
          <div style="width:${pct}%;height:3px;background:${barColor};border-radius:0 2px 0 0;"></div>
        </div>
      </div>`;
    };

    const deptSections = Object.entries(grouped).map(([deptName, records]) => {
      const inspectionBlocks = records.map(ins => {
        const dateStr = new Date(ins.inspection_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
        // รวมรูปจาก photos (five_s_photos table) + fallback ไป photo_urls
        const allPhotos = ins.photos && ins.photos.length > 0 
          ? ins.photos 
          : (ins.photo_urls || []).map(url => ({ url, comment: '' }));

        // Score cards row
        const scoreCards = [
          makeScoreCard('🔄', 'เปลี่ยนแปลง', ins.score_improvement, 10, '#3b82f6'),
          makeScoreCard('✨', 'สะอาด', ins.score_cleanliness, 10, '#10b981'),
          makeScoreCard('🎯', 'ท้าทาย', ins.score_innovation, 10, '#f59e0b'),
          makeScoreCard('🤝', 'ร่วมมือ', ins.score_cooperation || 0, 10, '#f97316'),
          makeScoreCard('❤️', 'ช่วยเหลือ', ins.score_helpfulness || 0, 10, '#ef4444'),
        ].join('');

        // Notes section
        const notesStr = ins.notes 
          ? `<div style="margin-bottom:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;display:flex;align-items:flex-start;gap:8px;">
              <span style="font-size:14px;flex-shrink:0;margin-top:1px;">💬</span>
              <div style="font-size:13px;">
                <span style="font-weight:700;color:#92400e;margin-right:6px;">ข้อเสนอแนะหลัก:</span>
                <span style="color:#a16207;">${ins.notes}</span>
              </div>
            </div>` 
          : '';

        // Photo list — side-by-side thumbnail + caption (like the mockup)
        const photoList = allPhotos.length > 0 
          ? `<div>
              <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;align-items:center;gap:4px;">
                📷 รายการรูปภาพจากการตรวจ (${allPhotos.length})
              </div>
              <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;">
                ${allPhotos.map((photo, pIdx) => `
                  <div style="display:flex;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:8px;gap:10px;break-inside:avoid;">
                    <div style="width:80px;height:100px;flex-shrink:0;border-radius:6px;overflow:hidden;background:#f3f4f6;border:1px solid #f0f0f0;">
                      <img src="${photo.url}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'text-align:center;padding:20px 4px;font-size:11px;color:#9ca3af;\\'>⚠️<br>โหลดไม่ได้</div>';" />
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;padding:2px 0;">
                      <span style="font-size:10px;font-weight:700;background:#f3f4f6;color:#6b7280;padding:2px 6px;border-radius:3px;display:inline-block;width:fit-content;margin-bottom:6px;">ภาพที่ ${pIdx + 1}</span>
                      <p style="font-size:12px;color:#374151;line-height:1.5;margin:0;word-break:break-word;">
                        ${photo.comment ? photo.comment : '<span style="color:#9ca3af;font-style:italic;">ไม่มีคำอธิบาย</span>'}
                      </p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>` 
          : '';

        return `
          <div style="break-inside:avoid;page-break-inside:avoid;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <!-- Header bar -->
            <div style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;">
              <div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;font-size:13px;">
                <span style="color:#374151;display:flex;align-items:center;gap:4px;">📅 <strong>วันที่ตรวจ:</strong> ${dateStr}</span>
                <span style="color:#374151;display:flex;align-items:center;gap:4px;">👤 <strong>ผู้ตรวจ:</strong> ${ins.inspector_name || '—'}</span>
              </div>
              <div style="display:flex;align-items:center;gap:6px;background:#d1fae5;border:1px solid #a7f3d0;padding:4px 10px;border-radius:6px;">
                <span style="font-size:12px;">⭐</span>
                <span style="font-weight:800;color:#065f46;font-size:13px;">รวม: ${ins.total_score}/50</span>
              </div>
            </div>
            <!-- Body -->
            <div style="padding:16px;">
              <!-- Score cards -->
              <div style="display:flex;gap:8px;margin-bottom:16px;">
                ${scoreCards}
              </div>
              <!-- Notes -->
              ${notesStr}
              <!-- Photos -->
              ${photoList}
            </div>
          </div>`;
      }).join('');

      return `
        <div style="margin-bottom:32px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
            <div style="background:#1e293b;color:#fff;padding:5px 7px;border-radius:6px;font-size:13px;display:flex;align-items:center;">📁</div>
            <h2 style="margin:0;font-size:16px;font-weight:800;color:#1e293b;">แผนก: ${deptName}</h2>
            <span style="font-size:12px;color:#6b7280;background:#f3f4f6;padding:2px 8px;border-radius:10px;">${records.length} รายการ</span>
            <div style="flex:1;height:1px;background:#e5e7eb;margin-left:8px;"></div>
          </div>
          ${inspectionBlocks}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>รายงานสรุปรูปภาพและคอมเมนต์การตรวจ 5ส</title>
<style>
  @media print { 
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; padding: 0; margin: 0; }
    .report-container { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border: none !important; border-top: none !important; }
  }
  * { box-sizing: border-box; }
  body { font-family: 'Sarabun', 'Segoe UI', 'Helvetica Neue', sans-serif; padding: 0; margin: 0; color: #111; font-size: 14px; background: #f3f4f6; }
</style></head><body>
<div class="report-container" style="max-width:800px;margin:24px auto;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.08);border-radius:12px;border-top:6px solid #059669;padding:32px;">
  
  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #f3f4f6;display:flex;flex-direction:column;align-items:center;">
    <div style="width:50px;height:50px;background:#ecfdf5;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:10px;border:1px solid #a7f3d0;box-shadow:0 2px 4px rgba(5,150,105,0.1);">🏢</div>
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:800;color:#111;">รายงานสรุปรูปภาพและคอมเมนต์การตรวจ 5ส</h1>
    <p style="margin:0 0 2px;font-size:14px;color:#6b7280;font-weight:500;">Polyfoam PFS — สาขาสุวรรณภูมิ</p>
    <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;background:#f9fafb;padding:4px 12px;border-radius:20px;">ประจำวันที่: ${dateLabel} · พิมพ์เมื่อ ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>

  <!-- BODY -->
  ${deptSections}

  <!-- FOOTER -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;">
    เอกสารฉบับนี้สร้างโดยระบบรายงานอัตโนมัติ • Polyfoam PFS — สาขาสุวรรณภูมิ
  </div>
</div>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.print(); };
  };

  const fetchInspections = async () => {
    setLoading(true);
    let query = supabase
      .from('five_s_inspections')
      .select('*, departments(name), photo_urls, inspector_employee_id')
      .order('inspection_date', { ascending: false });

    const { data, error } = await query;
    if (!error) {
      const inspectionsData = data || [];
      
      // Fetch photos from five_s_photos table for all inspections
      const inspectionIds = inspectionsData.map(i => i.id).filter(Boolean);
      let photosMap = {};
      if (inspectionIds.length > 0) {
        const { data: photosData, error: photosError } = await supabase
          .from('five_s_photos')
          .select('*')
          .in('inspection_id', inspectionIds)
          .order('sort_order', { ascending: true });
        if (!photosError && photosData) {
          photosData.forEach(p => {
            if (!photosMap[p.inspection_id]) photosMap[p.inspection_id] = [];
            photosMap[p.inspection_id].push({ id: p.id, url: p.url, comment: p.comment || '' });
          });
        } else if (photosError) {
          console.warn('five_s_photos query error (table may not exist yet):', photosError.message);
        }
      }
      
      // Attach photos to inspections
      const enriched = inspectionsData.map(ins => ({
        ...ins,
        photos: photosMap[ins.id] || []
      }));
      
      setInspections(enriched);
    }
    setLoading(false);
  };

  const handleSaveComment = async (photoId) => {
    if (!photoId) return;
    try {
      const { error } = await supabase
        .from('five_s_photos')
        .update({ comment: editingCommentText })
        .eq('id', photoId);
      
      if (!error) {
        setGalleryPhotos(prev => prev ? prev.map(p => 
          (typeof p !== 'string' && p.id === photoId) 
            ? { ...p, comment: editingCommentText } 
            : p
        ) : null);
        fetchInspections(); // refresh in background to keep data in sync
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกคอมเมนต์: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    }
    setEditingCommentId(null);
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  // Filter by EXACT DATE
  const filtered = filterDate
    ? inspections.filter(i => i.inspection_date === filterDate)
    : inspections;

  // Build department ranking from filtered data
  const departmentRanking = (() => {
    const map = {};
    filtered.forEach((ins) => {
      const deptName = ins.departments?.name || 'ไม่ระบุแผนก';
      if (!map[deptName]) {
        map[deptName] = {
          id: ins.department_id,
          name: deptName,
          totalImprovement: 0,
          totalCleanliness: 0,
          totalInnovation: 0,
          totalCooperation: 0,
          totalHelpfulness: 0,
          totalScore: 0,
          count: 0,
          latestDate: ins.inspection_date,
          latestScore: ins.total_score,
          allPhotos: [],
          voteCount: 0
        };
      }
      map[deptName].totalImprovement += ins.score_improvement;
      map[deptName].totalCleanliness += ins.score_cleanliness;
      map[deptName].totalInnovation += ins.score_innovation;
      map[deptName].totalCooperation += (ins.score_cooperation || 0);
      map[deptName].totalHelpfulness += (ins.score_helpfulness || 0);
      map[deptName].totalScore += ins.total_score;
      map[deptName].count += 1;
      if (ins.photos && ins.photos.length > 0) {
        map[deptName].allPhotos = [...map[deptName].allPhotos, ...ins.photos];
      } else if (ins.photo_urls && ins.photo_urls.length > 0) {
        // Fallback for old data without five_s_photos records
        map[deptName].allPhotos = [...map[deptName].allPhotos, ...ins.photo_urls.map(url => ({ url, comment: '' }))];
      }
      if (ins.inspection_date > map[deptName].latestDate) {
        map[deptName].latestDate = ins.inspection_date;
        map[deptName].latestScore = ins.total_score;
      }
    });

    const arr = Object.values(map);
    arr.forEach(dept => {
      dept.voteCount = votes.filter(v => String(v.department_id) === String(dept.id)).length;
    });

    return arr.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.voteCount - a.voteCount;
    });
  })();

  const total = departmentRanking.length;

  // Top 3 = green, Bottom 2 = red
  const getRowStyle = (rank) => {
    if (rank <= 3) {
      return {
        background: rank === 1 ? '#dcfce7' : rank === 2 ? '#e8faf0' : '#f0fdf4',
        borderLeft: '5px solid #16a34a'
      };
    }
    if (total >= 5 && rank > total - 2) {
      return {
        background: rank === total ? '#fee2e2' : '#fef2f2',
        borderLeft: '5px solid #dc2626'
      };
    }
    return { borderLeft: '5px solid transparent' };
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: '🥇', text: 'อันดับ 1', color: '#16a34a', bg: '#dcfce7' };
    if (rank === 2) return { icon: '🥈', text: 'อันดับ 2', color: '#16a34a', bg: '#dcfce7' };
    if (rank === 3) return { icon: '🥉', text: 'อันดับ 3', color: '#16a34a', bg: '#dcfce7' };
    if (total >= 5 && rank === total - 1) return { icon: '⚠️', text: `อันดับ ${rank}`, color: '#dc2626', bg: '#fee2e2' };
    if (total >= 5 && rank === total) return { icon: '🔴', text: `อันดับ ${rank} (สุดท้าย)`, color: '#dc2626', bg: '#fee2e2' };
    return { icon: '', text: `อันดับ ${rank}`, color: '#6b7280', bg: '#f3f4f6' };
  };

  const getScoreBarColor = (rank) => {
    if (rank <= 3) return '#16a34a';
    if (total >= 5 && rank > total - 2) return '#dc2626';
    return '#3b82f6';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div className="page-header">
        <h1 className="page-title">📊 ผลคะแนน 5ส &amp; อันดับแผนก</h1>
        <p className="page-subtitle">
          สรุปคะแนนเฉลี่ยรายแผนก — อันดับ 1-3 <span style={{ color: '#16a34a', fontWeight: 'bold' }}>สีเขียว</span> / สองอันดับสุดท้าย <span style={{ color: '#dc2626', fontWeight: 'bold' }}>สีแดง</span>
        </p>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>เลือกวันที่ตรวจ:</label>
          <input
            type="date"
            className="form-input"
            style={{ maxWidth: '200px', flex: 1, minWidth: 150 }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={() => setFilterDate('')}
            disabled={!filterDate}
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
          >
            ล้าง
          </button>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            ({filtered.length} รายการ จาก {departmentRanking.length} แผนก)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button
              className="btn btn-secondary"
              onClick={printReport}
              disabled={departmentRanking.length === 0}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
            >
              🖨️ รีพอร์ต
            </button>
            <button
              className="btn btn-primary"
              onClick={printPhotoReport}
              disabled={inspections.filter(i => (i.photos && i.photos.length > 0) || (i.photo_urls && i.photo_urls.length > 0) || (i.notes && i.notes.trim() !== '')).length === 0}
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
            >
              📸 รูป / หมายเหตุ
            </button>
          </div>
        </div>

        {/* Edit Window Status Bar */}
        {filterDate && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            background: isEditWindowOpen ? '#ecfdf5' : '#f9fafb',
            border: `1px solid ${isEditWindowOpen ? '#10b981' : '#e5e7eb'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{isEditWindowOpen ? '🔓' : '🔒'}</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: isEditWindowOpen ? '#059669' : '#6b7280' }}>
                  {isEditWindowOpen ? 'เปิดให้แก้ไขคะแนนอยู่' : 'ล็อกการแก้ไขคะแนน'}
                </div>
                {isEditWindowOpen && editWindow && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    หมดเวลา: {new Date(editWindow.expires_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>
            </div>
            {isAdmin() && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isEditWindowOpen ? (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                    onClick={() => { if (window.confirm('ต้องการปิดสิทธิ์แก้ไขก่อนเวลาใช่หรือไม่?')) closeEditWindow(); }}
                  >
                    🔒 ปิดสิทธิ์แก้ไข
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                    onClick={() => { if (window.confirm('เปิดสิทธิ์แก้ไขคะแนนสำหรับวันที่ ' + filterDate + '?\n(ทุกคนจะแก้ไขคะแนนได้ภายใน 24 ชม.)')) openEditWindow(); }}
                    disabled={editWindowLoading}
                  >
                    🔓 เปิดสิทธิ์แก้ไข (24 ชม.)
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* สรุปคะแนนรวม */}
      {filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem'
        }}>
          {[
            { label: 'จำนวนการตรวจ', value: filtered.length, unit: 'รายการ', color: '#6366f1', bg: '#eef2ff' },
            { label: 'เฉลี่ยเปลี่ยนแปลง', value: (filtered.reduce((s, i) => s + i.score_improvement, 0) / filtered.length).toFixed(1), unit: '/10', color: '#0891b2', bg: '#ecfeff' },
            { label: 'เฉลี่ยสะอาด', value: (filtered.reduce((s, i) => s + i.score_cleanliness, 0) / filtered.length).toFixed(1), unit: '/10', color: '#059669', bg: '#ecfdf5' },
            { label: 'เฉลี่ยท้าทาย', value: (filtered.reduce((s, i) => s + i.score_innovation, 0) / filtered.length).toFixed(1), unit: '/10', color: '#d97706', bg: '#fffbeb' },
            { label: 'เฉลี่ยร่วมมือ', value: (filtered.reduce((s, i) => s + (i.score_cooperation || 0), 0) / filtered.length).toFixed(1), unit: '/10', color: '#8b5cf6', bg: '#ede9fe' },
            { label: 'เฉลี่ยช่วยเหลือ', value: (filtered.reduce((s, i) => s + (i.score_helpfulness || 0), 0) / filtered.length).toFixed(1), unit: '/10', color: '#ec4899', bg: '#fce7f3' },
            { label: 'เฉลี่ยรวม', value: (filtered.reduce((s, i) => s + i.total_score, 0) / filtered.length).toFixed(1), unit: '/50', color: '#dc2626', bg: '#fef2f2' }
          ].map((item, idx) => (
            <div key={idx} className="card" style={{
              textAlign: 'center',
              padding: '1rem',
              background: item.bg,
              border: `1px solid ${item.color}22`
            }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>{item.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: item.color, lineHeight: 1.2 }}>
                {item.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{item.unit}</div>
            </div>
          ))}
        </div>
      )}

      {/* ปุ่ม Popup และ Podium */}
      {departmentRanking.length > 0 && (
        <div style={{ textAlign: 'center', marginBottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowRankingPopup(true)}
            style={{
              padding: '0.75rem 2.5rem',
              fontSize: '1.1rem',
              background: 'var(--color-primary)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(46, 204, 135, 0.3)'
            }}
          >
            📊 ดูอันดับคะแนนทั้งหมด
          </button>
          {votes.length > 0 && (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowVoteResults(true)}
              style={{
                padding: '0.75rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              🗳️ ผลการโหวต
            </button>
          )}
          {isAdmin() && votes.length > 0 && (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                fetchVoteDetails(filterDate);
                setShowVoteStatus(true);
              }}
              style={{
                padding: '0.75rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              📋 ดูแผนกที่โหวตแล้ว
            </button>
          )}
          {departmentRanking.length >= 3 && (
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setShowPodium(true)}
              style={{
                padding: '0.75rem 2.5rem',
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              🏆 ประกาศอันดับ Top 3
            </button>
          )}
        </div>
      )}

      {/* Podium Popup Modal — New */}
      {showPodium && departmentRanking.length >= 3 && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a1a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, flexDirection: 'column'
          }}
          onClick={() => setShowPodium(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', width: '90%', maxWidth: '750px' }}>

            {/* ปุ่มปิด */}
            <button
              onClick={() => setShowPodium(false)}
              style={{
                position: 'fixed', top: '1.5rem', right: '1.5rem',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: '#fff', fontSize: '1.5rem', cursor: 'pointer',
                borderRadius: '50%', width: '44px', height: '44px', zIndex: 10000
              }}
            >✕</button>

            {/* หัวข้อ */}
            <div style={{
              fontSize: '1.3rem', color: '#94a3b8', marginBottom: '0.5rem',
              opacity: podiumPhase >= 5 ? 1 : 0, transition: 'opacity 0.5s'
            }}>
              � ประกาศผลอันดับ 5ส
            </div>
            <div style={{
              fontSize: '0.85rem', color: '#64748b', marginBottom: '2rem',
              opacity: podiumPhase >= 5 ? 1 : 0, transition: 'opacity 0.5s'
            }}>
              {filterDate
                ? new Date(filterDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'ข้อมูลทั้งหมด'}
            </div>

            {/* Countdown 5-4-3-2-1 */}
            {podiumPhase >= 1 && podiumPhase <= 5 && (
              <div style={{
                fontSize: '10rem', fontWeight: '900', lineHeight: 1,
                color: 'transparent',
                background: 'linear-gradient(135deg, #ff6b6b, #ffd700)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text',
                animation: 'pulse 0.8s ease-in-out',
                margin: '2rem 0'
              }}>
                {podiumPhase}
              </div>
            )}

            {/* Label: อันดับที่ 3 */}
            {podiumPhase === 10 && (
              <div style={{
                fontSize: '2rem', fontWeight: 'bold', color: '#cd7f32',
                animation: 'slideUp 0.5s ease', margin: '3rem 0'
              }}>
                🥉 อันดับที่ 3
              </div>
            )}

            {/* Label: อันดับที่ 2 */}
            {podiumPhase === 20 && (
              <div style={{
                fontSize: '2rem', fontWeight: 'bold', color: '#c0c0c0',
                animation: 'slideUp 0.5s ease', margin: '3rem 0'
              }}>
                🥈 อันดับที่ 2
              </div>
            )}

            {/* Label: อันดับที่ 1 */}
            {podiumPhase === 30 && (
              <div style={{
                fontSize: '2.5rem', fontWeight: 'bold', color: '#ffd700',
                animation: 'slideUp 0.5s ease', margin: '3rem 0',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.5)'
              }}>
                🥇 อันดับที่ 1
              </div>
            )}

            {/* Podium Reveal — แสดงหลังจาก phase 11+ */}
            {podiumPhase >= 11 && (
              <div style={{
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                gap: '1rem', marginTop: '1rem', minHeight: '280px'
              }}>
                {/* 2nd Place — ซ้าย */}
                <div style={{
                  flex: 1, maxWidth: '200px', textAlign: 'center',
                  opacity: podiumPhase >= 21 ? 1 : 0,
                  transform: podiumPhase >= 21 ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.8)',
                  transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🥈</div>
                  <div style={{
                    background: 'linear-gradient(180deg, rgba(192,192,192,0.2), rgba(192,192,192,0.05))',
                    borderRadius: '16px', padding: '1rem', border: '1px solid rgba(192,192,192,0.3)'
                  }}>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.25rem' }}>
                      {departmentRanking[1].name}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#c0c0c0' }}>
                      {departmentRanking[1].totalScore}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>คะแนน</div>
                  </div>
                  <div style={{
                    height: '90px', marginTop: '0.5rem',
                    background: 'linear-gradient(180deg, #94a3b8, #64748b)',
                    borderRadius: '12px 12px 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', fontWeight: '900', color: '#fff'
                  }}>2</div>
                </div>

                {/* 1st Place — กลาง */}
                <div style={{
                  flex: 1, maxWidth: '220px', textAlign: 'center',
                  opacity: podiumPhase >= 31 ? 1 : 0,
                  transform: podiumPhase >= 31 ? 'translateY(0) scale(1)' : 'translateY(60px) scale(0.8)',
                  transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  <div style={{
                    fontSize: '4rem', marginBottom: '0.5rem',
                    filter: podiumPhase >= 31 ? 'drop-shadow(0 0 20px #ffd700)' : 'none',
                    animation: podiumPhase >= 31 ? 'pulse 2s ease-in-out infinite' : 'none'
                  }}>🥇</div>
                  <div style={{
                    background: 'linear-gradient(180deg, rgba(255,215,0,0.2), rgba(255,215,0,0.05))',
                    borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,215,0,0.4)',
                    boxShadow: podiumPhase >= 31 ? '0 0 40px rgba(255,215,0,0.15)' : 'none'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '0.25rem' }}>
                      {departmentRanking[0].name}
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ffd700' }}>
                      {departmentRanking[0].totalScore}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#fbbf24' }}>คะแนน</div>
                  </div>
                  <div style={{
                    height: '130px', marginTop: '0.5rem',
                    background: 'linear-gradient(180deg, #fbbf24, #f59e0b)',
                    borderRadius: '12px 12px 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.2rem', fontWeight: '900', color: '#fff'
                  }}>1</div>
                </div>

                {/* 3rd Place — ขวา */}
                <div style={{
                  flex: 1, maxWidth: '200px', textAlign: 'center',
                  opacity: podiumPhase >= 11 ? 1 : 0,
                  transform: podiumPhase >= 11 ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.8)',
                  transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🥉</div>
                  <div style={{
                    background: 'linear-gradient(180deg, rgba(205,127,50,0.2), rgba(205,127,50,0.05))',
                    borderRadius: '16px', padding: '1rem', border: '1px solid rgba(205,127,50,0.3)'
                  }}>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.25rem' }}>
                      {departmentRanking[2].name}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#cd7f32' }}>
                      {departmentRanking[2].totalScore}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>คะแนน</div>
                  </div>
                  <div style={{
                    height: '60px', marginTop: '0.5rem',
                    background: 'linear-gradient(180deg, #cd7f32, #a0522d)',
                    borderRadius: '12px 12px 0 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', fontWeight: '900', color: '#fff'
                  }}>3</div>
                </div>
              </div>
            )}

            {/* ปุ่มล่าง */}
            {podiumPhase >= 99 && (
              <div style={{ marginTop: '2rem', animation: 'fadeIn 0.5s ease' }}>
                <button
                  onClick={() => fireConfetti()}
                  style={{
                    padding: '0.75rem 2rem', fontSize: '1rem',
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    border: 'none', borderRadius: '12px', cursor: 'pointer',
                    color: '#1a1a2e', fontWeight: 'bold', marginRight: '1rem'
                  }}
                >🎆 ยิงพลุอีกครั้ง!</button>
                <button
                  onClick={() => setShowPodium(false)}
                  style={{
                    padding: '0.75rem 2rem', fontSize: '1rem',
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px', cursor: 'pointer',
                    color: '#fff', fontWeight: 'bold'
                  }}
                >ปิด</button>
              </div>
            )}

          </div>
        </div>
      )}
      {/* Vote Results Popup */}
      {showVoteResults && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'radial-gradient(ellipse at center, #1a0533 0%, #0a0015 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, animation: 'fadeIn 0.3s ease'
          }}
          onClick={() => { setShowVoteResults(false); setVoteRevealIndex(-1); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '95vw',
              maxWidth: '580px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              textAlign: 'center',
            }}
          >
            <button
              style={{
                position: 'fixed', top: '1.5rem', right: '1.5rem',
                background: 'rgba(255,255,255,0.15)', border: 'none',
                color: '#fff', fontSize: '1.5rem', cursor: 'pointer',
                borderRadius: '50%', width: '44px', height: '44px', zIndex: 10000
              }}
              onClick={() => { setShowVoteResults(false); setVoteRevealIndex(-1); }}
            >✕</button>

            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗳️</div>
            <div style={{ fontSize: '1.4rem', color: '#e2d9f3', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              ผลการโหวต 5ส
            </div>
            <div style={{ fontSize: '0.85rem', color: '#a78bfa', marginBottom: '2rem' }}>
              {filterDate
                ? new Date(filterDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'ข้อมูลทั้งหมด'}
            </div>

            {(() => {
              const categories = {
                rank_1: '🥇 อันดับ 1',
                rank_2: '🥈 อันดับ 2',
                rank_3: '🥉 อันดับ 3',
                bottom_2: '⬇️ อันดับรองสุดท้าย',
                bottom_1: '📉 อันดับสุดท้าย',
              };
              const categoryOrder = ['rank_1', 'rank_2', 'rank_3', 'bottom_2', 'bottom_1'];

              if (votes.length === 0) {
                return <div style={{ color: '#a78bfa', padding: '2rem' }}>ยังไม่มีผลการโหวตสำหรับวันที่เลือก</div>;
              }

              // Build flat list of all entries sorted lowest → highest
              const allEntries = [];
              categoryOrder.forEach(cat => {
                const catVotes = votes.filter(v => v.vote_category === cat);
                if (catVotes.length === 0) return;
                const counts = {};
                catVotes.forEach(v => { counts[v.department_id] = (counts[v.department_id] || 0) + 1; });
                const maxVotes = Math.max(...Object.values(counts));
                const deptEntries = Object.entries(counts).map(([deptId, count]) => {
                  const dept = filteredDepartments.find(d => String(d.id) === String(deptId));
                  return { name: dept?.name || `Dept ${deptId}`, count, cat, isWinner: count === maxVotes };
                }).sort((a, b) => a.count - b.count); // lowest first
                deptEntries.forEach(e => allEntries.push(e));
              });

              const totalEntries = allEntries.length;

              if (voteRevealIndex === -1) {
                return (
                  <button
                    onClick={() => {
                      setVoteRevealIndex(0);
                      let idx = 0;
                      const interval = setInterval(() => {
                        idx++;
                        setVoteRevealIndex(idx);
                        if (idx >= totalEntries - 1) clearInterval(interval);
                      }, 5000);
                    }}
                    style={{
                      marginTop: '1rem',
                      padding: '1rem 2.5rem',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
                      animation: 'pulse 1.5s infinite alternate'
                    }}
                  >
                    🎬 เริ่มเปิดผลโหวต
                  </button>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {allEntries.map((entry, idx) => {
                    if (idx > voteRevealIndex) return null;
                    const isLast = idx === totalEntries - 1 && voteRevealIndex >= totalEntries - 1;
                    return (
                      <div
                        key={`${entry.cat}-${entry.name}`}
                        style={{
                          padding: '1rem 1.5rem',
                          borderRadius: '12px',
                          background: entry.isWinner && isLast
                            ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                            : entry.isWinner ? 'rgba(255,255,255,0.12)'
                            : 'rgba(255,255,255,0.06)',
                          border: entry.isWinner && isLast ? '2px solid #16a34a' : '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          animation: 'fadeIn 0.5s ease',
                          transform: entry.isWinner && isLast ? 'scale(1.03)' : 'scale(1)',
                          transition: 'all 0.5s ease',
                        }}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: '0.7rem', color: entry.isWinner && isLast ? '#15803d' : '#a78bfa', marginBottom: '0.15rem' }}>
                            {categories[entry.cat]}
                          </div>
                          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: entry.isWinner && isLast ? '#15803d' : 'white' }}>
                            {entry.isWinner && isLast ? '👑 ' : ''}{entry.name}
                          </div>
                        </div>
                        <div style={{
                          fontWeight: 'bold',
                          fontSize: entry.isWinner && isLast ? '2rem' : '1.4rem',
                          color: entry.isWinner && isLast ? '#16a34a' : '#e2d9f3',
                          transition: 'font-size 0.5s'
                        }}>
                          {entry.count} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>โหวต</span>
                        </div>
                      </div>
                    );
                  })}
                  {voteRevealIndex >= totalEntries - 1 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setVoteRevealIndex(-1)}
                        style={{ padding: '0.5rem 1.5rem', color: '#e2d9f3', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        🔄 เริ่มใหม่
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ marginTop: '1.5rem', paddingBottom: '1rem' }}>
              <button
                onClick={() => { setShowVoteResults(false); setVoteRevealIndex(-1); }}
                style={{ padding: '0.5rem 1.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', color: '#e2d9f3', fontWeight: 'bold' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vote Status Popup (Admin Only) */}
      {showVoteStatus && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, animation: 'fadeIn 0.3s ease'
          }}
          onClick={() => setShowVoteStatus(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1.5rem',
              padding: '2rem',
              maxWidth: '95vw',
              width: '700px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <button
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'rgba(0,0,0,0.1)', border: 'none',
                color: '#666', fontSize: '1.2rem', cursor: 'pointer',
                borderRadius: '50%', width: '36px', height: '36px'
              }}
              onClick={() => setShowVoteStatus(false)}
            >✕</button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
              <div style={{ fontSize: '1.4rem', color: '#1e293b', fontWeight: 'bold' }}>
                สถานะการโหวตแยกตามแผนก
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {filterDate
                  ? new Date(filterDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                  : 'ข้อมูลทั้งหมด'}
              </div>
            </div>

            {loadingVoteDetails ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                กำลังโหลดข้อมูล...
              </div>
            ) : voteDetails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                ยังไม่มีผู้โหวตสำหรับวันที่เลือก
              </div>
            ) : (() => {
              // จัดกลุ่มตามแผนกผู้โหวต
              const byVoterDept = {};
              voteDetails.forEach(v => {
                const deptName = v.voterDeptName;
                if (!byVoterDept[deptName]) byVoterDept[deptName] = [];
                byVoterDept[deptName].push(v);
              });

              const categoryLabels = {
                rank_1: '🥇 อันดับ 1',
                rank_2: '🥈 อันดับ 2',
                rank_3: '🥉 อันดับ 3',
                bottom_2: '⬇️ รองสุดท้าย',
                bottom_1: '📉 สุดท้าย',
              };

              // สรุปจำนวน
              const totalVoters = new Set(voteDetails.map(v => v.voter_id)).size;
              const deptsThatVoted = Object.keys(byVoterDept);
              
              // คำนวณหาแผนกที่ติดอันดับเสมอ เพื่อหักออกจากแผนกที่รอโหวต
              const uniqueScores = [...new Set(departmentRanking.map(r => r.totalScore))];
              const targetScores = new Set();
              if (uniqueScores.length > 0) targetScores.add(uniqueScores[0]);
              if (uniqueScores.length > 1) targetScores.add(uniqueScores[1]);
              if (uniqueScores.length > 2) targetScores.add(uniqueScores[2]);
              if (uniqueScores.length > 0) targetScores.add(uniqueScores[uniqueScores.length - 1]);
              if (uniqueScores.length > 1) targetScores.add(uniqueScores[uniqueScores.length - 2]);

              const tiedDeptNames = new Set();
              targetScores.forEach(score => {
                const depts = departmentRanking.filter(d => d.totalScore === score);
                if (depts.length > 1) {
                  depts.forEach(d => tiedDeptNames.add(d.name));
                }
              });

              // แผนกที่มีสิทธิ์โหวต = แผนกที่ถูกตรวจวันนี้ หักด้วย แผนกที่เสมอ
              const inspectedDeptNames = departmentRanking.map(d => d.name);
              const eligibleDeptNames = inspectedDeptNames.filter(name => !tiedDeptNames.has(name));
              const deptsNotVoted = eligibleDeptNames.filter(name => !deptsThatVoted.includes(name));

              return (
                <>
                  {/* Summary Cards */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.75rem', marginBottom: '1.5rem'
                  }}>
                    <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#16a34a' }}>{totalVoters}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>คนที่โหวตแล้ว</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', background: '#eef2ff', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4f46e5' }}>{deptsThatVoted.length}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>แผนกที่โหวตแล้ว</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#dc2626' }}>{deptsNotVoted.length}</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>แผนกที่ยังไม่โหวต</div>
                    </div>
                  </div>

                  {/* แผนกที่ยังไม่โหวต */}
                  {deptsNotVoted.length > 0 && (
                    <div style={{
                      marginBottom: '1.5rem', padding: '1rem', background: '#fef2f2',
                      borderRadius: '12px', border: '1px solid #fecaca'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#dc2626', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                        🔴 แผนกที่ยังไม่โหวต
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {deptsNotVoted.map(name => (
                          <span key={name} style={{
                            padding: '0.3rem 0.75rem', background: 'white',
                            borderRadius: '20px', fontSize: '0.85rem', color: '#dc2626',
                            border: '1px solid #fca5a5'
                          }}>{name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* รายละเอียดแต่ละแผนก */}
                  {Object.entries(byVoterDept).sort((a, b) => a[0].localeCompare(b[0])).map(([deptName, deptVotes]) => {
                    const uniqueVoters = [...new Set(deptVotes.map(v => v.voter_id))];
                    return (
                      <div key={deptName} style={{
                        marginBottom: '1rem', border: '1px solid #e5e7eb',
                        borderRadius: '12px', overflow: 'hidden'
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #059669, #10b981)',
                          color: 'white', padding: '0.75rem 1rem',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>🏢 {deptName}</span>
                          <span style={{
                            background: 'rgba(255,255,255,0.25)', padding: '0.2rem 0.6rem',
                            borderRadius: '20px', fontSize: '0.8rem'
                          }}>
                            {uniqueVoters.length} คนโหวต
                          </span>
                        </div>
                        <div style={{ padding: '0.75rem 1rem' }}>
                          {deptVotes.map((v, idx) => (
                            <div key={idx} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.5rem 0',
                              borderBottom: idx < deptVotes.length - 1 ? '1px solid #f3f4f6' : 'none',
                              fontSize: '0.9rem'
                            }}>
                              <div>
                                <span style={{ fontWeight: '600', color: '#1e293b' }}>{v.voterName}</span>
                                <span style={{ color: '#9ca3af', marginLeft: '0.5rem', fontSize: '0.78rem' }}>
                                  {categoryLabels[v.vote_category] || v.vote_category}
                                </span>
                              </div>
                              <div style={{
                                background: '#f0f9ff', color: '#0369a1',
                                padding: '0.2rem 0.6rem', borderRadius: '8px',
                                fontSize: '0.82rem', fontWeight: '600'
                              }}>
                                → {v.votedDeptName}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowVoteStatus(false)}
                style={{ padding: '0.5rem 1.5rem' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ranking Popup Modal */}
      {showRankingPopup && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, animation: 'fadeIn 0.3s ease'
          }}
          onClick={() => setShowRankingPopup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1.5rem',
              padding: '2rem',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <button
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'rgba(0,0,0,0.1)', border: 'none',
                color: '#666', fontSize: '1.2rem', cursor: 'pointer',
                borderRadius: '50%', width: '36px', height: '36px'
              }}
              onClick={() => setShowRankingPopup(false)}
            >✕</button>

            <div style={{ fontSize: '1.5rem', color: '#3a3a35', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
              📊 อันดับคะแนน 5ส ทุกแผนก
            </div>
            <div style={{ fontSize: '0.9rem', color: '#7a7a6f', marginBottom: '1.5rem', textAlign: 'center' }}>
              {filterDate
                ? new Date(filterDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'ข้อมูลทั้งหมด'}
            </div>

            {/* Ranking Table in Popup */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#6dcba1', color: 'white' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #6dcba1' }}>อันดับ</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', border: '1px solid #6dcba1' }}>แผนก</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #6dcba1' }}>เปลี่ยนแปลง</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #6dcba1' }}>สะอาด</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #6dcba1' }}>ท้าทาย</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #6dcba1' }}>คะแนนเดิม</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #6dcba1', background: '#4ade80', color: 'black' }}>คะแนนโหวต</th>

                    <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #6dcba1' }}>รูป</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', border: '1px solid #6dcba1' }}>ครั้ง</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentRanking.map((dept, idx) => {
                    const rank = idx + 1;
                    const badge = getRankBadge(rank);
                    const barColor = dept.totalScore >= 27 ? '#16a34a' : dept.totalScore >= 21 ? '#3b82f6' : dept.totalScore >= 15 ? '#f59e0b' : '#ef4444';
                    return (
                      <tr key={dept.id} style={{
                        background: rank <= 3 ? badge.bg : 'white',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                          <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '9999px', background: badge.bg, color: badge.color, fontSize: '0.8rem' }}>
                            {badge.icon} {rank}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{dept.name}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{dept.totalImprovement}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{dept.totalCleanliness}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{dept.totalInnovation}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: barColor }}>{dept.totalScore}</span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', background: rank <= 3 ? 'transparent' : '#f0fdf4' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#16a34a' }}>{dept.voteCount > 0 ? `+${dept.voteCount}` : '-'}</span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          {(dept.allPhotos && dept.allPhotos.length > 0) ? (
                            <button onClick={(e) => { e.stopPropagation(); setGalleryPhotos(dept.allPhotos); setShowRankingPopup(false); }} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.9rem', color: '#3b82f6' }}>
                              🔍 <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{dept.allPhotos.length}</span>
                            </button>
                          ) : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>{dept.count} ครั้ง</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowRankingPopup(false)}
                style={{ padding: '0.5rem 1.5rem' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {departmentRanking.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          ยังไม่มีข้อมูลการตรวจ 5ส
        </div>
      ) : (
        <>
          {/* Ranking Table - Hidden by default, shown in popup */}
          <div className="card" style={{ marginBottom: '1rem', display: 'none' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>📋 ตารางอันดับทุกแผนก</h2>

            {/* === Desktop Table (hidden on mobile) === */}
            <div style={{ overflowX: 'auto', display: 'none' }} className="ranking-table-desktop">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '70px', textAlign: 'center' }}>อันดับ</th>
                    <th>แผนก</th>
                    <th style={{ textAlign: 'center' }}>เปลี่ยนแปลง<br /><span style={{ fontWeight: 'normal', fontSize: '0.75rem' }}>(รวม)</span></th>
                    <th style={{ textAlign: 'center' }}>สะอาด<br /><span style={{ fontWeight: 'normal', fontSize: '0.75rem' }}>(รวม)</span></th>
                    <th style={{ textAlign: 'center' }}>ท้าทาย<br /><span style={{ fontWeight: 'normal', fontSize: '0.75rem' }}>(รวม)</span></th>
                    <th style={{ textAlign: 'center' }}>คะแนนเดิม</th>
                    <th style={{ textAlign: 'center', color: '#16a34a' }}>คะแนนโหวต</th>
                    <th style={{ textAlign: 'center' }}>รูป</th>
                    <th style={{ textAlign: 'center' }}>ครั้ง</th>
                    <th style={{ width: '140px' }}>กราฟ</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentRanking.map((dept, idx) => {
                    const rank = idx + 1;
                    const badge = getRankBadge(rank);
                    const barColor = getScoreBarColor(rank);
                    const maxScore = departmentRanking[0]?.totalScore || 1;
                    const barWidth = (dept.totalScore / maxScore) * 100;
                    const rowStyle = getRowStyle(rank);
                    return (
                      <tr key={dept.name} style={rowStyle}>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: badge.bg, color: badge.color, fontWeight: 'bold', fontSize: '0.85rem', minWidth: '50px' }}>
                            {badge.icon} {rank}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold', fontSize: '1rem' }}>{dept.name}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{dept.totalImprovement}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{dept.totalCleanliness}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{dept.totalInnovation}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: barColor }}>{dept.totalScore}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#16a34a' }}>{dept.voteCount > 0 ? `+${dept.voteCount}` : '-'}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {(dept.allPhotos && dept.allPhotos.length > 0) ? (
                            <button onClick={() => setGalleryPhotos(dept.allPhotos)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', padding: '0.3rem 0.5rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                              🔍 <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{dept.allPhotos.length}</span>
                            </button>
                          ) : <span style={{ color: '#d1d5db' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{dept.count} ครั้ง</td>
                        <td>
                          <div style={{ width: '100%', height: '20px', background: '#f3f4f6', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ width: `${barWidth}%`, height: '100%', background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`, borderRadius: '10px', transition: 'width 0.6s ease' }} />
                            <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '0.65rem', fontWeight: 'bold', color: barWidth > 50 ? '#fff' : '#374151' }}>{Math.round(barWidth)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* === Mobile Card Layout (hidden on desktop) === */}
            <div className="ranking-cards-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {departmentRanking.map((dept, idx) => {
                const rank = idx + 1;
                const badge = getRankBadge(rank);
                const barColor = getScoreBarColor(rank);
                const maxScore = departmentRanking[0]?.totalScore || 1;
                const barWidth = (dept.totalScore / maxScore) * 100;
                const rowStyle = getRowStyle(rank);
                return (
                  <div key={dept.name} style={{
                    ...rowStyle,
                    borderRadius: '12px',
                    padding: '0.85rem 1rem',
                    border: `1px solid ${rowStyle.background && rowStyle.background !== '#fff' ? rowStyle.background : '#e5e7eb'}`,
                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                  }}>
                    {/* Row 1 — Rank + Name + Score + Photo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: badge.bg, color: badge.color, fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>
                        {badge.icon} {rank}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1rem', flex: 1 }}>{dept.name}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '2px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: barColor, lineHeight: 1 }}>{dept.totalScore}</span>
                        {dept.voteCount > 0 && <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#16a34a' }}>โหวต +{dept.voteCount}</span>}
                      </div>
                      {(dept.allPhotos && dept.allPhotos.length > 0) && (
                        <button onClick={() => setGalleryPhotos(dept.allPhotos)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', padding: '0.25rem 0.45rem', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#3b82f6', flexShrink: 0 }}>
                          🔍 <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{dept.allPhotos.length}</span>
                        </button>
                      )}
                    </div>
                    {/* Row 2 — Sub-scores */}
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.78rem', color: '#6b7280', flexWrap: 'wrap' }}>
                      <span>🔄 เปลี่ยนแปลง: <strong style={{ color: '#374151' }}>{dept.totalImprovement}</strong></span>
                      <span>🧹 สะอาด: <strong style={{ color: '#374151' }}>{dept.totalCleanliness}</strong></span>
                      <span>💡 ท้าทาย: <strong style={{ color: '#374151' }}>{dept.totalInnovation}</strong></span>
                      <span>📋 ตรวจ: <strong style={{ color: '#374151' }}>{dept.count} ครั้ง</strong></span>
                    </div>
                    {/* Row 3 — Bar */}
                    <div style={{ height: '10px', background: '#f3f4f6', borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`, borderRadius: '5px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          {/* Score Legend */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📌 เกณฑ์การให้คะแนน</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#dcfce7', border: '1px solid #16a34a' }}>
                <div style={{ fontWeight: 'bold', color: '#16a34a' }}>🟢 อันดับ 1-3</div>
                <div style={{ fontSize: '0.85rem', color: '#374151' }}>ผลงานดีเด่น — รักษามาตรฐาน</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#f3f4f6', border: '1px solid #9ca3af' }}>
                <div style={{ fontWeight: 'bold', color: '#6b7280' }}>⚪ อันดับกลาง</div>
                <div style={{ fontSize: '0.85rem', color: '#374151' }}>ผลงานพอใช้ — ควรพัฒนาเพิ่ม</div>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#fee2e2', border: '1px solid #dc2626' }}>
                <div style={{ fontWeight: 'bold', color: '#dc2626' }}>🔴 2 อันดับสุดท้าย</div>
                <div style={{ fontSize: '0.85rem', color: '#374151' }}>ต้องปรับปรุงเร่งด่วน</div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
              <strong>หัวข้อการตรวจ (แต่ละหัวข้อ 10 คะแนน รวม 30 คะแนน):</strong>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <span>1. การเปลี่ยนแปลงที่ดีขึ้น</span>
                <span>2. ความสะอาด</span>
                <span>3. ความท้าทายแปลกใหม่</span>
              </div>
            </div>
          </div>

          {/* Edit Modal */}
          {editItem && (
            <>
              <div
                onClick={() => setEditItem(null)}
                style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="card"
                  style={{
                    width: '90%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto',
                    position: 'relative', zIndex: 1001
                  }}
                >
                  <h2 style={{ marginBottom: '1.25rem', fontSize: '1.2rem' }}>✏️ แก้ไขรายการตรวจ</h2>

                  {/* Admin-only fields */}
                  <div className="form-group">
                    <label className="form-label">แผนกที่ตรวจ {!isAdmin() && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>(Admin เท่านั้น)</span>}</label>
                    <select
                      className="form-select"
                      value={editForm.department_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                      disabled={!isAdmin()}
                    >
                      <option value="">-- เลือกแผนก --</option>
                      {filteredDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">แผนกผู้ตรวจ {!isAdmin() && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>(Admin เท่านั้น)</span>}</label>
                    <select
                      className="form-select"
                      value={editForm.inspector_department_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, inspector_department_id: e.target.value, inspector_name: '' })}
                      disabled={!isAdmin()}
                    >
                      <option value="">-- เลือกแผนกผู้ตรวจ --</option>
                      {filteredDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ชื่อผู้ตรวจ {!isAdmin() && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>(Admin เท่านั้น)</span>}</label>
                    <select
                      className="form-select"
                      value={editForm.inspector_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, inspector_name: e.target.value })}
                      disabled={!isAdmin() || !editForm.inspector_department_id}
                    >
                      <option value="">{editForm.inspector_department_id ? '-- เลือกผู้ตรวจ --' : '-- เลือกแผนกก่อน --'}</option>
                      {activeEmployees
                        .filter(e => String(e.department_id) === String(editForm.inspector_department_id))
                        .map(emp => (
                          <option key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                            {emp.first_name} {emp.last_name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">วันที่ตรวจ {!isAdmin() && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>(Admin เท่านั้น)</span>}</label>
                    <input
                      type="date" className="form-input"
                      value={editForm.inspection_date || ''}
                      onChange={(e) => setEditForm({ ...editForm, inspection_date: e.target.value })}
                      disabled={!isAdmin()}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">1. การเปลี่ยนแปลงที่ดีขึ้น (0-10)</label>
                    <input
                      type="number" className="form-input" min="0" max="10"
                      value={editForm.score_improvement ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, score_improvement: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">2. ความสะอาด (0-10)</label>
                    <input
                      type="number" className="form-input" min="0" max="10"
                      value={editForm.score_cleanliness ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, score_cleanliness: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">3. ความท้าทายแปลกใหม่ (0-10)</label>
                    <input
                      type="number" className="form-input" min="0" max="10"
                      value={editForm.score_innovation ?? ''}
                      onChange={(e) => setEditForm({ ...editForm, score_innovation: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">หมายเหตุ</label>
                    <textarea
                      className="form-textarea" rows="2"
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    ></textarea>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      disabled={saving}
                      onClick={async () => {
                        const s1 = parseInt(editForm.score_improvement);
                        const s2 = parseInt(editForm.score_cleanliness);
                        const s3 = parseInt(editForm.score_innovation);
                        const s4 = parseInt(editForm.score_cooperation) || 0;
                        const s5 = parseInt(editForm.score_helpfulness) || 0;
                        if ([s1, s2, s3, s4, s5].some(s => isNaN(s) || s < 0 || s > 10)) {
                          alert('คะแนนต้องอยู่ระหว่าง 0-10');
                          return;
                        }
                        setSaving(true);

                        // Build update payload based on role
                        const editType = isAdmin() ? 'admin_override' : 'score_edit';
                        let updatePayload;
                        if (isAdmin()) {
                          updatePayload = {
                            department_id: parseInt(editForm.department_id),
                            inspector_name: editForm.inspector_name,
                            inspector_employee_id: editForm.inspector_employee_id ? parseInt(editForm.inspector_employee_id) : null,
                            inspection_date: editForm.inspection_date,
                            score_improvement: s1,
                            score_cleanliness: s2,
                            score_innovation: s3,
                            score_cooperation: s4,
                            score_helpfulness: s5,
                            total_score: s1 + s2 + s3 + s4 + s5,
                            notes: editForm.notes || null
                          };
                        } else {
                          // User: only scores
                          updatePayload = {
                            score_improvement: s1,
                            score_cleanliness: s2,
                            score_innovation: s3,
                            score_cooperation: s4,
                            score_helpfulness: s5,
                            total_score: s1 + s2 + s3 + s4 + s5
                          };
                        }

                        const { error } = await supabase
                          .from('five_s_inspections')
                          .update(updatePayload)
                          .eq('id', editItem.id);
                        
                        if (!error) {
                          // Audit Log — บันทึกทุกฟิลด์ที่เปลี่ยน
                          const fieldMap = {
                            score_improvement: { old: editItem.score_improvement, new: s1 },
                            score_cleanliness: { old: editItem.score_cleanliness, new: s2 },
                            score_innovation: { old: editItem.score_innovation, new: s3 },
                            score_cooperation: { old: editItem.score_cooperation || 0, new: s4 },
                            score_helpfulness: { old: editItem.score_helpfulness || 0, new: s5 },
                          };
                          if (isAdmin()) {
                            fieldMap.department_id = { old: editItem.department_id, new: parseInt(editForm.department_id) };
                            fieldMap.inspector_name = { old: editItem.inspector_name, new: editForm.inspector_name };
                            fieldMap.inspection_date = { old: editItem.inspection_date, new: editForm.inspection_date };
                            fieldMap.notes = { old: editItem.notes || '', new: editForm.notes || '' };
                          }
                          for (const [field, vals] of Object.entries(fieldMap)) {
                            await logEdit(editItem.id, field, vals.old, vals.new, editType);
                          }

                          setEditItem(null);
                          fetchInspections();
                        } else {
                          alert('เกิดข้อผิดพลาด: ' + error.message);
                        }
                        setSaving(false);
                      }}
                    >
                      {saving ? 'กำลังบันทึก...' : '💾 บันทึกการแก้ไข'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditItem(null)}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Detailed History */}
          <div className="card">
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>🕐 รายการตรวจทั้งหมด</h2>

            {/* Search & Filter */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '180px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 ค้นหาชื่อผู้ตรวจ..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div style={{ minWidth: '180px' }}>
                <select
                  className="form-select"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                >
                  <option value="">ทุกแผนก</option>
                  {[...new Set(filtered.map(i => i.departments?.name).filter(Boolean))].sort().map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const searchFiltered = filtered.filter(ins => {
                const matchName = !searchName || ins.inspector_name?.toLowerCase().includes(searchName.toLowerCase());
                const matchDept = !filterDept || ins.departments?.name === filterDept;
                return matchName && matchDept;
              });

              return searchFiltered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {filtered.length === 0 ? 'ไม่มีข้อมูลในช่วงที่เลือก' : 'ไม่พบรายการที่ค้นหา'}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                    พบ {searchFiltered.length} รายการ
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>วันที่</th>
                          <th>แผนก</th>
                          <th>ผู้ตรวจ</th>
                          <th style={{ textAlign: 'center' }}>เปลี่ยนแปลง</th>
                          <th style={{ textAlign: 'center' }}>สะอาด</th>
                          <th style={{ textAlign: 'center' }}>ท้าทาย</th>
                          <th style={{ textAlign: 'center' }}>ร่วมมือ</th>
                          <th style={{ textAlign: 'center' }}>ช่วยเหลือ</th>
                          <th style={{ textAlign: 'center' }}>รวม</th>
                          <th>หมายเหตุ</th>
                          <th style={{ textAlign: 'center', width: '80px' }}>รูป</th>
                          {(isAdmin() || isEditWindowOpen) && <th style={{ width: '90px', textAlign: 'center' }}>จัดการ</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {searchFiltered.map((ins) => (
                          <tr key={ins.id}>
                            <td>{new Date(ins.inspection_date).toLocaleDateString('th-TH')}</td>
                            <td style={{ fontWeight: 'bold' }}>{ins.departments?.name || '-'}</td>
                            <td>{
                              // แสดงชื่อผู้ตรวจจาก Employee Master ถ้ามี ID เชื่อมโยง (ลด fallback เป็นชื่อที่บันทึกไว้)
                              (() => {
                                if (ins.inspector_employee_id) {
                                  const emp = activeEmployees.find(e => e.id === ins.inspector_employee_id);
                                  return emp ? `${emp.first_name} ${emp.last_name}` : ins.inspector_name;
                                }
                                return ins.inspector_name;
                              })()
                            }</td>
                            <td style={{ textAlign: 'center' }}>{ins.score_improvement}</td>
                            <td style={{ textAlign: 'center' }}>{ins.score_cleanliness}</td>
                            <td style={{ textAlign: 'center' }}>{ins.score_innovation}</td>
                            <td style={{ textAlign: 'center' }}>{ins.score_cooperation || 0}</td>
                            <td style={{ textAlign: 'center' }}>{ins.score_helpfulness || 0}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{ins.total_score}/50</td>
                            <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{ins.notes || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              {((ins.photos && ins.photos.length > 0) || (ins.photo_urls && ins.photo_urls.length > 0)) ? (
                                <button
                                  onClick={() => setGalleryPhotos(ins.photos && ins.photos.length > 0 ? ins.photos : (ins.photo_urls || []).map(u => ({ url: u, comment: '' })))}
                                  style={{
                                    background: 'none', border: '1px solid #e5e7eb',
                                    borderRadius: '8px', cursor: 'pointer',
                                    padding: '0.3rem 0.5rem', fontSize: '1rem',
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    color: '#3b82f6'
                                  }}
                                  title={`ดูรูป ${(ins.photos || ins.photo_urls || []).length} รูป`}
                                >
                                  🔍 <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{(ins.photos && ins.photos.length > 0 ? ins.photos : ins.photo_urls || []).length}</span>
                                </button>
                              ) : (
                                <span style={{ color: '#d1d5db', fontSize: '0.75rem' }}>—</span>
                              )}
                            </td>
                            {(isAdmin() || isEditWindowOpen) && (
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.25rem' }}
                                  title={isAdmin() ? 'แก้ไข (Admin)' : 'แก้ไขคะแนน'}
                                  onClick={() => {
                                    // หาแผนกของผู้ตรวจจากชื่อ
                                    const inspectorEmp = activeEmployees.find(
                                      e => `${e.first_name} ${e.last_name}` === ins.inspector_name
                                    );
                                    setEditItem(ins);
                                    setEditForm({
                                      department_id: ins.department_id,
                                      inspector_department_id: inspectorEmp?.department_id || '',
                                      inspector_name: ins.inspector_name,
                                      inspection_date: ins.inspection_date,
                                      score_improvement: ins.score_improvement,
                                      score_cleanliness: ins.score_cleanliness,
                                      score_innovation: ins.score_innovation,
                                      score_cooperation: ins.score_cooperation || 0,
                                      score_helpfulness: ins.score_helpfulness || 0,
                                      notes: ins.notes || '',
                                      photo_urls: ins.photo_urls || []
                                    });
                                  }}
                                >
                                  ✏️
                                </button>
                                {isAdmin() && (
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                    title="ลบ"
                                    onClick={async () => {
                                      if (!window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
                                      // Log deletion
                                      await logEdit(ins.id, 'deleted', JSON.stringify({ dept: ins.departments?.name, score: ins.total_score }), 'deleted', 'delete');
                                      await supabase.from('five_s_inspections').delete().eq('id', ins.id);
                                      fetchInspections();
                                    }}
                                  >
                                    🗑️
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="photo-lightbox"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="photo-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button
              className="photo-lightbox-close"
              onClick={() => setLightboxUrl(null)}
            >✕</button>
            <img src={lightboxUrl} alt="ขยาย" className="photo-lightbox-img" />
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {galleryPhotos && (
        <div
          onClick={() => setGalleryPhotos(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', animation: 'fadeIn 0.2s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px', padding: '1.5rem',
              maxWidth: '680px', width: '100%', maxHeight: '90vh',
              overflowY: 'auto', position: 'relative'
            }}
          >
            <button
              onClick={() => setGalleryPhotos(null)}
              style={{
                position: 'absolute', top: '0.75rem', right: '0.75rem',
                background: '#f3f4f6', border: 'none', borderRadius: '50%',
                width: '32px', height: '32px', cursor: 'pointer',
                fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >✕</button>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
              📸 รูปภาพการตรวจ ({galleryPhotos.length} รูป)
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '0.75rem'
            }}>
              {galleryPhotos.map((photoItem, idx) => {
                const url = typeof photoItem === 'string' ? photoItem : photoItem.url;
                const comment = typeof photoItem === 'string' ? '' : (photoItem.comment || '');
                const ext = String(url).split('.').pop().split('?')[0].toLowerCase();
                const isHeic = ['heic', 'heif'].includes(ext);
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => { if (!isHeic) { setLightboxUrl(url); setGalleryPhotos(null); } }}>
                      {isHeic ? (
                        <div style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📷</div>
                          <div>ไฟล์ HEIC</div>
                          <a href={url} download style={{ color: '#3b82f6', fontSize: '0.7rem' }} onClick={e => e.stopPropagation()}>ดาวน์โหลด</a>
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt={`รูป ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div style="text-align:center;padding:0.5rem;font-size:0.75rem;color:#6b7280"><div style="font-size:2rem">⚠️</div>โหลดรูปไม่ได้</div>'; }}
                        />
                      )}
                    </div>
                    {(comment || photoItem.id) ? (
                      editingCommentId === photoItem.id ? (
                        <div style={{ padding: '0.4rem', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            style={{ 
                              width: '100%', fontSize: '0.75rem', padding: '6px', 
                              borderRadius: '4px', border: '1px solid #93c5fd', 
                              minHeight: '40px', outline: 'none', resize: 'vertical'
                            }}
                            placeholder="เพิ่มคอมเมนต์..."
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingCommentId(null)} style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#e5e7eb', color: '#4b5563', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>ยกเลิก</button>
                            <button onClick={() => handleSaveComment(photoItem.id)} style={{ fontSize: '0.7rem', padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>บันทึก</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          fontSize: '0.75rem', color: '#374151', padding: '0.3rem 0.5rem',
                          background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe',
                          wordBreak: 'break-word', lineHeight: 1.3, position: 'relative',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                          minHeight: '32px'
                        }}>
                          <span style={{flex: 1}}>💬 {comment || <span style={{color: '#9ca3af', fontStyle:'italic'}}>ไม่มีคอมเมนต์</span>}</span>
                          {(isAdmin && photoItem.id) ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingCommentId(photoItem.id); setEditingCommentText(comment); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0 0 0 4px', opacity: 0.6, flexShrink: 0 }}
                              title="แก้ไขคอมเมนต์"
                            >✏️</button>
                          ) : null}
                        </div>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
