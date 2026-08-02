import React, { useState, useEffect } from 'react';
import api from '../services/authService';
import FormField from './FormField';

interface Animal {
  id: number;
  identificador_unico: string;
  nombre: string;
  sexo: string;
  categoria: string;
  estado: string;
  raza_nombre: string;
  ubicacion_nombre: string;
  fecha_nacimiento: string;
  peso_nacimiento?: number;
  observaciones?: string;
}

const Animals: React.FC = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [filteredAnimals, setFilteredAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    identificador_unico: '',
    nombre: '',
    sexo: 'hembra',
    categoria: 'lechon',
    fecha_nacimiento: '',
    peso_nacimiento: '',
    observaciones: '',
    raza_id: '',
    ubicacion_id: '',
    padre_id: '',
    madre_id: ''
  });

  useEffect(() => {
    loadAnimals();
  }, []);

  useEffect(() => {
    filterAnimals();
  }, [animals, searchTerm, filterCategory, filterSex]);

  const filterAnimals = () => {
    let filtered = animals;
    
    if (searchTerm) {
      filtered = filtered.filter(animal => 
        animal.identificador_unico.toLowerCase().includes(searchTerm.toLowerCase()) ||
        animal.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        animal.raza_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterCategory) {
      filtered = filtered.filter(animal => animal.categoria === filterCategory);
    }
    
    if (filterSex) {
      filtered = filtered.filter(animal => animal.sexo === filterSex);
    }
    
    setFilteredAnimals(filtered);
  };

  const loadAnimals = async () => {
    try {
      const response = await api.get('/animals');
      setAnimals(response.data);
    } catch (error) {
      console.error('Error cargando animales:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Validar identificador único
    if (!formData.identificador_unico || !formData.identificador_unico.trim()) {
      newErrors.identificador_unico = 'El identificador único es requerido';
    } else if (formData.identificador_unico.length < 3) {
      newErrors.identificador_unico = 'El identificador debe tener al menos 3 caracteres';
    }
    
    // Validar peso de nacimiento
    if (formData.peso_nacimiento) {
      const peso = parseFloat(formData.peso_nacimiento);
      if (isNaN(peso) || peso <= 0) {
        newErrors.peso_nacimiento = 'El peso debe ser un número mayor a 0';
      } else if (peso > 5) {
        newErrors.peso_nacimiento = 'El peso de nacimiento parece demasiado alto';
      }
    }
    
    // Validar fecha de nacimiento
    if (formData.fecha_nacimiento) {
      const fechaNac = new Date(formData.fecha_nacimiento);
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999); // Permitir fecha de hoy
      if (fechaNac > hoy) {
        newErrors.fecha_nacimiento = 'La fecha no puede ser futura';
      }
      
      // Verificar que no sea demasiado antigua (más de 5 años)
      const cincoAnosAtras = new Date();
      cincoAnosAtras.setFullYear(cincoAnosAtras.getFullYear() - 5);
      if (fechaNac < cincoAnosAtras) {
        newErrors.fecha_nacimiento = 'La fecha parece demasiado antigua';
      }
    }
    
    // Validar sexo
    if (!formData.sexo || !['hembra', 'macho'].includes(formData.sexo)) {
      newErrors.sexo = 'Debe seleccionar un sexo válido';
    }
    
    // Validar categoría
    if (!formData.categoria || !['lechon', 'recria', 'desarrollo', 'engorde', 'reproductor'].includes(formData.categoria)) {
      newErrors.categoria = 'Debe seleccionar una categoría válida';
    }
    
    console.log('Errores de validación:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Validación fallida:', errors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const submitData = {
        ...formData,
        peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
        raza_id: formData.raza_id ? parseInt(formData.raza_id) : null,
        ubicacion_id: formData.ubicacion_id ? parseInt(formData.ubicacion_id) : null,
        padre_id: formData.padre_id ? parseInt(formData.padre_id) : null,
        madre_id: formData.madre_id ? parseInt(formData.madre_id) : null
      };
      
      if (modalType === 'create') {
        const response = await api.post('/animals', submitData);
        console.log('Animal creado:', response.data);
        setSuccess('Animal registrado exitosamente');
      } else if (modalType === 'edit' && selectedAnimal) {
        const response = await api.put(`/animals/${selectedAnimal.id}`, submitData);
        console.log('Animal actualizado:', response.data);
        setSuccess('Animal actualizado exitosamente');
      }
      
      resetForm();
      setShowModal(false);
      await loadAnimals();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error en handleSubmit:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error procesando solicitud';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      identificador_unico: '',
      nombre: '',
      sexo: 'hembra',
      categoria: 'lechon',
      fecha_nacimiento: '',
      peso_nacimiento: '',
      observaciones: '',
      raza_id: '',
      ubicacion_id: '',
      padre_id: '',
      madre_id: ''
    });
    setErrors({});
    setSelectedAnimal(null);
  };

  const handleCreate = () => {
    resetForm();
    setModalType('create');
    setShowModal(true);
  };

  const handleEdit = (animal: Animal) => {
    setFormData({
      identificador_unico: animal.identificador_unico,
      nombre: animal.nombre || '',
      sexo: animal.sexo,
      categoria: animal.categoria,
      fecha_nacimiento: animal.fecha_nacimiento?.split('T')[0] || '',
      peso_nacimiento: animal.peso_nacimiento?.toString() || '',
      observaciones: animal.observaciones || '',
      raza_id: '',
      ubicacion_id: '',
      padre_id: '',
      madre_id: ''
    });
    setSelectedAnimal(animal);
    setModalType('edit');
    setShowModal(true);
  };

  const handleView = (animal: Animal) => {
    setSelectedAnimal(animal);
    setModalType('view');
    setShowModal(true);
  };

  const handleDelete = async (animal: Animal) => {
    if (!window.confirm(`¿Estás seguro de eliminar el animal ${animal.identificador_unico}?`)) {
      return;
    }
    
    try {
      await api.delete(`/animals/${animal.id}`);
      setSuccess('Animal eliminado exitosamente');
      loadAnimals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error eliminando animal');
    }
  };

  if (loading && animals.length === 0) return (
    <div className="page-inner">
      <div className="card">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
          <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando animales...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-inner">
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
          {success}
        </div>
      )}
      
      <div className="card">
        <div className="card-header gradient" style={{ 
          background: 'linear-gradient(135deg, #1572e8 0%, #0d47a1 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h4 className="card-title" style={{ margin: 0, color: 'white' }}>
                <i className="fas fa-paw" style={{ marginRight: '10px' }}></i>
                Gestión de Animales ({filteredAnimals.length})
              </h4>
              <p className="card-subtitle" style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.9)' }}>
                Control total de tu ganado porcino
              </p>
            </div>
            <button 
              className="btn btn-outline" 
              onClick={handleCreate}
              style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white' }}
            >
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              Nuevo Animal
            </button>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Filtros */}
          <div className="filter-container" style={{ marginBottom: '25px' }}>
            <div className="filter-group">
              <label>Buscar:</label>
              <input
                type="text"
                className="form-control"
                placeholder="ID, nombre o raza..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ minWidth: '200px' }}
              />
            </div>
            
            <div className="filter-group">
              <label>Categoría:</label>
              <select
                className="form-control"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="lechon">Lechón</option>
                <option value="recria">Recría</option>
                <option value="desarrollo">Desarrollo</option>
                <option value="engorde">Engorde</option>
                <option value="reproductor">Reproductor</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Sexo:</label>
              <select
                className="form-control"
                value={filterSex}
                onChange={(e) => setFilterSex(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="hembra">Hembra</option>
                <option value="macho">Macho</option>
              </select>
            </div>
            
            <div className="filter-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('');
                  setFilterSex('');
                }}
              >
                <i className="fas fa-times" style={{ marginRight: '5px' }}></i>
                Limpiar
              </button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            <div className="stat-card">
              <div className="stat-value">{animals.length}</div>
              <div className="stat-label">Total Animales</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#31ce36' }}>
                {animals.filter(a => a.estado === 'activo').length}
              </div>
              <div className="stat-label">Activos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f25961' }}>
                {animals.filter(a => a.sexo === 'hembra').length}
              </div>
              <div className="stat-label">Hembras</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#1572e8' }}>
                {animals.filter(a => a.sexo === 'macho').length}
              </div>
              <div className="stat-label">Machos</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#ffad46' }}>
                {animals.filter(a => a.categoria === 'reproductor').length}
              </div>
              <div className="stat-label">Reproductores</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Sexo</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Raza</th>
                  <th>Ubicación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnimals.map(animal => (
                  <tr key={animal.id}>
                    <td style={{ fontWeight: '600' }}>{animal.identificador_unico}</td>
                    <td>{animal.nombre || '-'}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: animal.sexo === 'hembra' ? '#f25961' : '#1572e8',
                        color: '#ffffff'
                      }}>
                        {animal.sexo === 'hembra' ? 'Hembra' : 'Macho'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: '#6c757d',
                        color: '#ffffff',
                        textTransform: 'capitalize'
                      }}>
                        {animal.categoria}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: animal.estado === 'activo' ? '#31ce36' : 
                                   animal.estado === 'vendido' ? '#ffad46' : '#f25961',
                        color: '#ffffff',
                        textTransform: 'capitalize'
                      }}>
                        {animal.estado}
                      </span>
                    </td>
                    <td>{animal.raza_nombre || '-'}</td>
                    <td>{animal.ubicacion_nombre || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-primary btn-sm" 
                          title="Ver detalles"
                          onClick={() => handleView(animal)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          className="btn btn-warning btn-sm" 
                          title="Editar"
                          onClick={() => handleEdit(animal)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          title="Eliminar"
                          onClick={() => handleDelete(animal)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAnimals.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🐷</div>
              <h3>{animals.length === 0 ? 'No hay animales registrados' : 'No se encontraron animales'}</h3>
              <p>
                {animals.length === 0 
                  ? 'Comienza registrando tu primer animal en el sistema'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
              {animals.length === 0 && (
                <button className="btn btn-primary" onClick={handleCreate}>
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  Registrar Primer Animal
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h5 className="card-title">
                <i className={`fas ${modalType === 'create' ? 'fa-plus' : modalType === 'edit' ? 'fa-edit' : 'fa-eye'}`} style={{ marginRight: '10px' }}></i>
                {modalType === 'create' ? 'Nuevo Animal' : modalType === 'edit' ? 'Editar Animal' : 'Detalles del Animal'}
              </h5>
              <button 
                onClick={() => setShowModal(false)}
                style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div style={{ padding: '25px' }}>
              {errors.general && (
                <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
                  {errors.general}
                </div>
              )}
              
              {modalType === 'view' && selectedAnimal ? (
                <div className="grid grid-2">
                  <div>
                    <h6 style={{ color: '#1a2035', marginBottom: '15px' }}>Información Básica</h6>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>ID Único:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>{selectedAnimal.identificador_unico}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Nombre:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>{selectedAnimal.nombre || 'Sin nombre'}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Sexo:</strong>
                      <p style={{ margin: '5px 0 0 0', textTransform: 'capitalize' }}>{selectedAnimal.sexo}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Categoría:</strong>
                      <p style={{ margin: '5px 0 0 0', textTransform: 'capitalize' }}>{selectedAnimal.categoria}</p>
                    </div>
                  </div>
                  <div>
                    <h6 style={{ color: '#1a2035', marginBottom: '15px' }}>Detalles Adicionales</h6>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Estado:</strong>
                      <p style={{ margin: '5px 0 0 0', textTransform: 'capitalize' }}>{selectedAnimal.estado}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Raza:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>{selectedAnimal.raza_nombre || 'No especificada'}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Ubicación:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>{selectedAnimal.ubicacion_nombre || 'No asignada'}</p>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Fecha Nacimiento:</strong>
                      <p style={{ margin: '5px 0 0 0' }}>
                        {selectedAnimal.fecha_nacimiento ? new Date(selectedAnimal.fecha_nacimiento).toLocaleDateString() : 'No registrada'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-2">
                    <FormField
                      label="ID Único"
                      value={formData.identificador_unico}
                      onChange={(value) => setFormData({...formData, identificador_unico: value})}
                      error={errors.identificador_unico}
                      required
                      placeholder="Ej: CER001"
                      icon="fa-tag"
                    />
                    
                    <FormField
                      label="Nombre"
                      value={formData.nombre}
                      onChange={(value) => setFormData({...formData, nombre: value})}
                      placeholder="Nombre del animal"
                      icon="fa-signature"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Sexo"
                      type="select"
                      value={formData.sexo}
                      onChange={(value) => setFormData({...formData, sexo: value})}
                      options={[
                        { value: 'hembra', label: 'Hembra' },
                        { value: 'macho', label: 'Macho' }
                      ]}
                      icon="fa-venus-mars"
                    />
                    
                    <FormField
                      label="Categoría"
                      type="select"
                      value={formData.categoria}
                      onChange={(value) => setFormData({...formData, categoria: value})}
                      options={[
                        { value: 'lechon', label: 'Lechón' },
                        { value: 'recria', label: 'Recría' },
                        { value: 'desarrollo', label: 'Desarrollo' },
                        { value: 'engorde', label: 'Engorde' },
                        { value: 'reproductor', label: 'Reproductor' }
                      ]}
                      icon="fa-layer-group"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Fecha Nacimiento"
                      type="date"
                      value={formData.fecha_nacimiento}
                      onChange={(value) => setFormData({...formData, fecha_nacimiento: value})}
                      error={errors.fecha_nacimiento}
                      icon="fa-calendar"
                    />
                    
                    <FormField
                      label="Peso Nacimiento (kg)"
                      type="number"
                      step="0.1"
                      value={formData.peso_nacimiento}
                      onChange={(value) => setFormData({...formData, peso_nacimiento: value})}
                      error={errors.peso_nacimiento}
                      placeholder="1.5"
                      icon="fa-weight"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Raza"
                      type="select"
                      value={formData.raza_id}
                      onChange={(value) => setFormData({...formData, raza_id: value})}
                      options={[
                        { value: '1', label: 'Yorkshire' },
                        { value: '2', label: 'Landrace' },
                        { value: '3', label: 'Duroc' },
                        { value: '4', label: 'Hampshire' },
                        { value: '5', label: 'Pietrain' }
                      ]}
                      icon="fa-dna"
                    />
                    
                    <FormField
                      label="Ubicación"
                      type="select"
                      value={formData.ubicacion_id}
                      onChange={(value) => setFormData({...formData, ubicacion_id: value})}
                      options={[
                        { value: '1', label: 'Corral 1' },
                        { value: '2', label: 'Corral 2' },
                        { value: '3', label: 'Galpón A' },
                        { value: '4', label: 'Galpón B' },
                        { value: '5', label: 'Maternidad' }
                      ]}
                      icon="fa-map-marker-alt"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Padre"
                      type="select"
                      value={formData.padre_id}
                      onChange={(value) => setFormData({...formData, padre_id: value})}
                      options={[
                        { value: '1', label: 'VER001 - Verraco Alpha' },
                        { value: '2', label: 'VER002 - Verraco Beta' }
                      ]}
                      icon="fa-mars"
                    />
                    
                    <FormField
                      label="Madre"
                      type="select"
                      value={formData.madre_id}
                      onChange={(value) => setFormData({...formData, madre_id: value})}
                      options={[
                        { value: '1', label: 'CER001 - Cerda Principal' },
                        { value: '2', label: 'CER002 - Cerda Joven' }
                      ]}
                      icon="fa-venus"
                    />
                  </div>
                  
                  <FormField
                    label="Observaciones"
                    type="textarea"
                    value={formData.observaciones}
                    onChange={(value) => setFormData({...formData, observaciones: value})}
                    placeholder="Notas adicionales sobre el animal..."
                    rows={3}
                  />
                  
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '25px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-success" disabled={loading}>
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: '8px' }}></i>
                      {loading ? 'Guardando...' : (modalType === 'create' ? 'Crear Animal' : 'Actualizar')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Animals;