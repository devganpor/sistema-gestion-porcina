import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../services/authService';

interface Diet {
  id: number;
  nombre: string;
  categoria_animal: string;
  costo_por_kg: number;
  proteina_porcentaje: number;
  energia_kcal: number;
  descripcion?: string;
}

interface Etapa {
  semana: number;
  alimento: string;
  dieta_id?: number | null;
  dieta_nombre?: string;
  cad_kg_animal: number;
  fecha_inicio: string;
  fecha_fin: string;
}

interface Plan {
  id: number;
  nombre: string;
  descripcion?: string;
  total_animales: number;
  kg_por_saco: number;
  fecha_inicio: string;
  total_etapas: number;
  total_dias: number;
}

interface DiaPlan {
  dia: number;
  fecha: string;
  semana: number;
  alimento: string;
  cad_kg_animal: number;
  total_animales: number;
  consumo_diario_total: number;
  sacos_diarios: number;
}

interface ResumenEtapa {
  semana: number;
  alimento: string;
  cad_kg_animal: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  consumo_total_kg: number;
  sacos_etapa: number;
}

const emptyForm = {
  nombre: '',
  categoria: 'lechon',
  costo_kg: '',
  proteina: '',
  energia: '',
  descripcion: ''
};

const emptyPlanForm = {
  nombre: '',
  descripcion: '',
  total_animales: '',
  kg_por_saco: '40',
  fecha_inicio: new Date().toISOString().split('T')[0]
};

// Convierte fecha de Excel a YYYY-MM-DD sin desfase de zona horaria
const excelDateToISO = (val: any): string => {
  if (!val) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (val instanceof Date) {
    // Usar partes locales para evitar desfase UTC
    return `${val.getFullYear()}-${pad(val.getMonth() + 1)}-${pad(val.getDate())}`;
  }
  if (typeof val === 'number') {
    // Serial Excel: sumar días desde 1900-01-01 sin pasar por UTC
    const d = new Date(1899, 11, 30 + Math.round(val));
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  // string tipo "31/7/2026" o "31-07-2026"
  const s = val.toString().trim();
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (c.length === 4) return `${c}-${pad(parseInt(b))}-${pad(parseInt(a))}`;
    return s;
  }
  return s;
};

// Parsea YYYY-MM-DD sin desfase de zona horaria
const parseDate = (s: string) => {
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

const NutritionComplete: React.FC = () => {
  // --- Dietas ---
  const [diets, setDiets] = useState<Diet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dietas');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState(emptyForm);

  // --- Registros ---
  const [registros, setRegistros] = useState<any[]>([]);
  const [corrales, setCorrales] = useState<any[]>([]);
  const [showFeedingForm, setShowFeedingForm] = useState(false);
  const [feedingLoading, setFeedingLoading] = useState(false);
  const [feedingForm, setFeedingForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    ubicacion_id: '',
    dieta_id: '',
    cantidad_kg: '',
    observaciones: ''
  });
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0]);
  const [filtroCorral, setFiltroCorral] = useState('');

  // --- Planes ---
  const [plans, setPlans] = useState<Plan[]>([]);
  const [todasEtapas, setTodasEtapas] = useState<Etapa[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planDetail, setPlanDetail] = useState<{ dias: DiaPlan[]; resumenEtapas: ResumenEtapa[] } | null>(null);
  const [planDetailTab, setPlanDetailTab] = useState<'dias' | 'resumen'>('resumen');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [planEtapas, setPlanEtapas] = useState<Etapa[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);

  // --- Carga masiva de plan ---
  const planFileRef = useRef<HTMLInputElement>(null);
  const [showBulkPlan, setShowBulkPlan] = useState(false);
  const [bulkEtapas, setBulkEtapas] = useState<Etapa[]>([]);
  const [bulkPlanMeta, setBulkPlanMeta] = useState({ total_animales: '', kg_por_saco: '40', fecha_inicio: '', nombre: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [dietsRes, plansRes, corralesRes] = await Promise.all([
        api.get('/nutrition/diets').catch(() => ({ data: [] })),
        api.get('/nutrition/plans').catch(() => ({ data: [] })),
        api.get('/locations').catch(() => ({ data: [] }))
      ]);
      setDiets(dietsRes.data);
      setPlans(plansRes.data);
      setCorrales(corralesRes.data.filter((u: any) => ['corral','maternidad','aislamiento'].includes(u.tipo)));
      // Cargar etapas de todos los planes para auto-calcular cantidad
      const etapasAll: Etapa[] = [];
      await Promise.all(plansRes.data.map(async (p: Plan) => {
        try {
          const r = await api.get(`/nutrition/plans/${p.id}`);
          etapasAll.push(...r.data.etapas.map((e: any) => ({
            ...e,
            fecha_inicio: e.fecha_inicio.split('T')[0],
            fecha_fin: e.fecha_fin.split('T')[0],
            cad_kg_animal: parseFloat(e.cad_kg_animal)
          })));
        } catch {}
      }));
      setTodasEtapas(etapasAll);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistros = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroFecha) { params.append('fecha_inicio', filtroFecha); params.append('fecha_fin', filtroFecha); }
      if (filtroCorral) params.append('ubicacion_id', filtroCorral);
      const res = await api.get(`/nutrition/feeding?${params.toString()}`);
      setRegistros(res.data);
    } catch { setRegistros([]); }
  };

  const handleFeedingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedingForm.ubicacion_id || !feedingForm.dieta_id || !feedingForm.cantidad_kg) {
      alert('Completa corral, dieta y cantidad'); return;
    }
    setFeedingLoading(true);
    try {
      const res = await api.post('/nutrition/feeding', {
        ubicacion_id: parseInt(feedingForm.ubicacion_id),
        dieta_id: parseInt(feedingForm.dieta_id),
        cantidad_kg: parseFloat(feedingForm.cantidad_kg),
        fecha_suministro: feedingForm.fecha,
        observaciones: feedingForm.observaciones || null
      });
      setSuccess(`✅ Alimentación registrada — ${res.data.animales_distribuidos} animales · ${res.data.kg_por_animal} kg/animal`);
      setShowFeedingForm(false);
      setFeedingForm({ fecha: new Date().toISOString().split('T')[0], ubicacion_id: '', dieta_id: '', cantidad_kg: '', observaciones: '' });
      loadRegistros();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error registrando alimentación');
    } finally { setFeedingLoading(false); }
  };

  // Auto-calcular cantidad cuando cambia corral o fecha usando etapas de planes
  useEffect(() => {
    if (!feedingForm.ubicacion_id || !feedingForm.fecha || todasEtapas.length === 0) return;
    const corral = corrales.find(c => c.id === parseInt(feedingForm.ubicacion_id));
    if (!corral) return;
    const animales = Number(corral.animales_actuales);
    if (animales === 0) return;
    const fechaSel = new Date(feedingForm.fecha + 'T00:00:00');
    const etapaActiva = todasEtapas.find(e => {
      const ini = new Date(e.fecha_inicio + 'T00:00:00');
      const fin = new Date(e.fecha_fin + 'T00:00:00');
      return fechaSel >= ini && fechaSel <= fin;
    });
    if (etapaActiva) {
      setFeedingForm(prev => ({ ...prev, cantidad_kg: (etapaActiva.cad_kg_animal * animales).toFixed(1) }));
    }
  }, [feedingForm.ubicacion_id, feedingForm.fecha, todasEtapas, corrales]); // eslint-disable-line

  const corralSeleccionado = corrales.find(c => c.id === parseInt(feedingForm.ubicacion_id));

  // Calcular costo estimado en tiempo real
  const costoEstimado = (() => {
    const dieta = diets.find(d => d.id === parseInt(feedingForm.dieta_id));
    const kg = parseFloat(feedingForm.cantidad_kg);
    if (!dieta || isNaN(kg)) return null;
    return (parseFloat(dieta.costo_por_kg as any) * kg).toFixed(2);
  })();

  // ---- Dietas ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: formData.nombre,
        categoria_animal: formData.categoria,
        costo_por_kg: formData.costo_kg ? parseFloat(formData.costo_kg) : 0,
        proteina_porcentaje: formData.proteina ? parseFloat(formData.proteina) : null,
        energia_kcal: formData.energia ? parseFloat(formData.energia) : null,
        descripcion: formData.descripcion
      };
      if (editingId) {
        await api.put(`/nutrition/diets/${editingId}`, payload);
        setSuccess('Dieta actualizada exitosamente');
      } else {
        await api.post('/nutrition/diets', payload);
        setSuccess('Dieta creada exitosamente');
      }
      resetForm();
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      alert('Error guardando dieta');
    }
  };

  const handleEdit = (diet: Diet) => {
    setFormData({
      nombre: diet.nombre,
      categoria: diet.categoria_animal || 'lechon',
      costo_kg: diet.costo_por_kg?.toString() || '',
      proteina: diet.proteina_porcentaje?.toString() || '',
      energia: diet.energia_kcal?.toString() || '',
      descripcion: diet.descripcion || ''
    });
    setEditingId(diet.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar la dieta "${nombre}"?`)) return;
    try {
      await api.delete(`/nutrition/diets/${id}`);
      setSuccess('Dieta eliminada exitosamente');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      alert('Error eliminando dieta');
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  // ---- Planes ----
  const loadPlanDetail = async (plan: Plan) => {
    setPlanLoading(true);
    setSelectedPlan(plan);
    try {
      const res = await api.get(`/nutrition/plans/${plan.id}`);
      setPlanDetail({ dias: res.data.dias, resumenEtapas: res.data.resumenEtapas });
    } catch { alert('Error cargando detalle del plan'); }
    finally { setPlanLoading(false); }
  };

  const handleDeletePlan = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar el plan "${nombre}"?`)) return;
    try {
      await api.delete(`/nutrition/plans/${id}`);
      setSuccess('Plan eliminado');
      setSelectedPlan(null); setPlanDetail(null);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch { alert('Error eliminando plan'); }
  };

  const handleEditPlan = async (plan: Plan) => {
    setPlanLoading(true);
    try {
      const res = await api.get(`/nutrition/plans/${plan.id}`);
      setPlanForm({
        nombre: plan.nombre,
        descripcion: plan.descripcion || '',
        total_animales: plan.total_animales.toString(),
        kg_por_saco: plan.kg_por_saco.toString(),
        fecha_inicio: plan.fecha_inicio.split('T')[0]
      });
      setPlanEtapas(res.data.etapas.map((e: any) => ({
        semana: e.semana,
        alimento: e.alimento || '',
        dieta_id: e.dieta_id || null,
        dieta_nombre: e.dieta_nombre || '',
        cad_kg_animal: parseFloat(e.cad_kg_animal),
        fecha_inicio: e.fecha_inicio.split('T')[0],
        fecha_fin: e.fecha_fin.split('T')[0]
      })));
      setEditingPlanId(plan.id);
      setShowPlanForm(true);
      setShowBulkPlan(false);
    } catch { alert('Error cargando plan'); }
    finally { setPlanLoading(false); }
  };

  const handleSavePlan = async () => {
    if (!planForm.nombre || !planForm.total_animales || !planForm.fecha_inicio || planEtapas.length === 0) {
      alert('Completa nombre, total animales, fecha inicio y al menos una etapa'); return;
    }
    setPlanLoading(true);
    const payload = {
      nombre: planForm.nombre,
      descripcion: planForm.descripcion || null,
      total_animales: parseInt(planForm.total_animales),
      kg_por_saco: parseFloat(planForm.kg_por_saco) || 40,
      fecha_inicio: planForm.fecha_inicio,
      etapas: planEtapas
    };
    try {
      if (editingPlanId) {
        await api.put(`/nutrition/plans/${editingPlanId}`, payload);
        setSuccess('Plan actualizado exitosamente');
      } else {
        await api.post('/nutrition/plans', payload);
        setSuccess('Plan creado exitosamente');
      }
      setShowPlanForm(false); setShowBulkPlan(false);
      setPlanForm(emptyPlanForm); setPlanEtapas([]);
      setEditingPlanId(null); setBulkEtapas([]);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch { alert('Error guardando plan'); }
    finally { setPlanLoading(false); }
  };

  // ---- Excel: descarga plantilla ----
  const downloadPlanTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['SEMANA', 'ALIMENTO', 'CAD_KG_ANIMAL', 'FECHA_INICIO', 'FECHA_FIN'],
      [1, 'CRECIMIENTO 1 HARINA', 1.45, '2026-07-31', '2026-08-06'],
      [2, 'CRECIMIENTO 1 HARINA', 1.65, '2026-08-07', '2026-08-13'],
      [3, 'CRECIMIENTO 1 HARINA', 1.75, '2026-08-14', '2026-08-20'],
      [4, 'CRECIMIENTO 1 HARINA', 1.90, '2026-08-21', '2026-08-27'],
      [5, 'CRECIMIENTO 1 HARINA', 2.05, '2026-08-28', '2026-09-03'],
      [6, 'CRECIMIENTO 2 HARINA', 2.15, '2026-09-04', '2026-09-10'],
      [7, 'CRECIMIENTO 2 HARINA', 2.30, '2026-09-11', '2026-09-17'],
      [8, 'CRECIMIENTO 2 HARINA', 2.45, '2026-09-18', '2026-09-24'],
      [9, 'CRECIMIENTO 2 HARINA', 2.55, '2026-09-25', '2026-10-01'],
      [10, 'FINALIZADOR HARINA', 2.70, '2026-10-02', '2026-10-08'],
      [11, 'FINALIZADOR HARINA', 2.80, '2026-10-09', '2026-10-15'],
      [12, 'FINALIZADOR HARINA', 2.90, '2026-10-16', '2026-10-22'],
      [13, 'FINALIZADOR HARINA', 3.00, '2026-10-23', '2026-10-29']
    ]);
    ws['!cols'] = [10, 25, 16, 14, 14].map(w => ({ wch: w }));
    const ref = XLSX.utils.aoa_to_sheet([
      ['CAMPO', 'DESCRIPCIÓN'],
      ['SEMANA', 'Número de semana (1, 2, 3...)'],
      ['ALIMENTO', 'Nombre del alimento (ej: CRECIMIENTO 1 HARINA)'],
      ['CAD_KG_ANIMAL', 'Consumo diario en kg por animal (ej: 1.45)'],
      ['FECHA_INICIO', 'Fecha de inicio de la etapa (YYYY-MM-DD)'],
      ['FECHA_FIN', 'Fecha de fin de la etapa (YYYY-MM-DD)']
    ]);
    ref['!cols'] = [16, 45].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Etapas');
    XLSX.utils.book_append_sheet(wb, ref, 'Referencia');
    XLSX.writeFile(wb, 'plantilla_plan_alimentacion.xlsx');
  };

  // ---- Excel: parsear archivo ----
  const handlePlanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const etapas: Etapa[] = rows
        .filter(r => r['SEMANA'] !== '' && r['CAD_KG_ANIMAL'] !== '')
        .map(r => ({
          semana: parseInt(r['SEMANA']),
          alimento: (r['ALIMENTO'] || '').toString().trim(),
          cad_kg_animal: parseFloat((r['CAD_KG_ANIMAL'] || '0').toString().replace(',', '.')),
          fecha_inicio: excelDateToISO(r['FECHA_INICIO']),
          fecha_fin:    excelDateToISO(r['FECHA_FIN'])
        }))
        .filter(e => !isNaN(e.semana) && !isNaN(e.cad_kg_animal) && e.fecha_inicio && e.fecha_fin);
      setBulkEtapas(etapas);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const tabBtn = (tab: string, icon: string, label: string) => (
    <button onClick={() => setActiveTab(tab)} style={{
      padding: '12px 20px', border: 'none', cursor: 'pointer', fontWeight: '600',
      borderRadius: '8px 8px 0 0',
      background: activeTab === tab ? '#1572e8' : 'transparent',
      color: activeTab === tab ? '#fff' : '#6c757d'
    }}>
      <i className={`fas ${icon}`} style={{ marginRight: '8px' }}></i>{label}
    </button>
  );

  const inp = (style?: any) => ({ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px', ...style });

  if (loading) return (
    <div className="page-inner"><div className="card">
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
        <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando nutrición...</p>
      </div>
    </div></div>
  );

  return (
    <div className="page-inner">
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>{success}
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h4 className="card-title">
              <i className="fas fa-seedling" style={{ marginRight: '10px' }}></i>
              Nutrición y Alimentación
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeTab === 'dietas' && (
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
                  <i className={`fas ${showForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
                  {showForm ? 'Cancelar' : 'Nueva Dieta'}
                </button>
              )}
              {activeTab === 'planes' && !selectedPlan && (
                <>
                  <button className="btn btn-success" onClick={() => { setShowBulkPlan(true); setShowPlanForm(false); setEditingPlanId(null); }}>
                    <i className="fas fa-file-excel" style={{ marginRight: '8px' }}></i>Cargar Excel
                  </button>
                  <button className="btn btn-primary" onClick={() => { setShowPlanForm(true); setShowBulkPlan(false); setPlanEtapas([]); setPlanForm(emptyPlanForm); setEditingPlanId(null); }}>
                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>Nuevo Plan
                  </button>
                </>
              )}
              {activeTab === 'registros' && (
                <button className="btn btn-success" onClick={() => setShowFeedingForm(v => !v)}>
                  <i className={`fas ${showFeedingForm ? 'fa-times' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
                  {showFeedingForm ? 'Cancelar' : 'Registrar Alimentación'}
                </button>
              )}
              {activeTab === 'planes' && selectedPlan && (
                <button className="btn btn-secondary" onClick={() => { setSelectedPlan(null); setPlanDetail(null); }}>
                  <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>Volver a Planes
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '25px' }}>

          {/* Formulario dieta */}
          {activeTab === 'dietas' && showForm && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className={`fas ${editingId ? 'fa-edit' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
                  {editingId ? 'Editar Dieta' : 'Nueva Dieta'}
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Nombre *</label>
                      <input type="text" value={formData.nombre} required onChange={e => setFormData({...formData, nombre: e.target.value})} style={inp()} placeholder="Ej: Iniciador Lechones" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Categoría Animal</label>
                      <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} style={inp()}>
                        <option value="lechon">Lechón</option>
                        <option value="recria">Recría</option>
                        <option value="desarrollo">Desarrollo</option>
                        <option value="engorde">Engorde</option>
                        <option value="reproductor">Reproductor</option>
                        <option value="gestacion">Gestación</option>
                        <option value="lactancia">Lactancia</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Costo por Kg ($)</label>
                      <input type="number" step="0.01" value={formData.costo_kg} onChange={e => setFormData({...formData, costo_kg: e.target.value})} style={inp()} placeholder="1500" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Proteína (%)</label>
                      <input type="number" step="0.1" value={formData.proteina} onChange={e => setFormData({...formData, proteina: e.target.value})} style={inp()} placeholder="18.5" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Energía (kcal/kg)</label>
                      <input type="number" step="1" value={formData.energia} onChange={e => setFormData({...formData, energia: e.target.value})} style={inp()} placeholder="3200" />
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Descripción / Ingredientes</label>
                    <textarea value={formData.descripcion} rows={3} onChange={e => setFormData({...formData, descripcion: e.target.value})} style={inp({ resize: 'vertical' })} placeholder="Maíz 60%, Soya 25%..." />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-success"><i className="fas fa-save" style={{ marginRight: '8px' }}></i>{editingId ? 'Actualizar' : 'Guardar'}</button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ebedf2' }}>
            {tabBtn('dietas', 'fa-utensils', 'Dietas')}
            {tabBtn('planes', 'fa-calendar-alt', 'Planes de Alimentación')}
            {tabBtn('registros', 'fa-clipboard-list', 'Registro Diario')}
          </div>

          {activeTab === 'dietas' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1572e8' }}>{diets.length}</div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>DIETAS REGISTRADAS</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#31ce36' }}>
                    {diets.length > 0 ? (diets.reduce((acc, d) => acc + (parseFloat(d.costo_por_kg as any) || 0), 0) / diets.length).toFixed(0) : 0}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>COSTO PROMEDIO/KG</div>
                </div>
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffad46' }}>
                    {new Set(diets.map(d => d.categoria_animal)).size}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>CATEGORÍAS</div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Costo/Kg</th>
                      <th>Proteína (%)</th>
                      <th>Energía (kcal/kg)</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diets.map(diet => (
                      <tr key={diet.id}>
                        <td style={{ fontWeight: '600' }}>{diet.nombre}</td>
                        <td>
                          <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', background: '#6c757d', color: '#fff', textTransform: 'capitalize' }}>
                            {diet.categoria_animal || '-'}
                          </span>
                        </td>
                        <td>${parseFloat(diet.costo_por_kg as any || 0).toLocaleString()}</td>
                        <td>{diet.proteina_porcentaje != null ? `${diet.proteina_porcentaje}%` : '-'}</td>
                        <td>{diet.energia_kcal != null ? diet.energia_kcal : '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button className="btn btn-warning btn-sm" title="Editar" onClick={() => handleEdit(diet)}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => handleDelete(diet.id, diet.nombre)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {diets.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-seedling" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
                  <h5>No hay dietas registradas</h5>
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>Crear Dieta
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============ TAB PLANES ============ */}
          {activeTab === 'planes' && (
            <div>

              {/* --- Formulario carga Excel --- */}
              {showBulkPlan && !selectedPlan && (
                <div className="card" style={{ marginBottom: '20px', border: '1px solid #c3e6cb' }}>
                  <div className="card-header" style={{ background: '#d4edda' }}>
                    <h5 className="card-title" style={{ color: '#155724', margin: 0 }}>
                      <i className="fas fa-file-excel" style={{ marginRight: '8px' }}></i>Cargar Plan desde Excel
                    </h5>
                  </div>
                  <div style={{ padding: '20px' }}>
                    {/* Paso 1 */}
                    <div style={{ background: '#f0f7ff', border: '1px solid #bee3f8', borderRadius: '8px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', color: '#1a2035' }}><i className="fas fa-download" style={{ marginRight: '8px', color: '#1572e8' }}></i>Paso 1 — Descarga la plantilla</div>
                        <div style={{ fontSize: '13px', color: '#6c757d' }}>Columnas: SEMANA, ALIMENTO, CAD_KG_ANIMAL, FECHA_INICIO, FECHA_FIN</div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={downloadPlanTemplate}>
                        <i className="fas fa-file-download" style={{ marginRight: '6px' }}></i>Descargar Plantilla
                      </button>
                    </div>

                    {/* Paso 2 */}
                    <div style={{ background: '#f8f9fa', border: '2px dashed #dee2e6', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                      <div style={{ fontWeight: '700', color: '#1a2035', marginBottom: '8px' }}><i className="fas fa-upload" style={{ marginRight: '8px', color: '#ffad46' }}></i>Paso 2 — Sube tu archivo Excel</div>
                      <input ref={planFileRef} type="file" accept=".xlsx,.xls" onChange={handlePlanFileChange} style={{ display: 'none' }} />
                      <button className="btn btn-warning btn-sm" onClick={() => planFileRef.current?.click()}>
                        <i className="fas fa-folder-open" style={{ marginRight: '6px' }}></i>Seleccionar Archivo
                      </button>
                      {bulkEtapas.length > 0 && (
                        <div style={{ marginTop: '10px', color: '#155724', fontWeight: '600' }}>
                          <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>{bulkEtapas.length} etapas detectadas
                        </div>
                      )}
                    </div>

                    {/* Preview etapas */}
                    {bulkEtapas.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#1a2035' }}>Vista previa de etapas:</div>
                        <div className="table-responsive">
                          <table className="table" style={{ fontSize: '13px' }}>
                            <thead><tr><th>Semana</th><th>Alimento</th><th>CAD kg/animal</th><th>Fecha inicio</th><th>Fecha fin</th><th>Días</th></tr></thead>
                            <tbody>
                              {bulkEtapas.map((e, i) => (
                                <tr key={i}>
                                  <td>{e.semana}</td>
                                  <td>{e.alimento}</td>
                                  <td style={{ fontWeight: '600', color: '#1572e8' }}>{e.cad_kg_animal}</td>
                                  <td>{e.fecha_inicio}</td>
                                  <td>{e.fecha_fin}</td>
                                  <td>{Math.round((parseDate(e.fecha_fin).getTime() - parseDate(e.fecha_inicio).getTime()) / 86400000) + 1}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Paso 3: datos del plan */}
                    {bulkEtapas.length > 0 && (
                      <div style={{ background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                        <div style={{ fontWeight: '700', color: '#856404', marginBottom: '12px' }}><i className="fas fa-cog" style={{ marginRight: '8px' }}></i>Paso 3 — Configura el plan</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Nombre del plan *</label>
                            <input type="text" value={bulkPlanMeta.nombre} onChange={e => setBulkPlanMeta({...bulkPlanMeta, nombre: e.target.value})} style={inp()} placeholder="Ej: Engorde Lote Ago 2026" />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Total animales *</label>
                            <input type="number" value={bulkPlanMeta.total_animales} onChange={e => setBulkPlanMeta({...bulkPlanMeta, total_animales: e.target.value})} style={inp()} placeholder="68" />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Kg por saco</label>
                            <input type="number" value={bulkPlanMeta.kg_por_saco} onChange={e => setBulkPlanMeta({...bulkPlanMeta, kg_por_saco: e.target.value})} style={inp()} placeholder="40" />
                          </div>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Fecha inicio *</label>
                            <input type="date" value={bulkPlanMeta.fecha_inicio} onChange={e => setBulkPlanMeta({...bulkPlanMeta, fecha_inicio: e.target.value})} style={inp()} />
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                      {bulkEtapas.length > 0 && (
                        <button className="btn btn-success" disabled={planLoading} onClick={async () => {
                          if (!bulkPlanMeta.nombre || !bulkPlanMeta.total_animales || !bulkPlanMeta.fecha_inicio) {
                            alert('Completa nombre, total animales y fecha inicio'); return;
                          }
                          setPlanLoading(true);
                          try {
                            await api.post('/nutrition/plans', {
                              nombre: bulkPlanMeta.nombre,
                              total_animales: parseInt(bulkPlanMeta.total_animales),
                              kg_por_saco: parseFloat(bulkPlanMeta.kg_por_saco) || 40,
                              fecha_inicio: bulkPlanMeta.fecha_inicio,
                              etapas: bulkEtapas
                            });
                            setSuccess('Plan creado exitosamente');
                            setShowBulkPlan(false); setBulkEtapas([]);
                            setBulkPlanMeta({ total_animales: '', kg_por_saco: '40', fecha_inicio: '', nombre: '' });
                            loadData(); setTimeout(() => setSuccess(''), 3000);
                          } catch { alert('Error guardando plan'); }
                          finally { setPlanLoading(false); }
                        }}>
                          <i className={`fas ${planLoading ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: '8px' }}></i>
                          {planLoading ? 'Guardando...' : 'Guardar Plan'}
                        </button>
                      )}
                      <button className="btn btn-secondary" onClick={() => { setShowBulkPlan(false); setBulkEtapas([]); }}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- Formulario manual --- */}
              {showPlanForm && !selectedPlan && (
                <div className="card" style={{ marginBottom: '20px' }}>
                  <div className="card-header">
                    <h5 className="card-title">
                      <i className={`fas ${editingPlanId ? 'fa-edit' : 'fa-plus'}`} style={{ marginRight: '8px' }}></i>
                      {editingPlanId ? 'Editar Plan' : 'Nuevo Plan Manual'}
                    </h5>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Nombre *</label>
                        <input type="text" value={planForm.nombre} onChange={e => setPlanForm({...planForm, nombre: e.target.value})} style={inp()} placeholder="Ej: Engorde Lote 1" />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Total animales *</label>
                        <input type="number" value={planForm.total_animales} onChange={e => setPlanForm({...planForm, total_animales: e.target.value})} style={inp()} placeholder="68" />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Kg por saco</label>
                        <input type="number" value={planForm.kg_por_saco} onChange={e => setPlanForm({...planForm, kg_por_saco: e.target.value})} style={inp()} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Fecha inicio *</label>
                        <input type="date" value={planForm.fecha_inicio} onChange={e => setPlanForm({...planForm, fecha_inicio: e.target.value})} style={inp()} />
                      </div>
                    </div>

                    {/* Etapas manuales */}
                    <div style={{ marginBottom: '12px', fontWeight: '700', color: '#1a2035' }}>Etapas del plan:</div>
                    {planEtapas.map((et, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 110px 130px 130px 36px', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                        <input type="number" value={et.semana} onChange={e => { const arr=[...planEtapas]; arr[i]={...arr[i],semana:parseInt(e.target.value)||0}; setPlanEtapas(arr); }} style={inp()} placeholder="Sem" />
                        <select
                          value={et.dieta_id || ''}
                          onChange={e => {
                            const id = e.target.value ? parseInt(e.target.value) : null;
                            const dieta = diets.find(d => d.id === id);
                            const arr = [...planEtapas];
                            arr[i] = { ...arr[i], dieta_id: id, alimento: dieta ? dieta.nombre : arr[i].alimento };
                            setPlanEtapas(arr);
                          }}
                          style={inp()}
                        >
                          <option value="">— Sin dieta —</option>
                          {diets.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                        <input type="text" value={et.alimento} onChange={e => { const arr=[...planEtapas]; arr[i]={...arr[i],alimento:e.target.value}; setPlanEtapas(arr); }} style={inp()} placeholder="Nombre alimento" />
                        <input type="number" step="0.01" value={et.cad_kg_animal} onChange={e => { const arr=[...planEtapas]; arr[i]={...arr[i],cad_kg_animal:parseFloat(e.target.value)||0}; setPlanEtapas(arr); }} style={inp()} placeholder="kg/animal" />
                        <input type="date" value={et.fecha_inicio} onChange={e => { const arr=[...planEtapas]; arr[i]={...arr[i],fecha_inicio:e.target.value}; setPlanEtapas(arr); }} style={inp()} />
                        <input type="date" value={et.fecha_fin} onChange={e => { const arr=[...planEtapas]; arr[i]={...arr[i],fecha_fin:e.target.value}; setPlanEtapas(arr); }} style={inp()} />
                        <button className="btn btn-danger btn-sm" onClick={() => setPlanEtapas(planEtapas.filter((_,j)=>j!==i))}><i className="fas fa-times"></i></button>
                      </div>
                    ))}
                    <button className="btn btn-secondary btn-sm" style={{ marginBottom: '16px' }}
                      onClick={() => setPlanEtapas([...planEtapas, { semana: planEtapas.length+1, alimento: '', dieta_id: null, cad_kg_animal: 0, fecha_inicio: '', fecha_fin: '' }])}>
                      <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>Agregar Etapa
                    </button>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-success" onClick={handleSavePlan} disabled={planLoading}>
                        <i className={`fas ${planLoading ? 'fa-spinner fa-spin' : 'fa-save'}`} style={{ marginRight: '8px' }}></i>
                        {planLoading ? 'Guardando...' : 'Guardar Plan'}
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setShowPlanForm(false); setPlanEtapas([]); setEditingPlanId(null); }}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- Lista de planes --- */}
              {!selectedPlan && !showPlanForm && !showBulkPlan && (
                <div>
                  {plans.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                      <i className="fas fa-calendar-alt" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.4 }}></i>
                      <h5>No hay planes de alimentación</h5>
                      <p>Crea un plan manualmente o carga uno desde Excel</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                      {plans.map(plan => (
                        <div key={plan.id} style={{ border: '1px solid #ebedf2', borderRadius: '10px', padding: '18px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#1a2035' }}>{plan.nombre}</div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button className="btn btn-primary btn-sm" title="Ver detalle" onClick={() => loadPlanDetail(plan)}><i className="fas fa-eye"></i></button>
                              <button className="btn btn-warning btn-sm" title="Editar" onClick={() => handleEditPlan(plan)}><i className="fas fa-edit"></i></button>
                              <button className="btn btn-danger btn-sm" title="Eliminar" onClick={() => handleDeletePlan(plan.id, plan.nombre)}><i className="fas fa-trash"></i></button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                            <div style={{ background: '#f0f7ff', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                              <div style={{ fontWeight: '700', color: '#1572e8', fontSize: '18px' }}>{plan.total_animales}</div>
                              <div style={{ color: '#6c757d' }}>Animales</div>
                            </div>
                            <div style={{ background: '#f0fff4', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                              <div style={{ fontWeight: '700', color: '#31ce36', fontSize: '18px' }}>{plan.total_dias}</div>
                              <div style={{ color: '#6c757d' }}>Días totales</div>
                            </div>
                            <div style={{ background: '#fffbf0', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                              <div style={{ fontWeight: '700', color: '#ffad46', fontSize: '18px' }}>{plan.total_etapas}</div>
                              <div style={{ color: '#6c757d' }}>Etapas</div>
                            </div>
                            <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                              <div style={{ fontWeight: '700', color: '#6c757d', fontSize: '14px' }}>{plan.kg_por_saco} kg</div>
                              <div style={{ color: '#6c757d' }}>Por saco</div>
                            </div>
                          </div>
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#6c757d' }}>
                            <i className="fas fa-calendar" style={{ marginRight: '5px' }}></i>
                            Inicio: {parseDate(plan.fecha_inicio).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* --- Detalle del plan seleccionado --- */}
              {selectedPlan && (
                <div>
                  {planLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
                    </div>
                  ) : planDetail && (
                    <div>
                      {/* Header del plan */}
                      <div style={{ background: 'linear-gradient(135deg, #1572e8, #0d47a1)', borderRadius: '10px', padding: '20px', color: '#fff', marginBottom: '20px' }}>
                        <h5 style={{ margin: '0 0 10px 0', color: '#fff' }}>{selectedPlan.nombre}</h5>
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '14px' }}>
                          <span><i className="fas fa-paw" style={{ marginRight: '6px' }}></i>{selectedPlan.total_animales} animales</span>
                          <span><i className="fas fa-calendar" style={{ marginRight: '6px' }}></i>Inicio: {parseDate(selectedPlan.fecha_inicio).toLocaleDateString()}</span>
                          <span><i className="fas fa-clock" style={{ marginRight: '6px' }}></i>{selectedPlan.total_dias} días</span>
                          <span><i className="fas fa-box" style={{ marginRight: '6px' }}></i>{selectedPlan.kg_por_saco} kg/saco</span>
                        </div>
                      </div>

                      {/* Sub-tabs */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button onClick={() => setPlanDetailTab('resumen')} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', background: planDetailTab === 'resumen' ? '#1572e8' : '#f8f9fa', color: planDetailTab === 'resumen' ? '#fff' : '#6c757d' }}>
                          <i className="fas fa-chart-bar" style={{ marginRight: '6px' }}></i>Resumen por Etapa
                        </button>
                        <button onClick={() => setPlanDetailTab('dias')} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', background: planDetailTab === 'dias' ? '#1572e8' : '#f8f9fa', color: planDetailTab === 'dias' ? '#fff' : '#6c757d' }}>
                          <i className="fas fa-list" style={{ marginRight: '6px' }}></i>Proyección Día a Día
                        </button>
                      </div>

                      {/* Resumen por etapa */}
                      {planDetailTab === 'resumen' && (
                        <div>
                          {/* Totales globales */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                            {[{
                              label: 'Total kg consumidos', val: planDetail.resumenEtapas.reduce((a,e)=>a+e.consumo_total_kg,0).toLocaleString(), color: '#1572e8', icon: 'fa-weight'
                            },{
                              label: 'Total sacos', val: planDetail.resumenEtapas.reduce((a,e)=>a+e.sacos_etapa,0).toLocaleString(), color: '#31ce36', icon: 'fa-box'
                            },{
                              label: 'Etapas', val: planDetail.resumenEtapas.length, color: '#ffad46', icon: 'fa-layer-group'
                            },{
                              label: 'Días totales', val: planDetail.resumenEtapas.reduce((a,e)=>a+e.dias,0), color: '#6c757d', icon: 'fa-calendar'
                            }].map((kpi,i) => (
                              <div key={i} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                                <i className={`fas ${kpi.icon}`} style={{ fontSize: '20px', color: kpi.color, marginBottom: '6px' }}></i>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: kpi.color }}>{kpi.val}</div>
                                <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>{kpi.label}</div>
                              </div>
                            ))}
                          </div>
                          <div className="table-responsive">
                            <table className="table">
                              <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                  <th>Semana</th><th>Alimento</th><th>CAD kg/animal</th><th>Fecha inicio</th><th>Fecha fin</th><th>Días</th><th>Consumo total kg</th><th>Sacos etapa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {planDetail.resumenEtapas.map((e, i) => (
                                  <tr key={i}>
                                    <td><span style={{ background: '#1572e8', color: '#fff', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: '700' }}>Sem {e.semana}</span></td>
                                    <td style={{ fontWeight: '600' }}>
                                      {e.alimento}
                                      {(e as any).dieta_nombre && (
                                        <span style={{ marginLeft: '6px', background: '#e8f4fd', color: '#1572e8', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>
                                          <i className="fas fa-link" style={{ marginRight: '4px' }}></i>{(e as any).dieta_nombre}
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ color: '#1572e8', fontWeight: '700' }}>{e.cad_kg_animal} kg</td>
                                    <td>{parseDate(e.fecha_inicio).toLocaleDateString()}</td>
                                    <td>{parseDate(e.fecha_fin).toLocaleDateString()}</td>
                                    <td>{e.dias}</td>
                                    <td style={{ fontWeight: '600' }}>{e.consumo_total_kg.toLocaleString()} kg</td>
                                    <td><span style={{ background: '#31ce36', color: '#fff', borderRadius: '12px', padding: '3px 10px', fontSize: '12px', fontWeight: '700' }}>{e.sacos_etapa} sacos</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Proyección día a día */}
                      {planDetailTab === 'dias' && (
                        <div className="table-responsive">
                          <table className="table" style={{ fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: '#f8f9fa' }}>
                                <th>Día</th><th>Fecha</th><th>Semana</th><th>Alimento</th><th>CAD kg/animal</th><th>Animales</th><th>Consumo diario total</th><th>Sacos diarios</th>
                              </tr>
                            </thead>
                            <tbody>
                              {planDetail.dias.map((d, i) => {
                                const esSabado = parseDate(d.fecha).getDay() === 6;
                                return (
                                  <tr key={i} style={{ background: esSabado ? '#f0fff4' : undefined }}>
                                    <td style={{ fontWeight: '700', color: '#1572e8' }}>{d.dia}</td>
                                    <td>{parseDate(d.fecha).toLocaleDateString()}</td>
                                    <td><span style={{ background: '#ebedf2', borderRadius: '10px', padding: '2px 8px', fontSize: '11px', fontWeight: '600' }}>S{d.semana}</span></td>
                                    <td style={{ fontSize: '12px' }}>{d.alimento}</td>
                                    <td style={{ fontWeight: '600' }}>{d.cad_kg_animal}</td>
                                    <td>{d.total_animales}</td>
                                    <td style={{ fontWeight: '700', color: '#1572e8' }}>{d.consumo_diario_total} kg</td>
                                    <td>
                                      <span style={{ background: '#31ce36', color: '#fff', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', fontWeight: '700' }}>{d.sacos_diarios}</span>
                                      {esSabado && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#31ce36', fontWeight: '600' }}>← fin semana</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============ TAB REGISTROS ============ */}
          {activeTab === 'registros' && (
            <div>
              {/* Formulario registro */}
              {showFeedingForm && (
                <div className="card" style={{ marginBottom: '20px', border: '1px solid #bee3f8' }}>
                  <div className="card-header" style={{ background: '#e8f4fd' }}>
                    <h5 className="card-title" style={{ margin: 0, color: '#1a2035' }}>
                      <i className="fas fa-plus" style={{ marginRight: '8px', color: '#1572e8' }}></i>Registrar Alimentación
                    </h5>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <form onSubmit={handleFeedingSubmit}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Fecha *</label>
                          <input type="date" value={feedingForm.fecha} onChange={e => setFeedingForm({...feedingForm, fecha: e.target.value})} style={inp()} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Corral *</label>
                          <select value={feedingForm.ubicacion_id} onChange={e => setFeedingForm({...feedingForm, ubicacion_id: e.target.value})} style={inp()} required>
                            <option value="">— Seleccionar corral —</option>
                            {corrales.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}{c.etiqueta ? ` — ${c.etiqueta}` : ''} ({Number(c.animales_actuales)} animales)</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Dieta *</label>
                          <select value={feedingForm.dieta_id} onChange={e => setFeedingForm({...feedingForm, dieta_id: e.target.value})} style={inp()} required>
                            <option value="">— Seleccionar dieta —</option>
                            {diets.map(d => (
                              <option key={d.id} value={d.id}>{d.nombre} ({d.categoria_animal}) — ${parseFloat(d.costo_por_kg as any).toLocaleString()}/kg</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Cantidad total (kg) *</label>
                          <input type="number" step="0.1" min="0.1" value={feedingForm.cantidad_kg} onChange={e => setFeedingForm({...feedingForm, cantidad_kg: e.target.value})} style={inp()} placeholder="Ej: 120" required />
                        </div>
                      </div>

                      {/* Preview en tiempo real */}
                      {feedingForm.ubicacion_id && feedingForm.dieta_id && feedingForm.cantidad_kg && (
                        <div style={{ background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: '8px', padding: '14px', marginBottom: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                          {[
                            { label: 'Animales en corral', val: Number(corralSeleccionado?.animales_actuales || 0), color: '#1572e8' },
                            { label: 'Kg por animal', val: corralSeleccionado && Number(corralSeleccionado.animales_actuales) > 0 ? (parseFloat(feedingForm.cantidad_kg) / Number(corralSeleccionado.animales_actuales)).toFixed(3) + ' kg' : '—', color: '#31ce36' },
                            { label: 'Costo estimado', val: costoEstimado ? `$${parseFloat(costoEstimado).toLocaleString()}` : '—', color: '#ffad46' },
                          ].map(kpi => (
                            <div key={kpi.label} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '20px', fontWeight: '700', color: kpi.color }}>{kpi.val}</div>
                              <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '600' }}>{kpi.label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Observaciones</label>
                        <input type="text" value={feedingForm.observaciones} onChange={e => setFeedingForm({...feedingForm, observaciones: e.target.value})} style={inp()} placeholder="Opcional..." />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-success" disabled={feedingLoading}>
                          <i className={`fas ${feedingLoading ? 'fa-spinner fa-spin' : 'fa-check'}`} style={{ marginRight: '8px' }}></i>
                          {feedingLoading ? 'Guardando...' : 'Confirmar Alimentación'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowFeedingForm(false)}>Cancelar</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Filtros + botón */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6c757d', marginBottom: '4px' }}>FECHA</label>
                  <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} style={{ ...inp(), width: 160 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6c757d', marginBottom: '4px' }}>CORRAL</label>
                  <select value={filtroCorral} onChange={e => setFiltroCorral(e.target.value)} style={{ ...inp(), width: 200 }}>
                    <option value="">Todos los corrales</option>
                    {corrales.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.etiqueta ? ` — ${c.etiqueta}` : ''}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary" onClick={loadRegistros}>
                  <i className="fas fa-search" style={{ marginRight: '6px' }}></i>Buscar
                </button>
                <button className="btn btn-success" style={{ marginLeft: 'auto' }} onClick={() => { setShowFeedingForm(true); }}>
                  <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>Registrar Alimentación
                </button>
              </div>

              {/* Tabla registros */}
              {registros.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-clipboard-list" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.4 }}></i>
                  <h5>Sin registros para los filtros seleccionados</h5>
                  <p style={{ fontSize: '13px' }}>Selecciona una fecha y presiona Buscar, o registra una nueva alimentación.</p>
                </div>
              ) : (
                <>
                  {/* Resumen del día */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                    {[
                      { label: 'Registros', val: registros.length, color: '#1572e8', icon: 'fa-list' },
                      { label: 'Total kg', val: registros.reduce((s,r) => s + parseFloat(r.cantidad_kg||0), 0).toFixed(1) + ' kg', color: '#31ce36', icon: 'fa-weight' },
                      { label: 'Costo total', val: '$' + registros.reduce((s,r) => s + parseFloat(r.costo_total||0), 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}), color: '#ffad46', icon: 'fa-dollar-sign' },
                      { label: 'Corrales', val: new Set(registros.map(r => r.ubicacion_id)).size, color: '#6f42c1', icon: 'fa-door-open' },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                        <i className={`fas ${kpi.icon}`} style={{ color: kpi.color, marginBottom: '4px', fontSize: '16px' }}></i>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: kpi.color }}>{kpi.val}</div>
                        <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '600' }}>{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th>Fecha</th><th>Corral</th><th>Dieta</th><th>Cantidad</th><th>Kg/animal</th><th>Costo total</th><th>Responsable</th><th>Obs.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registros.map(r => {
                          const animales = Number(corrales.find(c => c.id === r.ubicacion_id)?.animales_actuales || 0);
                          const kgAnimal = animales > 0 ? (parseFloat(r.cantidad_kg) / animales).toFixed(3) : '—';
                          return (
                            <tr key={r.id}>
                              <td style={{ whiteSpace: 'nowrap' }}>{parseDate(r.fecha_suministro).toLocaleDateString()}</td>
                              <td style={{ fontWeight: '600' }}>{r.ubicacion_nombre}</td>
                              <td>
                                <span style={{ background: '#e8f4fd', color: '#1572e8', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' }}>
                                  {r.dieta_nombre}
                                </span>
                              </td>
                              <td style={{ fontWeight: '700', color: '#1572e8' }}>{parseFloat(r.cantidad_kg).toFixed(1)} kg</td>
                              <td style={{ color: '#31ce36', fontWeight: '600' }}>{kgAnimal} {kgAnimal !== '—' ? 'kg' : ''}</td>
                              <td style={{ fontWeight: '600', color: '#ffad46' }}>${parseFloat(r.costo_total||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                              <td style={{ fontSize: '12px', color: '#6c757d' }}>{r.responsable_nombre}</td>
                              <td style={{ fontSize: '12px', color: '#6c757d', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observaciones || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionComplete;
