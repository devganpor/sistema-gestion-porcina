import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const menuItems = [
    { path: '/', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { path: '/animals', icon: 'fas fa-paw', label: 'Animales' },
    { path: '/reproduction', icon: 'fas fa-heart', label: 'Reproducción' },
    { path: '/weights', icon: 'fas fa-weight', label: 'Pesajes' },
    { path: '/health', icon: 'fas fa-medkit', label: 'Sanidad' },
    { path: '/locations', icon: 'fas fa-map-marker-alt', label: 'Ubicaciones' },
    { path: '/finance', icon: 'fas fa-dollar-sign', label: 'Finanzas' },
    { path: '/genealogy', icon: 'fas fa-dna', label: 'Genealogía' },
    { path: '/nutrition', icon: 'fas fa-seedling', label: 'Nutrición' },
    { path: '/reports', icon: 'fas fa-chart-bar', label: 'Reportes' },
    { path: '/users', icon: 'fas fa-users', label: 'Usuarios' },
    { path: '/analytics', icon: 'fas fa-brain', label: 'Analytics' }
  ];

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(false);
        setIsMobileOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Llamar inmediatamente
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarStyles = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    height: '100vh',
    background: '#1a2035',
    zIndex: 1000,
    overflowY: 'auto' as const,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
    width: isMobile ? '280px' : (isCollapsed ? '70px' : '250px'),
    transform: isMobile ? (isMobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)'
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          style={{
            position: 'fixed',
            top: '15px',
            left: '15px',
            zIndex: 10001,
            background: '#1a2035',
            border: 'none',
            color: '#ffffff',
            padding: '12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
          }}
        >
          <i className={`fas ${isMobileOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      )}
      
      <div className="sidebar" style={sidebarStyles}>
        <div style={{ 
          padding: isMobile ? '25px 20px' : '20px', 
          borderBottom: '1px solid rgba(255,255,255,0.1)', 
          position: 'relative',
          marginTop: isMobile ? '50px' : '0'
        }}>
          {/* Desktop Toggle */}
          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#ffffff',
                padding: '8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                opacity: 0.8
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
            >
              <i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            </button>
          )}

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: (isCollapsed && !isMobile) ? '0' : '12px',
            color: '#ffffff',
            fontSize: isMobile ? '22px' : '20px',
            fontWeight: '700',
            justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start'
          }}>
            <div style={{
              width: isMobile ? '45px' : '40px',
              height: isMobile ? '45px' : '40px',
              background: 'linear-gradient(135deg, #1572e8, #0d47a1)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(21, 114, 232, 0.3)'
            }}>
              <i className="fas fa-rocket" style={{ 
                color: '#ffffff', 
                fontSize: isMobile ? '20px' : '18px' 
              }}></i>
            </div>
            {(!isCollapsed || isMobile) && <span>GANPOR</span>}
          </div>
          {(!isCollapsed || isMobile) && (
            <div style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: isMobile ? '14px' : '12px',
              marginTop: '8px',
              fontWeight: '500'
            }}>
              Sistema de Gestión Porcina
            </div>
          )}
        </div>

        <div style={{ padding: '20px 0' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: isMobile ? '15px 25px' : '12px 25px',
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  background: isActive ? 'rgba(21, 114, 232, 0.2)' : 'transparent',
                  borderRight: isActive ? '3px solid #1572e8' : '3px solid transparent',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: isMobile ? '15px' : '14px',
                  fontWeight: isActive ? '600' : '500',
                  justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                title={(isCollapsed && !isMobile) ? item.label : ''}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  }
                }}
              >
                <i className={item.icon} style={{ 
                  fontSize: isMobile ? '18px' : '16px', 
                  width: '20px', 
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}></i>
                {(!isCollapsed || isMobile) && (
                  <span style={{ 
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div style={{ 
          position: 'absolute', 
          bottom: '20px', 
          left: '20px', 
          right: '20px',
          padding: (isCollapsed && !isMobile) ? '12px' : '15px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '12px',
          textAlign: (isCollapsed && !isMobile) ? 'center' : 'left',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {(isCollapsed && !isMobile) ? (
            <div style={{
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1572e8, #0d47a1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              margin: '0 auto',
              boxShadow: '0 4px 15px rgba(21, 114, 232, 0.3)'
            }}>
              {user?.nombre?.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1572e8, #0d47a1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '700',
                boxShadow: '0 4px 15px rgba(21, 114, 232, 0.3)'
              }}>
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ 
                  color: '#ffffff', 
                  fontSize: isMobile ? '15px' : '14px', 
                  fontWeight: '600',
                  marginBottom: '2px'
                }}>
                  {user?.nombre}
                </div>
                <div style={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  fontSize: isMobile ? '13px' : '12px', 
                  textTransform: 'capitalize',
                  fontWeight: '500'
                }}>
                  {user?.rol}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 999,
            backdropFilter: 'blur(4px)',
            transition: 'all 0.3s ease'
          }}
        />
      )}
    </>
  );
};

export default Sidebar;