import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@granja.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: 'clamp(16px, 4vw, 20px)',
        padding: 'clamp(24px, 6vw, 40px)',
        width: '100%',
        maxWidth: '450px',
        margin: '0 15px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(100,116,139,0.3)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            fontSize: '80px', 
            marginBottom: '20px',
            color: '#0ea5e9'
          }}>
            🚀
          </div>
          <h1 style={{ 
            color: '#ffffff', 
            marginBottom: '10px',
            fontSize: 'clamp(24px, 6vw, 28px)',
            fontWeight: '700'
          }}>
            GANPOR
          </h1>
          <p style={{ 
            color: '#cbd5e1',
            fontSize: 'clamp(14px, 4vw, 16px)',
            margin: 0
          }}>
            Sistema de Gestión Porcina
          </p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#ffffff', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '8px'
            }}>
              📧 Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #475569',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#1e293b',
                color: '#ffffff'
              }}
              placeholder="Ingresa tu email"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              marginBottom: '8px'
            }}>
              🔒 Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #475569',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#1e293b',
                color: '#ffffff'
              }}
              placeholder="Ingresa tu contraseña"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ 
              width: '100%',
              padding: '15px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              border: 'none',
              marginTop: '10px',
              minHeight: '54px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: '#ffffff'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner" style={{ 
                  width: '20px', 
                  height: '20px',
                  borderWidth: '2px'
                }}></div>
                Ingresando...
              </>
            ) : (
              <>
                🚀 Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        {/* Credenciales por defecto */}
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: 'linear-gradient(135deg, rgba(51,65,85,0.5), rgba(71,85,105,0.3))', 
          borderRadius: '12px',
          border: '1px solid #475569'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '12px',
            color: '#ffffff'
          }}>
            <span style={{ fontSize: '20px', marginRight: '8px' }}>💡</span>
            <strong>Credenciales de Demostración</strong>
          </div>
          <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '5px' }}>
              <strong>Email:</strong> admin@granja.com
            </div>
            <div>
              <strong>Contraseña:</strong> admin123
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #475569'
        }}>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: 'clamp(11px, 3vw, 12px)',
            margin: 0
          }}>
            © 2025 GANPOR - Sistema de Gestión Porcina v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;