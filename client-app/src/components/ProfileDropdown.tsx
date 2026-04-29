import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout();
      setIsOpen(false);
    }
  };

  const handleProfile = () => {
    navigate('/profile');
    setIsOpen(false);
  };

  return (
    <div className="nav-item dropdown" ref={dropdownRef}>
      <button 
        className="nav-link dropdown-toggle"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'none',
          border: 'none',
          padding: '8px 15px',
          borderRadius: '25px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          backgroundColor: isOpen ? '#f8f9fa' : 'transparent'
        }}
        onMouseEnter={(e) => !isOpen && (e.currentTarget.style.backgroundColor = '#f8f9fa')}
        onMouseLeave={(e) => !isOpen && (e.currentTarget.style.backgroundColor = 'transparent')}
      >
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
          fontWeight: '600'
        }}>
          {user?.nombre?.charAt(0).toUpperCase()}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a2035' }}>
            {user?.nombre}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d', textTransform: 'capitalize' }}>
            {user?.rol}
          </div>
        </div>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '10px', color: '#6c757d' }}></i>
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 8 : 0,
          right: dropdownRef.current ? window.innerWidth - dropdownRef.current.getBoundingClientRect().right : 0,
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 25px rgba(0,0,0,.15)',
          minWidth: '200px',
          zIndex: 9999,
          border: '1px solid #ebedf2'
        }}>
          <div style={{ padding: '15px 20px', borderBottom: '1px solid #ebedf2' }}>
            <div style={{ fontWeight: '600', color: '#1a2035', marginBottom: '5px' }}>
              {user?.nombre}
            </div>
            <div style={{ fontSize: '13px', color: '#6c757d' }}>
              {user?.email}
            </div>
          </div>
          
          <div style={{ padding: '10px 0' }}>
            <button
              onClick={handleProfile}
              style={{
                width: '100%',
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                color: '#495057',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <i className="fas fa-user" style={{ width: '16px', textAlign: 'center' }}></i>
              Mi Perfil
            </button>
            
            <button
              onClick={() => {
                navigate('/notifications');
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                color: '#495057',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <i className="fas fa-bell" style={{ width: '16px', textAlign: 'center' }}></i>
              Notificaciones
            </button>
          </div>

          <div style={{ borderTop: '1px solid #ebedf2', padding: '10px 0' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '10px 20px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                color: '#f25961',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <i className="fas fa-sign-out-alt" style={{ width: '16px', textAlign: 'center' }}></i>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;