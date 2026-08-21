import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface HealthEvent {
  id: number;
  animal_id: number;
  animal_identificador: string;
  animal_nombre?: string;
  ubicacion_nombre?: string;
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
  animal_nombre?: string;
  ubicacion_nombre?: string;
  vacuna: string;
  fecha_aplicacion: string;
  lote?: string;
  proxima_dosis?: string;
  responsable?: string;
}

interface KPIs {
  por_tipo: Record<string, number>;
  eventos_mes: number;
  costo_total: number;
  costo_mes: number;
  proximas_vacunas: number;
  animales_en_tratamiento: number;
}

const TIPOS_EVENTO = ['vacunacion', 'desparasitacion', 'tratamiento', 'enfermedad', 'revision', 'cirugia'];
const TIPO_COLOR: Record<string, string> = {
  vacunacion: '#31ce36', desparasitacion: '#1572e8', tratamiento: '#ffad46',
  enfermedad: '#f25961', revision: '#6c757d', cirugia: '#6f42c1'
};
const TIPO_ICON: Record<string, string> = {
  vacunacion: 'fa-syringe', desparasitacion: 'fa-bug', tratamiento: 'fa-pills',
  enfermedad: 'fa-thermometer-half', revision: 'fa-stethoscope', cirugia: 'fa-cut'
};
const VACUNAS_COMUNES = [
  'Triple (Cólera, Erisipela, Pasteurella)', 'Circovirus', 'Fiebre Aftosa',
  'Aujeszky', 'Parvovirus', 'PRRS', 'Influenza Porcina', 'Mycoplasma'
];

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const str = typeof s === 'string' ? s : new Date(s as any).toISOString();
  const part = str.split('T')[0];
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('es-CO');
};

const fmtUSD = (n: number | null | undefined) => n ? `$${Number(n).toFixed(3)}` : '—';

const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
  width: '100%', padding: '8px 10px', border: '1px solid #dee2e6',
  borderRadius: '6px', fontSize: '13px', ...extra
});

const Health: React.FC = () => {
  const [healthEvents, setHealthEvents]     = useState<HealthEvent[]>([]);
  const [vaccinations, setVaccinations]     = useState<Vaccination[]>([]);
  const [animals, setAnimals]               = useState<any[]>([]);
  const [corrales, setCorrales]             = useState<any[]>([]);
  const [kpis, setKpis]                     = useState<KPIs | null>(null);
  const [upcomingVaccinations, setUpcoming] = useState<any[]>([]);
  const [expiringMeds, setExpiring]         = useState<any[]>([]);

  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState('');
  const [activeTab, setActiveTab]   = useState<'eventos'|'vacunas'|'alertas'>('eventos');

  // ── Filtros ──
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [filtroFechaIni, setFiltroFechaIni]   = useState(firstOfMonth);
  const [filtroFechaFin, setFiltroFechaFin]   = useState(today);
  const [filtroTipo, setFiltroTipo]           = useState('');
  const [filtroCorral, setFiltroCorral]       = useState('');
  const [filtroVacuna, setFiltroVacuna]       = useState('');
  const [busqueda, setBusqueda]               = useState('');

  // ── Formulario evento ──
  const emptyEvento = { animal_id: '', tipo_evento: 'tratamiento', fecha: today, descripcion: '', tratamiento: '', veterinario: '', costo: '' };
  const [showEventoForm, setShowEventoForm]   = useState(false);
  const [eventoForm, setEventoForm]           = useState(emptyEvento);
  const [editingEventoId, setEditingEventoId] = useState<number|null>(null);

  // ── Formulario vacuna ──
  const emptyVacuna = { animal_id: '', vacuna: '', fecha_aplicacion: today, lote: '', proxima_dosis: '', responsable: '' };
  const [showVacunaForm, setShowVacunaForm]   = useState(false);
  const [vacunaForm, setVacunaForm]           = useState(emptyVacuna);
  const [editingVacunaId, setEditingVacunaId] = useState<number|null>(null);

  // ── Registro masivo ──
  const [showMasivo, setShowMasivo]           = useState(false);
  const [masivoTipo, setMasivoTipo]           = useState<'evento'|'vacuna'>('vacuna');
  const [masivoCorral, setMasivoCorral]       = useState('');
  const [masivoSeleccion, setMasivoSeleccion] = useState<number[]>([]);
  const [masivoForm, setMasivoForm]           = useState({
    tipo_evento: 'vacunacion', fecha: today, descripcion: '', tratamiento: '', veterinario: '', costo: '',
    vacuna: '', lote: '', proxima_dosis: '', responsable: ''
  });

  // ── Carga inicial ──
  useEffect(() => {
    loadAll();
    api.get('/animals?estado=activo').then(r => setAnimals(r.data)).catch(() => {});
    api.get('/locations').then(r => setCorrales(r.data.filter((u: any) => ['corral','maternidad','aislamiento'].includes(u.tipo)))).catch(() => {});
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [kpisRes, upRes, expRes] = await Promise.all([
        api.get('/health/kpis').catch(() => ({ data: null })),
        api.get('/health/vaccinations/upcoming').catch(() => ({ data: [] })),
        api.get('/health/medications/expiring').catch(() => ({ data: [] }))
      ]);
      setKpis(kpisRes.data);
      setUpcoming(upRes.data);
      setExpiring(expRes.data);
    } catch {}
    finally { setLoading(false); }
  };

  const loadEventos = async () => {
    const params = new URLSearchParams();
    if (filtroFechaIni) params.append('fecha_inicio', filtroFechaIni);
    if (filtroFechaFin) params.append('fecha_fin', filtroFechaFin);
    if (filtroTipo)     params.append('tipo_evento', filtroTipo);
    if (filtroCorral)   params.append('ubicacion_id', filtroCorral);
    const res = await api.get(`/health/events?${params}`).catch(() => ({ data: [] }));
    setHealthEvents(res.data);
  };

  const loadVacunas = async () => {
    const params = new URLSearchParams();
    if (filtroFechaIni) params.append('fecha_inicio', filtroFechaIni);
    if (filtroFechaFin) params.append('fecha_fin', filtroFechaFin);
    if (filtroVacuna)   params.append('vacuna', filtroVacuna);
    if (filtroCorral)   params.append('ubicacion_id', filtroCorral);
    const res = await api.get(`/health/vaccinations?${params}`).catch(() => ({ data: [] }));
    setVaccinations(res.data);
  };

  useEffect(() => { if (activeTab === 'eventos') loadEventos(); }, [activeTab]); // eslint-disable-line
  useEffect(() => { if (activeTab === 'vacunas') loadVacunas(); }, [activeTab]); // eslint-disable-line

  const buscar = () => { if (activeTab === 'eventos') loadEventos(); else loadVacunas(); };

  // ── CRUD Evento ──
  const submitEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoForm.animal_id || !eventoForm.descripcion) { alert('Animal y descripción son requeridos'); return; }
    setSubmitting(true);
    try {
      const payload = {
        animal_id: parseInt(eventoForm.animal_id), tipo_evento: eventoForm.tipo_evento,
        fecha: eventoForm.fecha, descripcion: eventoForm.descripcion,
        tratamiento: eventoForm.tratamiento || null, veterinario: eventoForm.veterinario || null,
        costo: eventoForm.costo ? parseFloat(eventoForm.costo) : null
      };
      if (editingEventoId) await api.put(`/health/events/${editingEventoId}`, payload);
      else await api.post('/health/events', payload);
      setSuccess(editingEventoId ? 'Evento actualizado' : 'Evento registrado');
      setShowEventoForm(false); setEventoForm(emptyEvento); setEditingEventoId(null);
      loadEventos(); loadAll();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { alert(err.response?.data?.error || 'Error guardando evento'); }
    finally { setSubmitting(false); }
  };

  const editEvento = (ev: HealthEvent) => {
    setEventoForm({ animal_id: ev.animal_id.toString(), tipo_evento: ev.tipo_evento,
      fecha: ev.fecha?.split('T')[0] || today, descripcion: ev.descripcion || '',
      tratamiento: ev.tratamiento || '', veterinario: ev.veterinario || '',
      costo: ev.costo?.toString() || '' });
    setEditingEventoId(ev.id); setShowEventoForm(true);
  };

  const deleteEvento = async (id: number) => {
    if (!window.confirm('¿Eliminar este evento sanitario?')) return;
    await api.delete(`/health/events/${id}`).catch(() => alert('Error eliminando'));
    setSuccess('Evento eliminado'); loadEventos(); loadAll();
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── CRUD Vacuna ──
  const submitVacuna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacunaForm.animal_id || !vacunaForm.vacuna) { alert('Animal y vacuna son requeridos'); return; }
    setSubmitting(true);
    try {
      const payload = { animal_id: parseInt(vacunaForm.animal_id), vacuna: vacunaForm.vacuna,
        fecha_aplicacion: vacunaForm.fecha_aplicacion, lote: vacunaForm.lote || null,
        proxima_dosis: vacunaForm.proxima_dosis || null, responsable: vacunaForm.responsable || null };
      if (editingVacunaId) await api.put(`/health/vaccinations/${editingVacunaId}`, payload);
      else await api.post('/health/vaccinations', payload);
      setSuccess(editingVacunaId ? 'Vacunación actualizada' : 'Vacunación registrada');
      setShowVacunaForm(false); setVacunaForm(emptyVacuna); setEditingVacunaId(null);
      loadVacunas(); loadAll();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { alert(err.response?.data?.error || 'Error guardando vacunación'); }
    finally { setSubmitting(false); }
  };

  const editVacuna = (v: Vaccination) => {
    setVacunaForm({ animal_id: v.animal_id.toString(), vacuna: v.vacuna,
      fecha_aplicacion: v.fecha_aplicacion?.split('T')[0] || today,
      lote: v.lote || '', proxima_dosis: v.proxima_dosis?.split('T')[0] || '',
      responsable: v.responsable || '' });
    setEditingVacunaId(v.id); setShowVacunaForm(true);
  };

  const deleteVacuna = async (id: number) => {
    if (!window.confirm('¿Eliminar esta vacunación?')) return;
    await api.delete(`/health/vaccinations/${id}`).catch(() => alert('Error eliminando'));
    setSuccess('Vacunación eliminada'); loadVacunas(); loadAll();
    setTimeout(() => setSuccess(''), 3000);
  };

  // ── Registro masivo ──
  const animalesCorral = masivoCorral
    ? animals.filter(a => a.ubicacion_actual_id === parseInt(masivoCorral))
    : [];

  const toggleMasivoAnimal = (id: number) =>
    setMasivoSeleccion(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submitMasivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (masivoSeleccion.length === 0) { alert('Selecciona al menos un animal'); return; }
    setSubmitting(true);
    try {
      if (masivoTipo === 'vacuna') {
        if (!masivoForm.vacuna) { alert('Nombre de vacuna requerido'); setSubmitting(false); return; }
        const res = await api.post('/health/vaccinations/bulk', {
          animal_ids: masivoSeleccion, vacuna: masivoForm.vacuna,
          fecha_aplicacion: masivoForm.fecha, lote: masivoForm.lote || null,
          proxima_dosis: masivoForm.proxima_dosis || null, responsable: masivoForm.responsable || null
        });
        setSuccess(res.data.message);
        loadVacunas();
      } else {
        if (!masivoForm.descripcion) { alert('Descripción requerida'); setSubmitting(false); return; }
        const res = await api.post('/health/events/bulk', {
          animal_ids: masivoSeleccion, tipo_evento: masivoForm.tipo_evento,
          fecha: masivoForm.fecha, descripcion: masivoForm.descripcion,
          tratamiento: masivoForm.tratamiento || null, veterinario: masivoForm.veterinario || null,
          costo_por_animal: masivoForm.costo ? parseFloat(masivoForm.costo) : null
        });
        setSuccess(res.data.message);
        loadEventos();
      }
      setShowMasivo(false);
      setMasivoSeleccion([]);
      setMasivoCorral('');
      loadAll();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) { alert(err.response?.data?.error || 'Error en registro masivo'); }
    finally { setSubmitting(false); }
  };

  // ── Filtro búsqueda local ──
  const eventosFiltrados = healthEvents.filter(e =>
    !busqueda || e.animal_identificador?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.veterinario?.toLowerCase().includes(busqueda.toLowerCase())
  );
  const vacunasFiltradas = vaccinations.filter(v =>
    !busqueda || v.animal_identificador?.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.vacuna?.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.responsable?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const tabBtn = (tab: typeof activeTab, icon: string, label: string, badge?: number) => (
    <button onClick={() => setActiveTab(tab)} style={{
      padding: '10px 18px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
      borderBottom: activeTab === tab ? '3px solid #1572e8' : '3px solid transparent',
      background: 'transparent', color: activeTab === tab ? '#1572e8' : '#6c757d',
      display: 'flex', alignItems: 'center', gap: '6px'
    }}>
      <i className={`fas ${icon}`}></i>{label}
      {badge !== undefined && badge > 0 && (
        <span style={{ background: '#f25961', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>{badge}</span>
      )}
    </button>
  );

  if (loading) return (
    <div className="page-inner"><div className="card">
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
        <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando datos sanitarios...</p>
      </div>
    </div></div>
  );


  return (
    <div className="page-inner">

      {/* ── KPIs ── */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {[
            { label: 'Eventos este mes',      val: kpis.eventos_mes,             color: '#1572e8', icon: 'fa-notes-medical' },
            { label: 'En tratamiento',         val: kpis.animales_en_tratamiento, color: '#ffad46', icon: 'fa-pills' },
            { label: 'Vacunas próximas',       val: kpis.proximas_vacunas,        color: '#f25961', icon: 'fa-syringe' },
            { label: 'Costo sanitario mes',    val: fmtUSD(kpis.costo_mes),       color: '#20c997', icon: 'fa-dollar-sign' },
            { label: 'Costo sanitario total',  val: fmtUSD(kpis.costo_total),     color: '#6f42c1', icon: 'fa-chart-line' },
          ].map(k => (
            <div key={k.label} className="card">
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: k.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fas ${k.icon}`} style={{ color: k.color, fontSize: '16px' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: k.color, lineHeight: 1 }}>{k.val}</div>
                  <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '600', marginTop: '3px' }}>{k.label.toUpperCase()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Desglose por tipo ── */}
      {kpis?.por_tipo && Object.keys(kpis.por_tipo).length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {Object.entries(kpis.por_tipo).map(([tipo, cnt]) => (
            <span key={tipo} style={{ background: TIPO_COLOR[tipo] + '18', color: TIPO_COLOR[tipo], border: `1px solid ${TIPO_COLOR[tipo]}40`, borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600' }}>
              <i className={`fas ${TIPO_ICON[tipo] || 'fa-circle'}`} style={{ marginRight: '5px' }}></i>
              {tipo}: {cnt}
            </span>
          ))}
        </div>
      )}

      {success && (
        <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', color: '#155724', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-check-circle"></i>{success}
        </div>
      )}

      <div className="card">
        {/* ── Header con botones ── */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h4 className="card-title" style={{ margin: 0 }}>
            <i className="fas fa-medkit" style={{ marginRight: '8px', color: '#1572e8' }}></i>Sanidad y Salud Animal
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-info btn-sm" onClick={() => { setShowMasivo(!showMasivo); setShowEventoForm(false); setShowVacunaForm(false); }}>
              <i className="fas fa-layer-group" style={{ marginRight: '6px' }}></i>Registro masivo
            </button>
            <button className="btn btn-warning btn-sm" onClick={() => { setShowVacunaForm(!showVacunaForm); setShowEventoForm(false); setShowMasivo(false); setEditingVacunaId(null); setVacunaForm(emptyVacuna); }}>
              <i className="fas fa-syringe" style={{ marginRight: '6px' }}></i>Nueva vacuna
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowEventoForm(!showEventoForm); setShowVacunaForm(false); setShowMasivo(false); setEditingEventoId(null); setEventoForm(emptyEvento); }}>
              <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>Nuevo evento
            </button>
          </div>
        </div>

        <div style={{ padding: '20px' }}>

          {/* ── Formulario Evento Individual ── */}
          {showEventoForm && (
            <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '18px', marginBottom: '20px', border: '1px solid #c5d3f0' }}>
              <h6 style={{ margin: '0 0 14px', fontWeight: '700', color: '#1572e8' }}>
                <i className="fas fa-notes-medical" style={{ marginRight: '8px' }}></i>
                {editingEventoId ? 'Editar Evento Sanitario' : 'Nuevo Evento Sanitario'}
              </h6>
              <form onSubmit={submitEvento}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Animal *</label>
                    <select value={eventoForm.animal_id} onChange={e => setEventoForm({...eventoForm, animal_id: e.target.value})} style={inp()} required>
                      <option value="">— Seleccionar —</option>
                      {animals.map(a => <option key={a.id} value={a.id}>{a.identificador_unico}{a.nombre ? ` · ${a.nombre}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Tipo *</label>
                    <select value={eventoForm.tipo_evento} onChange={e => setEventoForm({...eventoForm, tipo_evento: e.target.value})} style={inp()} required>
                      {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Fecha *</label>
                    <input type="date" value={eventoForm.fecha} onChange={e => setEventoForm({...eventoForm, fecha: e.target.value})} style={inp()} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Veterinario</label>
                    <input type="text" value={eventoForm.veterinario} onChange={e => setEventoForm({...eventoForm, veterinario: e.target.value})} style={inp()} placeholder="Dr. Nombre" />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Costo ($)</label>
                    <input type="number" step="0.001" min="0" value={eventoForm.costo} onChange={e => setEventoForm({...eventoForm, costo: e.target.value})} style={inp()} placeholder="0.000" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Descripción *</label>
                    <input type="text" value={eventoForm.descripcion} onChange={e => setEventoForm({...eventoForm, descripcion: e.target.value})} style={inp()} placeholder="Descripción del evento..." required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Tratamiento / Medicamento</label>
                    <input type="text" value={eventoForm.tratamiento} onChange={e => setEventoForm({...eventoForm, tratamiento: e.target.value})} style={inp()} placeholder="Medicamento, dosis..." />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-success btn-sm" disabled={submitting}>
                    <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-check'}`} style={{ marginRight: '6px' }}></i>
                    {submitting ? 'Guardando...' : (editingEventoId ? 'Actualizar' : 'Guardar evento')}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowEventoForm(false); setEditingEventoId(null); setEventoForm(emptyEvento); }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* ── Formulario Vacuna Individual ── */}
          {showVacunaForm && (
            <div style={{ background: '#f0fff4', borderRadius: '10px', padding: '18px', marginBottom: '20px', border: '1px solid #b8e6c1' }}>
              <h6 style={{ margin: '0 0 14px', fontWeight: '700', color: '#31ce36' }}>
                <i className="fas fa-syringe" style={{ marginRight: '8px' }}></i>
                {editingVacunaId ? 'Editar Vacunación' : 'Nueva Vacunación'}
              </h6>
              <form onSubmit={submitVacuna}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Animal *</label>
                    <select value={vacunaForm.animal_id} onChange={e => setVacunaForm({...vacunaForm, animal_id: e.target.value})} style={inp()} required>
                      <option value="">— Seleccionar —</option>
                      {animals.map(a => <option key={a.id} value={a.id}>{a.identificador_unico}{a.nombre ? ` · ${a.nombre}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Vacuna *</label>
                    <input type="text" list="vacunas-list" value={vacunaForm.vacuna} onChange={e => setVacunaForm({...vacunaForm, vacuna: e.target.value})} style={inp()} placeholder="Nombre de la vacuna" required />
                    <datalist id="vacunas-list">{VACUNAS_COMUNES.map(v => <option key={v} value={v} />)}</datalist>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Fecha aplicación *</label>
                    <input type="date" value={vacunaForm.fecha_aplicacion} onChange={e => setVacunaForm({...vacunaForm, fecha_aplicacion: e.target.value})} style={inp()} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Lote</label>
                    <input type="text" value={vacunaForm.lote} onChange={e => setVacunaForm({...vacunaForm, lote: e.target.value})} style={inp()} placeholder="Nº lote" />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Próxima dosis</label>
                    <input type="date" value={vacunaForm.proxima_dosis} onChange={e => setVacunaForm({...vacunaForm, proxima_dosis: e.target.value})} style={inp()} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Responsable</label>
                    <input type="text" value={vacunaForm.responsable} onChange={e => setVacunaForm({...vacunaForm, responsable: e.target.value})} style={inp()} placeholder="Nombre responsable" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-success btn-sm" disabled={submitting}>
                    <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-check'}`} style={{ marginRight: '6px' }}></i>
                    {submitting ? 'Guardando...' : (editingVacunaId ? 'Actualizar' : 'Guardar vacuna')}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowVacunaForm(false); setEditingVacunaId(null); setVacunaForm(emptyVacuna); }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* ── Registro Masivo ── */}
          {showMasivo && (
            <div style={{ background: '#fff8e1', borderRadius: '10px', padding: '18px', marginBottom: '20px', border: '1px solid #ffe082' }}>
              <h6 style={{ margin: '0 0 14px', fontWeight: '700', color: '#f59f00' }}>
                <i className="fas fa-layer-group" style={{ marginRight: '8px' }}></i>Registro Masivo por Corral
              </h6>
              <form onSubmit={submitMasivo}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Tipo de registro</label>
                    <select value={masivoTipo} onChange={e => setMasivoTipo(e.target.value as any)} style={inp()}>
                      <option value="vacuna">Vacunación</option>
                      <option value="evento">Evento sanitario</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Corral / Ubicación</label>
                    <select value={masivoCorral} onChange={e => { setMasivoCorral(e.target.value); setMasivoSeleccion([]); }} style={inp()}>
                      <option value="">— Todos los animales —</option>
                      {corrales.map(c => <option key={c.id} value={c.id}>{c.nombre} ({Number(c.animales_actuales)} animales)</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Fecha *</label>
                    <input type="date" value={masivoForm.fecha} onChange={e => setMasivoForm({...masivoForm, fecha: e.target.value})} style={inp()} required />
                  </div>
                  {masivoTipo === 'vacuna' ? (<>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Vacuna *</label>
                      <input type="text" list="vacunas-list2" value={masivoForm.vacuna} onChange={e => setMasivoForm({...masivoForm, vacuna: e.target.value})} style={inp()} placeholder="Nombre vacuna" required />
                      <datalist id="vacunas-list2">{VACUNAS_COMUNES.map(v => <option key={v} value={v} />)}</datalist>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Lote</label>
                      <input type="text" value={masivoForm.lote} onChange={e => setMasivoForm({...masivoForm, lote: e.target.value})} style={inp()} placeholder="Nº lote" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Próxima dosis</label>
                      <input type="date" value={masivoForm.proxima_dosis} onChange={e => setMasivoForm({...masivoForm, proxima_dosis: e.target.value})} style={inp()} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Responsable</label>
                      <input type="text" value={masivoForm.responsable} onChange={e => setMasivoForm({...masivoForm, responsable: e.target.value})} style={inp()} placeholder="Nombre responsable" />
                    </div>
                  </>) : (<>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Tipo evento</label>
                      <select value={masivoForm.tipo_evento} onChange={e => setMasivoForm({...masivoForm, tipo_evento: e.target.value})} style={inp()}>
                        {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Descripción *</label>
                      <input type="text" value={masivoForm.descripcion} onChange={e => setMasivoForm({...masivoForm, descripcion: e.target.value})} style={inp()} placeholder="Descripción..." required />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Tratamiento</label>
                      <input type="text" value={masivoForm.tratamiento} onChange={e => setMasivoForm({...masivoForm, tratamiento: e.target.value})} style={inp()} placeholder="Medicamento, dosis..." />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Costo por animal ($)</label>
                      <input type="number" step="0.001" min="0" value={masivoForm.costo} onChange={e => setMasivoForm({...masivoForm, costo: e.target.value})} style={inp()} placeholder="0.000" />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Veterinario</label>
                      <input type="text" value={masivoForm.veterinario} onChange={e => setMasivoForm({...masivoForm, veterinario: e.target.value})} style={inp()} placeholder="Dr. Nombre" />
                    </div>
                  </>)}
                </div>

                {/* Selección de animales */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600' }}>
                      Animales ({masivoSeleccion.length} seleccionados de {(masivoCorral ? animalesCorral : animals).length})
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" className="btn btn-sm btn-outline-primary" style={{ fontSize: '11px', padding: '2px 10px' }}
                        onClick={() => setMasivoSeleccion((masivoCorral ? animalesCorral : animals).map((a: any) => a.id))}>
                        Todos
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" style={{ fontSize: '11px', padding: '2px 10px' }}
                        onClick={() => setMasivoSeleccion([])}>
                        Ninguno
                      </button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '6px', background: '#fff' }}>
                    {(masivoCorral ? animalesCorral : animals).map((a: any) => (
                      <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', background: masivoSeleccion.includes(a.id) ? '#e8f4fd' : 'transparent' }}>
                        <input type="checkbox" checked={masivoSeleccion.includes(a.id)} onChange={() => toggleMasivoAnimal(a.id)} />
                        <span style={{ fontWeight: '600', fontSize: '13px' }}>{a.identificador_unico}</span>
                        {a.nombre && <span style={{ color: '#6c757d', fontSize: '12px' }}>· {a.nombre}</span>}
                        {a.ubicacion_nombre && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6c757d' }}>{a.ubicacion_nombre}</span>}
                      </label>
                    ))}
                    {(masivoCorral ? animalesCorral : animals).length === 0 && (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6c757d', fontSize: '13px' }}>Sin animales en este corral</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="submit" className="btn btn-warning btn-sm" disabled={submitting || masivoSeleccion.length === 0}>
                    <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-check'}`} style={{ marginRight: '6px' }}></i>
                    {submitting ? 'Guardando...' : `Registrar en ${masivoSeleccion.length} animales`}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowMasivo(false); setMasivoSeleccion([]); }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}


          {/* ── Tabs ── */}
          <div style={{ display: 'flex', borderBottom: '2px solid #ebedf2', marginBottom: '16px', gap: '4px' }}>
            {tabBtn('eventos', 'fa-notes-medical', 'Eventos Sanitarios', healthEvents.length || undefined)}
            {tabBtn('vacunas', 'fa-syringe', 'Vacunaciones', vaccinations.length || undefined)}
            {tabBtn('alertas', 'fa-bell', 'Alertas', (upcomingVaccinations.length + expiringMeds.length) || undefined)}
          </div>

          {/* ── Filtros comunes ── */}
          {(activeTab === 'eventos' || activeTab === 'vacunas') && (
            <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '3px', color: '#6c757d' }}>DESDE</label>
                <input type="date" value={filtroFechaIni} onChange={e => setFiltroFechaIni(e.target.value)} style={{ ...inp(), width: '140px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '3px', color: '#6c757d' }}>HASTA</label>
                <input type="date" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)} style={{ ...inp(), width: '140px' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '3px', color: '#6c757d' }}>CORRAL</label>
                <select value={filtroCorral} onChange={e => setFiltroCorral(e.target.value)} style={{ ...inp(), width: '160px' }}>
                  <option value="">Todos</option>
                  {corrales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              {activeTab === 'eventos' && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '3px', color: '#6c757d' }}>TIPO</label>
                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...inp(), width: '150px' }}>
                    <option value="">Todos</option>
                    {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              )}
              {activeTab === 'vacunas' && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '3px', color: '#6c757d' }}>VACUNA</label>
                  <input type="text" value={filtroVacuna} onChange={e => setFiltroVacuna(e.target.value)} style={{ ...inp(), width: '150px' }} placeholder="Buscar vacuna..." />
                </div>
              )}
              <div>
                <label style={{ fontSize: '11px', fontWeight: '600', display: 'block', marginBottom: '3px', color: '#6c757d' }}>BÚSQUEDA</label>
                <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...inp(), width: '160px' }} placeholder="Animal, descripción..." />
              </div>
              <button className="btn btn-primary btn-sm" onClick={buscar}>
                <i className="fas fa-search" style={{ marginRight: '6px' }}></i>Buscar
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setFiltroFechaIni(firstOfMonth); setFiltroFechaFin(today); setFiltroTipo(''); setFiltroCorral(''); setFiltroVacuna(''); setBusqueda(''); }}>
                <i className="fas fa-times" style={{ marginRight: '6px' }}></i>Limpiar
              </button>
            </div>
          )}

          {/* ── Tab Eventos ── */}
          {activeTab === 'eventos' && (
            <div>
              {eventosFiltrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-notes-medical" style={{ fontSize: '40px', opacity: 0.3, marginBottom: '12px', display: 'block' }}></i>
                  <p>Sin eventos para los filtros seleccionados</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowEventoForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>Registrar evento
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th>Animal</th><th>Corral</th><th>Tipo</th><th>Fecha</th>
                        <th>Descripción</th><th>Tratamiento</th><th>Veterinario</th>
                        <th>Costo</th><th style={{ width: 80 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventosFiltrados.map(ev => (
                        <tr key={ev.id}>
                          <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                            {ev.animal_identificador}
                            {ev.animal_nombre && <div style={{ fontSize: '11px', color: '#6c757d' }}>{ev.animal_nombre}</div>}
                          </td>
                          <td style={{ fontSize: '12px', color: '#6c757d' }}>{ev.ubicacion_nombre || '—'}</td>
                          <td>
                            <span style={{ background: TIPO_COLOR[ev.tipo_evento] + '18', color: TIPO_COLOR[ev.tipo_evento], border: `1px solid ${TIPO_COLOR[ev.tipo_evento]}40`, borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                              <i className={`fas ${TIPO_ICON[ev.tipo_evento] || 'fa-circle'}`} style={{ marginRight: '4px' }}></i>
                              {ev.tipo_evento}
                            </span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(ev.fecha)}</td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ev.descripcion}>{ev.descripcion}</td>
                          <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6c757d' }} title={ev.tratamiento}>{ev.tratamiento || '—'}</td>
                          <td style={{ color: '#6c757d' }}>{ev.veterinario || '—'}</td>
                          <td style={{ fontWeight: '600', color: '#20c997', whiteSpace: 'nowrap' }}>{fmtUSD(ev.costo)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="btn btn-warning btn-sm" title="Editar" onClick={() => { editEvento(ev); setActiveTab('eventos'); }}>
                                <i className="fas fa-edit"></i>
                              </button>
                              <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => deleteEvento(ev.id)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f0f4ff', fontWeight: '700', fontSize: '12px' }}>
                        <td colSpan={7}>Total: {eventosFiltrados.length} eventos</td>
                        <td style={{ color: '#20c997' }}>
                          ${eventosFiltrados.reduce((s, e) => s + (Number(e.costo) || 0), 0).toFixed(3)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab Vacunas ── */}
          {activeTab === 'vacunas' && (
            <div>
              {vacunasFiltradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-syringe" style={{ fontSize: '40px', opacity: 0.3, marginBottom: '12px', display: 'block' }}></i>
                  <p>Sin vacunaciones para los filtros seleccionados</p>
                  <button className="btn btn-success btn-sm" onClick={() => setShowVacunaForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>Registrar vacunación
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th>Animal</th><th>Corral</th><th>Vacuna</th><th>Fecha aplicación</th>
                        <th>Lote</th><th>Próxima dosis</th><th>Responsable</th><th style={{ width: 80 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vacunasFiltradas.map(v => {
                        const vencida = v.proxima_dosis && new Date(v.proxima_dosis) < new Date();
                        const proxima = v.proxima_dosis && !vencida && (new Date(v.proxima_dosis).getTime() - Date.now()) < 7 * 86400000;
                        return (
                          <tr key={v.id}>
                            <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                              {v.animal_identificador}
                              {v.animal_nombre && <div style={{ fontSize: '11px', color: '#6c757d' }}>{v.animal_nombre}</div>}
                            </td>
                            <td style={{ fontSize: '12px', color: '#6c757d' }}>{v.ubicacion_nombre || '—'}</td>
                            <td style={{ fontWeight: '600' }}>
                              <span style={{ background: '#e8f4fd', color: '#1572e8', borderRadius: '10px', padding: '2px 8px', fontSize: '12px' }}>{v.vacuna}</span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(v.fecha_aplicacion)}</td>
                            <td style={{ color: '#6c757d' }}>{v.lote || '—'}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {v.proxima_dosis ? (
                                <span style={{ color: vencida ? '#f25961' : proxima ? '#ffad46' : '#31ce36', fontWeight: '600' }}>
                                  <i className={`fas ${vencida ? 'fa-exclamation-circle' : proxima ? 'fa-clock' : 'fa-check-circle'}`} style={{ marginRight: '4px' }}></i>
                                  {fmtDate(v.proxima_dosis)}
                                </span>
                              ) : '—'}
                            </td>
                            <td style={{ color: '#6c757d' }}>{v.responsable || '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-warning btn-sm" title="Editar" onClick={() => { editVacuna(v); setActiveTab('vacunas'); }}>
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => deleteVacuna(v.id)}>
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f0fff4', fontWeight: '700', fontSize: '12px' }}>
                        <td colSpan={8}>Total: {vacunasFiltradas.length} vacunaciones</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab Alertas ── */}
          {activeTab === 'alertas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {upcomingVaccinations.length > 0 ? (
                <div style={{ background: '#fff3cd', borderRadius: '10px', padding: '16px', border: '1px solid #ffe082' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <i className="fas fa-syringe" style={{ fontSize: '20px', color: '#ffad46' }}></i>
                    <strong style={{ color: '#856404' }}>Vacunaciones próximas — {upcomingVaccinations.length} pendientes</strong>
                  </div>
                  {upcomingVaccinations.map((v, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#856404', padding: '4px 0', borderBottom: i < upcomingVaccinations.length - 1 ? '1px solid #ffe08240' : 'none' }}>
                      <i className="fas fa-angle-right" style={{ marginRight: '6px' }}></i>
                      <strong>{v.identificador_unico}</strong> — {v.vacuna} · {fmtDate(v.proxima_dosis)}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#d4edda', borderRadius: '10px', padding: '14px', border: '1px solid #c3e6cb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-check-circle" style={{ color: '#31ce36', fontSize: '20px' }}></i>
                  <span style={{ color: '#155724', fontWeight: '600' }}>Vacunaciones al día — sin pendientes en los próximos 30 días</span>
                </div>
              )}

              {expiringMeds.length > 0 ? (
                <div style={{ background: '#f8d7da', borderRadius: '10px', padding: '16px', border: '1px solid #f5c6cb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '20px', color: '#f25961' }}></i>
                    <strong style={{ color: '#721c24' }}>Medicamentos por vencer — {expiringMeds.length} lotes</strong>
                  </div>
                  {expiringMeds.map((m, i) => (
                    <div key={i} style={{ fontSize: '13px', color: '#721c24', padding: '4px 0', borderBottom: i < expiringMeds.length - 1 ? '1px solid #f5c6cb40' : 'none' }}>
                      <i className="fas fa-angle-right" style={{ marginRight: '6px' }}></i>
                      <strong>{m.nombre}</strong> · Lote {m.numero_lote} · {m.cantidad_actual} {m.unidad_medida} · Vence: {fmtDate(m.fecha_vencimiento)}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#d4edda', borderRadius: '10px', padding: '14px', border: '1px solid #c3e6cb', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fas fa-check-circle" style={{ color: '#31ce36', fontSize: '20px' }}></i>
                  <span style={{ color: '#155724', fontWeight: '600' }}>Medicamentos en buen estado — ninguno vence en 60 días</span>
                </div>
              )}

              {upcomingVaccinations.length === 0 && expiringMeds.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px', color: '#31ce36' }}>
                  <i className="fas fa-shield-alt" style={{ fontSize: '48px', marginBottom: '10px', display: 'block' }}></i>
                  <strong>Todo en orden — sin alertas sanitarias activas</strong>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Health;
