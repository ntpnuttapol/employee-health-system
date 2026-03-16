import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useAuth } from '../../contexts/AuthContext';
import confetti from 'canvas-confetti';

export default function FiveSVoting() {
  const { departments, branches } = useMasterData();
  const { user } = useAuth();

  // ชื่อแผนกของผู้โหวต (ใช้ป้องกันการโหวตให้แผนกตัวเอง)
  const voterDeptName = user?.employees?.departments?.name || null;

  // ล็อกเฉพาะสาขาสุวรรณภูมิ
  const suvarnabhumiBranch = (branches || []).find(b => b.name.includes('สุวรรณภูมิ'));
  const filteredDepartments = (departments || []).filter(
    d => d.is_active !== false && suvarnabhumiBranch && d.branch_id === suvarnabhumiBranch.id
  );

  const [loading, setLoading] = useState(false);
  
  // Default ให้เป็นวันที่ปัจจุบัน YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(todayStr);
  
  const [tiedGroups, setTiedGroups] = useState([]);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [votedCategories, setVotedCategories] = useState([]);

  // check if user already voted today
  const checkVotes = useCallback(async () => {
    if (!user || !filterDate) return;
    const { data } = await supabase
      .from('five_s_votes')
      .select('vote_category')
      .eq('inspection_date', filterDate)
      .eq('voter_id', user.id);
    
    if (data) {
      setVotedCategories(data.map(v => v.vote_category || 'rank_1')); // default to rank_1 for older votes
    }
  }, [user, filterDate]);

  useEffect(() => {
    checkVotes();
  }, [checkVotes]);

  const fetchTies = useCallback(async (date) => {
    if (!date) {
      setTiedGroups([]);
      return;
    }
    setLoading(true);

    // 1. Fetch inspections for the date
    const { data: inspections, error } = await supabase
      .from('five_s_inspections')
      .select('*, departments(name)')
      .eq('inspection_date', date);

    if (error || !inspections || inspections.length === 0) {
      setTiedGroups([]);
      setLoading(false);
      return;
    }

    // 2. Compute rankings
    const map = {};
    inspections.forEach((ins) => {
      const deptName = ins.departments?.name || 'ไม่ระบุแผนก';
      if (!map[deptName]) {
        map[deptName] = {
          name: deptName,
          totalScore: 0,
        };
      }
      map[deptName].totalScore += ins.total_score;
    });

    const ranking = Object.values(map).sort((a, b) => b.totalScore - a.totalScore);
    const uniqueScores = [...new Set(ranking.map(r => r.totalScore))];

    // Identify target scores for voting
    const targetScores = new Set();
    
    // Top 3 scores
    if (uniqueScores.length > 0) targetScores.add(uniqueScores[0]);
    if (uniqueScores.length > 1) targetScores.add(uniqueScores[1]);
    if (uniqueScores.length > 2) targetScores.add(uniqueScores[2]);
    
    // Bottom 2 scores
    if (uniqueScores.length > 0) targetScores.add(uniqueScores[uniqueScores.length - 1]);
    if (uniqueScores.length > 1) targetScores.add(uniqueScores[uniqueScores.length - 2]);

    const newTies = [];
    
    targetScores.forEach(score => {
      const depts = ranking.filter(d => d.totalScore === score);
      if (depts.length > 1) {
        let category = '';
        let title = '';
        if (score === uniqueScores[0]) { category = 'rank_1'; title = 'อันดับ 1'; }
        else if (score === uniqueScores[1]) { category = 'rank_2'; title = 'อันดับ 2'; }
        else if (score === uniqueScores[2]) { category = 'rank_3'; title = 'อันดับ 3'; }
        else if (score === uniqueScores[uniqueScores.length - 1]) { category = 'bottom_1'; title = 'อันดับสุดท้าย'; }
        else if (score === uniqueScores[uniqueScores.length - 2]) { category = 'bottom_2'; title = 'อันดับรองสุดท้าย'; }
        
        if (category) {
          newTies.push({ score, category, title, departments: depts });
        }
      }
    });

    // Sort ties by score descending
    newTies.sort((a,b) => b.score - a.score);
    
    setTiedGroups(newTies);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTies(filterDate);
  }, [filterDate, fetchTies]);

  const handleVote = async (deptName, category) => {
    const dept = filteredDepartments.find(d => d.name === deptName);
    if (!dept) return;

    if (!window.confirm(`ยืนยันการโหวตให้ ${deptName} ใช่หรือไม่?`)) return;

    setSubmittingVote(true);
    const { error } = await supabase
      .from('five_s_votes')
      .insert({
        inspection_date: filterDate,
        department_id: dept.id,
        voter_id: user?.id || 'anonymous',
        vote_category: category
      });

    if (!error) {
      setVotedCategories(prev => [...prev, category]);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#16a34a', '#4ade80', '#ffffff', '#fbbf24']
      });
    } else {
      alert('เกิดข้อผิดพลาดในการโหวต: ' + error.message);
    }
    setSubmittingVote(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '1rem' }}>
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🗳️</div>
        <h1 className="page-title" style={{ justifyContent: 'center' }}>โหวตคะแนน 5ส (รอบเสมอ)</h1>
        <p className="page-subtitle" style={{ textAlign: 'center' }}>
          ร่วมตัดสินแผนกที่ควรได้รับรางวัลชนะเลิศประจำวัน
        </p>
      </div>

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
        <label style={{ fontWeight: 'bold' }}>วันที่ตรวจ:</label>
        <input
          type="date"
          className="form-input"
          style={{ maxWidth: '200px' }}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
          กำลังตรวจสอบผลคะแนน...
        </div>
      ) : tiedGroups.length > 0 ? (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-block', background: '#fef2f2', color: '#dc2626', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '1rem', border: '1px solid #fca5a5' }}>
              🔴 ปิดบังผลโหวตแบบเรียลไทม์
            </div>
            <h2 style={{ fontSize: '1.3rem', color: '#1e293b' }}>เลือกแผนกที่คุณคิดว่าทำ 5ส ได้ดีที่สุดในแต่ละอันดับที่เสมอ</h2>
          </div>
          
          {tiedGroups.map(group => {
            const hasVotedThisCat = votedCategories.includes(group.category);
            // ตรวจสอบว่าแผนกของผู้โหวตอยู่ในกลุ่มที่ถูกโหวตหรือไม่
            const isVoterInGroup = voterDeptName && group.departments.some(d => d.name === voterDeptName);
            
            return (
              <div key={group.category} className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#1e293b', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                  🏆 โหวตหาแผนกที่ได้ <span style={{ color: '#2563eb' }}>{group.title}</span> <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 'normal' }}>(คะแนนเสมอ {group.score} คะแนน)</span>
                </h3>
                
                {isVoterInGroup ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚫</div>
                    <h4 style={{ color: '#dc2626', margin: 0, fontSize: '1.1rem' }}>แผนกของคุณอยู่ในอันดับนี้ จึงไม่สามารถโหวตได้</h4>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      แผนกที่อยู่ในกลุ่มคะแนนเสมอจะไม่สามารถร่วมโหวตในอันดับนั้นได้
                    </p>
                  </div>
                ) : hasVotedThisCat ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #16a34a' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                    <h4 style={{ color: '#16a34a', margin: 0, fontSize: '1.1rem' }}>คุณได้ทำการโหวตสำหรับ {group.title} ไปแล้ว</h4>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    {group.departments.map(dept => (
                      <div key={dept.name} style={{
                        textAlign: 'center',
                        padding: '1.5rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        background: '#f9fafb',
                        transition: 'all 0.2s',
                        cursor: submittingVote ? 'not-allowed' : 'pointer'
                      }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'white', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2rem' }}>
                          🏢
                        </div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: '#1e293b' }}>{dept.name}</h4>
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', padding: '0.6rem', fontSize: '1rem' }}
                          disabled={submittingVote}
                          onClick={() => handleVote(dept.name, group.category)}
                        >
                          {submittingVote ? 'กำลังบันทึก...' : '✔️ โหวต'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>⚖️</div>
          <h3>ไม่มีแผนกที่คะแนนเสมอกันในอันดับที่ต้องการโหวต</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>ระบบเปิดให้โหวตเฉพาะกรณีที่มีคะแนนรวมเท่ากันในอันดับ 1-3 หรือ 2 อันดับสุดท้าย</p>
        </div>
      )}
    </div>
  );
}
