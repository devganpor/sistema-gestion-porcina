import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface NominaRecord {
  id: number;
  empleado: string;
  cargo: string;
  periodo_inicio: string;
  periodo_fin: string;
  salario_base: number;
  bonificaciones: number;
  deducciones: number;
  total_pago: number;
  animal_id?: number;
  observaciones?: string;
  registrado_por_nombre?: string;
}

interface Resumen {
  total_pagado: number;
  cantidad_pagos: number;
  por_cargo: Array<{ cargo: string; total: number; cantidad: number }>;
}

const emptyForm = {
  empleado: '',
  cargo: '',
  periodo_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  periodo_fin: new Date().toISOString().split('T')[0],
  salario_base: '',
  bonificaciones: '0',
  deducciones: '0',
  total_pago: '',
  animal_id: '',
  observaciones: ''
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);

const Payroll: React.FC = () => {
  const [records, setRecords] = useState<NominaRecord[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [animals, setAnimals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [activeTab, setActiveTab] = useState('list');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [dateFilter, setDateFilter] = useState({
    fecha_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    fecha_fin: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { loadData(); }, [dateFilter]);

  // Calcular total automáticamente
  useEffect(() => {
    const base = parseFloat(form.salario_base) || 0;
    const bono = parseFloat(form.bonificaciones) || 0;
    const dedu = parseFloat(form.deducciones) || 0;
    setForm(f => ({ ...f, total_pago: (base + bono - dedu).toFixed(2) }));
  }, [form.salario_base, form.bonificaciones, form.deducciones]);

  const loadData = async () => {
    try {
      const [nominaRes, resumenRes, animalsRes] = await Promise.all([
        api.get(`/payroll?fecha_inicio=${dateFilter.fecha_inicio}&fecha_fin=${dateFilter.fecha_fin}`),
        api.get(`/payroll/summary?fecha_inicio=${dateFilter.fecha_inicio}&fecha_fin=${dateFilter.fecha_fin}`),
        api.get('/animals?estado=activo')
      ]);
      setRecords(nominaRes.data);
      setResumen(resumenRes.data);
      setAnimals(animalsRes.data);
    } catch {
      setError('Error cargando datos de nómina');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empleado || !form.cargo || !form.total_pago) {
      setError('Empleado, cargo y total de pago son requeridos');
      return;
    }
    try {
      const data = {
        ...form,
        salario_base: parseFloat(form.salario_base) || 0,
        bonificaciones: parseFloat(form.bonificaciones) || 0,
        deducciones: parseFloat(form.deducciones) || 0,
        total_pago: parseFloat(form.total_pago),
        animal_id: form.animal_id ? parseInt(form.animal_id) : null
      };
      if (editingId) {
        await api.put(`/payroll/${editingId}`, data);
        setSuccess('Nómina actualizada exitosamente');
      } else {
        await api.post('/payroll', data);
        setSuccess('Nómina registrada y gasto generado exitosamente');
      }
      resetForm();
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error guardando nómina');
    }
  };

  const handleEdit = (r: NominaRecord) => {
    setForm({
      empleado: r.empleado,
      cargo: r.cargo,
      periodo_inicio: r.periodo_inicio.split('T')[0],
      periodo_fin: r.periodo_fin.split('T')[0],
      salario_base: r.salario_base.toString(),
      bonificaciones: r.bonificaciones.toString(),
      deducciones: r.deducciones.toString(),
      total_pago: r.total_pago.toString(),
      animal_id: r.animal_id?.toString() || '',
      observaciones: r.observaciones || ''
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar este registro de nómina?')) return;
    try {
      await api.delete(`/payroll/${id}`);
      setSuccess('Registro eliminado');
      await loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Error eliminando registro');
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const tabStyle = (tab: string) => ({
    padding: '12px 24px',
    border: 'none',
    backgroundColor: activeTab === tab ? '#17a2b8' : '#f8f9fa',
    color: activeTab === tab ? 'white' : '#333',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginRight: '2px'
  });

  return (
    <div>
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>{success}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>{error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>👷 Gestión de Nómina</h1>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + Registrar Pago
        </button>
      </div>

      {/* Filtro de fechas */}
      <div className="card mb-3">
        <div className="d-flex align-items-center" style={{ gap: '15px' }}>
          <label>Período:</label>
          <input type="date" className="form-control" style={{ width: 'auto' }}
            value={dateFilter.fecha_inicio}
            onChange={e => setDateFilter({ ...dateFilter, fecha_inicio: e.target.value })} />
          <span>hasta</span>
          <input type="date" className="form-control" style={{ width: 'auto' }}
            value={dateFilter.fecha_fin}
            onChange={e => setDateFilter({ ...dateFilter, fecha_fin: e.target.value })} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <button style={tabStyle('list')} onClick={() => setActiveTab('list')}>📋 Registros</button>
        <button style={tabStyle('summary')} onClick={() => setActiveTab('summary')}>📊 Resumen</button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="card mb-3">
          <h3>{editingId ? '✏️ Editar Pago de Nómina' : '➕ Registrar Pago de Nómina'}</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>
            <i className="fas fa-info-circle"></i> El pago se registrará automáticamente como gasto en la categoría <strong>Nómina</strong>.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-3">
              <div className="form-group">
                <label>Empleado *</label>
                <input type="text" className="form-control" value={form.empleado}
                  onChange={e => setForm({ ...form, empleado: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Cargo *</label>
                <select className="form-control" value={form.cargo}
                  onChange={e => setForm({ ...form, cargo: e.target.value })} required>
                  <option value="">Seleccionar cargo</option>
                  <option value="Operario">Operario</option>
                  <option value="Veterinario">Veterinario</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Nutricionista">Nutricionista</option>
                  <option value="Auxiliar">Auxiliar</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Animal asociado (opcional)</label>
                <select className="form-control" value={form.animal_id}
                  onChange={e => setForm({ ...form, animal_id: e.target.value })}>
                  <option value="">Gasto general de granja</option>
                  {animals.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.identificador_unico} - {a.nombre || 'Sin nombre'} ({a.categoria})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Período inicio *</label>
                <input type="date" className="form-control" value={form.periodo_inicio}
                  onChange={e => setForm({ ...form, periodo_inicio: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Período fin *</label>
                <input type="date" className="form-control" value={form.periodo_fin}
                  onChange={e => setForm({ ...form, periodo_fin: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Salario base ($)</label>
                <input type="number" step="0.01" min="0" className="form-control" value={form.salario_base}
                  onChange={e => setForm({ ...form, salario_base: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Bonificaciones ($)</label>
                <input type="number" step="0.01" min="0" className="form-control" value={form.bonificaciones}
                  onChange={e => setForm({ ...form, bonificaciones: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Deducciones ($)</label>
                <input type="number" step="0.01" min="0" className="form-control" value={form.deducciones}
                  onChange={e => setForm({ ...form, deducciones: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Total a pagar ($) *</label>
                <input type="number" step="0.01" min="0" className="form-control"
                  value={form.total_pago}
                  onChange={e => setForm({ ...form, total_pago: e.target.value })}
                  style={{ fontWeight: 'bold', backgroundColor: '#f0fff4' }} required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 3' }}>
                <label>Observaciones</label>
                <input type="text" className="form-control" value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-success">
                💾 {editingId ? 'Actualizar' : 'Registrar'} Pago
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                ❌ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de registros */}
      {activeTab === 'list' && (
        <div className="card">
          <h3>Registros de Nómina ({records.length})</h3>
          {records.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Cargo</th>
                  <th>Período</th>
                  <th>Salario Base</th>
                  <th>Bonif.</th>
                  <th>Deduc.</th>
                  <th>Total Pagado</th>
                  <th>Animal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.empleado}</strong></td>
                    <td>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', backgroundColor: '#e3f2fd', color: '#1565c0' }}>
                        {r.cargo}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>
                      {new Date(r.periodo_inicio).toLocaleDateString()} — {new Date(r.periodo_fin).toLocaleDateString()}
                    </td>
                    <td>{formatCurrency(r.salario_base)}</td>
                    <td style={{ color: '#28a745' }}>+{formatCurrency(r.bonificaciones)}</td>
                    <td style={{ color: '#dc3545' }}>-{formatCurrency(r.deducciones)}</td>
                    <td style={{ fontWeight: 'bold', color: '#1565c0' }}>{formatCurrency(r.total_pago)}</td>
                    <td style={{ fontSize: '12px' }}>{r.animal_id ? `#${r.animal_id}` : 'General'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button className="btn btn-warning btn-sm" onClick={() => handleEdit(r)} title="Editar">
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)} title="Eliminar">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>👷</div>
              <p>No hay registros de nómina en el período</p>
            </div>
          )}
        </div>
      )}

      {/* Resumen */}
      {activeTab === 'summary' && resumen && (
        <div>
          <div className="grid grid-2 mb-3">
            <div className="card text-center">
              <h3 style={{ color: '#1565c0', fontSize: '32px', marginBottom: '10px' }}>
                {formatCurrency(resumen.total_pagado)}
              </h3>
              <p style={{ color: '#7f8c8d', fontWeight: '500' }}>Total Pagado en Nómina</p>
            </div>
            <div className="card text-center">
              <h3 style={{ color: '#333', fontSize: '32px', marginBottom: '10px' }}>
                {resumen.cantidad_pagos}
              </h3>
              <p style={{ color: '#7f8c8d', fontWeight: '500' }}>Pagos Realizados</p>
            </div>
          </div>
          <div className="card">
            <h3>Nómina por Cargo</h3>
            {resumen.por_cargo.length > 0 ? (
              resumen.por_cargo.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < resumen.por_cargo.length - 1 ? '1px solid #ecf0f1' : 'none'
                }}>
                  <span>{item.cargo} ({item.cantidad} pagos)</span>
                  <span style={{ fontWeight: 'bold', color: '#1565c0' }}>{formatCurrency(item.total)}</span>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>Sin datos en el período</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
