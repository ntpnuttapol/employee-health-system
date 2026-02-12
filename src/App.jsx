import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BranchManagement from './pages/admin/BranchManagement';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import PositionManagement from './pages/admin/PositionManagement';
import EmployeeManagement from './pages/admin/EmployeeManagement';
import UserManagement from './pages/admin/UserManagement';
import ActivityList from './pages/activity/ActivityList';
import ActivityDetail from './pages/activity/ActivityDetail';
import ActivityScan from './pages/activity/ActivityScan';
import HealthDataEntry from './pages/health/HealthDataEntry';
import HealthRecords from './pages/health/HealthRecords';
import HealthDashboard from './pages/health/HealthDashboard';
import ProfilePage from './pages/ProfilePage';
import FiveSInspection from './pages/fives/FiveSInspection';
import FiveSResults from './pages/fives/FiveSResults';

// Components
import Sidebar from './components/common/Sidebar';
import HeaderBar from './components/common/HeaderBar';

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Layout with Mobile Menu Toggle
function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-btn"
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="mobile-backdrop"
          onClick={closeMobileMenu}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}

      <div className="app-container">
        <div className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <Sidebar onLinkClick={closeMobileMenu} />
        </div>
        <main className="main-content" onClick={closeMobileMenu}>
          <HeaderBar />
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* Admin Only Routes */}
            <Route path="/users" element={
              <ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>
            } />
            <Route path="/branches" element={
              <ProtectedRoute adminOnly><BranchManagement /></ProtectedRoute>
            } />
            <Route path="/departments" element={
              <ProtectedRoute adminOnly><DepartmentManagement /></ProtectedRoute>
            } />
            <Route path="/positions" element={
              <ProtectedRoute adminOnly><PositionManagement /></ProtectedRoute>
            } />
            <Route path="/employees" element={
              <ProtectedRoute adminOnly><EmployeeManagement /></ProtectedRoute>
            } />
            
            {/* Activity Routes */}
            <Route path="/activities" element={<ActivityList />} />
            <Route path="/activities/:id" element={<ActivityDetail />} />
            <Route path="/activity-scan" element={<ActivityScan />} />
            
            {/* Health Routes */}
            <Route path="/health-dashboard" element={<HealthDashboard />} />
            <Route path="/health-entry" element={<HealthDataEntry />} />
            <Route path="/health-records" element={<HealthRecords />} />
            
            {/* 5S Inspection Routes */}
            <Route path="/five-s" element={<FiveSInspection />} />
            <Route path="/five-s-results" element={
              <ProtectedRoute adminOnly><FiveSResults /></ProtectedRoute>
            } />

            {/* Profile Route */}
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      
      <Route path="/" element={
        <Navigate to={user ? "/dashboard" : "/login"} replace />
      } />

      {/* Protected Routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
