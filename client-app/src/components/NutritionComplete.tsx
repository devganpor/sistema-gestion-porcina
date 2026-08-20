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
    dieta_id: '',
    observaciones: ''
  });
  // corrales seleccionados para registro en lote: { corral_id, cantidad_kg, dieta_id }
  const [feedingRows, setFeedingRows] = useState<{corral_id:number; cantidad_kg:string; dieta_id:string}[]>([]);
  const today = new Date().toISOString().split('T')[0];
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('2026-07-31');
  const [filtroFechaFin, setFiltroFechaFin] = useState(today);
  const [filtroCorral, setFiltroCorral] = useState('');
  const [sortCol, setSortCol] = useState('fecha_suministro');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [viewRegistro, setViewRegistro] = useState<any|null>(null);
  const [editRegistro, setEditRegistro] = useState<any|null>(null);
  const [editForm, setEditForm] = useState({ dieta_id: '', cantidad_kg: '', observaciones: '' });

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
      if (filtroFechaInicio) params.append('fecha_inicio', filtroFechaInicio);
      if (filtroFechaFin) params.append('fecha_fin', filtroFechaFin);
      if (filtroCorral) params.append('ubicacion_id', filtroCorral);
      const res = await api.get(`/nutrition/feeding?${params.toString()}`);
      setRegistros(res.data);
    } catch { setRegistros([]); }
  };

  const aplicarRangoSemana = (tipo: 'esta' | 'pasada' | 'dos' | 'mes') => {
    const hoy = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1; // lunes=0
    if (tipo === 'esta') {
      const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - diaSemana);
      setFiltroFechaInicio(fmt(lunes)); setFiltroFechaFin(fmt(hoy));
    } else if (tipo === 'pasada') {
      const lunesPasado = new Date(hoy); lunesPasado.setDate(hoy.getDate() - diaSemana - 7);
      const domPasado = new Date(lunesPasado); domPasado.setDate(lunesPasado.getDate() + 6);
      setFiltroFechaInicio(fmt(lunesPasado)); setFiltroFechaFin(fmt(domPasado));
    } else if (tipo === 'dos') {
      const hace14 = new Date(hoy); hace14.setDate(hoy.getDate() - 13);
      setFiltroFechaInicio(fmt(hace14)); setFiltroFechaFin(fmt(hoy));
    } else {
      const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFiltroFechaInicio(fmt(primerDia)); setFiltroFechaFin(fmt(hoy));
    }
  };

  const handleFeedingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedingRows.length === 0) { alert('Agrega al menos un corral'); return; }
    setFeedingLoading(true);
    let ok = 0; let errors: string[] = [];
    for (const row of feedingRows) {
      try {
        await api.post('/nutrition/feeding', {
          ubicacion_id: row.corral_id,
          dieta_id: parseInt(row.dieta_id),
          cantidad_kg: parseFloat(row.cantidad_kg),
          fecha_suministro: feedingForm.fecha,
          observaciones: feedingForm.observaciones || null
        });
        ok++;
      } catch (err: any) {
        const corral = corralesConAnimales.find(c => c.id === row.corral_id);
        const msg = err.response?.data?.error || 'Error';
        errors.push(`${corral?.nombre || row.corral_id}: ${msg}`);
      }
    }
    setFeedingLoading(false);
    if (ok > 0) {
      setSuccess(`${ok} registro${ok > 1 ? 's' : ''} de alimentación guardado${ok > 1 ? 's' : ''}`);
      setShowFeedingForm(false);
      setFeedingRows([]);
      setFeedingForm({ fecha: new Date().toISOString().split('T')[0], dieta_id: '', observaciones: '' });
      loadRegistros();
      setTimeout(() => setSuccess(''), 5000);
    }
    if (errors.length > 0) alert('Errores:\n' + errors.join('\n'));
  };
  // Corrales con animales (>0) para el formulario
  const corralesConAnimales = corrales.filter(c => Number(c.animales_actuales) > 0);

  // Sugerir dieta y cantidad para un corral en una fecha dada
  const getSugerencia = (corralId: number, fecha: string) => {
    const corral = corralesConAnimales.find(c => c.id === corralId);
    if (!corral) return { dieta_id: '', cantidad_kg: '' };
    const animales = Number(corral.animales_actuales);
    const fechaSel = new Date(fecha + 'T00:00:00');
    const etapa = todasEtapas.find(e => {
      const ini = new Date(e.fecha_inicio + 'T00:00:00');
      const fin = new Date(e.fecha_fin + 'T00:00:00');
      return fechaSel >= ini && fechaSel <= fin;
    });
    return {
      dieta_id: etapa?.dieta_id ? String(etapa.dieta_id) : '',
      cantidad_kg: etapa && animales > 0 ? (etapa.cad_kg_animal * animales).toFixed(1) : ''
    };
  };

  // Agregar corrales al lote (uno o todos)
  const addCorralToRows = (corralId: number | 'all') => {
    const targets = corralId === 'all'
      ? corralesConAnimales.filter(c => !feedingRows.some(r => r.corral_id === c.id))
      : corralesConAnimales.filter(c => c.id === corralId && !feedingRows.some(r => r.corral_id === c.id));
    const newRows = targets.map(c => {
      const sug = getSugerencia(c.id, feedingForm.fecha);
      return { corral_id: c.id, dieta_id: sug.dieta_id, cantidad_kg: sug.cantidad_kg };
    });
    setFeedingRows(prev => [...prev, ...newRows]);
  };

  const updateFeedingRow = (idx: number, field: 'dieta_id'|'cantidad_kg', val: string) => {
    setFeedingRows(prev => prev.map((r, i) => i === idx ? {...r, [field]: val} : r));
  };

  const removeRow = (idx: number) => setFeedingRows(prev => prev.filter((_, i) => i !== idx));

  const costoTotalLote = feedingRows.reduce((sum, row) => {
    const d = diets.find(d => d.id === parseInt(row.dieta_id));
    const kg = parseFloat(row.cantidad_kg);
    return sum + (d && !isNaN(kg) ? parseFloat(d.costo_por_kg as any) * kg : 0);
  }, 0);


  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortIcon = (col: string) => (
    <i className={`fas fa-sort${sortCol === col ? (sortDir === 'asc' ? '-up' : '-down') : ''}`}
      style={{ marginLeft: '5px', fontSize: '11px', opacity: sortCol === col ? 1 : 0.35 }} />
  );

  const registrosOrdenados = [...registros].sort((a, b) => {
    let va: any, vb: any;
    if (sortCol === 'fecha_suministro') { va = a.fecha_suministro; vb = b.fecha_suministro; }
    else if (sortCol === 'ubicacion_nombre') { va = a.ubicacion_nombre; vb = b.ubicacion_nombre; }
    else if (sortCol === 'dieta_nombre') { va = a.dieta_nombre; vb = b.dieta_nombre; }
    else if (sortCol === 'cantidad_kg') { va = parseFloat(a.cantidad_kg); vb = parseFloat(b.cantidad_kg); }
    else if (sortCol === 'costo_total') { va = parseFloat(a.costo_total||0); vb = parseFloat(b.costo_total||0); }
    else if (sortCol === 'responsable_nombre') { va = a.responsable_nombre; vb = b.responsable_nombre; }
    else { va = a[sortCol]; vb = b[sortCol]; }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleEditRegistro = (r: any) => {
    setEditRegistro(r);
    setEditForm({ dieta_id: r.dieta_id?.toString() || '', cantidad_kg: parseFloat(r.cantidad_kg).toFixed(1), observaciones: r.observaciones || '' });
  };

  const handleSaveEditRegistro = async () => {
    if (!editForm.dieta_id || !editForm.cantidad_kg) { alert('Completa dieta y cantidad'); return; }
    try {
      await api.put(`/nutrition/feeding/${editRegistro.id}`, {
        dieta_id: parseInt(editForm.dieta_id),
        cantidad_kg: parseFloat(editForm.cantidad_kg),
        observaciones: editForm.observaciones || null
      });
      setEditRegistro(null);
      setSuccess('Registro actualizado');
      loadRegistros();
      setTimeout(() => setSuccess(''), 3000);
    } catch { alert('Error actualizando registro'); }
  };


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
                    {diets.length > 0 ? (diets.reduce((acc, d) => acc + (parseFloat(d.costo_por_kg as any) || 0), 0) / diets.length).toFixed(3) : '0.000'}
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
                        <td>${parseFloat(diet.costo_por_kg as any || 0).toFixed(3)}</td>
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
                      {/* Fila superior: fecha + observaciones */}
                      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Fecha *</label>
                          <input type="date" value={feedingForm.fecha}
                            onChange={e => { setFeedingForm({...feedingForm, fecha: e.target.value}); setFeedingRows([]); }}
                            style={inp()} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px' }}>Observaciones (aplica a todos)</label>
                          <input type="text" value={feedingForm.observaciones}
                            onChange={e => setFeedingForm({...feedingForm, observaciones: e.target.value})}
                            style={inp()} placeholder="Opcional..." />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="btn btn-primary btn-sm"
                            onClick={() => addCorralToRows('all')}
                            title="Agregar todos los corrales con animales">
                            <i className="fas fa-layer-group" style={{ marginRight: '6px' }}></i>Todos los corrales
                          </button>
                        </div>
                      </div>

                      {/* Selector para agregar corral individual */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
                        <select style={{ ...inp(), flex: 1, maxWidth: '320px' }}
                          value=""
                          onChange={e => { if (e.target.value) { addCorralToRows(parseInt(e.target.value)); e.target.value = ''; } }}>
                          <option value="">+ Agregar corral...</option>
                          {corralesConAnimales
                            .filter(c => !feedingRows.some(r => r.corral_id === c.id))
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}{c.etiqueta ? ` — ${c.etiqueta}` : ''} ({Number(c.animales_actuales)} animales)
                              </option>
                            ))}
                        </select>
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>
                          {corralesConAnimales.length} corrales disponibles
                        </span>
                      </div>

                      {/* Tabla de corrales seleccionados */}
                      {feedingRows.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: '#f0f4ff', borderBottom: '2px solid #dee2e6' }}>
                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '600' }}>Corral</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>Animales</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '600' }}>Dieta *</th>
                                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: '600' }}>Cantidad (kg) *</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>Kg/animal</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>Sacos</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '600' }}>Costo est.</th>
                                <th style={{ padding: '8px 4px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {feedingRows.map((row, idx) => {
                                const corral = corralesConAnimales.find(c => c.id === row.corral_id);
                                const animales = Number(corral?.animales_actuales || 0);
                                const kg = parseFloat(row.cantidad_kg);
                                const dieta = diets.find(d => d.id === parseInt(row.dieta_id));
                                const kgAnimal = animales > 0 && !isNaN(kg) ? (kg / animales).toFixed(3) : '—';
                                const sacos = !isNaN(kg) ? Math.ceil(kg / 40) : '—';
                                const costo = dieta && !isNaN(kg) ? (parseFloat(dieta.costo_por_kg as any) * kg).toFixed(3) : '—';
                                const hasSugerencia = getSugerencia(row.corral_id, feedingForm.fecha).cantidad_kg !== '';
                                return (
                                  <tr key={row.corral_id} style={{ borderBottom: '1px solid #ebedf2', background: idx % 2 === 0 ? '#fff' : '#fafbff' }}>
                                    <td style={{ padding: '8px 10px', fontWeight: '600' }}>
                                      {corral?.nombre}
                                      {hasSugerencia && <span style={{ marginLeft: '6px', fontSize: '10px', background: '#d4edda', color: '#155724', borderRadius: '8px', padding: '1px 6px' }}>plan</span>}
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1572e8', fontWeight: '700' }}>{animales}</td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <select value={row.dieta_id} onChange={e => updateFeedingRow(idx, 'dieta_id', e.target.value)}
                                        style={{ ...inp(), padding: '5px 8px', fontSize: '12px', minWidth: '160px' }} required>
                                        <option value="">— Dieta —</option>
                                        {diets.map(d => (
                                          <option key={d.id} value={d.id}>{d.nombre} · ${parseFloat(d.costo_por_kg as any).toFixed(3)}/kg</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td style={{ padding: '6px 8px' }}>
                                      <input type="number" step="0.1" min="0.1" value={row.cantidad_kg}
                                        onChange={e => updateFeedingRow(idx, 'cantidad_kg', e.target.value)}
                                        style={{ ...inp(), padding: '5px 8px', fontSize: '12px', width: '90px' }} required />
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#31ce36', fontWeight: '600' }}>{kgAnimal}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#20c997', fontWeight: '700' }}>{sacos}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ffad46', fontWeight: '600' }}>{costo !== '—' ? `$${costo}` : '—'}</td>
                                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                      <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(idx)} title="Quitar">
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {feedingRows.length > 1 && (
                              <tfoot>
                                <tr style={{ background: '#f0f4ff', fontWeight: '700', borderTop: '2px solid #dee2e6' }}>
                                  <td colSpan={2} style={{ padding: '8px 10px' }}>TOTAL ({feedingRows.length} corrales)</td>
                                  <td></td>
                                  <td style={{ padding: '8px 10px', color: '#1572e8' }}>
                                    {feedingRows.reduce((s, r) => s + (parseFloat(r.cantidad_kg) || 0), 0).toFixed(1)} kg
                                  </td>
                                  <td></td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#20c997' }}>
                                    {Math.ceil(feedingRows.reduce((s, r) => s + (parseFloat(r.cantidad_kg) || 0), 0) / 40)} sacos
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ffad46' }}>
                                    ${costoTotalLote.toFixed(3)}
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      )}

                      {feedingRows.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#6c757d', background: '#f8f9fa', borderRadius: '8px', marginBottom: '16px', border: '2px dashed #dee2e6' }}>
                          <i className="fas fa-plus-circle" style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.4 }}></i>
                          <p style={{ margin: 0, fontSize: '13px' }}>Selecciona corrales arriba o usa "Todos los corrales"</p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button type="submit" className="btn btn-success" disabled={feedingLoading || feedingRows.length === 0}>
                          <i className={`fas ${feedingLoading ? 'fa-spinner fa-spin' : 'fa-check'}`} style={{ marginRight: '8px' }}></i>
                          {feedingLoading ? 'Guardando...' : `Confirmar ${feedingRows.length > 1 ? feedingRows.length + ' registros' : 'alimentación'}`}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => { setShowFeedingForm(false); setFeedingRows([]); }}>Cancelar</button>
                        {feedingRows.length > 0 && (
                          <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: 'auto' }}>
                            {feedingRows.filter(r => r.dieta_id && r.cantidad_kg).length}/{feedingRows.length} corrales completos
                          </span>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Filtros + botón */}
              <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', border: '1px solid #ebedf2' }}>
                {/* Atajos de semana */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', marginRight: '4px' }}>RANGO RÁPIDO:</span>
                  {([
                    { label: 'Esta semana', tipo: 'esta' as const },
                    { label: 'Semana pasada', tipo: 'pasada' as const },
                    { label: 'Últimas 2 semanas', tipo: 'dos' as const },
                    { label: 'Este mes', tipo: 'mes' as const },
                  ]).map(({ label, tipo }) => (
                    <button key={tipo} className="btn btn-sm" onClick={() => aplicarRangoSemana(tipo)}
                      style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '20px', fontSize: '12px', padding: '4px 12px', color: '#495057', cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Inputs de rango + corral */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6c757d', marginBottom: '4px' }}>FECHA INICIO</label>
                    <input type="date" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)} style={{ ...inp(), width: 160 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6c757d', marginBottom: '4px' }}>FECHA FIN</label>
                    <input type="date" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)} style={{ ...inp(), width: 160 }} />
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
                  <button className="btn btn-success" style={{ marginLeft: 'auto' }} onClick={() => setShowFeedingForm(true)}>
                    <i className="fas fa-plus" style={{ marginRight: '6px' }}></i>Registrar Alimentación
                  </button>
                </div>
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
                      { label: 'Costo total', val: '$' + registros.reduce((s,r) => s + parseFloat(r.costo_total||0), 0).toFixed(3), color: '#ffad46', icon: 'fa-dollar-sign' },
                      { label: 'Corrales', val: new Set(registros.map(r => r.ubicacion_id)).size, color: '#6f42c1', icon: 'fa-door-open' },
                      { label: 'Sacos (40 kg)', val: Math.ceil(registros.reduce((s,r) => s + parseFloat(r.cantidad_kg||0), 0) / 40), color: '#20c997', icon: 'fa-box' },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                        <i className={`fas ${kpi.icon}`} style={{ color: kpi.color, marginBottom: '4px', fontSize: '16px' }}></i>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: kpi.color }}>{kpi.val}</div>
                        <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '600' }}>{kpi.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="table-responsive">
                    <table className="table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th onClick={() => handleSort('fecha_suministro')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Fecha{sortIcon('fecha_suministro')}</th>
                          <th onClick={() => handleSort('ubicacion_nombre')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Corral{sortIcon('ubicacion_nombre')}</th>
                          <th onClick={() => handleSort('dieta_nombre')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Dieta{sortIcon('dieta_nombre')}</th>
                          <th onClick={() => handleSort('cantidad_kg')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Cantidad{sortIcon('cantidad_kg')}</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Kg/animal</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Sacos</th>
                          <th onClick={() => handleSort('costo_total')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Costo total{sortIcon('costo_total')}</th>
                          <th onClick={() => handleSort('responsable_nombre')} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Responsable{sortIcon('responsable_nombre')}</th>
                          <th>Obs.</th>
                          <th style={{ width: 110 }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrosOrdenados.map(r => {
                          const animales = Number(corrales.find(c => c.id === r.ubicacion_id)?.animales_actuales || 0);
                          const kgAnimal = animales > 0 ? (parseFloat(r.cantidad_kg) / animales).toFixed(3) : '—';
                          return (
                            <tr key={r.id}>
                              <td style={{ whiteSpace: 'nowrap' }}>{parseDate(r.fecha_suministro).toLocaleDateString()}</td>
                              <td style={{ fontWeight: '600' }}>{r.ubicacion_nombre}</td>
                              <td><span style={{ background: '#e8f4fd', color: '#1572e8', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' }}>{r.dieta_nombre}</span></td>
                              <td style={{ fontWeight: '700', color: '#1572e8' }}>{parseFloat(r.cantidad_kg).toFixed(1)} kg</td>
                              <td style={{ color: '#31ce36', fontWeight: '600' }}>{kgAnimal}{kgAnimal !== '—' ? ' kg' : ''}</td>
                              <td style={{ color: '#20c997', fontWeight: '700' }}>{Math.ceil(parseFloat(r.cantidad_kg) / 40)} <span style={{ fontSize: '11px', color: '#6c757d' }}>({parseFloat(r.cantidad_kg).toFixed(1)} kg)</span></td>
                              <td style={{ fontWeight: '600', color: '#ffad46' }}>${parseFloat(r.costo_total||0).toFixed(3)}</td>
                              <td style={{ color: '#6c757d' }}>{r.responsable_nombre}</td>
                              <td style={{ color: '#6c757d', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observaciones || '—'}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button className="btn btn-info btn-sm" title="Ver detalle" onClick={() => setViewRegistro(r)}>
                                    <i className="fas fa-eye"></i>
                                  </button>
                                  <button className="btn btn-warning btn-sm" title="Editar" onClick={() => handleEditRegistro(r)}>
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button className="btn btn-danger btn-sm" title="Eliminar" onClick={async () => {
                                    if (!window.confirm(`¿Eliminar el registro de ${r.ubicacion_nombre} del ${parseDate(r.fecha_suministro).toLocaleDateString()}?`)) return;
                                    try { await api.delete(`/nutrition/feeding/${r.id}`); loadRegistros(); } catch { alert('Error eliminando registro'); }
                                  }}><i className="fas fa-trash"></i></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Modal Ver detalle */}
                  {viewRegistro && (() => {
                    const animales = Number(corrales.find(c => c.id === viewRegistro.ubicacion_id)?.animales_actuales || 0);
                    const kgAnimal = animales > 0 ? (parseFloat(viewRegistro.cantidad_kg) / animales).toFixed(3) : '—';
                    return (
                      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setViewRegistro(null)}>
                        <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', minWidth: 340, maxWidth: 480, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
                          onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h5 style={{ margin: 0, color: '#1a2035' }}><i className="fas fa-clipboard-list" style={{ marginRight: '8px', color: '#1572e8' }}></i>Detalle de Alimentación</h5>
                            <button className="btn btn-sm btn-secondary" onClick={() => setViewRegistro(null)}><i className="fas fa-times"></i></button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {[
                              { label: 'Fecha', val: parseDate(viewRegistro.fecha_suministro).toLocaleDateString() },
                              { label: 'Corral', val: viewRegistro.ubicacion_nombre },
                              { label: 'Dieta', val: viewRegistro.dieta_nombre },
                              { label: 'Cantidad total', val: `${parseFloat(viewRegistro.cantidad_kg).toFixed(1)} kg` },
                              { label: 'Animales en corral', val: animales || '—' },
                              { label: 'Kg por animal', val: kgAnimal !== '—' ? `${kgAnimal} kg` : '—' },
                              { label: 'Sacos (40 kg)', val: `${Math.ceil(parseFloat(viewRegistro.cantidad_kg) / 40)} sacos (${parseFloat(viewRegistro.cantidad_kg).toFixed(1)} kg)` },
                              { label: 'Costo total', val: `$${parseFloat(viewRegistro.costo_total||0).toFixed(3)}` },
                              { label: 'Responsable', val: viewRegistro.responsable_nombre },
                            ].map(({ label, val }) => (
                              <div key={label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px 12px' }}>
                                <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '600', marginBottom: '3px' }}>{label.toUpperCase()}</div>
                                <div style={{ fontWeight: '700', color: '#1a2035' }}>{val}</div>
                              </div>
                            ))}
                          </div>
                          {viewRegistro.observaciones && (
                            <div style={{ marginTop: '12px', background: '#fff3cd', borderRadius: '8px', padding: '10px 12px' }}>
                              <div style={{ fontSize: '11px', color: '#856404', fontWeight: '600', marginBottom: '3px' }}>OBSERVACIONES</div>
                              <div style={{ color: '#1a2035' }}>{viewRegistro.observaciones}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Modal Editar */}
                  {editRegistro && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => setEditRegistro(null)}>
                      <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', minWidth: 340, maxWidth: 460, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h5 style={{ margin: 0, color: '#1a2035' }}><i className="fas fa-edit" style={{ marginRight: '8px', color: '#ffad46' }}></i>Editar Registro</h5>
                          <button className="btn btn-sm btn-secondary" onClick={() => setEditRegistro(null)}><i className="fas fa-times"></i></button>
                        </div>
                        <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6c757d' }}>
                          <i className="fas fa-calendar" style={{ marginRight: '6px' }}></i>{parseDate(editRegistro.fecha_suministro).toLocaleDateString()}
                          <i className="fas fa-door-open" style={{ marginLeft: '12px', marginRight: '6px' }}></i>{editRegistro.ubicacion_nombre}
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Dieta *</label>
                          <select value={editForm.dieta_id} onChange={e => setEditForm({...editForm, dieta_id: e.target.value})} style={inp()}>
                            <option value="">— Seleccionar —</option>
                            {diets.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                          </select>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Cantidad total (kg) *</label>
                          <input type="number" step="0.1" min="0.1" value={editForm.cantidad_kg} onChange={e => setEditForm({...editForm, cantidad_kg: e.target.value})} style={inp()} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>Observaciones</label>
                          <input type="text" value={editForm.observaciones} onChange={e => setEditForm({...editForm, observaciones: e.target.value})} style={inp()} placeholder="Opcional..." />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button className="btn btn-success" onClick={handleSaveEditRegistro}>
                            <i className="fas fa-save" style={{ marginRight: '6px' }}></i>Guardar cambios
                          </button>
                          <button className="btn btn-secondary" onClick={() => setEditRegistro(null)}>Cancelar</button>
                        </div>
                      </div>
                    </div>
                  )}
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
