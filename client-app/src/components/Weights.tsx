import React, { useState, useEffect } from 'react';
import api from '../services/authService';
import FormField from './FormField';

interface WeightRecord {
  id: number;
  animal_id: number;
  animal_identificador: string;
  peso: number;
  fecha: string;
  edad_dias: number;
  ganancia_diaria?: number;
  observaciones?: string;
}

interface GrowthStats {
  totalPesajes: number;
  pesoPromedio: number;
  gananciaPromedio: number;
  animalesListos: number;
}

const Weights: React.FC = () => {
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [filteredWeights, setFilteredWeights] = useState<WeightRecord[]>([]);
  const [stats, setStats] = useState<GrowthStats>({
    totalPesajes: 0,
    pesoPromedio: 0,
    gananciaPromedio: 0,
    animalesListos: 0
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'history'>('create');
  const [selectedWeight, setSelectedWeight] = useState<WeightRecord | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    animal_id: '',
    peso: '',
    fecha: new Date().toISOString().split('T')[0],
    observaciones: '',
    condicion_corporal: '3',
    temperatura: '',
    ubicacion_pesaje: 'bascula_principal'
  });

  useEffect(() => {
    loadWeights();
  }, []);

  useEffect(() => {
    filterWeights();
  }, [weights, searchTerm, filterStatus]);

  const filterWeights = () => {
    let filtered = weights;
    
    if (searchTerm) {
      filtered = filtered.filter(weight => 
        weight.animal_identificador.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus) {
      filtered = filtered.filter(weight => {
        const status = getWeightStatus(weight.peso);
        return status.status.toLowerCase().includes(filterStatus.toLowerCase());
      });
    }
    
    setFilteredWeights(filtered);
  };

  const loadWeights = async () => {
    try {
      const response = await api.get('/weights');
      const weightsData = response.data || [];
      setWeights(weightsData);
      
      // Calcular estadísticas
      const totalPesajes = weightsData.length;
      const pesoPromedio = weightsData.length > 0 
        ? weightsData.reduce((acc: number, w: WeightRecord) => acc + w.peso, 0) / weightsData.length 
        : 0;
      const gananciaPromedio = weightsData.length > 0
        ? weightsData.reduce((acc: number, w: WeightRecord) => acc + (w.ganancia_diaria || 0), 0) / weightsData.length
        : 0;
      const animalesListos = weightsData.filter((w: WeightRecord) => w.peso >= 100).length;
      
      setStats({
        totalPesajes,
        pesoPromedio: Math.round(pesoPromedio * 10) / 10,
        gananciaPromedio: Math.round(gananciaPromedio * 10) / 10,
        animalesListos
      });
    } catch (error) {
      console.error('Error cargando pesajes:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Validar animal
    if (!formData.animal_id || formData.animal_id === '') {
      newErrors.animal_id = 'Debe seleccionar un animal';
    }
    
    // Validar peso
    if (!formData.peso || formData.peso === '') {
      newErrors.peso = 'El peso es requerido';
    } else {
      const peso = parseFloat(formData.peso);
      if (isNaN(peso) || peso <= 0) {
        newErrors.peso = 'El peso debe ser un número mayor a 0';
      } else {
        // Validaciones más específicas por rango de peso
        if (peso > 400) {
          newErrors.peso = 'El peso parece demasiado alto (máximo 400kg)';
        } else if (peso < 0.3) {
          newErrors.peso = 'El peso parece demasiado bajo (mínimo 0.3kg)';
        }
        // Validación de rangos normales
        if (peso > 200 && peso <= 400) {
          // Rango válido para reproductores adultos
        } else if (peso > 80 && peso <= 200) {
          // Rango válido para animales de engorde
        } else if (peso >= 15 && peso <= 80) {
          // Rango válido para lechones y desarrollo
        } else if (peso < 15) {
          // Solo advertencia para pesos muy bajos
          console.log('Peso bajo detectado, pero válido para lechones recién nacidos');
        }
      }
    }
    
    // Validar fecha
    if (!formData.fecha) {
      newErrors.fecha = 'La fecha es requerida';
    } else {
      const fecha = new Date(formData.fecha);
      const hoy = new Date();
      if (fecha > hoy) {
        newErrors.fecha = 'La fecha no puede ser futura';
      }
      
      // Verificar que no sea demasiado antigua
      const unAnoAtras = new Date();
      unAnoAtras.setFullYear(unAnoAtras.getFullYear() - 1);
      if (fecha < unAnoAtras) {
        newErrors.fecha = 'La fecha parece demasiado antigua';
      }
    }
    
    // Validar temperatura si se proporciona
    if (formData.temperatura) {
      const temp = parseFloat(formData.temperatura);
      if (isNaN(temp)) {
        newErrors.temperatura = 'La temperatura debe ser un número';
      } else if (temp < 35 || temp > 42) {
        newErrors.temperatura = 'La temperatura debe estar entre 35°C y 42°C';
      }
    }
    
    // Validar condición corporal
    const condicion = parseInt(formData.condicion_corporal);
    if (isNaN(condicion) || condicion < 1 || condicion > 5) {
      newErrors.condicion_corporal = 'La condición corporal debe estar entre 1 y 5';
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
        animal_id: parseInt(formData.animal_id),
        peso: parseFloat(formData.peso),
        fecha: formData.fecha,
        observaciones: formData.observaciones || null,
        condicion_corporal: parseInt(formData.condicion_corporal),
        temperatura: formData.temperatura ? parseFloat(formData.temperatura) : null,
        ubicacion_pesaje: formData.ubicacion_pesaje
      };
      
      if (modalType === 'create') {
        const response = await api.post('/weights', submitData);
        console.log('Pesaje creado:', response.data);
        setSuccess('Pesaje registrado exitosamente');
      } else if (modalType === 'edit' && selectedWeight) {
        const response = await api.put(`/weights/${selectedWeight.id}`, submitData);
        console.log('Pesaje actualizado:', response.data);
        setSuccess('Pesaje actualizado exitosamente');
      }
      
      resetForm();
      setShowModal(false);
      await loadWeights();
      
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
      animal_id: '',
      peso: '',
      fecha: new Date().toISOString().split('T')[0],
      observaciones: '',
      condicion_corporal: '3',
      temperatura: '',
      ubicacion_pesaje: 'bascula_principal'
    });
    setErrors({});
    setSelectedWeight(null);
  };

  const handleCreate = () => {
    resetForm();
    setModalType('create');
    setShowModal(true);
  };

  const handleEdit = (weight: WeightRecord) => {
    setFormData({
      animal_id: weight.animal_id.toString(),
      peso: weight.peso.toString(),
      fecha: weight.fecha.split('T')[0],
      observaciones: weight.observaciones || '',
      condicion_corporal: '3',
      temperatura: '',
      ubicacion_pesaje: 'bascula_principal'
    });
    setSelectedWeight(weight);
    setModalType('edit');
    setShowModal(true);
  };

  const handleDelete = async (weight: WeightRecord) => {
    if (!window.confirm(`¿Estás seguro de eliminar este pesaje?`)) {
      return;
    }
    
    try {
      await api.delete(`/weights/${weight.id}`);
      setSuccess('Pesaje eliminado exitosamente');
      loadWeights();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error eliminando pesaje');
    }
  };

  const handleHistory = (animalId: number) => {
    setSelectedAnimal(animalId);
    setModalType('history');
    setShowModal(true);
  };

  const calculateProjectedWeight = (currentWeight: number, dailyGain: number, targetWeight: number) => {
    if (dailyGain <= 0) return 0;
    const remainingWeight = targetWeight - currentWeight;
    return Math.ceil(remainingWeight / (dailyGain / 1000)); // dailyGain en gramos
  };

  const getWeightStatus = (peso: number) => {
    if (peso >= 100) return { color: '#31ce36', status: 'Listo para venta' };
    if (peso >= 70) return { color: '#ffad46', status: 'Próximo a venta' };
    if (peso >= 30) return { color: '#1572e8', status: 'En crecimiento' };
    return { color: '#6c757d', status: 'Lechón' };
  };

  if (loading && weights.length === 0) {
    return (
      <div className="page-inner">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando datos de pesajes...</p>
          </div>
        </div>
      </div>
    );
  }

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
          background: 'linear-gradient(135deg, #ffad46 0%, #fd7e14 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h4 className="card-title" style={{ margin: 0, color: 'white' }}>
                <i className="fas fa-weight" style={{ marginRight: '10px' }}></i>
                Control de Peso y Crecimiento ({filteredWeights.length})
              </h4>
              <p className="card-subtitle" style={{ margin: '5px 0 0 0', color: 'rgba(255,255,255,0.9)' }}>
                Seguimiento del crecimiento y desarrollo
              </p>
            </div>
            <button 
              className="btn btn-outline" 
              onClick={handleCreate}
              style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.3)', color: 'white' }}
            >
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              Nuevo Pesaje
            </button>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Filtros */}
          <div className="filter-container" style={{ marginBottom: '25px' }}>
            <div className="filter-group">
              <label>Buscar Animal:</label>
              <input
                type="text"
                className="form-control"
                placeholder="ID del animal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ minWidth: '200px' }}
              />
            </div>
            
            <div className="filter-group">
              <label>Estado:</label>
              <select
                className="form-control"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="lechon">Lechón</option>
                <option value="crecimiento">En crecimiento</option>
                <option value="proximo">Próximo a venta</option>
                <option value="listo">Listo para venta</option>
              </select>
            </div>
            
            <div className="filter-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
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
              <div className="stat-value">{stats.totalPesajes}</div>
              <div className="stat-label">Pesajes Registrados</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#31ce36' }}>{stats.pesoPromedio}kg</div>
              <div className="stat-label">Peso Promedio</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#ffad46' }}>{stats.gananciaPromedio}g</div>
              <div className="stat-label">Ganancia Diaria</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#f25961' }}>{stats.animalesListos}</div>
              <div className="stat-label">Listos para Venta</div>
            </div>
          </div>

          {/* Alertas de Animales Listos */}
          {stats.animalesListos > 0 && (
            <div style={{ marginBottom: '25px', padding: '15px', background: '#d4edda', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '24px', color: '#31ce36' }}></i>
                <div>
                  <div style={{ fontWeight: '600', color: '#1a2035' }}>Animales Listos para Venta</div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    {stats.animalesListos} animales han alcanzado el peso objetivo (≥100kg) y están listos para venta
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Pesajes */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Peso (kg)</th>
                  <th>Fecha</th>
                  <th>Edad (días)</th>
                  <th>Ganancia Diaria</th>
                  <th>Estado</th>
                  <th>Proyección</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredWeights.map(weight => {
                  const status = getWeightStatus(weight.peso);
                  const daysToMarket = weight.ganancia_diaria 
                    ? calculateProjectedWeight(weight.peso, weight.ganancia_diaria, 100)
                    : 0;
                  
                  return (
                    <tr key={weight.id}>
                      <td style={{ fontWeight: '600' }}>{weight.animal_identificador}</td>
                      <td>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: status.color }}>
                          {weight.peso}kg
                        </span>
                      </td>
                      <td>{new Date(weight.fecha).toLocaleDateString()}</td>
                      <td>{weight.edad_dias} días</td>
                      <td>
                        {weight.ganancia_diaria ? (
                          <span style={{ 
                            color: weight.ganancia_diaria >= 500 ? '#31ce36' : 
                                   weight.ganancia_diaria >= 400 ? '#ffad46' : '#f25961',
                            fontWeight: '600'
                          }}>
                            {weight.ganancia_diaria}g/día
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: status.color,
                          color: '#ffffff'
                        }}>
                          {status.status}
                        </span>
                      </td>
                      <td>
                        {weight.peso < 100 && daysToMarket > 0 ? (
                          <span style={{ fontSize: '12px', color: '#6c757d' }}>
                            {daysToMarket} días a 100kg
                          </span>
                        ) : weight.peso >= 100 ? (
                          <span style={{ fontSize: '12px', color: '#31ce36', fontWeight: '600' }}>
                            ✓ Peso objetivo
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button 
                            className="btn btn-primary btn-sm" 
                            title="Ver historial"
                            onClick={() => handleHistory(weight.animal_id)}
                          >
                            <i className="fas fa-chart-line"></i>
                          </button>
                          <button 
                            className="btn btn-warning btn-sm" 
                            title="Editar"
                            onClick={() => handleEdit(weight)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="btn btn-danger btn-sm" 
                            title="Eliminar"
                            onClick={() => handleDelete(weight)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredWeights.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">⚖️</div>
              <h3>{weights.length === 0 ? 'No hay pesajes registrados' : 'No se encontraron pesajes'}</h3>
              <p>
                {weights.length === 0 
                  ? 'Comienza registrando el primer pesaje de tus animales'
                  : 'Intenta ajustar los filtros de búsqueda'
                }
              </p>
              {weights.length === 0 && (
                <button className="btn btn-primary" onClick={handleCreate}>
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  Registrar Primer Pesaje
                </button>
              )}
            </div>
          )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <h5 className="card-title">
                <i className={`fas ${
                  modalType === 'create' ? 'fa-plus' : 
                  modalType === 'edit' ? 'fa-edit' : 'fa-chart-line'
                }`} style={{ marginRight: '10px' }}></i>
                {
                  modalType === 'create' ? 'Nuevo Pesaje' :
                  modalType === 'edit' ? 'Editar Pesaje' : 'Historial de Crecimiento'
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
              
              {modalType === 'history' ? (
                <div style={{ textAlign: 'center' }}>
                  <i className="fas fa-chart-area" style={{ fontSize: '48px', color: '#6c757d', marginBottom: '15px', opacity: 0.5 }}></i>
                  <h5 style={{ color: '#1a2035' }}>Curva de Crecimiento</h5>
                  <p style={{ color: '#6c757d' }}>
                    Aquí se mostraría el gráfico de evolución del peso del animal seleccionado
                  </p>
                  <div style={{ marginTop: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                    <h6>Próximamente:</h6>
                    <ul style={{ textAlign: 'left', color: '#6c757d' }}>
                      <li>Gráfico de curva de crecimiento</li>
                      <li>Comparación con estándares</li>
                      <li>Proyecciones de peso</li>
                      <li>Análisis de ganancia diaria</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-2">
                    <FormField
                      label="Animal"
                      type="select"
                      value={formData.animal_id}
                      onChange={(value) => setFormData({...formData, animal_id: value})}
                      error={errors.animal_id}
                      required
                      options={[
                        { value: '1', label: 'CER001 - Cerda Principal' },
                        { value: '2', label: 'LEC001 - Lechón Joven' },
                        { value: '3', label: 'ENG001 - Cerdo Engorde' },
                        { value: '4', label: 'VER001 - Verraco Alpha' }
                      ]}
                      icon="fa-paw"
                    />
                    
                    <FormField
                      label="Fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(value) => setFormData({...formData, fecha: value})}
                      error={errors.fecha}
                      required
                      icon="fa-calendar"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Peso (kg)"
                      type="number"
                      step="0.1"
                      value={formData.peso}
                      onChange={(value) => setFormData({...formData, peso: value})}
                      error={errors.peso}
                      required
                      placeholder="45.5"
                      icon="fa-weight"
                    />
                    
                    <FormField
                      label="Condición Corporal (1-5)"
                      type="select"
                      value={formData.condicion_corporal}
                      onChange={(value) => setFormData({...formData, condicion_corporal: value})}
                      options={[
                        { value: '1', label: '1 - Muy flaco' },
                        { value: '2', label: '2 - Flaco' },
                        { value: '3', label: '3 - Normal' },
                        { value: '4', label: '4 - Gordo' },
                        { value: '5', label: '5 - Muy gordo' }
                      ]}
                      icon="fa-eye"
                    />
                  </div>
                  
                  <div className="grid grid-2">
                    <FormField
                      label="Temperatura (°C)"
                      type="number"
                      step="0.1"
                      value={formData.temperatura}
                      onChange={(value) => setFormData({...formData, temperatura: value})}
                      placeholder="38.5"
                      icon="fa-thermometer-half"
                    />
                    
                    <FormField
                      label="Ubicación de Pesaje"
                      type="select"
                      value={formData.ubicacion_pesaje}
                      onChange={(value) => setFormData({...formData, ubicacion_pesaje: value})}
                      options={[
                        { value: 'bascula_principal', label: 'Báscula Principal' },
                        { value: 'bascula_portatil', label: 'Báscula Portátil' },
                        { value: 'bascula_corral', label: 'Báscula de Corral' }
                      ]}
                      icon="fa-map-marker-alt"
                    />
                  </div>
                  
                  <FormField
                    label="Observaciones"
                    type="textarea"
                    value={formData.observaciones}
                    onChange={(value) => setFormData({...formData, observaciones: value})}
                    placeholder="Observaciones del pesaje, comportamiento del animal, etc..."
                    rows={3}
                  />
                  
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '25px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-success" disabled={loading}>
                      <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: '8px' }}></i>
                      {loading ? 'Guardando...' : (modalType === 'create' ? 'Registrar Pesaje' : 'Actualizar')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default Weights;