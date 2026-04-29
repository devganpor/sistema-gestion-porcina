import React, { useState, useEffect } from 'react';
import api from '../services/authService';
import FormField from './FormField';

interface ReproductiveCycle {
  id: number;
  cerda_id: number;
  cerda_identificador: string;
  fecha_inicio: string;
  estado: string;
  numero_ciclo: number;
  fecha_celo?: string;
  fecha_servicio?: string;
  fecha_parto_esperado?: string;
  fecha_parto_real?: string;
  lechones_vivos?: number;
  lechones_muertos?: number;
  observaciones?: string;
}

interface Animal {
  id: number;
  identificador_unico: string;
  nombre: string;
  sexo: string;
  categoria: string;
}

const Reproduction: React.FC = () => {
  const [cycles, setCycles] = useState<ReproductiveCycle[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ciclos');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'birth'>('create');
  const [selectedCycle, setSelectedCycle] = useState<ReproductiveCycle | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    cerda_id: '',
    fecha_celo: '',
    intensidad_celo: 'media',
    fecha_servicio: '',
    verraco_id: '',
    tipo_servicio: 'monta_natural',
    observaciones: '',
    lechones_vivos: '',
    lechones_muertos: '',
    fecha_parto_real: '',
    peso_promedio: '',
    observaciones_parto: ''
  });

  useEffect(() => {
    loadCycles();
    loadAnimals();
  }, []);

  const loadCycles = async () => {
    try {
      const response = await api.get('/reproduction/cycles');
      setCycles(response.data || []);
    } catch (error) {
      console.error('Error cargando ciclos reproductivos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnimals = async () => {
    try {
      const response = await api.get('/animals');
      setAnimals(response.data || []);
    } catch (error) {
      console.error('Error cargando animales:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Validar cerda
    if (!formData.cerda_id || formData.cerda_id === '') {
      newErrors.cerda_id = 'Debe seleccionar una cerda';
    }
    
    if (modalType === 'birth') {
      // Validaciones para registro de parto
      if (!formData.fecha_parto_real) {
        newErrors.fecha_parto_real = 'La fecha de parto es requerida';
      } else {
        const fechaParto = new Date(formData.fecha_parto_real);
        const hoy = new Date();
        if (fechaParto > hoy) {
          newErrors.fecha_parto_real = 'La fecha de parto no puede ser futura';
        }
      }
      
      if (!formData.lechones_vivos || formData.lechones_vivos === '') {
        newErrors.lechones_vivos = 'Ingresa el número de lechones vivos';
      } else {
        const lechones = parseInt(formData.lechones_vivos);
        if (isNaN(lechones) || lechones < 0) {
          newErrors.lechones_vivos = 'El número de lechones debe ser 0 o mayor';
        } else if (lechones > 20) {
          newErrors.lechones_vivos = 'El número de lechones parece demasiado alto';
        }
      }
      
      if (formData.lechones_muertos) {
        const muertos = parseInt(formData.lechones_muertos);
        if (isNaN(muertos) || muertos < 0) {
          newErrors.lechones_muertos = 'El número de lechones muertos debe ser 0 o mayor';
        }
      }
      
      if (formData.peso_promedio) {
        const peso = parseFloat(formData.peso_promedio);
        if (isNaN(peso) || peso <= 0) {
          newErrors.peso_promedio = 'El peso debe ser mayor a 0';
        } else if (peso > 3) {
          newErrors.peso_promedio = 'El peso promedio parece demasiado alto para lechones';
        }
      }
    } else {
      // Validaciones para ciclo reproductivo
      if (formData.fecha_celo) {
        const fechaCelo = new Date(formData.fecha_celo);
        const hoy = new Date();
        if (fechaCelo > hoy) {
          newErrors.fecha_celo = 'La fecha de celo no puede ser futura';
        }
      }
      
      if (formData.fecha_servicio) {
        const fechaServicio = new Date(formData.fecha_servicio);
        const hoy = new Date();
        if (fechaServicio > hoy) {
          newErrors.fecha_servicio = 'La fecha de servicio no puede ser futura';
        }
        
        // Validar que el servicio sea después del celo
        if (formData.fecha_celo) {
          const fechaCelo = new Date(formData.fecha_celo);
          if (fechaServicio < fechaCelo) {
            newErrors.fecha_servicio = 'La fecha de servicio debe ser posterior al celo';
          }
        }
      }
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
      let submitData: any = {};
      let endpoint = '';
      
      if (modalType === 'create') {
        submitData = {
          cerda_id: parseInt(formData.cerda_id),
          fecha_celo: formData.fecha_celo || null,
          intensidad_celo: formData.intensidad_celo,
          fecha_servicio: formData.fecha_servicio || null,
          verraco_id: formData.verraco_id ? parseInt(formData.verraco_id) : null,
          tipo_servicio: formData.tipo_servicio,
          observaciones: formData.observaciones || null
        };
        endpoint = '/reproduction/cycles';
        
        const response = await api.post(endpoint, submitData);
        console.log('Ciclo creado:', response.data);
        setSuccess('Ciclo reproductivo registrado exitosamente');
        
      } else if (modalType === 'edit' && selectedCycle) {
        submitData = {
          cerda_id: parseInt(formData.cerda_id),
          fecha_celo: formData.fecha_celo || null,
          intensidad_celo: formData.intensidad_celo,
          fecha_servicio: formData.fecha_servicio || null,
          verraco_id: formData.verraco_id ? parseInt(formData.verraco_id) : null,
          tipo_servicio: formData.tipo_servicio,
          observaciones: formData.observaciones || null
        };
        endpoint = `/reproduction/cycles/${selectedCycle.id}`;
        
        const response = await api.put(endpoint, submitData);
        console.log('Ciclo actualizado:', response.data);
        setSuccess('Ciclo actualizado exitosamente');
        
      } else if (modalType === 'birth' && selectedCycle) {
        submitData = {
          fecha_parto_real: formData.fecha_parto_real,
          lechones_vivos: parseInt(formData.lechones_vivos) || 0,
          lechones_muertos: parseInt(formData.lechones_muertos) || 0,
          peso_promedio: formData.peso_promedio ? parseFloat(formData.peso_promedio) : null,
          observaciones_parto: formData.observaciones_parto || null
        };
        endpoint = `/reproduction/cycles/${selectedCycle.id}/birth`;
        
        const response = await api.post(endpoint, submitData);
        console.log('Parto registrado:', response.data);
        setSuccess('Parto registrado exitosamente');
      }
      
      resetForm();
      setShowModal(false);
      await loadCycles();
      
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
      cerda_id: '',
      fecha_celo: '',
      intensidad_celo: 'media',
      fecha_servicio: '',
      verraco_id: '',
      tipo_servicio: 'monta_natural',
      observaciones: '',
      lechones_vivos: '',
      lechones_muertos: '',
      fecha_parto_real: '',
      peso_promedio: '',
      observaciones_parto: ''
    });
    setErrors({});
    setSelectedCycle(null);
  };

  const handleCreate = () => {
    resetForm();
    setModalType('create');
    setShowModal(true);
  };

  const handleEdit = (cycle: ReproductiveCycle) => {
    setFormData({
      cerda_id: cycle.cerda_id.toString(),
      fecha_celo: cycle.fecha_celo?.split('T')[0] || '',
      intensidad_celo: 'media',
      fecha_servicio: cycle.fecha_servicio?.split('T')[0] || '',
      verraco_id: '',
      tipo_servicio: 'monta_natural',
      observaciones: cycle.observaciones || '',
      lechones_vivos: '',
      lechones_muertos: '',
      fecha_parto_real: '',
      peso_promedio: '',
      observaciones_parto: ''
    });
    setSelectedCycle(cycle);
    setModalType('edit');
    setShowModal(true);
  };

  const handleBirth = (cycle: ReproductiveCycle) => {
    setFormData({
      cerda_id: cycle.cerda_id.toString(),
      fecha_celo: '',
      intensidad_celo: 'media',
      fecha_servicio: '',
      verraco_id: '',
      tipo_servicio: 'monta_natural',
      observaciones: '',
      lechones_vivos: '',
      lechones_muertos: '0',
      fecha_parto_real: new Date().toISOString().split('T')[0],
      peso_promedio: '',
      observaciones_parto: ''
    });
    setSelectedCycle(cycle);
    setModalType('birth');
    setShowModal(true);
  };

  const calculateExpectedBirth = (serviceDate: string) => {
    if (!serviceDate) return '';
    const date = new Date(serviceDate);
    date.setDate(date.getDate() + 114); // 114 días de gestación
    return date.toISOString().split('T')[0];
  };

  if (loading && cycles.length === 0) {
    return (
      <div className="page-inner">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando datos reproductivos...</p>
          </div>
        </div>
      </div>
    );
  }

  const cerdas = animals.filter(a => a.sexo === 'hembra' && (a.categoria === 'reproductor' || a.categoria === 'desarrollo'));
  const verracos = animals.filter(a => a.sexo === 'macho' && a.categoria === 'reproductor');

  return (
    <div className="page-inner">
      {/* Success Message */}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
          {success}
        </div>
      )}
      
      <div className="card">
        <div className="card-header gradient" style={{ 
          background: 'linear-gradient(135deg, #f25961 0%, #e74c3c 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h4 className="card-title" style={{ margin: 0, color: 'white' }}>
                <i className="fas fa-heart" style={{ marginRight: '10px' }}></i>
                Control Reproductivo ({cycles.length})
              </h4>
              <p className="card-subtitle" style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.9)' }}>
                Gestión completa de ciclos reproductivos
              </p>
            </div>
            <button 
              className="btn btn-outline" 
              onClick={handleCreate}
              style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white' }}
            >
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              Nuevo Ciclo
            </button>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Formulario - Temporalmente deshabilitado */}
          {false && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  Registrar Evento Reproductivo
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Cerda *</label>
                      <select
                        value={formData.cerda_id}
                        onChange={(e) => setFormData({...formData, cerda_id: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Seleccionar cerda</option>
                        <option value="1">CER001 - Cerda Principal</option>
                        <option value="2">CER002 - Cerda Joven</option>
                        <option value="3">CER003 - Cerda Veterana</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Fecha de Celo</label>
                      <input
                        type="date"
                        value={formData.fecha_celo}
                        onChange={(e) => setFormData({...formData, fecha_celo: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Intensidad del Celo</label>
                      <select
                        value={formData.intensidad_celo}
                        onChange={(e) => setFormData({...formData, intensidad_celo: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="baja">Baja</option>
                        <option value="media">Media</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Fecha de Servicio</label>
                      <input
                        type="date"
                        value={formData.fecha_servicio}
                        onChange={(e) => setFormData({...formData, fecha_servicio: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Verraco</label>
                      <select
                        value={formData.verraco_id}
                        onChange={(e) => setFormData({...formData, verraco_id: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Seleccionar verraco</option>
                        <option value="1">VER001 - Verraco Alpha</option>
                        <option value="2">VER002 - Verraco Beta</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Tipo de Servicio</label>
                      <select
                        value={formData.tipo_servicio}
                        onChange={(e) => setFormData({...formData, tipo_servicio: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="monta_natural">Monta Natural</option>
                        <option value="inseminacion_artificial">Inseminación Artificial</option>
                      </select>
                    </div>
                  </div>
                  
                  {formData.fecha_servicio && (
                    <div style={{ marginBottom: '15px', padding: '10px', background: '#e3f2fd', borderRadius: '8px' }}>
                      <strong>Fecha probable de parto:</strong> {calculateExpectedBirth(formData.fecha_servicio)}
                    </div>
                  )}
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Observaciones</label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ebedf2',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                      placeholder="Observaciones del evento reproductivo..."
                    />
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                      Guardar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => {}}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ebedf2' }}>
            <button
              onClick={() => setActiveTab('ciclos')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'ciclos' ? '#1572e8' : 'transparent',
                color: activeTab === 'ciclos' ? '#ffffff' : '#6c757d',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-sync-alt" style={{ marginRight: '8px' }}></i>
              Ciclos Reproductivos
            </button>
            <button
              onClick={() => setActiveTab('calendario')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'calendario' ? '#1572e8' : 'transparent',
                color: activeTab === 'calendario' ? '#ffffff' : '#6c757d',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-calendar-alt" style={{ marginRight: '8px' }}></i>
              Calendario
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'alertas' ? '#1572e8' : 'transparent',
                color: activeTab === 'alertas' ? '#ffffff' : '#6c757d',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-bell" style={{ marginRight: '8px' }}></i>
              Alertas
            </button>
          </div>

          {/* Contenido de Tabs */}
          {activeTab === 'ciclos' && (
            <div>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1572e8' }}>{cycles.length}</div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>CICLOS ACTIVOS</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#31ce36' }}>
                    {cycles.filter(c => c.estado === 'gestante').length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>GESTANTES</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffad46' }}>
                    {cycles.filter(c => c.fecha_parto_esperado && new Date(c.fecha_parto_esperado) <= new Date(Date.now() + 7*24*60*60*1000)).length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>PARTOS PRÓXIMOS</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#f25961' }}>
                    {cycles.reduce((acc, c) => acc + (c.lechones_vivos || 0), 0)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>LECHONES NACIDOS</div>
                </div>
              </div>

              {/* Tabla de Ciclos */}
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cerda</th>
                      <th>Ciclo #</th>
                      <th>Estado</th>
                      <th>Fecha Celo</th>
                      <th>Fecha Servicio</th>
                      <th>Parto Esperado</th>
                      <th>Lechones</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycles.map(cycle => (
                      <tr key={cycle.id}>
                        <td style={{ fontWeight: '600' }}>{cycle.cerda_identificador}</td>
                        <td>{cycle.numero_ciclo}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: cycle.estado === 'gestante' ? '#31ce36' : 
                                       cycle.estado === 'servida' ? '#ffad46' : 
                                       cycle.estado === 'celo' ? '#1572e8' : '#6c757d',
                            color: '#ffffff',
                            textTransform: 'capitalize'
                          }}>
                            {cycle.estado}
                          </span>
                        </td>
                        <td>{cycle.fecha_celo ? new Date(cycle.fecha_celo).toLocaleDateString() : '-'}</td>
                        <td>{cycle.fecha_servicio ? new Date(cycle.fecha_servicio).toLocaleDateString() : '-'}</td>
                        <td>{cycle.fecha_parto_esperado ? new Date(cycle.fecha_parto_esperado).toLocaleDateString() : '-'}</td>
                        <td>
                          {cycle.lechones_vivos ? (
                            <span style={{ color: '#31ce36', fontWeight: '600' }}>
                              {cycle.lechones_vivos}V {cycle.lechones_muertos ? `/ ${cycle.lechones_muertos}M` : ''}
                            </span>
                          ) : '-'}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="btn btn-warning btn-sm" 
                              title="Editar"
                              onClick={() => handleEdit(cycle)}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            {cycle.estado === 'gestante' && (
                              <button 
                                className="btn btn-success btn-sm" 
                                title="Registrar Parto"
                                onClick={() => handleBirth(cycle)}
                              >
                                <i className="fas fa-baby"></i>
                              </button>
                            )}
                            <button 
                              className="btn btn-danger btn-sm" 
                              title="Eliminar"
                              onClick={() => {
                                if (window.confirm('¿Estás seguro de eliminar este ciclo?')) {
                                  // Implementar eliminación
                                }
                              }}
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

              {cycles.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">❤️</div>
                  <h3>No hay ciclos reproductivos registrados</h3>
                  <p>Comienza registrando el primer ciclo reproductivo de tus cerdas</p>
                  <button className="btn btn-primary" onClick={handleCreate}>
                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                    Registrar Primer Ciclo
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'calendario' && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <i className="fas fa-calendar-alt" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
              <h5>Calendario Reproductivo</h5>
              <p>Vista mensual con eventos programados - En desarrollo</p>
            </div>
          )}

          {activeTab === 'alertas' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px', color: '#ffad46' }}></i>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a2035' }}>Partos Próximos (7 días)</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>3 cerdas con parto esperado en los próximos 7 días</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: '#d1ecf1', borderRadius: '8px', border: '1px solid #bee5eb' }}>
                  <i className="fas fa-heart" style={{ fontSize: '24px', color: '#1572e8' }}></i>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a2035' }}>Celos Esperados</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>2 cerdas deberían estar en celo (21 días post-destete)</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: '#f8d7da', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
                  <i className="fas fa-redo" style={{ fontSize: '24px', color: '#f25961' }}></i>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a2035' }}>Repetición de Celos</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>1 cerda con posible repetición de celo - verificar gestación</div>
                  </div>
                </div>
              </div>
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
                <i className={`fas ${
                  modalType === 'create' ? 'fa-plus' : 
                  modalType === 'edit' ? 'fa-edit' : 'fa-baby'
                }`} style={{ marginRight: '10px' }}></i>
                {
                  modalType === 'create' ? 'Nuevo Ciclo Reproductivo' :
                  modalType === 'edit' ? 'Editar Ciclo' : 'Registrar Parto'
                }
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
              
              <form onSubmit={handleSubmit}>
                {modalType === 'birth' ? (
                  // Formulario de Parto
                  <>
                    <div className="grid grid-2">
                      <FormField
                        label="Fecha de Parto"
                        type="date"
                        value={formData.fecha_parto_real}
                        onChange={(value) => setFormData({...formData, fecha_parto_real: value})}
                        error={errors.fecha_parto_real}
                        required
                        icon="fa-calendar"
                      />
                      
                      <FormField
                        label="Lechones Vivos"
                        type="number"
                        value={formData.lechones_vivos}
                        onChange={(value) => setFormData({...formData, lechones_vivos: value})}
                        error={errors.lechones_vivos}
                        required
                        min="0"
                        icon="fa-piggy-bank"
                      />
                    </div>
                    
                    <div className="grid grid-2">
                      <FormField
                        label="Lechones Muertos"
                        type="number"
                        value={formData.lechones_muertos}
                        onChange={(value) => setFormData({...formData, lechones_muertos: value})}
                        min="0"
                        icon="fa-times-circle"
                      />
                      
                      <FormField
                        label="Peso Promedio (kg)"
                        type="number"
                        step="0.1"
                        value={formData.peso_promedio}
                        onChange={(value) => setFormData({...formData, peso_promedio: value})}
                        placeholder="1.5"
                        icon="fa-weight"
                      />
                    </div>
                    
                    <FormField
                      label="Observaciones del Parto"
                      type="textarea"
                      value={formData.observaciones_parto}
                      onChange={(value) => setFormData({...formData, observaciones_parto: value})}
                      placeholder="Detalles del parto, complicaciones, etc..."
                      rows={3}
                    />
                  </>
                ) : (
                  // Formulario de Ciclo
                  <>
                    <div className="grid grid-2">
                      <FormField
                        label="Cerda"
                        type="select"
                        value={formData.cerda_id}
                        onChange={(value) => setFormData({...formData, cerda_id: value})}
                        error={errors.cerda_id}
                        required
                        options={cerdas.map(cerda => ({
                          value: cerda.id.toString(),
                          label: `${cerda.identificador_unico} - ${cerda.nombre || 'Sin nombre'}`
                        }))}
                        icon="fa-venus"
                      />
                      
                      <FormField
                        label="Fecha de Celo"
                        type="date"
                        value={formData.fecha_celo}
                        onChange={(value) => setFormData({...formData, fecha_celo: value})}
                        icon="fa-heart"
                      />
                    </div>
                    
                    <div className="grid grid-2">
                      <FormField
                        label="Intensidad del Celo"
                        type="select"
                        value={formData.intensidad_celo}
                        onChange={(value) => setFormData({...formData, intensidad_celo: value})}
                        options={[
                          { value: 'baja', label: 'Baja' },
                          { value: 'media', label: 'Media' },
                          { value: 'alta', label: 'Alta' }
                        ]}
                        icon="fa-thermometer-half"
                      />
                      
                      <FormField
                        label="Fecha de Servicio"
                        type="date"
                        value={formData.fecha_servicio}
                        onChange={(value) => setFormData({...formData, fecha_servicio: value})}
                        icon="fa-calendar-check"
                      />
                    </div>
                    
                    <div className="grid grid-2">
                      <FormField
                        label="Verraco"
                        type="select"
                        value={formData.verraco_id}
                        onChange={(value) => setFormData({...formData, verraco_id: value})}
                        options={verracos.map(verraco => ({
                          value: verraco.id.toString(),
                          label: `${verraco.identificador_unico} - ${verraco.nombre || 'Sin nombre'}`
                        }))}
                        icon="fa-mars"
                      />
                      
                      <FormField
                        label="Tipo de Servicio"
                        type="select"
                        value={formData.tipo_servicio}
                        onChange={(value) => setFormData({...formData, tipo_servicio: value})}
                        options={[
                          { value: 'monta_natural', label: 'Monta Natural' },
                          { value: 'inseminacion_artificial', label: 'Inseminación Artificial' }
                        ]}
                        icon="fa-dna"
                      />
                    </div>
                    
                    {formData.fecha_servicio && (
                      <div style={{ 
                        marginBottom: '20px', 
                        padding: '15px', 
                        background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)', 
                        borderRadius: '12px',
                        border: '1px solid #2196f3'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <i className="fas fa-calendar-alt" style={{ color: '#1976d2', fontSize: '20px' }}></i>
                          <div>
                            <strong style={{ color: '#1976d2' }}>Fecha probable de parto:</strong>
                            <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: '600' }}>
                              {calculateExpectedBirth(formData.fecha_servicio)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <FormField
                      label="Observaciones"
                      type="textarea"
                      value={formData.observaciones}
                      onChange={(value) => setFormData({...formData, observaciones: value})}
                      placeholder="Observaciones del evento reproductivo..."
                      rows={3}
                    />
                  </>
                )}
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '25px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: '8px' }}></i>
                    {loading ? 'Guardando...' : (
                      modalType === 'create' ? 'Crear Ciclo' :
                      modalType === 'edit' ? 'Actualizar' : 'Registrar Parto'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reproduction;