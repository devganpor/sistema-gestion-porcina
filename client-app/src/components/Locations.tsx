import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface Ubicacion {
  id: number;
  nombre: string;
  tipo: string;
  capacidad_maxima: number;
  animales_actuales: number;
  ubicacion_padre_nombre: string;
  estado: string;
}

interface Animal {
  id: number;
  identificador_unico: string;
  nombre: string;
  categoria: string;
}

const Locations: React.FC = () => {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'corral',
    capacidad_maxima: '',
    ubicacion_padre_id: ''
  });
  const [moveData, setMoveData] = useState({
    animal_id: '',
    nueva_ubicacion_id: '',
    motivo: ''
  });

  useEffect(() => {
    loadUbicaciones();
    loadAnimals();
  }, []);

  const loadUbicaciones = async () => {
    try {
      const response = await api.get('/locations');
      setUbicaciones(response.data);
    } catch (error) {
      console.error('Error cargando ubicaciones:', error);
    }
  };

  const loadAnimals = async () => {
    try {
      const response = await api.get('/animals?estado=activo');
      setAnimals(response.data);
    } catch (error) {
      console.error('Error cargando animales:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        capacidad_maxima: formData.capacidad_maxima ? parseInt(formData.capacidad_maxima) : null,
        ubicacion_padre_id: formData.ubicacion_padre_id ? parseInt(formData.ubicacion_padre_id) : null
      };
      
      if (editingId) {
        await api.put(`/locations/${editingId}`, data);
      } else {
        await api.post('/locations', data);
      }
      
      resetForm();
      loadUbicaciones();
    } catch (error) {
      console.error('Error guardando ubicación:', error);
      alert('Error guardando ubicación');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      nombre: '',
      tipo: 'corral',
      capacidad_maxima: '',
      ubicacion_padre_id: ''
    });
  };

  const handleEdit = (ubicacion: Ubicacion) => {
    setFormData({
      nombre: ubicacion.nombre,
      tipo: ubicacion.tipo,
      capacidad_maxima: ubicacion.capacidad_maxima?.toString() || '',
      ubicacion_padre_id: ''
    });
    setEditingId(ubicacion.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar esta ubicación?')) {
      try {
        await api.delete(`/locations/${id}`);
        loadUbicaciones();
      } catch (error) {
        console.error('Error eliminando ubicación:', error);
        alert('Error eliminando ubicación');
      }
    }
  };

  const handleMoveAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations/move-animal', {
        animal_id: parseInt(moveData.animal_id),
        nueva_ubicacion_id: parseInt(moveData.nueva_ubicacion_id),
        motivo: moveData.motivo
      });
      setShowMoveForm(false);
      setMoveData({
        animal_id: '',
        nueva_ubicacion_id: '',
        motivo: ''
      });
      loadUbicaciones();
      alert('Animal movido exitosamente');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error moviendo animal');
    }
  };

  const getOcupacionColor = (ocupacion: number, capacidad: number) => {
    if (!capacidad) return '#95a5a6';
    const porcentaje = (ocupacion / capacidad) * 100;
    if (porcentaje >= 90) return '#e74c3c';
    if (porcentaje >= 70) return '#f39c12';
    return '#27ae60';
  };

  const granjas = ubicaciones.filter(u => u.tipo === 'granja');
  const galpones = ubicaciones.filter(u => u.tipo === 'galpon');
  const corrales = ubicaciones.filter(u => u.tipo === 'corral');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gestión de Ubicaciones</h1>
        <div>
          <button 
            className="btn btn-success"
            onClick={() => setShowMoveForm(!showMoveForm)}
            style={{ marginRight: '10px' }}
          >
            {showMoveForm ? 'Cancelar' : 'Mover Animal'}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancelar' : 'Nueva Ubicación'}
          </button>
        </div>
      </div>

      {/* Formulario Nueva Ubicación */}
      {showForm && (
        <div className="card mb-3">
          <h3>{editingId ? '✏️ Editar Ubicación' : '➕ Crear Nueva Ubicación'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2">
              <div className="form-group">
                <label>Nombre:</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tipo:</label>
                <select
                  className="form-control"
                  value={formData.tipo}
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                >
                  <option value="granja">Granja</option>
                  <option value="galpon">Galpón</option>
                  <option value="corral">Corral</option>
                </select>
              </div>
              <div className="form-group">
                <label>Capacidad Máxima:</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.capacidad_maxima}
                  onChange={(e) => setFormData({...formData, capacidad_maxima: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Ubicación Padre:</label>
                <select
                  className="form-control"
                  value={formData.ubicacion_padre_id}
                  onChange={(e) => setFormData({...formData, ubicacion_padre_id: e.target.value})}
                >
                  <option value="">Ninguna</option>
                  {ubicaciones.map(ubicacion => (
                    <option key={ubicacion.id} value={ubicacion.id}>
                      {ubicacion.nombre} ({ubicacion.tipo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-success">
                {editingId ? '💾 Actualizar' : '💾 Crear'} Ubicación
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulario Mover Animal */}
      {showMoveForm && (
        <div className="card mb-3">
          <h3>Mover Animal</h3>
          <form onSubmit={handleMoveAnimal}>
            <div className="grid grid-3">
              <div className="form-group">
                <label>Animal:</label>
                <select
                  className="form-control"
                  value={moveData.animal_id}
                  onChange={(e) => setMoveData({...moveData, animal_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar animal</option>
                  {animals.map(animal => (
                    <option key={animal.id} value={animal.id}>
                      {animal.identificador_unico} - {animal.nombre || 'Sin nombre'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nueva Ubicación:</label>
                <select
                  className="form-control"
                  value={moveData.nueva_ubicacion_id}
                  onChange={(e) => setMoveData({...moveData, nueva_ubicacion_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar ubicación</option>
                  {corrales.map(ubicacion => (
                    <option key={ubicacion.id} value={ubicacion.id}>
                      {ubicacion.nombre} ({ubicacion.animales_actuales}/{ubicacion.capacidad_maxima || '∞'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Motivo:</label>
                <input
                  type="text"
                  className="form-control"
                  value={moveData.motivo}
                  onChange={(e) => setMoveData({...moveData, motivo: e.target.value})}
                  placeholder="Ej: Cambio de etapa"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success">Mover Animal</button>
          </form>
        </div>
      )}

      {/* Lista de Ubicaciones */}
      <div className="grid grid-3">
        {/* Granjas */}
        <div className="card">
          <h3>🏢 Granjas ({granjas.length})</h3>
          {granjas.map(ubicacion => (
            <div key={ubicacion.id} style={{
              padding: '12px',
              margin: '8px 0',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{ubicacion.nombre}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Animales: {ubicacion.animales_actuales}
                    {ubicacion.capacidad_maxima && ` / ${ubicacion.capacidad_maxima}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button 
                    className="btn btn-warning btn-sm"
                    onClick={() => handleEdit(ubicacion)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(ubicacion.id)}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
          {granjas.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              No hay granjas registradas
            </p>
          )}
        </div>

        {/* Galpones */}
        <div className="card">
          <h3>🏠 Galpones ({galpones.length})</h3>
          {galpones.map(ubicacion => (
            <div key={ubicacion.id} style={{
              padding: '12px',
              margin: '8px 0',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{ubicacion.nombre}</div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Animales: {ubicacion.animales_actuales}
                {ubicacion.capacidad_maxima && ` / ${ubicacion.capacidad_maxima}`}
              </div>
              {ubicacion.ubicacion_padre_nombre && (
                <div style={{ fontSize: '12px', color: '#999' }}>
                  En: {ubicacion.ubicacion_padre_nombre}
                </div>
              )}
            </div>
          ))}
          {galpones.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              No hay galpones registrados
            </p>
          )}
        </div>

        {/* Corrales */}
        <div className="card">
          <h3>🚪 Corrales ({corrales.length})</h3>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {corrales.map(ubicacion => (
              <div key={ubicacion.id} style={{
                padding: '12px',
                margin: '8px 0',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '5px'
                }}>
                  <span style={{ fontWeight: 'bold' }}>{ubicacion.nombre}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    backgroundColor: getOcupacionColor(ubicacion.animales_actuales, ubicacion.capacidad_maxima),
                    color: 'white'
                  }}>
                    {ubicacion.animales_actuales}/{ubicacion.capacidad_maxima || '∞'}
                  </span>
                </div>
                {ubicacion.ubicacion_padre_nombre && (
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    En: {ubicacion.ubicacion_padre_nombre}
                  </div>
                )}
                {ubicacion.capacidad_maxima && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Ocupación: {Math.round((ubicacion.animales_actuales / ubicacion.capacidad_maxima) * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
          {corrales.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              No hay corrales registrados
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Locations;