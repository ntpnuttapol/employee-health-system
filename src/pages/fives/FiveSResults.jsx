import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMasterData } from '../../contexts/MasterDataContext';
import confetti from 'canvas-confetti';

export default function FiveSResults() {
  const { departments, branches, employees, loading: masterLoading } = useMasterData();

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
  const [filterMonth, setFilterMonth] = useState('');
  const [searchName, setSearchName] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPodium, setShowPodium] = useState(false);

  // พลุเมื่อเปิด podium
  const fireConfetti = useCallback(() => {
    const duration = 4000;
    const end = Date.now() + duration;
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#7B68EE', '#32CD32'];
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    // พลุใหญ่ตรงกลาง
    confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors });
    setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 }, colors }), 300);
    frame();
  }, []);

  // ออกรีพอร์ต PDF
  const printReport = () => {
    const monthLabel = filterMonth
      ? new Date(filterMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
      : 'ทั้งหมด';

    const rows = departmentRanking.map((dept, idx) => {
      const rank = idx + 1;
      let rowBg = '#fff';
      if (rank <= 3) rowBg = '#f0fdf4';
      if (total >= 5 && rank > total - 2) rowBg = '#fef2f2';
      return `<tr style="background:${rowBg}">
        <td style="text-align:center;font-weight:bold;padding:8px;border:1px solid #e5e7eb">${rank}</td>
        <td style="font-weight:bold;padding:8px;border:1px solid #e5e7eb">${dept.name}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${dept.totalImprovement}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${dept.totalCleanliness}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${dept.totalInnovation}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb;font-weight:bold;font-size:1.1em">${dept.totalScore}</td>
        <td style="text-align:center;padding:8px;border:1px solid #e5e7eb">${dept.count}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>รายงานผลคะแนน 5ส</title>
<style>
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: 'Sarabun', 'Segoe UI', sans-serif; padding: 20px; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1e3a5f; color: #fff; padding: 10px 8px; border: 1px solid #1e3a5f; font-size: 0.9em; }
</style></head><body>
<div style="text-align:center;margin-bottom:24px">
  <img src="/pfslogo.png" style="height:60px;margin-bottom:8px" />
  <h1 style="margin:0;font-size:1.5em;color:#1e3a5f">รายงานผลคะแนนการตรวจ 5ส</h1>
  <p style="margin:4px 0 0;color:#6b7280;font-size:0.95em">Polyfoam PFS — สาขาสุวรรณภูมิ</p>
  <p style="margin:4px 0 0;color:#6b7280;font-size:0.9em">เดือน: ${monthLabel} | จำนวนแผนกที่ตรวจ: ${departmentRanking.length} แผนก</p>
</div>
<table>
  <thead><tr>
    <th style="width:60px">อันดับ</th>
    <th>แผนก</th>
    <th>การเปลี่ยนแปลง</th>
    <th>ความสะอาด</th>
    <th>ความท้าทาย</th>
    <th>คะแนนรวม</th>
    <th>จำนวนครั้ง</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div style="margin-top:24px;text-align:center;color:#9ca3af;font-size:0.8em">
  พิมพ์เมื่อ ${new Date().toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
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
      .select('*, departments(name)')
      .order('inspection_date', { ascending: false });

    const { data, error } = await query;
    if (!error) {
      setInspections(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  // Filter by month
  const filtered = filterMonth
    ? inspections.filter(i => i.inspection_date?.startsWith(filterMonth))
    : inspections;

  // Build department ranking from filtered data
  const departmentRanking = (() => {
    const map = {};
    filtered.forEach((ins) => {
      const deptName = ins.departments?.name || 'ไม่ระบุแผนก';
      if (!map[deptName]) {
        map[deptName] = {
          name: deptName,
          totalImprovement: 0,
          totalCleanliness: 0,
          totalInnovation: 0,
          totalScore: 0,
          count: 0,
          latestDate: ins.inspection_date,
          latestScore: ins.total_score
        };
      }
      map[deptName].totalImprovement += ins.score_improvement;
      map[deptName].totalCleanliness += ins.score_cleanliness;
      map[deptName].totalInnovation += ins.score_innovation;
      map[deptName].totalScore += ins.total_score;
      map[deptName].count += 1;
      if (ins.inspection_date > map[deptName].latestDate) {
        map[deptName].latestDate = ins.inspection_date;
        map[deptName].latestScore = ins.total_score;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.totalScore - a.totalScore);
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

  // Month options from data
  const monthOptions = (() => {
    const months = new Set();
    inspections.forEach(i => {
      if (i.inspection_date) months.add(i.inspection_date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  })();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>
        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">📊 ผลคะแนน 5ส &amp; อันดับแผนก</h1>
        <p className="page-subtitle">
          สรุปคะแนนเฉลี่ยรายแผนก — อันดับ 1-3 <span style={{ color: '#16a34a', fontWeight: 'bold' }}>สีเขียว</span> / สองอันดับสุดท้าย <span style={{ color: '#dc2626', fontWeight: 'bold' }}>สีแดง</span>
        </p>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>กรองเดือน:</label>
        <select
          className="form-select"
          style={{ maxWidth: '220px' }}
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {monthOptions.map(m => {
            const [y, mo] = m.split('-');
            const label = new Date(y, parseInt(mo) - 1).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
            return <option key={m} value={m}>{label}</option>;
          })}
        </select>
        <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          ({filtered.length} รายการ จาก {departmentRanking.length} แผนก)
        </span>
        <button
          className="btn btn-secondary"
          style={{ marginLeft: 'auto' }}
          onClick={printReport}
          disabled={departmentRanking.length === 0}
        >
          🖨️ ออกรีพอร์ต
        </button>
      </div>

      {/* สรุปคะแนนรวม */}
      {filtered.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {[
            { label: 'จำนวนการตรวจ', value: filtered.length, unit: 'รายการ', color: '#6366f1', bg: '#eef2ff' },
            { label: 'เฉลี่ยการเปลี่ยนแปลง', value: (filtered.reduce((s, i) => s + i.score_improvement, 0) / filtered.length).toFixed(1), unit: '/10', color: '#0891b2', bg: '#ecfeff' },
            { label: 'เฉลี่ยความสะอาด', value: (filtered.reduce((s, i) => s + i.score_cleanliness, 0) / filtered.length).toFixed(1), unit: '/10', color: '#059669', bg: '#ecfdf5' },
            { label: 'เฉลี่ยความท้าทาย', value: (filtered.reduce((s, i) => s + i.score_innovation, 0) / filtered.length).toFixed(1), unit: '/10', color: '#d97706', bg: '#fffbeb' },
            { label: 'เฉลี่ยรวมทุกแผนก', value: (filtered.reduce((s, i) => s + i.total_score, 0) / filtered.length).toFixed(1), unit: '/30', color: '#dc2626', bg: '#fef2f2' }
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

      {/* ปุ่มเปิด Podium Popup */}
      {departmentRanking.length >= 3 && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button
            className="btn btn-primary btn-lg"
            style={{
              padding: '0.75rem 2.5rem',
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(239,68,68,0.4)'
            }}
            onClick={() => { setShowPodium(true); setTimeout(fireConfetti, 300); }}
          >
            🏆 ประกาศอันดับ Top 3
          </button>
        </div>
      )}

      {/* Podium Popup Modal */}
      {showPodium && departmentRanking.length >= 3 && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, animation: 'fadeIn 0.3s ease'
          }}
          onClick={() => setShowPodium(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              borderRadius: '20px',
              padding: '2rem',
              width: '90%',
              maxWidth: '700px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              animation: 'slideUp 0.5s ease'
            }}
          >
            <button
              onClick={() => setShowPodium(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'rgba(255,255,255,0.1)', border: 'none',
                color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                borderRadius: '50%', width: '36px', height: '36px'
              }}
            >✕</button>

            <div style={{ fontSize: '1.5rem', color: '#ffd700', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              🎉 ประกาศผลอันดับ 5ส 🎉
            </div>
            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '2rem' }}>
              {filterMonth
                ? new Date(filterMonth + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
                : 'ทั้งหมด'}
            </div>

            {/* Podium */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              {/* 2nd Place */}
              <div style={{ flex: 1, maxWidth: '180px', animation: 'slideUp 0.6s ease 0.3s both' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥈</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.25rem' }}>
                  {departmentRanking[1].name}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#c0c0c0' }}>
                  {departmentRanking[1].totalScore}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>คะแนน</div>
                <div style={{
                  height: '100px', marginTop: '0.75rem',
                  background: 'linear-gradient(180deg, #94a3b8, #64748b)',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 'bold', color: '#fff'
                }}>2</div>
              </div>

              {/* 1st Place */}
              <div style={{ flex: 1, maxWidth: '200px', animation: 'slideUp 0.6s ease 0.1s both' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 0 10px #ffd700)' }}>🥇</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ffd700', marginBottom: '0.25rem' }}>
                  {departmentRanking[0].name}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ffd700' }}>
                  {departmentRanking[0].totalScore}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>คะแนน</div>
                <div style={{
                  height: '140px', marginTop: '0.75rem',
                  background: 'linear-gradient(180deg, #fbbf24, #f59e0b)',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.5rem', fontWeight: 'bold', color: '#fff'
                }}>1</div>
              </div>

              {/* 3rd Place */}
              <div style={{ flex: 1, maxWidth: '180px', animation: 'slideUp 0.6s ease 0.5s both' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥉</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '0.25rem' }}>
                  {departmentRanking[2].name}
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#cd7f32' }}>
                  {departmentRanking[2].totalScore}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>คะแนน</div>
                <div style={{
                  height: '70px', marginTop: '0.75rem',
                  background: 'linear-gradient(180deg, #cd7f32, #a0522d)',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 'bold', color: '#fff'
                }}>3</div>
              </div>
            </div>

            <button
              onClick={() => { setShowPodium(false); fireConfetti(); }}
              style={{
                padding: '0.6rem 2rem', fontSize: '1rem',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                border: 'none', borderRadius: '8px', cursor: 'pointer',
                color: '#1a1a2e', fontWeight: 'bold'
              }}
            >🎆 ยิงพลุอีกครั้ง!</button>
          </div>
        </div>
      )}

      {departmentRanking.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          ยังไม่มีข้อมูลการตรวจ 5ส
        </div>
      ) : (
        <>
          {/* Full Ranking Table */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>📋 ตารางอันดับทุกแผนก</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '70px', textAlign: 'center' }}>อันดับ</th>
                    <th>แผนก</th>
                    <th style={{ textAlign: 'center' }}>การเปลี่ยนแปลง<br /><span style={{ fontWeight: 'normal', fontSize: '0.75rem' }}>(รวม)</span></th>
                    <th style={{ textAlign: 'center' }}>ความสะอาด<br /><span style={{ fontWeight: 'normal', fontSize: '0.75rem' }}>(รวม)</span></th>
                    <th style={{ textAlign: 'center' }}>ความท้าทาย<br /><span style={{ fontWeight: 'normal', fontSize: '0.75rem' }}>(รวม)</span></th>
                    <th style={{ textAlign: 'center' }}>คะแนนรวม</th>
                    <th style={{ textAlign: 'center' }}>จำนวนครั้ง</th>
                    <th style={{ width: '180px' }}>กราฟ</th>
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
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            background: badge.bg,
                            color: badge.color,
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            minWidth: '50px'
                          }}>
                            {badge.icon} {rank}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold', fontSize: '1rem' }}>{dept.name}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{dept.totalImprovement}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{dept.totalCleanliness}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{dept.totalInnovation}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 'bold',
                            fontSize: '1.2rem',
                            color: barColor
                          }}>
                            {dept.totalScore}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{dept.count} ครั้ง</td>
                        <td>
                          <div style={{
                            width: '100%',
                            height: '22px',
                            background: '#f3f4f6',
                            borderRadius: '11px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              width: `${barWidth}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                              borderRadius: '11px',
                              transition: 'width 0.6s ease'
                            }} />
                            <span style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              color: barWidth > 50 ? '#fff' : '#374151'
                            }}>
                              {Math.round(barWidth)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Legend */}
          <div className="card" style={{ marginBottom: '2rem' }}>
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

                  <div className="form-group">
                    <label className="form-label">แผนกที่ตรวจ</label>
                    <select
                      className="form-select"
                      value={editForm.department_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                    >
                      <option value="">-- เลือกแผนก --</option>
                      {filteredDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">แผนกผู้ตรวจ</label>
                    <select
                      className="form-select"
                      value={editForm.inspector_department_id || ''}
                      onChange={(e) => setEditForm({ ...editForm, inspector_department_id: e.target.value, inspector_name: '' })}
                    >
                      <option value="">-- เลือกแผนกผู้ตรวจ --</option>
                      {filteredDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ชื่อผู้ตรวจ</label>
                    <select
                      className="form-select"
                      value={editForm.inspector_name || ''}
                      onChange={(e) => setEditForm({ ...editForm, inspector_name: e.target.value })}
                      disabled={!editForm.inspector_department_id}
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
                    <label className="form-label">วันที่ตรวจ</label>
                    <input
                      type="date" className="form-input"
                      value={editForm.inspection_date || ''}
                      onChange={(e) => setEditForm({ ...editForm, inspection_date: e.target.value })}
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
                        if ([s1, s2, s3].some(s => isNaN(s) || s < 0 || s > 10)) {
                          alert('คะแนนต้องอยู่ระหว่าง 0-10');
                          return;
                        }
                        setSaving(true);
                        const { error } = await supabase
                          .from('five_s_inspections')
                          .update({
                            department_id: parseInt(editForm.department_id),
                            inspector_name: editForm.inspector_name,
                            inspection_date: editForm.inspection_date,
                            score_improvement: s1,
                            score_cleanliness: s2,
                            score_innovation: s3,
                            total_score: s1 + s2 + s3,
                            notes: editForm.notes || null
                          })
                          .eq('id', editItem.id);
                        setSaving(false);
                        if (!error) {
                          setEditItem(null);
                          fetchInspections();
                        } else {
                          alert('เกิดข้อผิดพลาด: ' + error.message);
                        }
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
                          <th style={{ textAlign: 'center' }}>การเปลี่ยนแปลง</th>
                          <th style={{ textAlign: 'center' }}>ความสะอาด</th>
                          <th style={{ textAlign: 'center' }}>ความท้าทาย</th>
                          <th style={{ textAlign: 'center' }}>รวม</th>
                          <th>หมายเหตุ</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchFiltered.map((ins) => (
                          <tr key={ins.id}>
                            <td>{new Date(ins.inspection_date).toLocaleDateString('th-TH')}</td>
                            <td style={{ fontWeight: 'bold' }}>{ins.departments?.name || '-'}</td>
                            <td>{ins.inspector_name}</td>
                            <td style={{ textAlign: 'center' }}>{ins.score_improvement}</td>
                            <td style={{ textAlign: 'center' }}>{ins.score_cleanliness}</td>
                            <td style={{ textAlign: 'center' }}>{ins.score_innovation}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{ins.total_score}/30</td>
                            <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{ins.notes || '-'}</td>
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', marginRight: '0.25rem' }}
                                title="แก้ไข"
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
                                    notes: ins.notes || ''
                                  });
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                title="ลบ"
                                onClick={async () => {
                                  if (!window.confirm('ต้องการลบรายการนี้ใช่หรือไม่?')) return;
                                  await supabase.from('five_s_inspections').delete().eq('id', ins.id);
                                  fetchInspections();
                                }}
                              >
                                🗑️
                              </button>
                            </td>
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
    </div>
  );
}
