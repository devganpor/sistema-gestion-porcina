import React, { useState, useEffect } from 'react';
import api from '../services/authService';

// ── Interfaces ──────────────────────────────────────────────────────────────
interface Medication {
  id: number;
  nombre: string;
  tipo: string;
  unidad_medida: string;
  dias_retiro: number;
  dosis_recomendada: string;
  stock_disponible: number;  // calculado desde lotes
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

interface Animal {
  id: number;
  identificador_unico: string;
  nombre: string;
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

const emptyApply = {
  animal_id: '', medicamento_id: '', fecha: new Date().toISOString().split('T')[0],
  dosis_aplicada: '', descripcion: '', veterinario: '',
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

// Costo estimado FIFO dado lotes disponibles y dosis solicitada
const calcCostoFIFO = (lotes: Lote[], dosis: number): number => {
  let restante = dosis;
  let costo = 0;
  const disponibles = [...lotes]
    .filter(l => l.activo && l.cantidad_actual > 0 && (diasParaVencer(l.fecha_vencimiento) === null || diasParaVencer(l.fecha_vencimiento)! >= 0))
    .sort((a, b) => {
      if (!a.fecha_vencimiento && !b.fecha_vencimiento) return 0;
      if (!a.fecha_vencimiento) return 1;
      if (!b.fecha_vencimiento) return -1;
      return a.fecha_vencimiento.localeCompare(b.fecha_vencimiento);
    });
  for (const l of disponibles) {
    if (restante <= 0) break;
    const usado = Math.min(l.cantidad_actual, restante);
    costo += usado * l.costo_unitario;
    restante -= usado;
  }
  return costo;
};

// ── Componente ───────────────────────────────────────────────────────────────
const Medications: React.FC = () => {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventario' | 'lotes' | 'aplicar' | 'alertas'>('inventario');
  const [showMedForm, setShowMedForm] = useState(false);
  const [editingMedId, setEditingMedId] = useState<number | null>(null);
  const [showLoteForm, setShowLoteForm] = useState(false);
  const [editingLoteId, setEditingLoteId] = useState<number | null>(null);
  const [medForm, setMedForm] = useState(emptyMedForm);
  const [loteForm, setLoteForm] = useState(emptyLoteForm);
  const [applyData, setApplyData] = useState(emptyApply);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMeds();
    api.get('/animals?estado=activo').then(r => setAnimals(r.data)).catch(() => {});
  }, []);

  const loadMeds = async () => {
    try {
      const res = await api.get('/health/medications');
      setMeds(res.data);
    } catch { setError('Error cargando medicamentos'); }
    finally { setLoading(false); }
  };

  const loadLotes = async (med: Medication) => {
    setSelectedMed(med);
    setActiveTab('lotes');
    try {
      const res = await api.get(`/health/medications/${med.id}/lots`);
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
        showOk('Medicamento actualizado');
      } else {
        await api.post('/health/medications', payload);
        showOk('Medicamento creado');
      }
      resetMedForm(); loadMeds();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error guardando medicamento');
    } finally { setSubmitting(false); }
  };

  const handleMedEdit = (m: Medication) => {
    setMedForm({
      nombre: m.nombre, tipo: m.tipo || 'antibiotico',
      unidad_medida: m.unidad_medida || 'ml',
      dias_retiro: m.dias_retiro?.toString() || '0',
      dosis_recomendada: m.dosis_recomendada || '',
    });
    setEditingMedId(m.id); setShowMedForm(true);
  };

  const handleMedDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar "${nombre}" y todos sus lotes?`)) return;
    try {
      await api.delete(`/health/medications/${id}`);
      showOk('Medicamento eliminado'); loadMeds();
      if (selectedMed?.id === id) { setSelectedMed(null); setActiveTab('inventario'); }
    } catch (err: any) { setError(err.response?.data?.error || 'Error eliminando'); }
  };

  const resetMedForm = () => { setShowMedForm(false); setEditingMedId(null); setMedForm(emptyMedForm); };

  // ── Lote CRUD ──
  const handleLoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMed) return;
    if (!loteForm.numero_lote.trim()) { setError('El número de lote es requerido'); return; }
    if (!loteForm.cantidad_inicial || parseFloat(loteForm.cantidad_inicial) <= 0) { setError('La cantidad debe ser mayor a 0'); return; }
    if (loteForm.costo_unitario === '' || parseFloat(loteForm.costo_unitario) < 0) { setError('El costo unitario es requerido'); return; }
    setSubmitting(true); setError('');
    try {
      const payload = {
        numero_lote: loteForm.numero_lote,
        cantidad_inicial: parseFloat(loteForm.cantidad_inicial),
        unidad_medida: loteForm.unidad_medida || selectedMed.unidad_medida,
        costo_unitario: parseFloat(loteForm.costo_unitario),
        fecha_vencimiento: loteForm.fecha_vencimiento || null,
        fecha_ingreso: loteForm.fecha_ingreso,
        proveedor: loteForm.proveedor || null,
      };
      if (editingLoteId) {
        await api.put(`/health/medications/${selectedMed.id}/lots/${editingLoteId}`, {
          ...payload, cantidad_actual: parseFloat(loteForm.cantidad_inicial), activo: true,
        });
        showOk('Lote actualizado');
      } else {
        await api.post(`/health/medications/${selectedMed.id}/lots`, payload);
        showOk('Lote registrado');
      }
      resetLoteForm(); loadLotes(selectedMed); loadMeds();
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
    if (!selectedMed || !window.confirm('¿Eliminar este lote?')) return;
    try {
      await api.delete(`/health/medications/${selectedMed.id}/lots/${lotId}`);
      showOk('Lote eliminado'); loadLotes(selectedMed); loadMeds();
    } catch (err: any) { setError(err.response?.data?.error || 'Error eliminando lote'); }
  };

  const resetLoteForm = () => { setShowLoteForm(false); setEditingLoteId(null); setLoteForm(emptyLoteForm); };

  // ── Aplicar ──
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyData.animal_id || !applyData.medicamento_id || !applyData.dosis_aplicada || !applyData.descripcion.trim()) {
      setError('Animal, medicamento, dosis y descripción son requeridos'); return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await api.post('/health/medications/apply', {
        animal_id: parseInt(applyData.animal_id),
        medicamento_id: parseInt(applyData.medicamento_id),
        fecha: applyData.fecha,
        dosis_aplicada: parseFloat(applyData.dosis_aplicada),
        descripcion: applyData.descripcion,
        veterinario: applyData.veterinario || null,
      });
      showOk(`Aplicación registrada — Costo: $${parseFloat(res.data.costo_total).toFixed(2)}`);
      setApplyData(emptyApply); loadMeds();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error registrando aplicación');
    } finally { setSubmitting(false); }
  };

  // ── Helpers UI ──
  const inp = (extra?: any) => ({
    width: '100%', padding: '10px', border: '1px solid #ebedf2',
    borderRadius: '8px', fontSize: '14px', ...extra,
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

  const alertas = meds.filter(m => {
    const lotesVenc = lotes.filter(l => l.medicamento_id === m.id);
    const minDias = lotesVenc.length
      ? Math.min(...lotesVenc.map(l => diasParaVencer(l.fecha_vencimiento) ?? 999))
      : null;
    return (minDias !== null && minDias <= 60) || Number(m.stock_disponible) <= 0;
  });

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
            <div style={{ display: 'flex', gap: 8 }}>
              {activeTab === 'inventario' && (
                <button className="btn btn-primary" onClick={() => { resetMedForm(); setShowMedForm(v => !v); }}>
                  <i className={`fas ${showMedForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: 8 }} />
                  {showMedForm ? 'Cancelar' : 'Nuevo Medicamento'}
                </button>
              )}
              {activeTab === 'lotes' && selectedMed && (
                <>
                  <button className="btn btn-secondary" onClick={() => { setActiveTab('inventario'); setSelectedMed(null); }}>
                    <i className="fas fa-arrow-left" style={{ marginRight: 8 }} />Volver
                  </button>
                  <button className="btn btn-primary" onClick={() => { resetLoteForm(); setShowLoteForm(v => !v); }}>
                    <i className={`fas ${showLoteForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: 8 }} />
                    {showLoteForm ? 'Cancelar' : 'Nuevo Lote'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: 25 }}>

          {/* ── Formulario Medicamento ── */}
          {activeTab === 'inventario' && showMedForm && (
            <div className="card" style={{ marginBottom: 24, border: '1px solid #ebedf2' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className={`fas ${editingMedId ? 'fa-edit' : 'fa-plus'}`} style={{ marginRight: 8 }} />
                  {editingMedId ? 'Editar Medicamento' : 'Nuevo Medicamento'}
                </h5>
              </div>
              <div style={{ padding: 20 }}>
                <form onSubmit={handleMedSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Nombre *</label>
                      <input type="text" value={medForm.nombre} onChange={e => setMedForm({ ...medForm, nombre: e.target.value })} style={inp()} placeholder="Ej: Amoxicilina 500mg" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Tipo</label>
                      <select value={medForm.tipo} onChange={e => setMedForm({ ...medForm, tipo: e.target.value })} style={inp()}>
                        {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Unidad de medida</label>
                      <select value={medForm.unidad_medida} onChange={e => setMedForm({ ...medForm, unidad_medida: e.target.value })} style={inp()}>
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Días de retiro</label>
                      <input type="number" min="0" value={medForm.dias_retiro} onChange={e => setMedForm({ ...medForm, dias_retiro: e.target.value })} style={inp()} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Dosis recomendada</label>
                      <input type="text" value={medForm.dosis_recomendada} onChange={e => setMedForm({ ...medForm, dosis_recomendada: e.target.value })} style={inp()} placeholder="Ej: 1ml/10kg" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-success" disabled={submitting}>
                      <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: 8 }} />
                      {submitting ? 'Guardando...' : (editingMedId ? 'Actualizar' : 'Guardar')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetMedForm}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Formulario Lote ── */}
          {activeTab === 'lotes' && showLoteForm && (
            <div className="card" style={{ marginBottom: 24, border: '1px solid #ebedf2' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className={`fas ${editingLoteId ? 'fa-edit' : 'fa-plus'}`} style={{ marginRight: 8 }} />
                  {editingLoteId ? 'Editar Lote' : 'Registrar Nuevo Lote'} — {selectedMed?.nombre}
                </h5>
              </div>
              <div style={{ padding: 20 }}>
                <form onSubmit={handleLoteSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Número de lote *</label>
                      <input type="text" value={loteForm.numero_lote} onChange={e => setLoteForm({ ...loteForm, numero_lote: e.target.value })} style={inp()} placeholder="Ej: LOT-2025-001" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Cantidad *</label>
                      <input type="number" step="0.001" min="0.001" value={loteForm.cantidad_inicial} onChange={e => setLoteForm({ ...loteForm, cantidad_inicial: e.target.value })} style={inp()} placeholder="0" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Unidad</label>
                      <select value={loteForm.unidad_medida} onChange={e => setLoteForm({ ...loteForm, unidad_medida: e.target.value })} style={inp()}>
                        {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Costo unitario ($/unidad) *</label>
                      <input type="number" step="0.0001" min="0" value={loteForm.costo_unitario} onChange={e => setLoteForm({ ...loteForm, costo_unitario: e.target.value })} style={inp()} placeholder="0.00" required />
                      {loteForm.cantidad_inicial && loteForm.costo_unitario && (
                        <small style={{ color: '#1572e8' }}>
                          Total lote: ${(parseFloat(loteForm.cantidad_inicial) * parseFloat(loteForm.costo_unitario)).toFixed(2)}
                        </small>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Fecha de ingreso</label>
                      <input type="date" value={loteForm.fecha_ingreso} onChange={e => setLoteForm({ ...loteForm, fecha_ingreso: e.target.value })} style={inp()} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Fecha de vencimiento</label>
                      <input type="date" value={loteForm.fecha_vencimiento} onChange={e => setLoteForm({ ...loteForm, fecha_vencimiento: e.target.value })} style={inp()} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Proveedor</label>
                      <input type="text" value={loteForm.proveedor} onChange={e => setLoteForm({ ...loteForm, proveedor: e.target.value })} style={inp()} placeholder="Nombre del proveedor" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-success" disabled={submitting}>
                      <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: 8 }} />
                      {submitting ? 'Guardando...' : (editingLoteId ? 'Actualizar' : 'Registrar Lote')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetLoteForm}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid #ebedf2', flexWrap: 'wrap' }}>
            {tabBtn('inventario', 'fa-boxes', 'Inventario')}
            {selectedMed && tabBtn('lotes', 'fa-layer-group', `Lotes — ${selectedMed.nombre}`)}
            {tabBtn('aplicar', 'fa-syringe', 'Aplicar a Animal')}
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
                        <td>
                          <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: '#e8f4fd', color: '#1572e8', textTransform: 'capitalize' }}>
                            {m.tipo}
                          </span>
                        </td>
                        <td>{m.unidad_medida}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: Number(m.stock_disponible) <= 0 ? '#f25961' : '#31ce36' }}>
                            {Number(m.stock_disponible).toFixed(2)} {m.unidad_medida}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm" style={{ background: '#e8f4fd', color: '#1572e8', fontWeight: 600 }} onClick={() => loadLotes(m)}>
                            <i className="fas fa-layer-group" style={{ marginRight: 5 }} />{m.total_lotes} lote{Number(m.total_lotes) !== 1 ? 's' : ''}
                          </button>
                        </td>
                        <td>{m.dosis_recomendada || '-'}</td>
                        <td>{m.dias_retiro > 0 ? `${m.dias_retiro}d` : '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-warning btn-sm" title="Editar" onClick={() => handleMedEdit(m)}><i className="fas fa-edit" /></button>
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
                  <button className="btn btn-primary" onClick={() => setShowMedForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: 8 }} />Agregar Medicamento
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════ TAB LOTES ══════════ */}
          {activeTab === 'lotes' && selectedMed && (
            <div>
              <div style={{ background: '#f0f7ff', border: '1px solid #bee3f8', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <span><strong>Medicamento:</strong> {selectedMed.nombre}</span>
                <span><strong>Tipo:</strong> {selectedMed.tipo}</span>
                <span><strong>Unidad:</strong> {selectedMed.unidad_medida}</span>
                <span><strong>Stock disponible:</strong> <span style={{ color: Number(selectedMed.stock_disponible) <= 0 ? '#f25961' : '#31ce36', fontWeight: 700 }}>{Number(selectedMed.stock_disponible).toFixed(2)} {selectedMed.unidad_medida}</span></span>
                {selectedMed.dosis_recomendada && <span><strong>Dosis recomendada:</strong> {selectedMed.dosis_recomendada}</span>}
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nº Lote</th><th>Cantidad inicial</th><th>Disponible</th><th>Unidad</th>
                      <th>Costo unit.</th><th>Total lote</th><th>Ingreso</th><th>Vencimiento</th><th>Proveedor</th><th>Estado</th><th>Acciones</th>
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
                          <td>{Number(l.cantidad_inicial).toFixed(2)}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: agotado ? '#f25961' : '#31ce36' }}>
                              {Number(l.cantidad_actual).toFixed(3)}
                            </span>
                          </td>
                          <td>{l.unidad_medida}</td>
                          <td>${Number(l.costo_unitario).toFixed(4)}</td>
                          <td style={{ fontWeight: 600 }}>${(Number(l.cantidad_actual) * Number(l.costo_unitario)).toFixed(2)}</td>
                          <td>{fmtDate(l.fecha_ingreso)}</td>
                          <td>
                            {l.fecha_vencimiento ? (
                              <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: vencColor(dias) + '22', color: vencColor(dias) }}>
                                {fmtDate(l.fecha_vencimiento)} {dias !== null && `(${dias < 0 ? 'VENCIDO' : dias + 'd'})`}
                              </span>
                            ) : '-'}
                          </td>
                          <td>{l.proveedor || '-'}</td>
                          <td>
                            {vencido ? <span style={{ color: '#f25961', fontWeight: 700, fontSize: 12 }}>VENCIDO</span>
                              : agotado ? <span style={{ color: '#f25961', fontWeight: 700, fontSize: 12 }}>AGOTADO</span>
                              : <span style={{ color: '#31ce36', fontWeight: 700, fontSize: 12 }}>ACTIVO</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-warning btn-sm" title="Editar" onClick={() => handleLoteEdit(l)}><i className="fas fa-edit" /></button>
                              <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => handleLoteDelete(l.id)}><i className="fas fa-trash" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {lotes.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                  <i className="fas fa-layer-group" style={{ fontSize: 48, marginBottom: 15, opacity: 0.4 }} />
                  <h5>No hay lotes registrados</h5>
                  <button className="btn btn-primary" onClick={() => setShowLoteForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: 8 }} />Registrar Primer Lote
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══════════ TAB APLICAR ══════════ */}
          {activeTab === 'aplicar' && (
            <div>
              <div style={{ background: '#f0f7ff', border: '1px solid #bee3f8', borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#1572e8' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
                  El costo se calcula automáticamente usando <strong>FIFO</strong> (lote con vencimiento más próximo primero) y se registra en el evento sanitario.
                </p>
              </div>
              <form onSubmit={handleApply}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Animal *</label>
                    <select value={applyData.animal_id} onChange={e => setApplyData({ ...applyData, animal_id: e.target.value })} style={inp()} required>
                      <option value="">Seleccionar animal</option>
                      {animals.map(a => <option key={a.id} value={a.id}>{a.identificador_unico}{a.nombre ? ` — ${a.nombre}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Medicamento *</label>
                    <select value={applyData.medicamento_id} onChange={e => setApplyData({ ...applyData, medicamento_id: e.target.value })} style={inp()} required>
                      <option value="">Seleccionar medicamento</option>
                      {meds.map(m => {
                        const sinStock = Number(m.stock_disponible) <= 0;
                        return (
                          <option key={m.id} value={m.id} disabled={sinStock}>
                            {m.nombre} — Stock: {Number(m.stock_disponible).toFixed(2)} {m.unidad_medida}{sinStock ? ' ⚠️ SIN STOCK' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {applyData.medicamento_id && (() => {
                      const med = meds.find(m => m.id === parseInt(applyData.medicamento_id));
                      return med?.dosis_recomendada
                        ? <small style={{ color: '#1572e8' }}>Dosis recomendada: {med.dosis_recomendada}</small>
                        : null;
                    })()}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Fecha *</label>
                    <input type="date" value={applyData.fecha} onChange={e => setApplyData({ ...applyData, fecha: e.target.value })} style={inp()} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>
                      Dosis aplicada * {applyData.medicamento_id && <small style={{ color: '#888' }}>({meds.find(m => m.id === parseInt(applyData.medicamento_id))?.unidad_medida})</small>}
                    </label>
                    <input type="number" step="0.001" min="0.001" value={applyData.dosis_aplicada} onChange={e => setApplyData({ ...applyData, dosis_aplicada: e.target.value })} style={inp()} placeholder="0" required />
                    {applyData.medicamento_id && applyData.dosis_aplicada && (() => {
                      const med = meds.find(m => m.id === parseInt(applyData.medicamento_id));
                      const dosis = parseFloat(applyData.dosis_aplicada);
                      if (!med || isNaN(dosis) || dosis <= 0) return null;
                      const stockDisp = Number(med.stock_disponible);
                      const sinStock = dosis > stockDisp;
                      // Para el preview de costo necesitamos los lotes del medicamento seleccionado
                      // Usamos los lotes cargados si coinciden, si no mostramos aviso de stock
                      const lotesDisp = lotes.filter(l => l.medicamento_id === med.id);
                      const costoEst = lotesDisp.length > 0 ? calcCostoFIFO(lotesDisp, dosis) : null;
                      return (
                        <div style={{ marginTop: 4 }}>
                          {sinStock && <small style={{ color: '#f25961', fontWeight: 700 }}>⚠ Stock insuficiente (disponible: {stockDisp.toFixed(2)})</small>}
                          {!sinStock && costoEst !== null && (
                            <small style={{ color: '#31ce36', fontWeight: 700 }}>
                              Costo estimado (FIFO): ${costoEst.toFixed(4)}
                            </small>
                          )}
                          {!sinStock && costoEst === null && (
                            <small style={{ color: '#ffad46' }}>
                              <i className="fas fa-layer-group" style={{ marginRight: 4 }} />
                              Ver lotes para calcular costo exacto
                            </small>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Veterinario / Responsable</label>
                    <input type="text" value={applyData.veterinario} onChange={e => setApplyData({ ...applyData, veterinario: e.target.value })} style={inp()} placeholder="Nombre" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Descripción / Motivo *</label>
                    <textarea value={applyData.descripcion} onChange={e => setApplyData({ ...applyData, descripcion: e.target.value })} rows={3} style={inp({ resize: 'vertical' })} placeholder="Motivo de la aplicación, síntomas observados..." required />
                  </div>
                </div>
                <button type="submit" className="btn btn-success" disabled={submitting}>
                  <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-syringe'}`} style={{ marginRight: 8 }} />
                  {submitting ? 'Registrando...' : 'Registrar Aplicación'}
                </button>
              </form>
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
              ) : meds.filter(m => Number(m.stock_disponible) <= 0 || Number(m.total_lotes) === 0).map(m => (
                <div key={`stock-${m.id}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 10 }}>
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
                  <button className="btn btn-primary btn-sm" onClick={() => loadLotes(m)}>
                    <i className="fas fa-layer-group" style={{ marginRight: 5 }} />Ver lotes
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Medications;
