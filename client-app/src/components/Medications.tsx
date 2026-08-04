import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface Medication {
  id: number;
  nombre: string;
  tipo: string;
  dias_retiro: number;
  dosis_recomendada: string;
  stock_actual: number;
  fecha_vencimiento: string | null;
  costo_unitario: number;
}

interface Animal {
  id: number;
  identificador_unico: string;
  nombre: string;
}

const TIPOS = ['antibiotico', 'antiparasitario', 'vacuna', 'vitamina', 'hormona', 'analgesico', 'otro'];

const emptyForm = {
  nombre: '',
  tipo: 'antibiotico',
  dias_retiro: '0',
  dosis_recomendada: '',
  stock_actual: '0',
  fecha_vencimiento: '',
  costo_unitario: '0',
};

const emptyApply = {
  animal_id: '',
  medicamento_id: '',
  fecha: new Date().toISOString().split('T')[0],
  dosis_aplicada: '',
  descripcion: '',
  veterinario: '',
};

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

const vencimientoColor = (dias: number | null) => {
  if (dias === null) return '#6c757d';
  if (dias < 0) return '#f25961';
  if (dias <= 30) return '#f25961';
  if (dias <= 60) return '#ffad46';
  return '#31ce36';
};

const Medications: React.FC = () => {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventario' | 'aplicar' | 'alertas'>('inventario');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [applyData, setApplyData] = useState(emptyApply);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
    api.get('/animals?estado=activo').then(r => setAnimals(r.data)).catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get('/health/medications');
      setMeds(res.data);
    } catch { setError('Error cargando medicamentos'); }
    finally { setLoading(false); }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg); setError('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) { setError('El nombre es requerido'); return; }
    setSubmitting(true); setError('');
    try {
      const payload = {
        nombre: formData.nombre,
        tipo: formData.tipo,
        dias_retiro: parseInt(formData.dias_retiro) || 0,
        dosis_recomendada: formData.dosis_recomendada || null,
        stock_actual: parseFloat(formData.stock_actual) || 0,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        costo_unitario: parseFloat(formData.costo_unitario) || 0,
      };
      if (editingId) {
        await api.put(`/health/medications/${editingId}`, payload);
        showSuccess('Medicamento actualizado');
      } else {
        await api.post('/health/medications', payload);
        showSuccess('Medicamento creado');
      }
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error guardando medicamento');
    } finally { setSubmitting(false); }
  };

  const handleEdit = (m: Medication) => {
    setFormData({
      nombre: m.nombre,
      tipo: m.tipo || 'antibiotico',
      dias_retiro: m.dias_retiro?.toString() || '0',
      dosis_recomendada: m.dosis_recomendada || '',
      stock_actual: m.stock_actual?.toString() || '0',
      fecha_vencimiento: m.fecha_vencimiento ? m.fecha_vencimiento.split('T')[0] : '',
      costo_unitario: m.costo_unitario?.toString() || '0',
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      await api.delete(`/health/medications/${id}`);
      showSuccess('Medicamento eliminado');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error eliminando medicamento');
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyData.animal_id || !applyData.medicamento_id || !applyData.descripcion.trim()) {
      setError('Animal, medicamento y descripción son requeridos'); return;
    }
    setSubmitting(true); setError('');
    try {
      const med = meds.find(m => m.id === parseInt(applyData.medicamento_id));
      const dosisNum = parseFloat(applyData.dosis_aplicada);
      const costoAplicacion = (!isNaN(dosisNum) && dosisNum > 0 && med?.costo_unitario)
        ? dosisNum * med.costo_unitario
        : null;
      await api.post('/health/events', {
        animal_id: parseInt(applyData.animal_id),
        tipo_evento: 'tratamiento',
        fecha: applyData.fecha,
        descripcion: applyData.descripcion,
        tratamiento: `${med?.nombre || ''}${applyData.dosis_aplicada ? ` — ${applyData.dosis_aplicada}` : ''}`,
        veterinario: applyData.veterinario || null,
        costo: costoAplicacion,
      });
      // Descontar stock
      if (!isNaN(dosisNum) && dosisNum > 0) {
        await api.put(`/health/medications/${applyData.medicamento_id}`, {
          ...med,
          stock_actual: Math.max(0, (med?.stock_actual || 0) - dosisNum),
        });
      }
      showSuccess('Aplicación registrada exitosamente');
      setApplyData(emptyApply);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error registrando aplicación');
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setShowForm(false); setEditingId(null); setFormData(emptyForm);
  };

  const inp = (extra?: any) => ({
    width: '100%', padding: '10px', border: '1px solid #ebedf2',
    borderRadius: '8px', fontSize: '14px', ...extra,
  });

  const alertas = meds.filter(m => {
    const dias = diasParaVencer(m.fecha_vencimiento);
    return (dias !== null && dias <= 60) || m.stock_actual <= 0;
  });

  const tabBtn = (tab: typeof activeTab, icon: string, label: string, badge?: number) => (
    <button onClick={() => setActiveTab(tab)} style={{
      padding: '12px 20px', border: 'none', cursor: 'pointer', fontWeight: '600',
      borderRadius: '8px 8px 0 0', position: 'relative',
      background: activeTab === tab ? '#1572e8' : 'transparent',
      color: activeTab === tab ? '#fff' : '#6c757d',
    }}>
      <i className={`fas ${icon}`} style={{ marginRight: '8px' }}></i>{label}
      {badge != null && badge > 0 && (
        <span style={{ marginLeft: 6, background: '#f25961', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{badge}</span>
      )}
    </button>
  );

  if (loading) return (
    <div className="page-inner"><div className="card">
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
        <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando medicamentos...</p>
      </div>
    </div></div>
  );

  return (
    <div className="page-inner">
      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}><i className="fas fa-check-circle" style={{ marginRight: 8 }}></i>{success}</div>}
      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>{error}</div>}

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <h4 className="card-title">
              <i className="fas fa-pills" style={{ marginRight: 10 }}></i>Medicamentos
            </h4>
            <div style={{ display: 'flex', gap: 8 }}>
              {activeTab === 'inventario' && (
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
                  <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: 8 }}></i>
                  {showForm ? 'Cancelar' : 'Nuevo Medicamento'}
                </button>
              )}
              {activeTab === 'aplicar' && (
                <button className="btn btn-success" onClick={() => setApplyData(emptyApply)}>
                  <i className="fas fa-redo" style={{ marginRight: 8 }}></i>Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '25px' }}>

          {/* Formulario nuevo/editar */}
          {activeTab === 'inventario' && showForm && (
            <div className="card" style={{ marginBottom: 24, border: '1px solid #ebedf2' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className={`fas ${editingId ? 'fa-edit' : 'fa-plus'}`} style={{ marginRight: 8 }}></i>
                  {editingId ? 'Editar Medicamento' : 'Nuevo Medicamento'}
                </h5>
              </div>
              <div style={{ padding: 20 }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Nombre *</label>
                      <input type="text" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} style={inp()} placeholder="Ej: Amoxicilina 500mg" required />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Tipo</label>
                      <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} style={inp()}>
                        {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Stock actual</label>
                      <input type="number" step="0.01" value={formData.stock_actual} onChange={e => setFormData({ ...formData, stock_actual: e.target.value })} style={inp()} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Días de retiro</label>
                      <input type="number" value={formData.dias_retiro} onChange={e => setFormData({ ...formData, dias_retiro: e.target.value })} style={inp()} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Fecha vencimiento</label>
                      <input type="date" value={formData.fecha_vencimiento} onChange={e => setFormData({ ...formData, fecha_vencimiento: e.target.value })} style={inp()} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Dosis recomendada</label>
                      <input type="text" value={formData.dosis_recomendada} onChange={e => setFormData({ ...formData, dosis_recomendada: e.target.value })} style={inp()} placeholder="Ej: 1ml/10kg" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Costo unitario ($/unidad)</label>
                      <input type="number" step="0.01" min="0" value={formData.costo_unitario} onChange={e => setFormData({ ...formData, costo_unitario: e.target.value })} style={inp()} placeholder="0.00" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-success" disabled={submitting}>
                      <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: 8 }}></i>
                      {submitting ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid #ebedf2' }}>
            {tabBtn('inventario', 'fa-boxes', 'Inventario')}
            {tabBtn('aplicar', 'fa-syringe', 'Aplicar a Animal')}
            {tabBtn('alertas', 'fa-bell', 'Alertas', alertas.length)}
          </div>

          {/* ===== INVENTARIO ===== */}
          {activeTab === 'inventario' && (
            <div>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'TOTAL', val: meds.length, color: '#1572e8' },
                  { label: 'SIN STOCK', val: meds.filter(m => m.stock_actual <= 0).length, color: '#f25961' },
                  { label: 'POR VENCER', val: meds.filter(m => { const d = diasParaVencer(m.fecha_vencimiento); return d !== null && d >= 0 && d <= 60; }).length, color: '#ffad46' },
                  { label: 'VENCIDOS', val: meds.filter(m => { const d = diasParaVencer(m.fecha_vencimiento); return d !== null && d < 0; }).length, color: '#f25961' },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#f8f9fa', padding: '18px', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>{k.val}</div>
                    <div style={{ fontSize: 12, color: '#6c757d', fontWeight: 600 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th><th>Tipo</th><th>Stock</th><th>Dosis recomendada</th><th>Costo unit.</th><th>Días retiro</th><th>Vencimiento</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meds.map(m => {
                      const dias = diasParaVencer(m.fecha_vencimiento);
                      return (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600 }}>{m.nombre}</td>
                          <td>
                            <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: '#e8f4fd', color: '#1572e8', textTransform: 'capitalize' }}>
                              {m.tipo}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: m.stock_actual <= 0 ? '#f25961' : '#31ce36' }}>
                              {m.stock_actual}
                            </span>
                          </td>
                          <td>{m.dosis_recomendada || '-'}</td>
                          <td style={{ fontWeight: 600 }}>{m.costo_unitario > 0 ? `$${Number(m.costo_unitario).toFixed(2)}` : '-'}</td>
                          <td>{m.dias_retiro > 0 ? `${m.dias_retiro} días` : '-'}</td>
                          <td>
                            {m.fecha_vencimiento ? (
                              <span style={{ padding: '3px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: vencimientoColor(dias) + '22', color: vencimientoColor(dias) }}>
                                {fmtDate(m.fecha_vencimiento)}
                                {dias !== null && <span style={{ marginLeft: 4 }}>({dias < 0 ? 'VENCIDO' : `${dias}d`})</span>}
                              </span>
                            ) : '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-warning btn-sm" title="Editar" onClick={() => handleEdit(m)}><i className="fas fa-edit"></i></button>
                              <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => handleDelete(m.id, m.nombre)}><i className="fas fa-trash"></i></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {meds.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                  <i className="fas fa-pills" style={{ fontSize: 48, marginBottom: 15, opacity: 0.4 }}></i>
                  <h5>No hay medicamentos registrados</h5>
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: 8 }}></i>Agregar Medicamento
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ===== APLICAR A ANIMAL ===== */}
          {activeTab === 'aplicar' && (
            <div>
              <div style={{ background: '#f0f7ff', border: '1px solid #bee3f8', borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 14, color: '#1572e8' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
                  Registra la aplicación de un medicamento a un animal. Se creará un evento sanitario de tipo <strong>tratamiento</strong> y se descontará del stock si indicas la dosis aplicada.
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
                        const dias = diasParaVencer(m.fecha_vencimiento);
                        const vencido = dias !== null && dias < 0;
                        return (
                          <option key={m.id} value={m.id} disabled={vencido}>
                            {m.nombre} — Stock: {m.stock_actual}{vencido ? ' ⚠️ VENCIDO' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {applyData.medicamento_id && (() => {
                      const med = meds.find(m => m.id === parseInt(applyData.medicamento_id));
                      return med?.dosis_recomendada ? (
                        <small style={{ color: '#1572e8' }}>Dosis recomendada: {med.dosis_recomendada}</small>
                      ) : null;
                    })()}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Fecha *</label>
                    <input type="date" value={applyData.fecha} onChange={e => setApplyData({ ...applyData, fecha: e.target.value })} style={inp()} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Dosis aplicada <small style={{ color: '#888' }}>(descuenta stock)</small></label>
                    <input type="number" step="0.01" min="0" value={applyData.dosis_aplicada} onChange={e => setApplyData({ ...applyData, dosis_aplicada: e.target.value })} style={inp()} placeholder="Ej: 5" />
                    {applyData.medicamento_id && applyData.dosis_aplicada && (() => {
                      const med = meds.find(m => m.id === parseInt(applyData.medicamento_id));
                      const d = parseFloat(applyData.dosis_aplicada);
                      if (med?.costo_unitario && !isNaN(d) && d > 0) {
                        return <small style={{ color: '#31ce36', fontWeight: 600 }}>Costo estimado: ${(d * med.costo_unitario).toFixed(2)}</small>;
                      }
                      return null;
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
                  <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-syringe'}`} style={{ marginRight: 8 }}></i>
                  {submitting ? 'Registrando...' : 'Registrar Aplicación'}
                </button>
              </form>
            </div>
          )}

          {/* ===== ALERTAS ===== */}
          {activeTab === 'alertas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alertas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                  <i className="fas fa-shield-alt" style={{ fontSize: 48, marginBottom: 15, color: '#31ce36', opacity: 0.7 }}></i>
                  <h5 style={{ color: '#155724' }}>Todo en orden</h5>
                  <p>No hay alertas de medicamentos</p>
                </div>
              ) : alertas.map(m => {
                const dias = diasParaVencer(m.fecha_vencimiento);
                const vencido = dias !== null && dias < 0;
                const sinStock = m.stock_actual <= 0;
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 16, padding: 16,
                    background: vencido ? '#fff5f5' : sinStock ? '#fff8f0' : '#fffbf0',
                    border: `1px solid ${vencido ? '#fed7d7' : sinStock ? '#fbd38d' : '#feebc8'}`,
                    borderRadius: 10,
                  }}>
                    <i className={`fas ${vencido ? 'fa-times-circle' : sinStock ? 'fa-exclamation-triangle' : 'fa-clock'}`}
                      style={{ fontSize: 28, color: vencido ? '#f25961' : sinStock ? '#f25961' : '#ffad46', flexShrink: 0 }}></i>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{m.nombre}</div>
                      <div style={{ fontSize: 13, color: '#6c757d', textTransform: 'capitalize' }}>{m.tipo}</div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                        {vencido && (
                          <span style={{ background: '#f25961', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                            VENCIDO hace {Math.abs(dias!)} días ({fmtDate(m.fecha_vencimiento)})
                          </span>
                        )}
                        {!vencido && dias !== null && dias <= 60 && (
                          <span style={{ background: '#ffad46', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                            Vence en {dias} días ({fmtDate(m.fecha_vencimiento)})
                          </span>
                        )}
                        {sinStock && (
                          <span style={{ background: '#f25961', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                            SIN STOCK
                          </span>
                        )}
                        {m.dias_retiro > 0 && (
                          <span style={{ background: '#e8f4fd', color: '#1572e8', borderRadius: 10, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                            {m.dias_retiro} días retiro
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="btn btn-warning btn-sm" onClick={() => { handleEdit(m); setActiveTab('inventario'); }}>
                      <i className="fas fa-edit"></i>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Medications;
