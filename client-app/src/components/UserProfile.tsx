import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/authService';

interface UserStats {
  totalSessions: number;
  lastLogin: string;
  accountCreated: string;
  totalActions: number;
}

const UserProfile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    telefono: user?.telefono || '',
    cargo: user?.cargo || '',
    departamento: user?.departamento || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notificaciones_email: user?.notificaciones_email ?? true,
    notificaciones_push: user?.notificaciones_push ?? true,
    tema_oscuro: user?.tema_oscuro ?? false
  });

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setUserStats(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Ingresa tu contraseña actual';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setSuccess('');
    
    try {
      const updateData = {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        cargo: formData.cargo,
        departamento: formData.departamento,
        notificaciones_email: formData.notificaciones_email,
        notificaciones_push: formData.notificaciones_push,
        tema_oscuro: formData.tema_oscuro,
        ...(formData.newPassword && {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      };
      
      const response = await api.put('/users/profile', updateData);
      updateUser(response.data.user);
      
      setSuccess('Perfil actualizado exitosamente');
      setIsEditing(false);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setErrors({ general: error.response?.data?.message || 'Error actualizando perfil' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      logout();
    }
  };

  const handleCancel = () => {
    setFormData({
      nombre: user?.nombre || '',
      email: user?.email || '',
      telefono: user?.telefono || '',
      cargo: user?.cargo || '',
      departamento: user?.departamento || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      notificaciones_email: user?.notificaciones_email || true,
      notificaciones_push: user?.notificaciones_push || true,
      tema_oscuro: user?.tema_oscuro || false
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="page-inner">
      {/* Header Card */}
      <div className="card" style={{ marginBottom: '25px' }}>
        <div className="card-header gradient" style={{ 
          background: 'linear-gradient(135deg, #1572e8 0%, #0d47a1 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '32px',
                fontWeight: '700',
                border: '3px solid rgba(255,255,255,0.3)'
              }}>
                {user?.nombre?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
                  {user?.nombre}
                </h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '16px', opacity: 0.9, textTransform: 'capitalize' }}>
                  {user?.rol} • {user?.departamento || 'GANPOR'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {!isEditing ? (
                <button 
                  className="btn btn-outline"
                  onClick={() => setIsEditing(true)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white' }}
                >
                  <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
                  Editar Perfil
                </button>
              ) : (
                <>
                  <button 
                    className="btn btn-success"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: '8px' }}></i>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
          {success}
        </div>
      )}
      
      {errors.general && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
          {errors.general}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-container" style={{ marginBottom: '25px' }}>
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <i className="fas fa-user" style={{ marginRight: '8px' }}></i>
          Información Personal
        </button>
        <button 
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <i className="fas fa-shield-alt" style={{ marginRight: '8px' }}></i>
          Seguridad
        </button>
        <button 
          className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>
          Preferencias
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <i className="fas fa-chart-line" style={{ marginRight: '8px' }}></i>
          Estadísticas
        </button>
      </div>

      <div className="grid grid-2">
        {/* Main Content */}
        <div>
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-user" style={{ marginRight: '10px' }}></i>
                  Información Personal
                </h5>
              </div>
              <div style={{ padding: '25px' }}>
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    disabled={!isEditing}
                    placeholder="Ingresa tu nombre completo"
                  />
                  {errors.nombre && <small style={{ color: '#f25961' }}>{errors.nombre}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={!isEditing}
                    placeholder="tu@email.com"
                  />
                  {errors.email && <small style={{ color: '#f25961' }}>{errors.email}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    disabled={!isEditing}
                    placeholder="+57 300 123 4567"
                  />
                </div>

                <div className="grid grid-2">
                  <div className="form-group">
                    <label className="form-label">Cargo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.cargo}
                      onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Administrador, Veterinario, etc."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Departamento</label>
                    <select
                      className="form-control"
                      value={formData.departamento}
                      onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                      disabled={!isEditing}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="administracion">Administración</option>
                      <option value="produccion">Producción</option>
                      <option value="veterinaria">Veterinaria</option>
                      <option value="nutricion">Nutrición</option>
                      <option value="mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-shield-alt" style={{ marginRight: '10px' }}></i>
                  Seguridad de la Cuenta
                </h5>
              </div>
              <div style={{ padding: '25px' }}>
                {isEditing && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Contraseña Actual</label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                        placeholder="Ingresa tu contraseña actual"
                      />
                      {errors.currentPassword && <small style={{ color: '#f25961' }}>{errors.currentPassword}</small>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nueva Contraseña</label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                        placeholder="Mínimo 6 caracteres"
                      />
                      {errors.newPassword && <small style={{ color: '#f25961' }}>{errors.newPassword}</small>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confirmar Nueva Contraseña</label>
                      <input
                        type="password"
                        className="form-control"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        placeholder="Repite la nueva contraseña"
                      />
                      {errors.confirmPassword && <small style={{ color: '#f25961' }}>{errors.confirmPassword}</small>}
                    </div>
                  </>
                )}
                
                {!isEditing && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <i className="fas fa-lock" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
                    <h5>Configuración de Seguridad</h5>
                    <p>Haz clic en "Editar Perfil" para cambiar tu contraseña</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-cog" style={{ marginRight: '10px' }}></i>
                  Preferencias
                </h5>
              </div>
              <div style={{ padding: '25px' }}>
                <div style={{ marginBottom: '25px' }}>
                  <h6 style={{ marginBottom: '15px', color: '#1a2035' }}>Notificaciones</h6>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                      <strong>Notificaciones por Email</strong>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Recibir alertas importantes por correo</p>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input
                        type="checkbox"
                        checked={formData.notificaciones_email}
                        onChange={(e) => setFormData({...formData, notificaciones_email: e.target.checked})}
                        disabled={!isEditing}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: formData.notificaciones_email ? '#1572e8' : '#ccc',
                        transition: '0.4s',
                        borderRadius: '34px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '',
                          height: '26px',
                          width: '26px',
                          left: formData.notificaciones_email ? '30px' : '4px',
                          bottom: '4px',
                          backgroundColor: 'white',
                          transition: '0.4s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                      <strong>Notificaciones Push</strong>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Notificaciones en tiempo real</p>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input
                        type="checkbox"
                        checked={formData.notificaciones_push}
                        onChange={(e) => setFormData({...formData, notificaciones_push: e.target.checked})}
                        disabled={!isEditing}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'pointer',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: formData.notificaciones_push ? '#1572e8' : '#ccc',
                        transition: '0.4s',
                        borderRadius: '34px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '',
                          height: '26px',
                          width: '26px',
                          left: formData.notificaciones_push ? '30px' : '4px',
                          bottom: '4px',
                          backgroundColor: 'white',
                          transition: '0.4s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h6 style={{ marginBottom: '15px', color: '#1a2035' }}>Apariencia</h6>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>Tema Oscuro</strong>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Cambiar a modo oscuro (próximamente)</p>
                    </div>
                    <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
                      <input
                        type="checkbox"
                        checked={formData.tema_oscuro}
                        onChange={(e) => setFormData({...formData, tema_oscuro: e.target.checked})}
                        disabled={true} // Deshabilitado por ahora
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        cursor: 'not-allowed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: '#ccc',
                        transition: '0.4s',
                        borderRadius: '34px'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '',
                          height: '26px',
                          width: '26px',
                          left: '4px',
                          bottom: '4px',
                          backgroundColor: 'white',
                          transition: '0.4s',
                          borderRadius: '50%'
                        }}></span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-chart-line" style={{ marginRight: '10px' }}></i>
                  Estadísticas de Uso
                </h5>
              </div>
              <div style={{ padding: '25px' }}>
                {userStats ? (
                  <div className="grid grid-2">
                    <div className="stat-card">
                      <div className="stat-value">{userStats.totalSessions}</div>
                      <div className="stat-label">Sesiones Totales</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{userStats.totalActions}</div>
                      <div className="stat-label">Acciones Realizadas</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                    <i className="fas fa-chart-line" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
                    <h5>Estadísticas no disponibles</h5>
                    <p>Las estadísticas se mostrarán próximamente</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="fas fa-info-circle" style={{ marginRight: '10px' }}></i>
                Información de Cuenta
              </h5>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#1a2035' }}>Rol:</strong>
                <p style={{ margin: '5px 0 0 0', textTransform: 'capitalize' }}>{user?.rol}</p>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#1a2035' }}>Último acceso:</strong>
                <p style={{ margin: '5px 0 0 0' }}>{new Date().toLocaleDateString()}</p>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#1a2035' }}>Estado:</strong>
                <span style={{
                  display: 'inline-block',
                  marginTop: '5px',
                  padding: '4px 12px',
                  background: '#31ce36',
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Activo
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="card-title">
                <i className="fas fa-sign-out-alt" style={{ marginRight: '10px' }}></i>
                Sesión
              </h5>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ marginBottom: '15px', color: '#6c757d', fontSize: '14px' }}>
                ¿Necesitas cerrar tu sesión?
              </p>
              <button 
                className="btn btn-danger"
                onClick={handleLogout}
                style={{ width: '100%' }}
              >
                <i className="fas fa-sign-out-alt" style={{ marginRight: '8px' }}></i>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;