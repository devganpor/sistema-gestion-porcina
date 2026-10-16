import React, { useState, useRef } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  fields: string[];
  endpoint: string;
}

const reportTypes: ReportConfig[] = [
  {
    id: 'reproductivo',
    name: 'Reporte Reproductivo',
    description: 'Análisis completo de la actividad reproductiva',
    icon: 'fas fa-heart',
    color: '#f25961',
    fields: ['Cerdas servidas', 'Tasa de parición', 'Lechones nacidos', 'Mortalidad pre-destete'],
    endpoint: '/reports/reproductive'
  },
  {
    id: 'produccion',
    name: 'Reporte de Producción',
    description: 'KPIs de producción y rendimiento',
    icon: 'fas fa-chart-line',
    color: '#1572e8',
    fields: ['Ganancia diaria', 'Conversión alimenticia', 'Días a mercado', 'Peso promedio'],
    endpoint: '/reports/production'
  },
  {
    id: 'sanitario',
    name: 'Reporte Sanitario',
    description: 'Estado de salud y mortalidad',
    icon: 'fas fa-medkit',
    color: '#31ce36',
    fields: ['Vacunaciones aplicadas', 'Tratamientos', 'Mortalidad', 'Eventos sanitarios'],
    endpoint: '/reports/mortality'
  },
  {
    id: 'financiero',
    name: 'Reporte Financiero',
    description: 'Análisis de ingresos, gastos y rentabilidad',
    icon: 'fas fa-dollar-sign',
    color: '#ffad46',
    fields: ['Ingresos totales', 'Gastos por categoría', 'Margen de ganancia', 'ROI'],
    endpoint: '/reports/financial'
  },
  {
    id: 'inventario',
    name: 'Reporte de Inventario',
    description: 'Estado actual del inventario animal',
    icon: 'fas fa-warehouse',
    color: '#6c757d',
    fields: ['Total animales', 'Por categoría', 'Por ubicación', 'Movimientos'],
    endpoint: '/reports/inventory'
  },
  {
    id: 'alimentacion',
    name: 'Reporte de Alimentación',
    description: 'Consumo de alimentos y costos nutricionales',
    icon: 'fas fa-seedling',
    color: '#17a2b8',
    fields: ['Consumo total', 'Costo por kg', 'Eficiencia alimenticia', 'Inventario alimentos'],
    endpoint: '/reports/feeding'
  }
];

const fmt = (val: any, decimals = 2) => {
  const n = parseFloat(val);
  return isNaN(n) ? val ?? '-' : n.toFixed(decimals);
};

const ReportTable: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) return <p style={{ color: '#6c757d', textAlign: 'center' }}>Sin datos para el período seleccionado.</p>;
  const cols = Object.keys(data[0]);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            {cols.map(c => (
              <th key={c} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #ebedf2', fontWeight: 600, color: '#1a2035', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                {c.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ebedf2', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
              {cols.map(c => (
                <td key={c} style={{ padding: '9px 12px', color: '#444' }}>{fmt(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center', borderTop: `3px solid ${color}` }}>
    <div style={{ fontSize: '26px', fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: 600, marginTop: '4px' }}>{label}</div>
  </div>
);

const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [filters, setFilters] = useState({ categoria: '', estado: '' });
  const [feedFilters, setFeedFilters] = useState({ dieta_id: '', ubicacion_id: '', categoria_animal: '', agrupacion: 'month' });
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const currentReport = reportTypes.find(r => r.id === selectedReport);

  const handleGenerateReport = async () => {
    if (!selectedReport || !currentReport) return;
    setLoading(true);
    setError(null);
    setReportData(null);
    try {
      const params: any = {};
      if (dateRange.startDate) params.fecha_inicio = dateRange.startDate;
      if (dateRange.endDate) params.fecha_fin = dateRange.endDate;
      if (filters.categoria) params.categoria = filters.categoria;
      if (filters.estado) params.estado = filters.estado;
      if (selectedReport === 'alimentacion') {
        if (feedFilters.dieta_id)        params.dieta_id        = feedFilters.dieta_id;
        if (feedFilters.ubicacion_id)    params.ubicacion_id    = feedFilters.ubicacion_id;
        if (feedFilters.categoria_animal) params.categoria_animal = feedFilters.categoria_animal;
        if (feedFilters.agrupacion)      params.agrupacion      = feedFilters.agrupacion;
      }
      const res = await api.get(currentReport.endpoint, { params });
      setReportData(res.data);
    } catch (e: any) {
      if (e.code === 'ECONNABORTED') {
        setError('La consulta tardó demasiado. Intenta con un rango de fechas más corto.');
      } else {
        setError(e.response?.data?.error || 'Error al generar el reporte. Verifica la conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    const wb = XLSX.utils.book_new();
    Object.entries(reportData).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        const ws = XLSX.utils.json_to_sheet(value as any[]);
        XLSX.utils.book_append_sheet(wb, ws, key.substring(0, 31));
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        const ws = XLSX.utils.json_to_sheet([value]);
        XLSX.utils.book_append_sheet(wb, ws, key.substring(0, 31));
      }
    });
    XLSX.writeFile(wb, `${currentReport?.name || 'reporte'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (selectedReport) {
      case 'reproductivo': {
        const tp = reportData.tasa_paricion || {};
        const tasa = tp.ciclos_servicio > 0 ? ((tp.partos_realizados / tp.ciclos_servicio) * 100).toFixed(1) : '0';
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <SummaryCard label="CICLOS DE SERVICIO" value={tp.ciclos_servicio ?? '-'} color="#f25961" />
              <SummaryCard label="PARTOS REALIZADOS" value={tp.partos_realizados ?? '-'} color="#31ce36" />
              <SummaryCard label="TASA DE PARICIÓN" value={`${tasa}%`} color="#1572e8" />
            </div>
            <h6 style={{ marginBottom: '10px', color: '#1a2035' }}>Partos por Mes</h6>
            <ReportTable data={reportData.partos} />
          </>
        );
      }
      case 'produccion': {
        const v = reportData.ventas_resumen || {};
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <SummaryCard label="ANIMALES VENDIDOS" value={v.total_vendidos ?? '-'} color="#1572e8" />
              <SummaryCard label="DÍAS PROM. A MERCADO" value={v.dias_promedio_mercado ? fmt(v.dias_promedio_mercado, 0) : '-'} color="#ffad46" />
            </div>
            <h6 style={{ marginBottom: '10px', color: '#1a2035' }}>Producción Mensual por Categoría</h6>
            <ReportTable data={reportData.produccion_mensual} />
          </>
        );
      }
      case 'sanitario': {
        const total = (reportData.mortalidad_categoria || []).reduce((s: number, r: any) => s + parseInt(r.muertes || 0), 0);
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <SummaryCard label="TOTAL MUERTES" value={String(total)} color="#f25961" />
            </div>
            <h6 style={{ marginBottom: '10px', color: '#1a2035' }}>Mortalidad por Categoría</h6>
            <ReportTable data={reportData.mortalidad_categoria} />
            <h6 style={{ margin: '20px 0 10px', color: '#1a2035' }}>Causas Principales</h6>
            <ReportTable data={reportData.causas_principales} />
          </>
        );
      }
      case 'financiero': {
        const r = reportData.resumen || {};
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <SummaryCard label="INGRESOS TOTALES" value={r.total_ingresos ? `$${fmt(r.total_ingresos, 0)}` : '-'} color="#31ce36" />
              <SummaryCard label="GASTOS TOTALES" value={r.total_gastos ? `$${fmt(r.total_gastos, 0)}` : '-'} color="#f25961" />
              <SummaryCard label="UTILIDAD NETA" value={r.utilidad_neta ? `$${fmt(r.utilidad_neta, 0)}` : '-'} color="#1572e8" />
            </div>
            <h6 style={{ marginBottom: '10px', color: '#1a2035' }}>Ingresos Mensuales</h6>
            <ReportTable data={reportData.ingresos_mensuales} />
            <h6 style={{ margin: '20px 0 10px', color: '#1a2035' }}>Gastos por Categoría</h6>
            <ReportTable data={reportData.gastos_categoria} />
          </>
        );
      }
      case 'inventario': {
        const total = (reportData.inventario_actual || []).reduce((s: number, r: any) => s + parseInt(r.cantidad || 0), 0);
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <SummaryCard label="TOTAL ANIMALES ACTIVOS" value={String(total)} color="#6c757d" />
            </div>
            <h6 style={{ marginBottom: '10px', color: '#1a2035' }}>Inventario por Categoría y Sexo</h6>
            <ReportTable data={reportData.inventario_actual} />
            <h6 style={{ margin: '20px 0 10px', color: '#1a2035' }}>Ocupación por Ubicación</h6>
            <ReportTable data={reportData.ocupacion_ubicaciones} />
          </>
        );
      }
      case 'alimentacion': {
        const r = reportData.resumen || {};
        const agrupLabel = feedFilters.agrupacion === 'dia' ? 'Diario' : feedFilters.agrupacion === 'semana' ? 'Semanal' : 'Mensual';
        return (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <SummaryCard label="TOTAL KG CONSUMIDOS"     value={fmt(r.total_kg, 0)}              color="#17a2b8" />
              <SummaryCard label="COSTO TOTAL"             value={`$${fmt(r.costo_total, 2)}`}     color="#ffad46" />
              <SummaryCard label="PROMEDIO KG / REGISTRO"  value={fmt(r.promedio_kg_registro, 2)}  color="#1572e8" />
              <SummaryCard label="DIETAS UTILIZADAS"       value={r.dietas_usadas ?? '-'}           color="#31ce36" />
              <SummaryCard label="UBICACIONES ATENDIDAS"   value={r.ubicaciones_atendidas ?? '-'}   color="#6c757d" />
              <SummaryCard label="TOTAL REGISTROS"         value={r.total_registros ?? '-'}         color="#f25961" />
            </div>

            {/* Consumo temporal */}
            <h6 style={{ margin: '0 0 10px', color: '#1a2035' }}>Consumo {agrupLabel}</h6>
            <ReportTable data={reportData.consumo_temporal_tabla} />

            {/* Por dieta */}
            <h6 style={{ margin: '20px 0 10px', color: '#1a2035' }}>Consumo por Dieta</h6>
            <ReportTable data={reportData.por_dieta} />

            {/* Por ubicación */}
            <h6 style={{ margin: '20px 0 10px', color: '#1a2035' }}>Consumo por Ubicación</h6>
            <ReportTable data={reportData.por_ubicacion} />

            {/* Por categoría animal */}
            <h6 style={{ margin: '20px 0 10px', color: '#1a2035' }}>Consumo por Categoría Animal</h6>
            <ReportTable data={reportData.por_categoria} />
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="page-inner">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="card">
        <div className="card-header no-print">
          <h4 className="card-title">
            <i className="fas fa-chart-bar" style={{ marginRight: '10px' }}></i>
            Reportes y Analytics
          </h4>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Tipos de Reportes */}
          <div className="no-print" style={{ marginBottom: '30px' }}>
            <h5 style={{ color: '#1a2035', marginBottom: '15px' }}>
              <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
              Seleccionar Tipo de Reporte
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {reportTypes.map(report => (
                <div
                  key={report.id}
                  onClick={() => { setSelectedReport(report.id); setReportData(null); setError(null); }}
                  style={{
                    padding: '20px',
                    borderRadius: '8px',
                    border: selectedReport === report.id ? `2px solid ${report.color}` : '1px solid #ebedf2',
                    background: selectedReport === report.id ? `${report.color}15` : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <i className={report.icon} style={{ fontSize: '24px', color: report.color, marginRight: '12px' }}></i>
                    <div>
                      <h6 style={{ margin: 0, color: '#1a2035', fontWeight: 600 }}>{report.name}</h6>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>{report.description}</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    <strong>Incluye:</strong> {report.fields.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuración */}
          {selectedReport && (
            <div className="card no-print" style={{ marginBottom: '25px' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>
                  Configuración del Reporte
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1a2035' }}>Fecha Inicio</label>
                    <input type="date" value={dateRange.startDate}
                      onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1a2035' }}>Fecha Fin</label>
                    <input type="date" value={dateRange.endDate}
                      onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }} />
                  </div>
                  {selectedReport !== 'alimentacion' && (<>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1a2035' }}>Categoría</label>
                    <select value={filters.categoria} onChange={e => setFilters({ ...filters, categoria: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="">Todas las categorías</option>
                      <option value="lechon">Lechón</option>
                      <option value="recria">Recría</option>
                      <option value="desarrollo">Desarrollo</option>
                      <option value="engorde">Engorde</option>
                      <option value="reproductor">Reproductor</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1a2035' }}>Estado</label>
                    <select value={filters.estado} onChange={e => setFilters({ ...filters, estado: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="">Todos los estados</option>
                      <option value="activo">Activo</option>
                      <option value="vendido">Vendido</option>
                      <option value="muerto">Muerto</option>
                    </select>
                  </div>
                  </>)}

                  {selectedReport === 'alimentacion' && (<>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1a2035' }}>Agrupación</label>
                    <select value={feedFilters.agrupacion} onChange={e => setFeedFilters({ ...feedFilters, agrupacion: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="month">Mensual</option>
                      <option value="week">Semanal</option>
                      <option value="dia">Diario</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1a2035' }}>Categoría Animal</label>
                    <select value={feedFilters.categoria_animal} onChange={e => setFeedFilters({ ...feedFilters, categoria_animal: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="">Todas</option>
                      <option value="lechon">Lechón</option>
                      <option value="recria">Recría</option>
                      <option value="desarrollo">Desarrollo</option>
                      <option value="engorde">Engorde</option>
                      <option value="reproductor">Reproductor</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1a2035' }}>Dieta</label>
                    <select value={feedFilters.dieta_id} onChange={e => setFeedFilters({ ...feedFilters, dieta_id: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="">Todas las dietas</option>
                      {(reportData?.filtros_disponibles?.dietas || []).map((d: any) => (
                        <option key={d.id} value={d.id}>{d.nombre} ({d.categoria_animal})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#1a2035' }}>Ubicación</label>
                    <select value={feedFilters.ubicacion_id} onChange={e => setFeedFilters({ ...feedFilters, ubicacion_id: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}>
                      <option value="">Todas las ubicaciones</option>
                      {(reportData?.filtros_disponibles?.ubicaciones || []).map((u: any) => (
                        <option key={u.id} value={u.id}>{u.nombre} ({u.tipo})</option>
                      ))}
                    </select>
                  </div>
                  </>)}
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={handleGenerateReport} disabled={loading}>
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-play'}`} style={{ marginRight: '8px' }}></i>
                    {loading ? 'Generando...' : 'Generar Reporte'}
                  </button>
                  <button className="btn btn-danger" onClick={handleExportPDF} disabled={!reportData}>
                    <i className="fas fa-file-pdf" style={{ marginRight: '8px' }}></i>
                    Exportar PDF
                  </button>
                  <button className="btn btn-success" onClick={handleExportExcel} disabled={!reportData}>
                    <i className="fas fa-file-excel" style={{ marginRight: '8px' }}></i>
                    Exportar Excel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resultado */}
          <div className="card" ref={printRef}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="fas fa-eye" style={{ marginRight: '8px' }}></i>
                {currentReport ? currentReport.name : 'Vista Previa del Reporte'}
              </h5>
              {reportData && (
                <span style={{ fontSize: '12px', color: '#6c757d' }}>
                  {dateRange.startDate && dateRange.endDate
                    ? `${dateRange.startDate} — ${dateRange.endDate}`
                    : 'Período: año actual'}
                </span>
              )}
            </div>
            <div style={{ padding: '20px' }}>
              {error && (
                <div style={{ background: '#fff3f3', border: '1px solid #f25961', borderRadius: '8px', padding: '15px', color: '#f25961', marginBottom: '15px' }}>
                  <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>{error}
                </div>
              )}
              {loading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '36px', marginBottom: '15px' }}></i>
                  <p>Generando reporte...</p>
                </div>
              )}
              {!loading && reportData && renderReportContent()}
              {!loading && !reportData && !error && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-chart-bar" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.4 }}></i>
                  <h5>{selectedReport ? 'Configura el período y presiona "Generar Reporte"' : 'Selecciona un tipo de reporte'}</h5>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
