import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface HealthEvent {
  id: number;
  animal_id: number;
  animal_identificador: string;
  tipo_evento: string;
  fecha: string;
  descripcion: string;
  tratamiento?: string;
  veterinario?: string;
  costo?: number;
}

interface Vaccination {
  id: number;
  animal_id: number;
  animal_identificador: string;
  vacuna: string;
  fecha_aplicacion: string;
  lote: string;
  proxima_dosis?: string;
  responsable: string;
}

const Health: React.FC = () => {
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('eventos');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('evento');
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    animal_id: '',
    tipo_evento: 'vacunacion',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    tratamiento: '',
    veterinario: '',
    costo: '',
    vacuna: '',
    lote: '',
    proxima_dosis: '',
    responsable: ''
  });
  
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Validaciones comunes
    if (!formData.animal_id || formData.animal_id === '') {
      newErrors.animal_id = 'Debe seleccionar un animal';
    }
    
    if (!formData.fecha) {
      newErrors.fecha = 'La fecha es requerida';
    } else {
      const fecha = new Date(formData.fecha);
      const hoy = new Date();
      if (fecha > hoy) {
        newErrors.fecha = 'La fecha no puede ser futura';
      }
    }
    
    if (formType === 'evento') {
      // Validaciones para eventos sanitarios
      if (!formData.descripcion || formData.descripcion.trim() === '') {
        newErrors.descripcion = 'La descripción es requerida';
      }
      
      if (formData.costo && (isNaN(parseFloat(formData.costo)) || parseFloat(formData.costo) < 0)) {
        newErrors.costo = 'El costo debe ser un número positivo';
      }
    } else {
      // Validaciones para vacunaciones
      if (!formData.vacuna || formData.vacuna === '') {
        newErrors.vacuna = 'Debe seleccionar una vacuna';
      }
      
      if (!formData.lote || formData.lote.trim() === '') {
        newErrors.lote = 'El lote es requerido';
      }
      
      if (!formData.responsable || formData.responsable.trim() === '') {
        newErrors.responsable = 'El responsable es requerido';
      }
      
      if (formData.proxima_dosis) {
        const proximaDosis = new Date(formData.proxima_dosis);
        const fechaAplicacion = new Date(formData.fecha);
        if (proximaDosis <= fechaAplicacion) {
          newErrors.proxima_dosis = 'La próxima dosis debe ser posterior a la fecha de aplicación';
        }
      }
    }
    
    console.log('Errores de validación:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      const [eventsRes, vaccinationsRes] = await Promise.all([
        api.get('/health/events').catch(() => ({ data: [] })),
        api.get('/health/vaccinations').catch(() => ({ data: [] }))
      ]);
      setHealthEvents(eventsRes.data);
      setVaccinations(vaccinationsRes.data);
    } catch (error) {
      console.error('Error cargando datos de salud:', error);
    } finally {
      setLoading(false);
    }
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
      
      if (formType === 'evento') {
        submitData = {
          animal_id: parseInt(formData.animal_id),
          tipo_evento: formData.tipo_evento,
          fecha: formData.fecha,
          descripcion: formData.descripcion,
          tratamiento: formData.tratamiento || null,
          veterinario: formData.veterinario || null,
          costo: formData.costo ? parseFloat(formData.costo) : null
        };
        endpoint = '/health/events';
      } else {
        submitData = {
          animal_id: parseInt(formData.animal_id),
          vacuna: formData.vacuna,
          fecha_aplicacion: formData.fecha,
          lote: formData.lote,
          proxima_dosis: formData.proxima_dosis || null,
          responsable: formData.responsable
        };
        endpoint = '/health/vaccinations';
      }
      
      const response = await api.post(endpoint, submitData);
      console.log('Evento sanitario guardado:', response.data);
      
      setSuccess(`${formType === 'evento' ? 'Evento sanitario' : 'Vacunación'} registrado exitosamente`);
      resetForm();
      await loadHealthData();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error guardando evento:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Error guardando evento sanitario';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({
      animal_id: '',
      tipo_evento: 'vacunacion',
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      tratamiento: '',
      veterinario: '',
      costo: '',
      vacuna: '',
      lote: '',
      proxima_dosis: '',
      responsable: ''
    });
  };

  const getEventTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'vacunacion': return '#31ce36';
      case 'desparasitacion': return '#1572e8';
      case 'tratamiento': return '#ffad46';
      case 'enfermedad': return '#f25961';
      case 'revision': return '#6c757d';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="page-inner">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando datos sanitarios...</p>
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
              <i className="fas fa-medkit" style={{ marginRight: '10px' }}></i>
              Sanidad y Salud Animal
            </h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ebedf2',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="evento">Evento Sanitario</option>
                <option value="vacunacion">Vacunación</option>
              </select>
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
                <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
                {showForm ? 'Cancelar' : `Nuevo ${formType === 'evento' ? 'Evento' : 'Vacuna'}`}
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Formulario */}
          {showForm && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                  {formType === 'evento' ? 'Nuevo Evento Sanitario' : 'Nueva Vacunación'}
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Animal *</label>
                      <select
                        value={formData.animal_id}
                        onChange={(e) => setFormData({...formData, animal_id: e.target.value})}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #ebedf2',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Seleccionar animal</option>
                        <option value="1">CER001 - Cerda Principal</option>
                        <option value="2">LEC001 - Lechón Joven</option>
                        <option value="3">VER001 - Verraco Alpha</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Fecha *</label>
                      <input
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                        required
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
                  
                  {formType === 'evento' ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Tipo de Evento</label>
                          <select
                            value={formData.tipo_evento}
                            onChange={(e) => setFormData({...formData, tipo_evento: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ebedf2',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          >
                            <option value="vacunacion">Vacunación</option>
                            <option value="desparasitacion">Desparasitación</option>
                            <option value="tratamiento">Tratamiento</option>
                            <option value="enfermedad">Enfermedad</option>
                            <option value="revision">Revisión</option>
                            <option value="cirugia">Cirugía</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Veterinario</label>
                          <input
                            type="text"
                            value={formData.veterinario}
                            onChange={(e) => setFormData({...formData, veterinario: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ebedf2',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                            placeholder="Dr. Juan Pérez"
                          />
                        </div>
                      </div>
                      
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Descripción *</label>
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                          required
                          rows={3}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ebedf2',
                            borderRadius: '8px',
                            fontSize: '14px',
                            resize: 'vertical'
                          }}
                          placeholder="Descripción del evento sanitario..."
                        />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Tratamiento</label>
                          <input
                            type="text"
                            value={formData.tratamiento}
                            onChange={(e) => setFormData({...formData, tratamiento: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ebedf2',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                            placeholder="Medicamento aplicado, dosis..."
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Costo</label>
                          <input
                            type="number"
                            value={formData.costo}
                            onChange={(e) => setFormData({...formData, costo: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ebedf2',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Vacuna *</label>
                          <select
                            value={formData.vacuna}
                            onChange={(e) => setFormData({...formData, vacuna: e.target.value})}
                            required
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ebedf2',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          >
                            <option value="">Seleccionar vacuna</option>
                            <option value="triple">Triple (Cólera, Erisipela, Pasteurella)</option>
                            <option value="circovirus">Circovirus</option>
                            <option value="aftosa">Fiebre Aftosa</option>
                            <option value="aujeszky">Aujeszky</option>
                            <option value="parvovirus">Parvovirus</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Lote *</label>
                          <input
                            type="text"
                            value={formData.lote}
                            onChange={(e) => setFormData({...formData, lote: e.target.value})}
                            required
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ebedf2',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                            placeholder="Lote de la vacuna"
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Próxima Dosis</label>
                          <input
                            type="date"
                            value={formData.proxima_dosis}
                            onChange={(e) => setFormData({...formData, proxima_dosis: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ebedf2',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Responsable *</label>
                          <input
                            type="text"
                            value={formData.responsable}
                            onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                            required
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '1px solid #ebedf2',
                              borderRadius: '8px',
                              fontSize: '14px'
                            }}
                            placeholder="Nombre del responsable"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                      Guardar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
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
              onClick={() => setActiveTab('eventos')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'eventos' ? '#1572e8' : 'transparent',
                color: activeTab === 'eventos' ? '#ffffff' : '#6c757d',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-notes-medical" style={{ marginRight: '8px' }}></i>
              Eventos Sanitarios
            </button>
            <button
              onClick={() => setActiveTab('vacunas')}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === 'vacunas' ? '#1572e8' : 'transparent',
                color: activeTab === 'vacunas' ? '#ffffff' : '#6c757d',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-syringe" style={{ marginRight: '8px' }}></i>
              Vacunaciones
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
              Alertas Sanitarias
            </button>
          </div>

          {/* Contenido de Tabs */}
          {activeTab === 'eventos' && (
            <div>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1572e8' }}>{healthEvents.length}</div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>EVENTOS TOTALES</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#31ce36' }}>
                    {healthEvents.filter(e => e.tipo_evento === 'vacunacion').length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>VACUNACIONES</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffad46' }}>
                    {healthEvents.filter(e => e.tipo_evento === 'tratamiento').length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>TRATAMIENTOS</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#f25961' }}>
                    {healthEvents.filter(e => e.tipo_evento === 'enfermedad').length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>ENFERMEDADES</div>
                </div>
              </div>

              {/* Tabla de Eventos */}
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Animal</th>
                      <th>Tipo</th>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Veterinario</th>
                      <th>Costo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {healthEvents.map(event => (
                      <tr key={event.id}>
                        <td style={{ fontWeight: '600' }}>{event.animal_identificador}</td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: getEventTypeColor(event.tipo_evento),
                            color: '#ffffff',
                            textTransform: 'capitalize'
                          }}>
                            {event.tipo_evento}
                          </span>
                        </td>
                        <td>{new Date(event.fecha).toLocaleDateString()}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {event.descripcion}
                        </td>
                        <td>{event.veterinario || '-'}</td>
                        <td>{event.costo ? `$${event.costo.toLocaleString()}` : '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="btn btn-primary btn-sm" title="Ver">
                              <i className="fas fa-eye"></i>
                            </button>
                            <button className="btn btn-warning btn-sm" title="Editar">
                              <i className="fas fa-edit"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {healthEvents.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-medkit" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
                  <h5>No hay eventos sanitarios registrados</h5>
                  <p>Comienza registrando el primer evento sanitario</p>
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
                    Registrar Evento
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vacunas' && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              <i className="fas fa-syringe" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
              <h5>Calendario de Vacunaciones</h5>
              <p>Gestión de protocolos y alertas de vacunación - En desarrollo</p>
            </div>
          )}

          {activeTab === 'alertas' && (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                  <i className="fas fa-syringe" style={{ fontSize: '24px', color: '#ffad46' }}></i>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a2035' }}>Vacunaciones Pendientes</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>5 animales requieren vacunación triple en los próximos 7 días</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: '#f8d7da', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px', color: '#f25961' }}></i>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a2035' }}>Medicamentos Vencidos</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>2 medicamentos próximos a vencer en el inventario</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px', background: '#d1ecf1', borderRadius: '8px', border: '1px solid #bee5eb' }}>
                  <i className="fas fa-clock" style={{ fontSize: '24px', color: '#1572e8' }}></i>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a2035' }}>Período de Retiro</div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>3 animales en período de retiro por medicamentos</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Health;