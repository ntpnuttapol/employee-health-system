import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { useActivity } from '../contexts/ActivityContext';
import { useHealth } from '../contexts/HealthContext';
import { supabase } from '../lib/supabaseClient';

export default function DashboardPage() {
  const { user } = useAuth();
  const { employees, departments, branches } = useMasterData();
  const { activities } = useActivity();
  const { healthRecords } = useHealth();
  const [todayAttendance, setTodayAttendance] = useState(0);
  const [totalAttendance, setTotalAttendance] = useState(0);

  // Fetch attendance statistics
  useEffect(() => {
    async function fetchAttendanceStats() {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { count: todayCount } = await supabase
          .from('activity_attendance')
          .select('*', { count: 'exact', head: true })
          .gte('check_in_time', today + 'T00:00:00')
          .lt('check_in_time', today + 'T23:59:59');
        
        setTodayAttendance(todayCount || 0);

        const { count: totalCount } = await supabase
          .from('activity_attendance')
          .select('*', { count: 'exact', head: true });
        
        setTotalAttendance(totalCount || 0);
      } catch (error) {
        console.error('Error fetching attendance stats:', error);
      }
    }
    fetchAttendanceStats();
  }, []);

  const stats = {
    employees: employees.length,
    departments: departments.length,
    branches: branches.length,
    activities: activities.length,
    healthRecords: healthRecords.length,
    todayAttendance: todayAttendance,
    totalAttendance: totalAttendance
  };

  // Inject Tailwind CDN and FontAwesome to test the mockup, and hide AppLayout elements
  useEffect(() => {
    // 1. Hide Global Layout
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const headerBar = document.querySelector('.page-header');
    const appContainer = document.querySelector('.app-container');
    
    if (sidebar) sidebar.style.display = 'none';
    if (headerBar) headerBar.style.display = 'none';
    if (appContainer) appContainer.style.background = 'radial-gradient(circle at 10% 20%, rgb(180, 215, 255) 0%, rgb(150, 180, 240) 30%, rgb(200, 170, 255) 70%, rgb(160, 220, 255) 100%)';
    if (mainContent) {
      mainContent.style.marginLeft = '0';
      mainContent.style.padding = '0';
      mainContent.style.background = 'transparent';
      mainContent.style.minHeight = '100vh';
      mainContent.style.display = 'flex';
      mainContent.style.alignItems = 'center';
      mainContent.style.justifyContent = 'center';
    }

    // 2. Inject CDNs dynamically so we don't pollute the whole app permanently
    const tailwindScript = document.createElement('script');
    tailwindScript.src = 'https://cdn.tailwindcss.com?plugins=forms,container-queries';
    document.head.appendChild(tailwindScript);

    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(fontAwesome);

    return () => {
      if (sidebar) sidebar.style.display = '';
      if (headerBar) headerBar.style.display = '';
      if (appContainer) appContainer.style.background = '';
      if (mainContent) {
        mainContent.style.marginLeft = '';
        mainContent.style.padding = '';
        mainContent.style.background = '';
        mainContent.style.minHeight = '';
        mainContent.style.display = '';
        mainContent.style.alignItems = '';
        mainContent.style.justifyContent = '';
      }
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
        
        .mockup-wrapper { font-family: 'Prompt', sans-serif; width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .glass-container { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.5); border-radius: 1.5rem; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15); overflow: hidden; }
        .sidebar-gradient { background: linear-gradient(180deg, rgba(16, 30, 60, 0.8) 0%, rgba(10, 20, 45, 0.8) 100%); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .glass-card { background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 1rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .btn-gradient-blue { background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%); }
        .btn-gradient-purple { background: linear-gradient(90deg, #6366f1 0%, #4f46e5 100%); }
        .chart-placeholder { width: 100%; height: 60px; margin-top: 10px; position: relative; }
        .sparkline-green { stroke: #10b981; stroke-width: 2; fill: none; }
        .sparkline-blue { stroke: #3b82f6; stroke-width: 2; fill: none; }
        .main-line-chart { stroke: #3b82f6; stroke-width: 3; fill: rgba(59, 130, 246, 0.2); }
        .progress-track { background: rgba(0,0,0,0.05); border-radius: 999px; height: 8px; width: 100%; overflow: hidden; margin-top: 20px;}
        .progress-bar-inner { background: linear-gradient(90deg, #3b82f6, #8b5cf6); height: 100%; width: 70%; }
        .bar-chart-container { display: flex; align-items: flex-end; justify-content: space-around; height: 80px; margin-top: 20px;}
        .bar-item { width: 12px; border-radius: 6px; background: linear-gradient(180deg, #3b82f6, #8b5cf6); }
      `}</style>
      
      <div className="mockup-wrapper text-gray-800 antialiased">
        <div className="glass-container w-full max-w-[1408px] h-[768px] flex shadow-2xl relative">
          
          {/* Sidebar */}
          <aside className="sidebar-gradient w-[260px] h-full flex flex-col text-white rounded-l-2xl flex-shrink-0 z-10 relative shadow-[10px_0_15px_-3px_rgba(0,0,0,0.1)]">
            <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
              <Link to="/dashboard" className="flex items-center space-x-3 bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm border border-white/5 transition-colors">
                <i className="fas fa-th-large w-5 text-center text-blue-300"></i>
                <span className="font-medium text-sm">แดชบอร์ด</span>
              </Link>
              <Link to="/users" className="flex items-center space-x-3 hover:bg-white/5 px-4 py-3 rounded-xl transition-colors text-gray-300 hover:text-white">
                <i className="fas fa-users w-5 text-center text-gray-400"></i>
                <span className="font-medium text-sm">ผู้ใช้งาน</span>
              </Link>
              <Link to="/branches" className="flex items-center space-x-3 hover:bg-white/5 px-4 py-3 rounded-xl transition-colors text-gray-300 hover:text-white">
                <i className="fas fa-building w-5 text-center text-gray-400"></i>
                <span className="font-medium text-sm">สาขา</span>
              </Link>
              <Link to="/activities" className="flex items-center space-x-3 hover:bg-white/5 px-4 py-3 rounded-xl transition-colors text-gray-300 hover:text-white">
                <i className="fas fa-calendar-alt w-5 text-center text-gray-400"></i>
                <span className="font-medium text-sm">ตารางกิจกรรม</span>
              </Link>
              <Link to="/five-s-results" className="flex items-center space-x-3 hover:bg-white/5 px-4 py-3 rounded-xl transition-colors text-gray-300 hover:text-white">
                <i className="fas fa-file-alt w-5 text-center text-gray-400"></i>
                <span className="font-medium text-sm">รายงาน</span>
              </Link>
              <a className="flex items-center space-x-3 hover:bg-white/5 px-4 py-3 rounded-xl transition-colors text-gray-300 hover:text-white" href="#">
                <i className="fas fa-chart-bar w-5 text-center text-gray-400"></i>
                <span className="font-medium text-sm">กิจกรรมทั้งหมด</span>
              </a>
              <a className="flex items-center space-x-3 hover:bg-white/5 px-4 py-3 rounded-xl transition-colors text-gray-300 hover:text-white" href="#">
                <i className="fas fa-chart-pie w-5 text-center text-gray-400"></i>
                <span className="font-medium text-sm">สถิติ</span>
              </a>
              <a className="flex items-center space-x-3 hover:bg-white/5 px-4 py-3 rounded-xl transition-colors text-gray-300 hover:text-white" href="#">
                <i className="fas fa-bell w-5 text-center text-gray-400"></i>
                <span className="font-medium text-sm">การแจ้งเตือน</span>
              </a>
              <a className="flex items-center space-x-3 hover:bg-white/5 px-4 py-3 rounded-xl transition-colors text-gray-300 hover:text-white" href="#">
                <i className="fas fa-cog w-5 text-center text-gray-400"></i>
                <span className="font-medium text-sm">ตั้งค่า</span>
              </a>
            </nav>
          </aside>
          
          {/* Main Content Area */}
          <main className="flex-1 flex flex-col overflow-hidden relative z-0">
            {/* Top Bar */}
            <header className="h-20 flex items-center justify-between px-8 pt-4">
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400 text-sm"></i>
                </div>
                <input className="w-full pl-10 pr-4 py-2 bg-white/40 border border-white/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md placeholder-gray-500" placeholder="Search..." type="text"/>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white/40 border border-white/60 px-4 py-2 rounded-full backdrop-blur-md">
                  <span className="text-sm font-medium">Status</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_5px_#4ade80]"></span>
                </div>
                <div className="flex items-center space-x-2 bg-white/40 border border-white/60 px-4 py-2 rounded-full backdrop-blur-md">
                  <span className="text-sm font-medium">Notification</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></span>
                </div>
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors relative">
                  <i className="far fa-bell text-gray-600"></i>
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border border-white"></span>
                </button>
              </div>
            </header>
            
            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4 custom-scrollbar">
              {/* Quick Stats Section */}
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Stats</h2>
                <div className="grid grid-cols-12 gap-6">
                  {/* Stats Grid */}
                  <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
                    <div className="glass-card p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.employees}</h3>
                        <p className="text-xs text-gray-500 mt-1">พนักงานทั้งหมด</p>
                      </div>
                      <div className="chart-placeholder h-12 mt-2">
                        <svg className="w-full h-full preserve-aspect-ratio-none" viewBox="0 0 100 30">
                          <path className="sparkline-green" d="M0 25 L20 15 L40 20 L60 5 L80 10 L100 0"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="glass-card p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.departments}</h3>
                        <p className="text-xs text-gray-500 mt-1">แผนก</p>
                      </div>
                      <div className="chart-placeholder h-12 mt-2">
                        <svg className="w-full h-full preserve-aspect-ratio-none" viewBox="0 0 100 30">
                          <path className="sparkline-blue" d="M0 20 L20 25 L40 10 L60 15 L80 5 L100 10"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="glass-card p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.branches}</h3>
                        <p className="text-xs text-gray-500 mt-1">สาขา</p>
                      </div>
                      <div className="chart-placeholder h-12 mt-2">
                        <svg className="w-full h-full preserve-aspect-ratio-none" viewBox="0 0 100 30">
                          <path className="sparkline-blue" d="M0 15 L20 25 L40 20 L60 10 L80 15 L100 5"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="glass-card p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-3xl font-bold text-gray-800">{stats.activities}</h3>
                        <p className="text-xs text-gray-500 mt-1">กิจกรรมทั้งหมด</p>
                      </div>
                      <div className="chart-placeholder h-12 mt-2">
                        <svg className="w-full h-full preserve-aspect-ratio-none" viewBox="0 0 100 30">
                          <path className="sparkline-blue" d="M0 25 L20 15 L40 20 L60 5 L80 10 L100 20"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Welcome Card */}
                  <div className="col-span-12 lg:col-span-7 glass-card p-6 flex flex-col justify-between bg-gradient-to-br from-white/70 to-blue-50/40 relative overflow-hidden">
                    <div className="flex justify-between items-start z-10 relative">
                      <div className="max-w-[60%]">
                        <h2 className="text-2xl text-gray-600 mb-1">สวัสดี,</h2>
                        <h1 className="text-3xl font-bold text-gray-800 leading-tight">{user?.full_name || user?.username || 'ผู้ใช้งาน'}</h1>
                      </div>
                      <img alt="Welcome Illustration" className="w-48 h-32 object-cover rounded-lg shadow-md" src="https://images.unsplash.com/photo-1542435503-956c26b96af5?q=80&w=400&auto=format&fit=crop"/>
                    </div>
                    <div className="flex space-x-4 mt-6 z-10 relative">
                      <Link to="/activities" className="btn-gradient-blue text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow">
                        แสดงเข้าร่วมกิจกรรม
                      </Link>
                      <Link to="/health-entry" className="btn-gradient-purple text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-shadow">
                        บันทึกข้อมูลสุขภาพ
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              {/* Main Status Section */}
              <section>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Main Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Large Card 1: Health Records */}
                  <div className="glass-card p-5 h-56 flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-4xl font-bold text-gray-800">{stats.healthRecords}</h3>
                        <p className="text-sm text-gray-500 mt-1">บันทึกสุขภาพ</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                        <i className="fas fa-heartbeat text-sm"></i>
                      </div>
                    </div>
                    <div className="mt-auto h-24 relative w-full">
                      <svg className="w-full h-full preserve-aspect-ratio-none" viewBox="0 0 200 60">
                        <path className="main-line-chart" d="M0 50 Q 20 30, 40 40 T 80 20 T 120 40 T 160 10 T 200 30 L 200 60 L 0 60 Z"></path>
                      </svg>
                    </div>
                  </div>
                  {/* Large Card 2: Today Check-ins */}
                  <div className="glass-card p-5 h-56 flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-4xl font-bold text-gray-800">{stats.todayAttendance}</h3>
                        <p className="text-sm text-gray-500 mt-1">เช็คอินวันนี้</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                        <i className="far fa-calendar-check text-sm"></i>
                      </div>
                    </div>
                    <div className="mt-auto mb-4">
                      <div className="progress-track">
                        <div className="progress-bar-inner" style={{width: `${Math.min(100, (stats.todayAttendance / (stats.employees || 1)) * 100)}%`}}></div>
                      </div>
                    </div>
                  </div>
                  {/* Large Card 3: Total Check-ins */}
                  <div className="glass-card p-5 h-56 flex flex-col">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-4xl font-bold text-gray-800">{stats.totalAttendance}</h3>
                        <p className="text-sm text-gray-500 mt-1">เช็คอินทั้งหมด</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                        <i className="fas fa-chart-simple text-sm"></i>
                      </div>
                    </div>
                    <div className="mt-auto bar-chart-container">
                      <div className="bar-item h-[40%]"></div>
                      <div className="bar-item h-[60%]"></div>
                      <div className="bar-item h-[30%]"></div>
                      <div className="bar-item h-[80%]"></div>
                      <div className="bar-item h-[50%]"></div>
                      <div className="bar-item h-[70%]"></div>
                      <div className="bar-item h-[90%]"></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
