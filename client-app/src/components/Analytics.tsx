import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface KPIs {
  mortalidad_pre_destete: number;
  promedio_lechones: number;
  ganancia_diaria: number;
  dias_mercado: number;
  costo_kg_producido: number;
  roi: number;
  total_ingresos: number;
  total_gastos: number;
}

interface Trend {
  mes: string;
  ingresos: number;
  gastos: number;
  animales: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const kpiStatus = (value: number, target: number, reverse = false) => {
  const pct = (value / target) * 100;
  if (reverse) return pct <= 100 ? '#31ce36' : pct <= 120 ? '#ffad46' : '#f25961';
  return pct >= 100 ? '#31ce36' : pct >= 80 ? '#ffad46' : '#f25961';
};

const Analytics: React.FC = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('6');
  const [metric, setMetric] = useState<'ingresos' | 'gastos' | 'animales'>('ingresos');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/analytics/kpis?months=${period}`),
      api.get(`/analytics/trends?months=${period}`)
    ]).then(([kpisRes, trendsRes]) => {
      setKpis(kpisRes.data);
      setTrends(trendsRes.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

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

  const maxTrend = Math.max(...trends.map(t => t[metric] || 0), 1);

  return (
    <div className="page-inner">
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h4 className="card-title">
              <i className="fas fa-chart-bar" style={{ marginRight: '10px' }}></i>
              Analytics
            </h4>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ebedf2', borderRadius: '8px', fontSize: '14px' }}
            >
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Último año</option>
            </select>
          </div>
        </div>

        <div style={{ padding: '25px' }}>

          {/* KPIs */}
          <h5 style={{ color: '#1a2035', marginBottom: '15px' }}>
            <i className="fas fa-tachometer-alt" style={{ marginRight: '8px' }}></i>
            Indicadores Clave
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {[
              { label: 'Mortalidad Pre-destete', value: `${kpis?.mortalidad_pre_destete ?? 0}%`, color: kpiStatus(kpis?.mortalidad_pre_destete ?? 0, 5, true), meta: 'Meta: <5%' },
              { label: 'Lechones/Parto', value: kpis?.promedio_lechones ?? 0, color: kpiStatus(kpis?.promedio_lechones ?? 0, 10), meta: 'Meta: 10+' },
              { label: 'Ganancia Diaria', value: `${kpis?.ganancia_diaria ?? 0}g`, color: kpiStatus(kpis?.ganancia_diaria ?? 0, 500), meta: 'Meta: 500g+' },
              { label: 'Días a Mercado', value: kpis?.dias_mercado ?? 0, color: kpiStatus(kpis?.dias_mercado ?? 0, 170, true), meta: 'Meta: <170' },
              { label: 'Costo/Kg Producido', value: formatCurrency(kpis?.costo_kg_producido ?? 0), color: '#1572e8', meta: '' },
              { label: 'ROI del Período', value: `${kpis?.roi ?? 0}%`, color: kpiStatus(kpis?.roi ?? 0, 20), meta: 'Meta: 20%+' },
              { label: 'Ingresos', value: formatCurrency(kpis?.total_ingresos ?? 0), color: '#31ce36', meta: '' },
              { label: 'Gastos', value: formatCurrency(kpis?.total_gastos ?? 0), color: '#f25961', meta: '' },
            ].map((kpi, i) => (
              <div key={i} className="card">
                <div style={{ padding: '18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: kpi.color, marginBottom: '6px' }}>{kpi.value}</div>
                  <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>{kpi.label}</div>
                  {kpi.meta && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>{kpi.meta}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Tendencias */}
          <div className="card" style={{ marginBottom: '25px' }}>
            <div className="card-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h5 className="card-title">
                  <i className="fas fa-chart-line" style={{ marginRight: '8px' }}></i>
                  Tendencias por Mes
                </h5>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['ingresos', 'gastos', 'animales'] as const).map(m => (
                    <button key={m} onClick={() => setMetric(m)}
                      className={`btn btn-sm ${metric === m ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ textTransform: 'capitalize' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              {trends.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '180px' }}>
                  {trends.map((t, i) => {
                    const val = t[metric] || 0;
                    const height = Math.max((val / maxTrend) * 150, 4);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ fontSize: '10px', color: '#6c757d', textAlign: 'center' }}>
                          {metric !== 'animales' ? formatCurrency(val) : val}
                        </div>
                        <div style={{ width: '100%', height: `${height}px`, background: metric === 'ingresos' ? '#31ce36' : metric === 'gastos' ? '#f25961' : '#1572e8', borderRadius: '4px 4px 0 0' }}></div>
                        <div style={{ fontSize: '11px', color: '#6c757d', fontWeight: '600' }}>{t.mes}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-chart-bar" style={{ fontSize: '36px', marginBottom: '10px', display: 'block', opacity: 0.3 }}></i>
                  Sin datos para el período seleccionado
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Analytics;
