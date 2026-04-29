import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ModernDashboard from './components/ModernDashboard';
import Animals from './components/Animals';
import Reproduction from './components/Reproduction';
import Locations from './components/Locations';
import Weights from './components/Weights';
import Health from './components/Health';
import Finance from './components/Finance';
import Reports from './components/Reports';
import Analytics from './components/Analytics';
import Genealogy from './components/Genealogy';
import NutritionComplete from './components/NutritionComplete';
import UserManagement from './components/UserManagement';
import NotificationCenter from './components/NotificationCenter';
import UserProfile from './components/UserProfile';
import Sidebar from './components/Sidebar';
import ProfileDropdown from './components/ProfileDropdown';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './components/NotificationSystem';
import './App.css';
import './styles/global.css';
import './styles/responsive.css';
import './styles/forms.css';
import './styles/form-fix.css';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        color: '#1a2035'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          animation: 'spin 2s linear infinite'
        }}>🚀</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const mainPanelStyles = {
    marginLeft: isMobile ? '0' : '250px',
    width: isMobile ? '100%' : 'calc(100% - 250px)',
    minHeight: '100vh',
    background: '#f8f9fa',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  const mainHeaderStyles = {
    background: '#ffffff',
    padding: isMobile ? '15px 20px 15px 60px' : '15px 30px',
    borderBottom: '1px solid #ebedf2',
    boxShadow: '0 1px 15px rgba(69,65,78,.08)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100
  };

  const pageInnerStyles = {
    padding: isMobile ? '20px 15px' : '25px 30px'
  };

  return (
    <div className="main-wrapper" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="main-panel" style={mainPanelStyles}>
        <div className="main-header" style={mainHeaderStyles}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <h4 style={{ 
              margin: 0, 
              color: '#1a2035', 
              fontWeight: '700',
              fontSize: isMobile ? '18px' : '20px'
            }}>
              GANPOR - Sistema de Gestión Porcina
            </h4>
            <div className="navbar-nav">
              <ProfileDropdown />
            </div>
          </div>
        </div>
        <div className="page-inner" style={pageInnerStyles}>
          <Routes>
            <Route path="/" element={<ModernDashboard />} />
            <Route path="/animals" element={<Animals />} />
            <Route path="/reproduction" element={<Reproduction />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/weights" element={<Weights />} />
            <Route path="/health" element={<Health />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/genealogy" element={<Genealogy />} />
            <Route path="/nutrition" element={<NutritionComplete />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/notifications" element={<NotificationCenter />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
};

export default App;