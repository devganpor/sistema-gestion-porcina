import React, { useState } from 'react';

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  fields: string[];
}

const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filters, setFilters] = useState({
    categoria: '',
    ubicacion: '',
    estado: ''
  });

  const reportTypes: ReportConfig[] = [
    {
      id: 'reproductivo',
      name: 'Reporte Reproductivo',
      description: 'Análisis completo de la actividad reproductiva',
      icon: 'fas fa-heart',
      color: '#f25961',
      fields: ['Cerdas servidas', 'Tasa de parición', 'Lechones nacidos', 'Mortalidad pre-destete']
    },
    {
      id: 'produccion',
      name: 'Reporte de Producción',
      description: 'KPIs de producción y rendimiento',
      icon: 'fas fa-chart-line',
      color: '#1572e8',
      fields: ['Ganancia diaria', 'Conversión alimenticia', 'Días a mercado', 'Peso promedio']
    },
    {
      id: 'sanitario',
      name: 'Reporte Sanitario',
      description: 'Estado de salud y vacunaciones',
      icon: 'fas fa-medkit',
      color: '#31ce36',
      fields: ['Vacunaciones aplicadas', 'Tratamientos', 'Mortalidad', 'Eventos sanitarios']
    },
    {
      id: 'financiero',
      name: 'Reporte Financiero',
      description: 'Análisis de ingresos, gastos y rentabilidad',
      icon: 'fas fa-dollar-sign',
      color: '#ffad46',
      fields: ['Ingresos totales', 'Gastos por categoría', 'Margen de ganancia', 'ROI']
    },
    {
      id: 'inventario',
      name: 'Reporte de Inventario',
      description: 'Estado actual del inventario animal',
      icon: 'fas fa-warehouse',
      color: '#6c757d',
      fields: ['Total animales', 'Por categoría', 'Por ubicación', 'Movimientos']
    },
    {
      id: 'alimentacion',
      name: 'Reporte de Alimentación',
      description: 'Consumo de alimentos y costos nutricionales',
      icon: 'fas fa-seedling',
      color: '#17a2b8',
      fields: ['Consumo total', 'Costo por kg', 'Eficiencia alimenticia', 'Inventario alimentos']
    }
  ];

  const handleGenerateReport = () => {
    if (!selectedReport) {
      alert('Selecciona un tipo de reporte');
      return;
    }
    
    // Aquí iría la lógica para generar el reporte
    alert(`Generando ${reportTypes.find(r => r.id === selectedReport)?.name}...`);
  };

  const handleExportPDF = () => {
    alert('Exportando a PDF...');
  };

  const handleExportExcel = () => {
    alert('Exportando a Excel...');
  };

  return (
    <div className="page-inner">
      <div className="card">
        <div className="card-header">
          <h4 className="card-title">
            <i className="fas fa-chart-bar" style={{ marginRight: '10px' }}></i>
            Reportes y Analytics
          </h4>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Tipos de Reportes */}
          <div style={{ marginBottom: '30px' }}>
            <h5 style={{ color: '#1a2035', marginBottom: '15px' }}>
              <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
              Seleccionar Tipo de Reporte
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
              {reportTypes.map(report => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
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
                      <h6 style={{ margin: 0, color: '#1a2035', fontWeight: '600' }}>{report.name}</h6>
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

          {/* Configuración del Reporte */}
          {selectedReport && (
            <div className="card" style={{ marginBottom: '25px' }}>
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>
                  Configuración del Reporte
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                  {/* Rango de Fechas */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Fecha Inicio</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
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
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Fecha Fin</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ebedf2',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  {/* Filtros */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Categoría</label>
                    <select
                      value={filters.categoria}
                      onChange={(e) => setFilters({...filters, categoria: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ebedf2',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Todas las categorías</option>
                      <option value="lechon">Lechón</option>
                      <option value="recria">Recría</option>
                      <option value="desarrollo">Desarrollo</option>
                      <option value="engorde">Engorde</option>
                      <option value="reproductor">Reproductor</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', color: '#1a2035' }}>Estado</label>
                    <select
                      value={filters.estado}
                      onChange={(e) => setFilters({...filters, estado: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ebedf2',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Todos los estados</option>
                      <option value="activo">Activo</option>
                      <option value="vendido">Vendido</option>
                      <option value="muerto">Muerto</option>
                    </select>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={handleGenerateReport}>
                    <i className="fas fa-play" style={{ marginRight: '8px' }}></i>
                    Generar Reporte
                  </button>
                  <button className="btn btn-danger" onClick={handleExportPDF}>
                    <i className="fas fa-file-pdf" style={{ marginRight: '8px' }}></i>
                    Exportar PDF
                  </button>
                  <button className="btn btn-success" onClick={handleExportExcel}>
                    <i className="fas fa-file-excel" style={{ marginRight: '8px' }}></i>
                    Exportar Excel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vista Previa del Reporte */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">
                <i className="fas fa-eye" style={{ marginRight: '8px' }}></i>
                Vista Previa del Reporte
              </h5>
            </div>
            <div style={{ padding: '20px' }}>
              {selectedReport ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#1572e8' }}>1,247</div>
                      <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>TOTAL REGISTROS</div>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#31ce36' }}>95.2%</div>
                      <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>EFICIENCIA</div>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffad46' }}>$125M</div>
                      <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>VALOR TOTAL</div>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#f25961' }}>30</div>
                      <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600' }}>DÍAS PROMEDIO</div>
                    </div>
                  </div>

                  <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '8px', textAlign: 'center' }}>
                    <i className="fas fa-chart-area" style={{ fontSize: '48px', color: '#6c757d', marginBottom: '15px', opacity: 0.5 }}></i>
                    <h5 style={{ color: '#1a2035' }}>Gráfico del Reporte</h5>
                    <p style={{ color: '#6c757d' }}>
                      Aquí se mostraría el gráfico correspondiente al reporte seleccionado:<br/>
                      <strong>{reportTypes.find(r => r.id === selectedReport)?.name}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-chart-bar" style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}></i>
                  <h5>Selecciona un tipo de reporte</h5>
                  <p>Elige el tipo de reporte que deseas generar para ver la vista previa</p>
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