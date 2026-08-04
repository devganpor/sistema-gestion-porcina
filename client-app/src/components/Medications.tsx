import React, { useState, useEffect } from 'react';
import api from '../services/authService';

// ── Interfaces ───────────────────────────────────────────────────────────────
interface Medication {
  id: number;
  nombre: string;
  tipo: string;
  unidad_medida: string;
  dias_retiro: number;
  dosis_recomendada: string;
  stock_disponible: number;
  total_lotes: number;
}

interface Lote {
  id: number;
  medicamento_id: number;
  numero_lote: string;
  cantidad_inicial: number;
  cantidad_actual: number;
  unidad_medida: string;
  costo_unitario: number;
  fecha_vencimiento: string | null;
  fecha_ingreso: string;
  proveedor: string | null;
  activo: boolean;
}

// ── Constantes ───────────────────────────────────────────────────────────────
const TIPOS = ['antibiotico','antiparasitario','vacuna','vitamina','hormona','analgesico','otro'];
const UNIDADES = ['ml','L','mg','g','kg','tableta','capsula','dosis','sobre','ampolla'];

const emptyMedForm = {
  nombre: '', tipo: 'antibiotico', unidad_medida: 'ml',
  dias_retiro: '0', dosis_recomendada: '',
};

const emptyLoteForm = {
  numero_lote: '', cantidad_inicial: '', unidad_medida: 'ml',
  costo_unitario: '', fecha_vencimiento: '',
  fecha_ingreso: new Date().toISOString().split('T')[0],
  proveedor: '',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null) => {
  if (!s) return '-';
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString();
};

const diasParaVencer = (s: string | null): number | null => {
  if (!s) return null;
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  const venc = new Date(y, m - 1, d);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((venc.getTime() - hoy.getTime()) / 86400000);
};

const vencColor = (dias: number | null) => {
  if (dias === null) return '#6c757d';
  if (dias < 0) return '#f25961';
  if (dias <= 30) return '#f25961';
  if (dias <= 60) return '#ffad46';
  return '#31ce36';
};

// ── Componente ───────────────────────────────────────────────────────────────
const Medications: React.FC = () => {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventario' | 'alertas'>('inventario');
  const [showModal, setShowModal] = useState(false);
  const [editingMedId, setEditingMedId] = useState<number | null>(null);
  const [editingMedNombre, setEditingMedNombre] = useState('');
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [editingLoteId, setEditingLoteId] = useState<number | null>(null);
  const [medForm, setMedForm] = useState(emptyMedForm);
  const [loteForm, setLoteForm] = useState(emptyLoteForm);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadMeds(); }, []);

  const loadMeds = async () => {
    try {
      const res = await api.get('/health/medications');
      setMeds(res.data);
    } catch { setError('Error cargando medicamentos'); }
    finally { setLoading(false); }
  };

  const loadLotes = async (medId: number) => {
    try {
      const res = await api.get(`/health/medications/${medId}/lots`);
      setLotes(res.data);
    } catch { setError('Error cargando lotes'); }
  };

  const showOk = (msg: string) => {
    setSuccess(msg); setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Medicamento CRUD ──
  const handleMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.nombre.trim()) { setError('El nombre es requerido'); return; }
    setSubmitting(true); setError('');
    try {
      const payload = {
        nombre: medForm.nombre, tipo: medForm.tipo,
        unidad_medida: medForm.unidad_medida,
        dias_retiro: parseInt(medForm.dias_retiro) || 0,
        dosis_recomendada: medForm.dosis_recomendada || null,
      };
      if (editingMedId) {
        await api.put(`/health/medications/${editingMedId}`, payload);
        setEditingMedNombre(medForm.nombre);
        showOk('Medicamento actualizado');
      } else {
        const res = await api.post('/health/medications', payload);
        setEditingMedId(res.data.id);
        setEditingMedNombre(medForm.nombre);
        await loadLotes(res.data.id);
        showOk('Medicamento creado — ahora puedes agregar lotes');
      }
      loadMeds();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error guardando medicamento');
    } finally { setSubmitting(false); }
  };

  const openModal = (m?: Medication) => {
    if (m) {
      setMedForm({
        nombre: m.nombre, tipo: m.tipo || 'antibiotico',
        unidad_medida: m.unidad_medida || 'ml',
        dias_retiro: m.dias_retiro?.toString() || '0',
        dosis_recomendada: m.dosis_recomendada || '',
      });
      setEditingMedId(m.id);
      setEditingMedNombre(m.nombre);
      loadLotes(m.id);
    } else {
      setMedForm(emptyMedForm);
      setEditingMedId(null);
      setEditingMedNombre('');
      setLotes([]);
    }
    setShowLoteForm(false);
    setEditingLoteId(null);
    setLoteForm(emptyLoteForm);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMedId(null);
    setEditingMedNombre('');
    setMedForm(emptyMedForm);
    setLotes([]);
    setShowLoteForm(false);
    setEditingLoteId(null);
    setLoteForm(emptyLoteForm);
    setError('');
  };

  const handleMedDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar "${nombre}" y todos sus lotes?`)) return;
    try {
      await api.delete(`/health/medications/${id}`);
      showOk('Medicamento eliminado'); loadMeds();
    } catch (err: any) { setError(err.response?.data?.error || 'Error eliminando'); }
  };

  // ── Lote CRUD ──
  const handleLoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedId) return;
    if (!loteForm.numero_lote.trim()) { setError('El número de lote es requerido'); return; }
    if (!loteForm.cantidad_inicial || parseFloat(loteForm.cantidad_inicial) <= 0) { setError('La cantidad debe ser mayor a 0'); return; }
    if (loteForm.costo_unitario === '' || parseFloat(loteForm.costo_unitario) < 0) { setError('El costo unitario es requerido'); return; }
    setSubmitting(true); setError('');
    try {
      const payload = {
        numero_lote: loteForm.numero_lote,
        cantidad_inicial: parseFloat(loteForm.cantidad_inicial),
        unidad_medida: loteForm.unidad_medida,
        costo_unitario: parseFloat(loteForm.costo_unitario),
        fecha_vencimiento: loteForm.fecha_vencimiento || null,
        fecha_ingreso: loteForm.fecha_ingreso,
        proveedor: loteForm.proveedor || null,
      };
      if (editingLoteId) {
        await api.put(`/health/medications/${editingMedId}/lots/${editingLoteId}`, {
          ...payload, cantidad_actual: parseFloat(loteForm.cantidad_inicial), activo: true,
        });
        showOk('Lote actualizado');
      } else {
        await api.post(`/health/medications/${editingMedId}/lots`, payload);
        showOk('Lote registrado');
      }
      setShowLoteForm(false); setEditingLoteId(null); setLoteForm(emptyLoteForm);
      loadLotes(editingMedId); loadMeds();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error guardando lote');
    } finally { setSubmitting(false); }
  };

  const handleLoteEdit = (l: Lote) => {
    setLoteForm({
      numero_lote: l.numero_lote,
      cantidad_inicial: l.cantidad_actual.toString(),
      unidad_medida: l.unidad_medida,
      costo_unitario: l.costo_unitario.toString(),
      fecha_vencimiento: l.fecha_vencimiento ? l.fecha_vencimiento.split('T')[0] : '',
      fecha_ingreso: l.fecha_ingreso ? l.fecha_ingreso.split('T')[0] : new Date().toISOString().split('T')[0],
      proveedor: l.proveedor || '',
    });
    setEditingLoteId(l.id); setShowLoteForm(true);
  };

  const handleLoteDelete = async (lotId: number) => {
    if (!editingMedId || !window.confirm('¿Eliminar este lote?')) return;
    try {
      await api.delete(`/health/medications/${editingMedId}/lots/${lotId}`);
      showOk('Lote eliminado'); loadLotes(editingMedId); loadMeds();
    } catch (err: any) { setError(err.response?.data?.error || 'Error eliminando lote'); }
  };

  // ── Helpers UI ──
  const inp = (extra?: any) => ({
    width: '100%', padding: '10px', border: '1px solid #ebedf2',
    borderRadius: '8px', fontSize: '14px', background: '#fff', ...extra,
  });

  const tabBtn = (tab: typeof activeTab, icon: string, label: string, badge?: number) => (
    <button key={tab} onClick={() => setActiveTab(tab)} style={{
      padding: '10px 18px', border: 'none', cursor: 'pointer', fontWeight: 600,
      borderRadius: '8px 8px 0 0',
      background: activeTab === tab ? '#1572e8' : 'transparent',
      color: activeTab === tab ? '#fff' : '#6c757d',
    }}>
      <i className={`fas ${icon}`} style={{ marginRight: 7 }} />{label}
      {badge != null && badge > 0 && (
        <span style={{ marginLeft: 6, background: '#f25961', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{badge}</span>
      )}
    </button>
  );

  const alertas = meds.filter(m => Number(m.stock_disponible) <= 0 || Number(m.total_lotes) === 0);

  if (loading) return (
    <div className="page-inner"><div className="card">
      <div style={{ padding: 40, textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: '#1572e8' }} />
        <p style={{ marginTop: 10, color: '#6c757d' }}>Cargando medicamentos...</p>
      </div>
    </div></div>
  );

  return (
    <div className="page-inner">
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}><i className="fas fa-check-circle" style={{ marginRight: 8 }} />{success}</div>}
      {error   && <div className="alert alert-danger"  style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />{error}</div>}

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h4 className="card-title"><i className="fas fa-pills" style={{ marginRight: 10 }} />Medicamentos</h4>
            {activeTab === 'inventario' && (
              <button className="btn btn-primary" onClick={() => openModal()}>
                <i className="fas fa-plus" style={{ marginRight: 8 }} />Nuevo Medicamento
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: 25 }}>
          {/* ── Tabs ── */}
          <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid #ebedf2', flexWrap: 'wrap' }}>
            {tabBtn('inventario', 'fa-boxes', 'Inventario')}
            {tabBtn('alertas', 'fa-bell', 'Alertas', alertas.length)}
          </div>

          {/* ══════════ TAB INVENTARIO ══════════ */}
          {activeTab === 'inventario' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'TOTAL', val: meds.length, color: '#1572e8' },
                  { label: 'SIN STOCK', val: meds.filter(m => Number(m.stock_disponible) <= 0).length, color: '#f25961' },
                  { label: 'CON LOTES', val: meds.filter(m => Number(m.total_lotes) > 0).length, color: '#31ce36' },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#f8f9fa', padding: 18, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.val}</div>
                    <div style={{ fontSize: 12, color: '#6c757d', fontWeight: 600 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th><th>Tipo</th><th>Unidad</th><th>Stock disponible</th>
                      <th>Lotes</th><th>Dosis recomendada</th><th>Días retiro</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meds.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                        <td><span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: '#e8f4fd', color: '#1572e8', textTransform: 'capitalize' }}>{m.tipo}</span></td>
                        <td>{m.unidad_medida}</td>
                        <td><span style={{ fontWeight: 700, color: Number(m.stock_disponible) <= 0 ? '#f25961' : '#31ce36' }}>{Number(m.stock_disponible).toFixed(2)} {m.unidad_medida}</span></td>
                        <td><span style={{ fontSize: 13, color: '#6c757d' }}>{m.total_lotes} lote{Number(m.total_lotes) !== 1 ? 's' : ''}</span></td>
                        <td>{m.dosis_recomendada || '-'}</td>
                        <td>{m.dias_retiro > 0 ? `${m.dias_retiro}d` : '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-primary btn-sm" title="Ver / Editar" onClick={() => openModal(m)}><i className="fas fa-edit" /></button>
                            <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => handleMedDelete(m.id, m.nombre)}><i className="fas fa-trash" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {meds.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                  <i className="fas fa-pills" style={{ fontSize: 48, marginBottom: 15, opacity: 0.4 }} />
                  <h5>No hay medicamentos registrados</h5>
                  <button className="btn btn-primary" onClick={() => openModal()}>
                    <i className="fas fa-plus" style={{ marginRight: 8 }} />Agregar Medicamento
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════ TAB ALERTAS ══════════ */}
          {activeTab === 'alertas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alertas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                  <i className="fas fa-shield-alt" style={{ fontSize: 48, marginBottom: 15, color: '#31ce36', opacity: 0.7 }} />
                  <h5 style={{ color: '#155724' }}>Todo en orden</h5>
                  <p>No hay alertas de medicamentos</p>
                </div>
              ) : alertas.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 10 }}>
                  <i className="fas fa-exclamation-triangle" style={{ fontSize: 28, color: '#f25961', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.nombre}</div>
                    <div style={{ fontSize: 13, color: '#6c757d', textTransform: 'capitalize' }}>{m.tipo} · {m.unidad_medida}</div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ background: '#f25961', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                        {Number(m.total_lotes) === 0 ? 'SIN LOTES' : 'SIN STOCK'}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => openModal(m)}>
                    <i className="fas fa-edit" style={{ marginRight: 5 }} />Ver / Editar
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ══════════ MODAL UNIFICADO ══════════ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '30px 16px', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 860, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>

            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #ebedf2' }}>
              <h5 style={{ margin: 0, fontWeight: 700 }}>
                <i className={`fas ${editingMedId ? 'fa-edit' : 'fa-plus'}`} style={{ marginRight: 10, color: '#1572e8' }} />
                {editingMedId ? `Editar: ${editingMedNombre}` : 'Nuevo Medicamento'}
              </h5>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6c757d' }}>×</button>
            </div>

            <div style={{ padding: 24 }}>
              {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />{error}</div>}
              {success && <div className="alert alert-success" style={{ marginBottom: 16 }}><i className="fas fa-check-circle" style={{ marginRight: 8 }} />{success}</div>}

              {/* ── Sección 1: Datos básicos ── */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1572e8', marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid #e8f4fd' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 8 }} />Datos del Medicamento
                </div>
                <form onSubmit={handleMedSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 13 }}>Nombre *</label>
                      <input type="text" value={medForm.nombre} onChange={e => setMedForm({ ...medForm, nombre: e.target.value })} style={inp()} placeholder="Ej: Amoxicilina 500mg" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 13 }}>Tipo</label>
                      <select value={medForm.tipo} onChange={e => setMedForm({ ...medForm, tipo: e.target.value })} style={inp()}>
                        {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 13 }}>Unidad de medida</label>
                      <select value={medForm.unidad_medida} onChange={e => setMedForm({ ...medForm, unidad_medida: e.target.value })} style={inp()}>
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 13 }}>Días de retiro</label>
                      <input type="number" min="0" value={medForm.dias_retiro} onChange={e => setMedForm({ ...medForm, dias_retiro: e.target.value })} style={inp()} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: 13 }}>Dosis recomendada</label>
                      <input type="text" value={medForm.dosis_recomendada} onChange={e => setMedForm({ ...medForm, dosis_recomendada: e.target.value })} style={inp()} placeholder="Ej: 1ml/10kg" />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-success" disabled={submitting}>
                    <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: 8 }} />
                    {submitting ? 'Guardando...' : (editingMedId ? 'Actualizar datos' : 'Guardar y continuar')}
                  </button>
                </form>
              </div>

              {/* ── Sección 2: Lotes (solo si ya existe el medicamento) ── */}
              {editingMedId && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid #e8f4fd' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1572e8' }}>
                      <i className="fas fa-layer-group" style={{ marginRight: 8 }} />Lotes de Inventario
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => { setShowLoteForm(v => !v); setEditingLoteId(null); setLoteForm(emptyLoteForm); }}>
                      <i className={`fas ${showLoteForm && !editingLoteId ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: 6 }} />
                      {showLoteForm && !editingLoteId ? 'Cancelar' : 'Nuevo Lote'}
                    </button>
                  </div>

                  {/* Formulario de lote */}
                  {showLoteForm && (
                    <form onSubmit={handleLoteSubmit} style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Nº Lote *</label>
                          <input type="text" value={loteForm.numero_lote} onChange={e => setLoteForm({ ...loteForm, numero_lote: e.target.value })} style={inp()} placeholder="LOT-2025-001" required />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Cantidad *</label>
                          <input type="number" step="0.001" min="0.001" value={loteForm.cantidad_inicial} onChange={e => setLoteForm({ ...loteForm, cantidad_inicial: e.target.value })} style={inp()} placeholder="0" required />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Unidad</label>
                          <select value={loteForm.unidad_medida} onChange={e => setLoteForm({ ...loteForm, unidad_medida: e.target.value })} style={inp()}>
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Costo unitario *</label>
                          <input type="number" step="0.0001" min="0" value={loteForm.costo_unitario} onChange={e => setLoteForm({ ...loteForm, costo_unitario: e.target.value })} style={inp()} placeholder="0.00" required />
                          {loteForm.cantidad_inicial && loteForm.costo_unitario && (
                            <small style={{ color: '#1572e8' }}>Total: ${(parseFloat(loteForm.cantidad_inicial) * parseFloat(loteForm.costo_unitario)).toFixed(2)}</small>
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Fecha ingreso</label>
                          <input type="date" value={loteForm.fecha_ingreso} onChange={e => setLoteForm({ ...loteForm, fecha_ingreso: e.target.value })} style={inp()} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Fecha vencimiento</label>
                          <input type="date" value={loteForm.fecha_vencimiento} onChange={e => setLoteForm({ ...loteForm, fecha_vencimiento: e.target.value })} style={inp()} />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Proveedor</label>
                          <input type="text" value={loteForm.proveedor} onChange={e => setLoteForm({ ...loteForm, proveedor: e.target.value })} style={inp()} placeholder="Nombre del proveedor" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-success btn-sm" disabled={submitting}>
                          <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: 6 }} />
                          {submitting ? 'Guardando...' : (editingLoteId ? 'Actualizar lote' : 'Registrar lote')}
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowLoteForm(false); setEditingLoteId(null); setLoteForm(emptyLoteForm); }}>Cancelar</button>
                      </div>
                    </form>
                  )}

                  {/* Tabla de lotes */}
                  {lotes.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Nº Lote</th><th>Disponible</th><th>Unidad</th>
                            <th>Costo unit.</th><th>Total</th><th>Vencimiento</th><th>Proveedor</th><th>Estado</th><th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lotes.map(l => {
                            const dias = diasParaVencer(l.fecha_vencimiento);
                            const vencido = dias !== null && dias < 0;
                            const agotado = l.cantidad_actual <= 0;
                            return (
                              <tr key={l.id} style={{ opacity: (!l.activo || vencido || agotado) ? 0.55 : 1 }}>
                                <td style={{ fontWeight: 600 }}>{l.numero_lote}</td>
                                <td><span style={{ fontWeight: 700, color: agotado ? '#f25961' : '#31ce36' }}>{Number(l.cantidad_actual).toFixed(3)}</span></td>
                                <td>{l.unidad_medida}</td>
                                <td>${Number(l.costo_unitario).toFixed(4)}</td>
                                <td>${(Number(l.cantidad_actual) * Number(l.costo_unitario)).toFixed(2)}</td>
                                <td>
                                  {l.fecha_vencimiento ? (
                                    <span style={{ padding: '2px 7px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: vencColor(dias) + '22', color: vencColor(dias) }}>
                                      {fmtDate(l.fecha_vencimiento)}{dias !== null && ` (${dias < 0 ? 'VENCIDO' : dias + 'd'})`}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td>{l.proveedor || '-'}</td>
                                <td>
                                  {vencido ? <span style={{ color: '#f25961', fontWeight: 700, fontSize: 11 }}>VENCIDO</span>
                                    : agotado ? <span style={{ color: '#f25961', fontWeight: 700, fontSize: 11 }}>AGOTADO</span>
                                    : <span style={{ color: '#31ce36', fontWeight: 700, fontSize: 11 }}>ACTIVO</span>}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-warning btn-sm" onClick={() => handleLoteEdit(l)}><i className="fas fa-edit" /></button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleLoteDelete(l.id)}><i className="fas fa-trash" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 24, color: '#6c757d', background: '#f8f9fa', borderRadius: 8 }}>
                      <i className="fas fa-layer-group" style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }} />
                      <p style={{ margin: 0 }}>No hay lotes registrados — agrega el primero</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pie del modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #ebedf2' }}>
                <button className="btn btn-secondary" onClick={closeModal}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medications;
