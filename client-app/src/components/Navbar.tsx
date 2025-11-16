import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/authService';
import '../styles/navbar.css';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState({
    readyForSale: 0,
    lowWeight: 0,
    healthAlerts: 0
  });

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const [animalsRes, weightsRes] = await Promise.all([
        api.get('/animals'),
        api.get('/weights/ready-for-sale?peso_minimo=100').catch(() => ({ data: [] }))
      ]);
      
      const animals = animalsRes.data || [];
      const readyForSale = weightsRes.data || [];
      
      setNotifications({
        readyForSale: readyForSale.length,
        lowWeight: animals.filter((a: any) => a.categoria === 'lechon').length,
        healthAlerts: Math.floor(animals.length * 0.05) // 5% estimado
      });
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    }
  };

  const getTotalNotifications = () => {
    return notifications.readyForSale + notifications.lowWeight + notifications.healthAlerts;
  };

  const navStyle: React.CSSProperties = {
    background: 'var(--primary-gradient)',
    padding: '0',
    boxShadow: 'var(--shadow-lg)',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  };

  const navContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px'
  };

  const mobileNavStyle: React.CSSProperties = {
    '@media (max-width: 768px)': {
      padding: '0 15px'
    }
  } as React.CSSProperties;

  const logoStyle: React.CSSProperties = {
    color: 'white',
    fontSize: '28px',
    fontWeight: '700',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '15px 0'
  };

  const navLinksStyle: React.CSSProperties = {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: '5px',
    '@media (max-width: 768px)': {
      display: 'none'
    }
  } as React.CSSProperties;

  const mobileMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'linear-gradient(135deg, #2c3e50, #34495e)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    display: isMobileMenuOpen ? 'block' : 'none',
    zIndex: 1000
  };

  const hamburgerStyle: React.CSSProperties = {
    display: 'none',
    flexDirection: 'column',
    cursor: 'pointer',
    padding: '10px',
    gap: '4px',
    '@media (max-width: 768px)': {
      display: 'flex'
    }
  } as React.CSSProperties;

  const hamburgerLineStyle: React.CSSProperties = {
    width: '25px',
    height: '3px',
    backgroundColor: 'white',
    borderRadius: '2px',
    transition: 'all 0.3s ease'
  };

  const linkStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.9)',
    textDecoration: 'none',
    padding: '15px 16px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontSize: '14px',
    fontWeight: '500',
    position: 'relative',
    overflow: 'hidden'
  };

  const activeLinkStyle: React.CSSProperties = {
    ...linkStyle,
    color: 'white',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)'
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    color: 'white'
  };

  const logoutBtnStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    border: 'none',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 10px rgba(231, 76, 60, 0.3)'
  };

  const isActive = (path: string) => location.pathname === path;

  const getRoleIcon = (rol: string) => {
    const icons = {
      administrador: '👑',
      gerente: '📊',
      veterinario: '🩺',
      tecnico: '🔧',
      auxiliar: '👤'
    };
    return icons[rol as keyof typeof icons] || '👤';
  };

  const handleProfileClick = () => {
    setIsUserMenuOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span style={{ fontSize: '32px', color: '#0ea5e9' }}>🚀</span>
          <span>SGP</span>
        </Link>

        {/* Hamburger menu para móvil */}
        <div 
          style={{
            ...hamburgerStyle,
            '@media (max-width: 768px)': { display: 'flex' }
          } as any}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="hamburger-menu"
        >
          <div style={hamburgerLineStyle}></div>
          <div style={hamburgerLineStyle}></div>
          <div style={hamburgerLineStyle}></div>
        </div>

        <ul className="navbar-links desktop-menu">
          <li>
            <Link 
              to="/" 
              className={`navbar-link ${isActive('/') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/animals" 
              className={`navbar-link ${isActive('/animals') ? 'active' : ''}`}
            >
              Animales
            </Link>
          </li>
          <li>
            <Link 
              to="/reproduction" 
              className={`navbar-link ${isActive('/reproduction') ? 'active' : ''}`}
            >
              Reproducción
            </Link>
          </li>
          <li>
            <Link 
              to="/locations" 
              className={`navbar-link ${isActive('/locations') ? 'active' : ''}`}
            >
              Ubicaciones
            </Link>
          </li>
          <li style={{ position: 'relative' }}>
            <Link 
              to="/weights" 
              className={`navbar-link ${isActive('/weights') ? 'active' : ''}`}
            >
              Pesajes
            </Link>
            {notifications.readyForSale > 0 && (
              <span className="notification-badge">
                {notifications.readyForSale}
              </span>
            )}
          </li>
          <li style={{ position: 'relative' }}>
            <Link 
              to="/health" 
              className={`navbar-link ${isActive('/health') ? 'active' : ''}`}
            >
              Sanidad
            </Link>
            {notifications.healthAlerts > 0 && (
              <span className="notification-badge">
                {notifications.healthAlerts}
              </span>
            )}
          </li>
          <li>
            <Link 
              to="/finance" 
              className={`navbar-link ${isActive('/finance') ? 'active' : ''}`}
            >
              Finanzas
            </Link>
          </li>
          <li>
            <Link 
              to="/reports" 
              className={`navbar-link ${isActive('/reports') ? 'active' : ''}`}
            >
              Reportes
            </Link>
          </li>
          <li>
            <Link 
              to="/genealogy" 
              className={`navbar-link ${isActive('/genealogy') ? 'active' : ''}`}
            >
              Genealogía
            </Link>
          </li>
          <li>
            <Link 
              to="/nutrition" 
              className={`navbar-link ${isActive('/nutrition') ? 'active' : ''}`}
            >
              Nutrición
            </Link>
          </li>
          <li style={{ position: 'relative' }}>
            <Link 
              to="/notifications" 
              className={`navbar-link ${isActive('/notifications') ? 'active' : ''}`}
            >
              Notificaciones
            </Link>
            {getTotalNotifications() > 0 && (
              <span className="notification-badge">
                {getTotalNotifications()}
              </span>
            )}
          </li>
          <li>
            <Link 
              to="/users" 
              className={`navbar-link ${isActive('/users') ? 'active' : ''}`}
            >
              Usuarios
            </Link>
          </li>
          <li>
            <Link 
              to="/analytics" 
              className={`navbar-link ${isActive('/analytics') ? 'active' : ''}`}
            >
              IA
            </Link>
          </li>
        </ul>

        {/* Menú móvil */}
        <div style={mobileMenuStyle} className="mobile-menu">
          <div style={{ padding: '20px' }}>
            <Link 
              to="/" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🚀 Dashboard
            </Link>
            <Link 
              to="/animals" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🔲 Animales
            </Link>
            <Link 
              to="/reproduction" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🔄 Reproducción
            </Link>
            <Link 
              to="/locations" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🏢 Ubicaciones
            </Link>
            <Link 
              to="/weights" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              ⚡ Pesajes
            </Link>
            <Link 
              to="/health" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🛡️ Sanidad
            </Link>
            <Link 
              to="/finance" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              💰 Finanzas
            </Link>
            <Link 
              to="/reports" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              📈 Reportes
            </Link>
            <Link 
              to="/genealogy" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🧬 Genealogía
            </Link>
            <Link 
              to="/nutrition" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🌾 Nutrición
            </Link>
            <Link 
              to="/notifications" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🔔 Notificaciones
            </Link>
            <Link 
              to="/users" 
              style={{ ...linkStyle, display: 'block', marginBottom: '10px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              👥 Usuarios
            </Link>
            <Link 
              to="/analytics" 
              style={{ ...linkStyle, display: 'block', marginBottom: '20px' }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              🤖 IA
            </Link>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '15px' }}>
              <div style={{ color: 'white', marginBottom: '10px', fontSize: '14px' }}>
                👤 {user?.nombre}
              </div>
              <button 
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  ...logoutBtnStyle,
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>

        <div style={userInfoStyle}>
          {/* Indicador de Notificaciones */}
          {getTotalNotifications() > 0 && (
            <Link to="/notifications" style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '25px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              color: 'white',
              transition: 'all 0.3s ease'
            }}>
              <span style={{ fontSize: '18px' }}>🔔</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{getTotalNotifications()}</span>
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#e74c3c',
                borderRadius: '50%',
                width: '12px',
                height: '12px',
                animation: 'pulse 2s infinite'
              }}></span>
            </Link>
          )}
          
          {/* Menú de Usuario */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '25px',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                border: '2px solid rgba(255,255,255,0.3)'
              }}>
                {getRoleIcon(user?.rol || 'auxiliar')}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', lineHeight: '1.2' }}>
                  {user?.nombre?.split(' ')[0] || 'Usuario'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'capitalize' }}>
                  {user?.rol || 'Usuario'}
                </div>
              </div>
              <span style={{ fontSize: '12px', transition: 'transform 0.3s ease', transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>

            {/* Menú Desplegable */}
            {isUserMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                minWidth: '220px',
                zIndex: 1000,
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.1)'
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '4px' }}>
                    {user?.nombre}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    {user?.email}
                  </div>
                </div>
                
                <div style={{ padding: '8px 0' }}>
                  <button
                    onClick={handleProfileClick}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#2c3e50'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>◐</span>
                    <span style={{ fontWeight: '500' }}>Mi Perfil</span>
                  </button>
                  
                  <Link
                    to="/notifications"
                    onClick={() => setIsUserMenuOpen(false)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#2c3e50',
                      textDecoration: 'none'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>◈</span>
                    <span style={{ fontWeight: '500' }}>Notificaciones</span>
                    {getTotalNotifications() > 0 && (
                      <span style={{
                        background: '#e74c3c',
                        color: 'white',
                        borderRadius: '10px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        marginLeft: 'auto'
                      }}>
                        {getTotalNotifications()}
                      </span>
                    )}
                  </Link>
                  
                  {user?.rol === 'administrador' && (
                    <Link
                      to="/users"
                      onClick={() => setIsUserMenuOpen(false)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        color: '#2c3e50',
                        textDecoration: 'none'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '16px' }}>◐</span>
                      <span style={{ fontWeight: '500' }}>Administrar Usuarios</span>
                    </Link>
                  )}
                </div>
                
                <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 0' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#e74c3c',
                      fontWeight: '500'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#fff5f5'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '16px' }}>◇</span>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;