import React, { useState, useEffect } from 'react';

interface AnalyticsData {
  kpis: {
    lechonesPerCerdaYear: number;
    tasaParicion: number;
    mortalidadPreDestete: number;
    conversionAlimenticia: number;
    gananciaDialia: number;
    diasMercado: number;
    costoKgProducido: number;
    roi: number;
  };
  trends: {
    month: string;
    production: number;
    costs: number;
    revenue: number;
  }[];
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('production');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulación de datos de analytics
      const mockData: AnalyticsData = {
        kpis: {
          lechonesPerCerdaYear: 26.5,
          tasaParicion: 87.3,
          mortalidadPreDestete: 4.2,
          conversionAlimenticia: 2.8,
          gananciaDialia: 520,
          diasMercado: 165,
          costoKgProducido: 4200,
          roi: 23.5
        },
        trends: [
          { month: 'Ene', production: 1200, costs: 850, revenue: 1100 },
          { month: 'Feb', production: 1350, costs: 920, revenue: 1250 },
          { month: 'Mar', production: 1180, costs: 880, revenue: 1180 },
          { month: 'Abr', production: 1420, costs: 950, revenue: 1350 },
          { month: 'May', production: 1380, costs: 940, revenue: 1320 },
          { month: 'Jun', production: 1450, costs: 980, revenue: 1400 }
        ]
      };
      
      setTimeout(() => {
        setData(mockData);
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error cargando analytics:', error);
      setLoading(false);
    }
  };

  const getKpiStatus = (value: number, target: number, isReverse = false) => {
    const percentage = (value / target) * 100;
    if (isReverse) {
      return percentage <= 100 ? 'success' : percentage <= 120 ? 'warning' : 'danger';
    }
    return percentage >= 100 ? 'success' : percentage >= 80 ? 'warning' : 'danger';
  };

  const getKpiColor = (status: string) => {
    switch (status) {
      case 'success': return '#31ce36';
      case 'warning': return '#ffad46';
      case 'danger': return '#f25961';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="page-inner">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">
              <i className="fas fa-brain" style={{ marginRight: '10px' }}></i>
              Analytics e Inteligencia Artificial
            </h4>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ebedf2',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="3months">Últimos 3 meses</option>
                <option value="6months">Últimos 6 meses</option>
                <option value="1year">Último año</option>
                <option value="2years">Últimos 2 años</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* KPIs Principales */}
          <div style={{ marginBottom: '30px' }}>
            <h5 style={{ color: '#1a2035', marginBottom: '15px' }}>
              <i className="fas fa-tachometer-alt" style={{ marginRight: '8px' }}></i>
              Indicadores Clave de Rendimiento (KPIs)
            </h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div className="card">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: getKpiColor(getKpiStatus(data?.kpis.lechonesPerCerdaYear || 0, 25)), marginBottom: '8px' }}>
                    {data?.kpis.lechonesPerCerdaYear}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '5px' }}>LECHONES/CERDA/AÑO</div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Meta: 25+ | Actual: Excelente</div>
                </div>
              </div>

              <div className="card">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: getKpiColor(getKpiStatus(data?.kpis.tasaParicion || 0, 85)), marginBottom: '8px' }}>
                    {data?.kpis.tasaParicion}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '5px' }}>TASA DE PARICIÓN</div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Meta: 85%+ | Actual: Excelente</div>
                </div>
              </div>

              <div className="card">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: getKpiColor(getKpiStatus(data?.kpis.mortalidadPreDestete || 0, 5, true)), marginBottom: '8px' }}>
                    {data?.kpis.mortalidadPreDestete}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '5px' }}>MORTALIDAD PRE-DESTETE</div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Meta: &lt;5% | Actual: Excelente</div>
                </div>
              </div>

              <div className="card">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: getKpiColor(getKpiStatus(data?.kpis.conversionAlimenticia || 0, 3.0, true)), marginBottom: '8px' }}>
                    {data?.kpis.conversionAlimenticia}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '5px' }}>CONVERSIÓN ALIMENTICIA</div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Meta: &lt;3.0 | Actual: Excelente</div>
                </div>
              </div>

              <div className="card">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: getKpiColor(getKpiStatus(data?.kpis.gananciaDialia || 0, 500)), marginBottom: '8px' }}>
                    {data?.kpis.gananciaDialia}g
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '5px' }}>GANANCIA DIARIA</div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Meta: 500g+ | Actual: Excelente</div>
                </div>
              </div>

              <div className="card">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: getKpiColor(getKpiStatus(data?.kpis.diasMercado || 0, 170, true)), marginBottom: '8px' }}>
                    {data?.kpis.diasMercado}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '5px' }}>DÍAS A MERCADO</div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Meta: &lt;170 | Actual: Excelente</div>
                </div>
              </div>

              <div className="card">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: getKpiColor(getKpiStatus(data?.kpis.costoKgProducido || 0, 4500, true)), marginBottom: '8px' }}>
                    ${data?.kpis.costoKgProducido}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '5px' }}>COSTO/KG PRODUCIDO</div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Meta: &lt;$4500 | Actual: Excelente</div>
                </div>
              </div>

              <div className="card">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: '700', color: getKpiColor(getKpiStatus(data?.kpis.roi || 0, 20)), marginBottom: '8px' }}>
                    {data?.kpis.roi}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '5px' }}>ROI</div>
                  <div style={{ fontSize: '11px', color: '#6c757d' }}>Meta: 20%+ | Actual: Excelente</div>
                </div>
              </div>
            </div>
          </div>

          {/* Análisis de Tendencias */}
          <div className="card" style={{ marginBottom: '25px' }}>
            <div className="card-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h5 className="card-title">
                  <i className="fas fa-chart-line" style={{ marginRight: '8px' }}></i>
                  Análisis de Tendencias
                </h5>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setSelectedMetric('production')}
                    className={`btn btn-sm ${selectedMetric === 'production' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Producción
                  </button>
                  <button
                    onClick={() => setSelectedMetric('costs')}
                    className={`btn btn-sm ${selectedMetric === 'costs' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Costos
                  </button>
                  <button
                    onClick={() => setSelectedMetric('revenue')}
                    className={`btn btn-sm ${selectedMetric === 'revenue' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    Ingresos
                  </button>
                </div>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#f8f9fa', padding: '40px', borderRadius: '8px', textAlign: 'center' }}>
                <i className="fas fa-chart-area" style={{ fontSize: '48px', color: '#6c757d', marginBottom: '15px', opacity: 0.5 }}></i>
                <h5 style={{ color: '#1a2035' }}>Gráfico de Tendencias</h5>
                <p style={{ color: '#6c757d' }}>
                  Aquí se mostraría el gráfico de tendencias para: <strong>{selectedMetric}</strong><br/>
                  Período: {selectedPeriod}
                </p>
              </div>
            </div>
          </div>

          {/* Predicciones IA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-robot" style={{ marginRight: '8px' }}></i>
                  Predicciones IA
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '15px', padding: '15px', background: '#e3f2fd', borderRadius: '8px', borderLeft: '4px solid #1572e8' }}>
                  <div style={{ fontWeight: '600', color: '#1a2035', marginBottom: '5px' }}>
                    <i className="fas fa-chart-line" style={{ marginRight: '8px', color: '#1572e8' }}></i>
                    Producción Próximo Mes
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    Se estima una producción de <strong>1,520 kg</strong> basado en tendencias actuales
                  </div>
                </div>

                <div style={{ marginBottom: '15px', padding: '15px', background: '#f3e5f5', borderRadius: '8px', borderLeft: '4px solid #f25961' }}>
                  <div style={{ fontWeight: '600', color: '#1a2035', marginBottom: '5px' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px', color: '#f25961' }}></i>
                    Alerta de Rendimiento
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    Corral 5 muestra signos de bajo rendimiento. Revisar alimentación.
                  </div>
                </div>

                <div style={{ padding: '15px', background: '#e8f5e8', borderRadius: '8px', borderLeft: '4px solid #31ce36' }}>
                  <div style={{ fontWeight: '600', color: '#1a2035', marginBottom: '5px' }}>
                    <i className="fas fa-lightbulb" style={{ marginRight: '8px', color: '#31ce36' }}></i>
                    Recomendación
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    Optimizar dieta en fase de engorde puede mejorar conversión en 0.2 puntos
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="fas fa-bullseye" style={{ marginRight: '8px' }}></i>
                  Objetivos vs Realidad
                </h5>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a2035' }}>Lechones/Cerda/Año</span>
                    <span style={{ fontSize: '14px', color: '#31ce36', fontWeight: '600' }}>106%</span>
                  </div>
                  <div style={{ background: '#ebedf2', borderRadius: '10px', height: '8px' }}>
                    <div style={{ background: '#31ce36', borderRadius: '10px', height: '8px', width: '106%', maxWidth: '100%' }}></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>Meta: 25 | Actual: 26.5</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a2035' }}>Conversión Alimenticia</span>
                    <span style={{ fontSize: '14px', color: '#31ce36', fontWeight: '600' }}>107%</span>
                  </div>
                  <div style={{ background: '#ebedf2', borderRadius: '10px', height: '8px' }}>
                    <div style={{ background: '#31ce36', borderRadius: '10px', height: '8px', width: '93%' }}></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>Meta: &lt;3.0 | Actual: 2.8</div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a2035' }}>Mortalidad Pre-destete</span>
                    <span style={{ fontSize: '14px', color: '#31ce36', fontWeight: '600' }}>84%</span>
                  </div>
                  <div style={{ background: '#ebedf2', borderRadius: '10px', height: '8px' }}>
                    <div style={{ background: '#31ce36', borderRadius: '10px', height: '8px', width: '84%' }}></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>Meta: &lt;5% | Actual: 4.2%</div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1a2035' }}>ROI</span>
                    <span style={{ fontSize: '14px', color: '#31ce36', fontWeight: '600' }}>118%</span>
                  </div>
                  <div style={{ background: '#ebedf2', borderRadius: '10px', height: '8px' }}>
                    <div style={{ background: '#31ce36', borderRadius: '10px', height: '8px', width: '100%' }}></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>Meta: 20% | Actual: 23.5%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;