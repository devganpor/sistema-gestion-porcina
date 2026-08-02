import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  created_at: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'auxiliar',
    activo: true
  });

  const roles = [
    { value: 'administrador', label: 'Administrador', description: 'Acceso total al sistema', color: '#f25961' },
    { value: 'gerente', label: 'Gerente', description: 'Todos los módulos, sin eliminar datos', color: '#1572e8' },
    { value: 'veterinario', label: 'Veterinario', description: 'Sanidad, reproducción, eventos médicos', color: '#31ce36' },
    { value: 'tecnico', label: 'Técnico', description: 'Alimentación, pesajes, movimientos', color: '#ffad46' },
    { value: 'auxiliar', label: 'Auxiliar', description: 'Solo lectura y registros básicos', color: '#6c757d' }
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, formData);
        alert('Usuario actualizado correctamente');
      } else {
        await api.post('/users', formData);
        alert('Usuario creado exitosamente');
      }
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Error guardando usuario:', error);
      alert('Error guardando usuario');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'auxiliar',
      activo: true
    });
  };

  const handleEdit = (user: User) => {
    setFormData({
      nombre: user.nombre,
      email: user.email,
      password: '',
      rol: user.rol,
      activo: user.activo
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await api.put(`/users/${userId}`, { activo: !currentStatus });
      alert(`Usuario ${!currentStatus ? 'activado' : 'desactivado'} correctamente`);
      loadUsers();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      alert('Error cambiando estado del usuario');
    }
  };

  const getRoleInfo = (rol: string) => {
    return roles.find(r => r.value === rol) || roles[4];
  };

  if (loading) {
    return (
      <div className="page-inner">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando usuarios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">
              <i className="fas fa-users" style={{ marginRight: '10px' }}></i>
              Gestión de Usuarios ({users.length})
            </h4>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
              {showForm ? 'Cancelar' : 'Nuevo Usuario'}
            </button>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Formulario */}
          {showForm && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className={`fas ${editingId ? 'fa-edit' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
                  {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Nombre Completo *</label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                        placeholder="juan@granja.com"
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>
                        Contraseña {editingId ? '(dejar vacío para mantener)' : '*'}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required={!editingId}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Rol</label>
                      <select
                        value={formData.rol}
                        onChange={(e) => setFormData({...formData, rol: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        {roles.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label} - {role.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span style={{ fontWeight: '600', color: '#1a2035' }}>Usuario activo</span>
                    </label>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                      {editingId ? 'Actualizar' : 'Crear'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#1572e8' }}>{users.length}</div>
              <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>TOTAL USUARIOS</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#31ce36' }}>
                {users.filter(u => u.activo).length}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>ACTIVOS</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#f25961' }}>
                {users.filter(u => u.rol === 'administrador').length}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>ADMINISTRADORES</div>
            </div>
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffad46' }}>
                {new Set(users.map(u => u.rol)).size}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>ROLES DIFERENTES</div>
            </div>
          </div>

          {/* Tabla de Usuarios */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const roleInfo = getRoleInfo(user.rol);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '35px',
                            height: '35px',
                            borderRadius: '50%',
                            background: roleInfo.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}>
                            {user.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#1a2035' }}>{user.nombre}</div>
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: roleInfo.color,
                          color: '#ffffff',
                          textTransform: 'capitalize'
                        }}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: user.activo ? '#31ce36' : '#f25961',
                          color: '#ffffff'
                        }}>
                          {user.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            className="btn btn-warning btn-sm" 
                            title="Editar"
                            onClick={() => handleEdit(user)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className={`btn ${user.activo ? 'btn-danger' : 'btn-success'} btn-sm`}
                            title={user.activo ? 'Desactivar' : 'Activar'}
                            onClick={() => handleToggleStatus(user.id, user.activo)}
                          >
                            <i className={`fas ${user.activo ? 'fa-ban' : 'fa-check'}`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <i className="fas fa-users" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
              <h5>No hay usuarios registrados</h5>
              <p>Comienza creando el primer usuario</p>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                Crear Usuario
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;