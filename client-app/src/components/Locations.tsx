import React, { useState, useEffect } from 'react';
import api from '../services/authService';
import GalponView from './GalponView';

interface Ubicacion {
  id: number;
  nombre: string;
  tipo: string;
  capacidad_maxima: number;
  animales_actuales: number;
  secuencia: number | null;
  etiqueta: string | null;
  descripcion: string;
  granja_id: number | null;
  galpon_id: number | null;
  granja_nombre: string | null;
  galpon_nombre: string | null;
}

interface Animal {
  id: number;
  identificador_unico: string;
  nombre: string;
  categoria: string;
}

const fmtSeq = (n: number | null, fallback: number) =>
  String(n ?? fallback).padStart(4, '0');

const TIPO_NOMBRE: Record<string, string> = {
  granja:      'Granja',
  galpon:      'Galpon',
  corral:      'Corral',
  maternidad:  'Maternidad',
  aislamiento: 'Aislamiento',
};

const TIPOS = ['granja', 'galpon', 'corral', 'maternidad', 'aislamiento'];

const TIPO_LABELS: Record<string, string> = {
  granja: '🏢 Granjas',
  galpon: '🏠 Galpones',
  corral: '🚪 Corrales',
  maternidad: '🐣 Maternidad',
  aislamiento: '🔒 Aislamiento',
};

const Locations: React.FC = () => {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showMoveForm, setShowMoveForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    tipo: 'corral',
    capacidad_maxima: '',
    descripcion: '',
    etiqueta: '',
    secuencia: '',
    nombre_sugerido: '',
    granja_id: '',
    galpon_id: '',
  });
  const [moveData, setMoveData] = useState({
    animal_id: '',
    nueva_ubicacion_id: '',
    motivo: '',
  });
  const [loadingSeq, setLoadingSeq] = useState(false);
  const [galponView, setGalponView] = useState<Ubicacion | null>(null);

  useEffect(() => {
    loadUbicaciones();
    loadAnimals();
  }, []);

  // Cuando se abre el form de creación, cargar la secuencia sugerida
  useEffect(() => {
    if (showForm && !editingId) {
      fetchNextSequence(formData.tipo);
    }
  }, [showForm, editingId]); // eslint-disable-line

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

  const fetchNextSequence = async (tipo: string) => {
    setLoadingSeq(true);
    try {
      const res = await api.get(`/locations/next-sequence?tipo=${tipo}`);
      setFormData(prev => ({
        ...prev,
        secuencia: String(res.data.siguiente),
        nombre_sugerido: res.data.nombre_sugerido,
      }));
    } catch {
      // silencioso
    } finally {
      setLoadingSeq(false);
    }
  };

  const handleTipoChange = (tipo: string) => {
    setFormData(prev => ({ ...prev, tipo }));
    if (!editingId) fetchNextSequence(tipo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = {
        tipo: formData.tipo,
        capacidad_maxima: formData.capacidad_maxima ? parseInt(formData.capacidad_maxima) : null,
        descripcion: formData.descripcion || null,
        etiqueta: formData.etiqueta || null,
        granja_id: formData.granja_id ? parseInt(formData.granja_id) : null,
        galpon_id: formData.galpon_id ? parseInt(formData.galpon_id) : null,
      };
      if (editingId) {
        // Al editar sí se puede cambiar el nombre manualmente
        data.nombre = formData.nombre_sugerido;
        data.secuencia = formData.secuencia ? parseInt(formData.secuencia) : null;
        await api.put(`/locations/${editingId}`, data);
      } else {
        // Al crear, el nombre lo genera el servidor
        await api.post('/locations', data);
      }
      resetForm();
      loadUbicaciones();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error guardando ubicación');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ tipo: 'corral', capacidad_maxima: '', descripcion: '', etiqueta: '', secuencia: '', nombre_sugerido: '', granja_id: '', galpon_id: '' });
  };

  const handleEdit = (u: Ubicacion) => {
    setFormData({
      tipo: u.tipo || 'corral',
      capacidad_maxima: u.capacidad_maxima?.toString() || '',
      descripcion: u.descripcion || '',
      etiqueta: u.etiqueta || '',
      secuencia: u.secuencia?.toString() || '',
      nombre_sugerido: u.nombre,
      granja_id: u.granja_id?.toString() || '',
      galpon_id: u.galpon_id?.toString() || '',
    });
    setEditingId(u.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de eliminar esta ubicación?')) return;
    try {
      await api.delete(`/locations/${id}`);
      loadUbicaciones();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error eliminando ubicación');
    }
  };

  const handleMoveAnimal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/locations/move-animal', {
        animal_id: parseInt(moveData.animal_id),
        nueva_ubicacion_id: parseInt(moveData.nueva_ubicacion_id),
        motivo: moveData.motivo,
      });
      setShowMoveForm(false);
      setMoveData({ animal_id: '', nueva_ubicacion_id: '', motivo: '' });
      loadUbicaciones();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error moviendo animal');
    }
  };

  const getOcupacionColor = (ocupacion: number, capacidad: number) => {
    if (!capacidad) return '#95a5a6';
    const pct = (ocupacion / capacidad) * 100;
    if (pct >= 90) return '#e74c3c';
    if (pct >= 70) return '#f39c12';
    return '#27ae60';
  };

  const byTipo = (tipo: string) =>
    ubicaciones.filter(u => u.tipo === tipo);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Gestión de Ubicaciones</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-success" onClick={() => setShowMoveForm(!showMoveForm)}>
            {showMoveForm ? 'Cancelar' : 'Mover Animal'}
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
            {showForm ? 'Cancelar' : 'Nueva Ubicación'}
          </button>
        </div>
      </div>

      {/* Formulario Nueva / Editar Ubicación */}
      {showForm && (
        <div className="card mb-3">
          <h3>{editingId ? '✏️ Editar Ubicación' : '➕ Crear Nueva Ubicación'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-2">
              {/* Al crear: preview del nombre generado. Al editar: campo editable */}
              <div className="form-group">
                <label>Nombre:</label>
                {editingId ? (
                  <input
                    type="text"
                    className="form-control"
                    value={formData.nombre_sugerido}
                    onChange={e => setFormData({ ...formData, nombre_sugerido: e.target.value })}
                    required
                  />
                ) : (
                  <div style={{
                    padding: '8px 12px',
                    background: '#e8f4fd',
                    border: '1px solid #1572e8',
                    borderRadius: 6,
                    fontWeight: 700,
                    color: '#1572e8',
                    fontSize: 15,
                    letterSpacing: 1,
                  }}>
                    {loadingSeq ? 'Calculando...' : (formData.nombre_sugerido || `${TIPO_NOMBRE[formData.tipo]} 0001`)}
                    <small style={{ display: 'block', fontWeight: 400, color: '#666', fontSize: 11, marginTop: 2 }}>
                      Generado automáticamente
                    </small>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Tipo:</label>
                <select
                  className="form-control"
                  value={formData.tipo}
                  onChange={e => handleTipoChange(e.target.value)}
                  disabled={!!editingId}
                >
                  <option value="granja">Granja</option>
                  <option value="galpon">Galpón</option>
                  <option value="corral">Corral</option>
                  <option value="maternidad">Maternidad</option>
                  <option value="aislamiento">Aislamiento</option>
                </select>
              </div>
              <div className="form-group">
                <label>Capacidad Máxima:</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.capacidad_maxima}
                  onChange={e => setFormData({ ...formData, capacidad_maxima: e.target.value })}
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Etiqueta <small style={{color:'#888'}}>(opcional)</small>:</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.etiqueta}
                  onChange={e => setFormData({ ...formData, etiqueta: e.target.value })}
                  placeholder="Ej: Engorde, Lechones, Gestación..."
                  maxLength={100}
                />
              </div>
              {formData.tipo === 'galpon' && (
                <div className="form-group">
                  <label>Granja a la que pertenece:</label>
                  <select
                    className="form-control"
                    value={formData.granja_id}
                    onChange={e => setFormData({ ...formData, granja_id: e.target.value })}
                  >
                    <option value="">— Sin granja —</option>
                    {ubicaciones.filter(u => u.tipo === 'granja').map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}{u.etiqueta ? ` — ${u.etiqueta}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              {formData.tipo === 'corral' && (
                <div className="form-group">
                  <label>Galpón al que pertenece:</label>
                  <select
                    className="form-control"
                    value={formData.galpon_id}
                    onChange={e => setFormData({ ...formData, galpon_id: e.target.value })}
                  >
                    <option value="">— Sin galpón —</option>
                    {ubicaciones.filter(u => u.tipo === 'galpon').map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}{u.etiqueta ? ` — ${u.etiqueta}` : ''}{u.granja_nombre ? ` (${u.granja_nombre})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Descripción:</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción opcional"
                />
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
                  onChange={e => setMoveData({ ...moveData, animal_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar animal</option>
                  {animals.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.identificador_unico} - {a.nombre || 'Sin nombre'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nueva Ubicación:</label>
                <select
                  className="form-control"
                  value={moveData.nueva_ubicacion_id}
                  onChange={e => setMoveData({ ...moveData, nueva_ubicacion_id: e.target.value })}
                  required
                >
                  <option value="">Seleccionar ubicación</option>
                  {ubicaciones.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.secuencia ? `#${fmtSeq(u.secuencia, 0)} ` : ''}{u.nombre}{u.etiqueta ? ` — ${u.etiqueta}` : ''} ({u.tipo}) — {u.animales_actuales}/{u.capacidad_maxima || '∞'}
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
                  onChange={e => setMoveData({ ...moveData, motivo: e.target.value })}
                  placeholder="Ej: Cambio de etapa"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success">Mover Animal</button>
          </form>
        </div>
      )}

      {/* Lista por tipo */}
      <div className="grid grid-3">
        {TIPOS.map(tipo => {
          const lista = byTipo(tipo);
          if (tipo !== 'corral' && lista.length === 0) return null;
          return (
            <div key={tipo} className="card">
              <h3>
                {TIPO_LABELS[tipo]} ({lista.length})
              </h3>
              <div style={{ maxHeight: tipo === 'corral' ? '450px' : undefined, overflowY: tipo === 'corral' ? 'auto' : undefined }}>
                {lista.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                    No hay {tipo}s registrados
                  </p>
                ) : (
                  lista.map((u, idx) => (
                    <div
                      key={u.id}
                      style={{
                        padding: '10px 12px',
                        margin: '6px 0',
                        backgroundColor: tipo === 'aislamiento' ? '#fff3cd' : '#f8f9fa',
                        border: `1px solid ${tipo === 'aislamiento' ? '#ffeaa7' : '#dee2e6'}`,
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {/* Número de secuencia */}
                      {tipo === 'corral' && (
                        <span style={{
                          minWidth: 36,
                          height: 24,
                          borderRadius: 4,
                          background: '#1572e8',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                          letterSpacing: 1,
                          fontFamily: 'monospace',
                        }}>
                          {fmtSeq(u.secuencia, idx + 1)}
                        </span>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.nombre}
                        </div>
                        {u.etiqueta && (
                          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, background: '#e8f4fd', color: '#1572e8', borderRadius: 10, padding: '1px 8px', marginTop: 2, marginBottom: 2 }}>
                            {u.etiqueta}
                          </div>
                        )}
                        {u.tipo === 'corral' && (u.galpon_nombre || u.granja_nombre) && (
                          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                            {[u.granja_nombre, u.galpon_nombre].filter(Boolean).join(' › ')}
                          </div>
                        )}
                        {u.tipo === 'galpon' && u.granja_nombre && (
                          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{u.granja_nombre}</div>
                        )}
                        {(() => {
                          const animalesAgregados = u.tipo === 'granja'
                            ? ubicaciones.filter(x => x.tipo === 'galpon' && x.granja_id === u.id)
                                .reduce((s, g) => s + ubicaciones.filter(x => x.tipo === 'corral' && x.galpon_id === g.id)
                                  .reduce((ss, c) => ss + Number(c.animales_actuales), 0), 0)
                            : u.tipo === 'galpon'
                              ? ubicaciones.filter(x => x.tipo === 'corral' && x.galpon_id === u.id)
                                  .reduce((s, c) => s + Number(c.animales_actuales), 0)
                              : Number(u.animales_actuales);
                          return (
                            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                              {u.tipo !== 'corral' ? `${animalesAgregados} animales (total corrales)` :
                                u.capacidad_maxima
                                  ? `${u.animales_actuales}/${u.capacidad_maxima} · ${Math.round((Number(u.animales_actuales) / u.capacidad_maxima) * 100)}%`
                                  : `${u.animales_actuales} animales`
                              }
                            </div>
                          );
                        })()}
                      </div>

                      {/* Badge ocupación */}
                      {u.capacidad_maxima > 0 && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: getOcupacionColor(u.animales_actuales, u.capacidad_maxima),
                          color: '#fff',
                          flexShrink: 0,
                        }}>
                          {u.animales_actuales}/{u.capacidad_maxima}
                        </span>
                      )}

                      {/* Acciones */}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className="btn btn-warning btn-sm" onClick={() => handleEdit(u)} title="Editar">✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)} title="Eliminar">🗑️</button>
                        {u.tipo === 'galpon' && (
                          <button
                            className="btn btn-sm"
                            title="Ver plano del galpón"
                            style={{ background: '#6f42c1', color: 'white' }}
                            onClick={() => setGalponView(u)}
                          >
                            <i className="fas fa-th" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista 2D Galpón */}
      {galponView && (
        <GalponView
          galpon={galponView}
          corrales={ubicaciones.filter(u => u.tipo === 'corral' && u.galpon_id === galponView.id)}
          onClose={() => setGalponView(null)}
        />
      )}
    </div>
  );
};

export default Locations;
