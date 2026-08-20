import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/authService';

interface KPIs {
  total_animales: number;
  cerdas_reproductoras: number;
  listos_para_venta: number;
  mortalidad_ultimo_mes: number;
  inventario: Array<{ categoria: string; cantidad: number }>;
}

interface FinancialSummary {
  totales: { ingresos: number; gastos: number; utilidad: number; margen: number };
}

interface CostoCategoria {
  categoria: string;
  total: number;
  mes: number;
  icon: string;
  color: string;
}

interface CostsSummary {
  costos: CostoCategoria[];
  totalAcumulado: number;
  totalMes: number;
}

interface Alert {
  tipo: string;
  titulo: string;
  mensaje: string;
  prioridad: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const fmtUSD = (n: number) => `$${n.toFixed(3)}`;

const ModernDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [finance, setFinance] = useState<FinancialSummary | null>(null);
  const [costs, setCosts] = useState<CostsSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/finance/summary').catch(() => ({ data: null })),
      api.get('/dashboard/costs').catch(() => ({ data: null })),
      api.get('/dashboard/alerts').catch(() => ({ data: [] }))
    ]).then(([kpisRes, financeRes, costsRes, alertsRes]) => {
      setKpis(kpisRes.data);
      setFinance(financeRes.data);
      setCosts(costsRes.data);
      setAlerts(alertsRes.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-inner">
        <div className="card">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            <p style={{ marginTop: '10px', color: '#6c757d' }}>Cargando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const alertColor = (p: string) => p === 'alta' ? '#fff3cd' : p === 'media' ? '#d1ecf1' : '#d4edda';
  const alertBorder = (p: string) => p === 'alta' ? '#ffeaa7' : p === 'media' ? '#bee5eb' : '#c3e6cb';
  const alertIcon = (p: string) => p === 'alta' ? 'fa-exclamation-triangle' : p === 'media' ? 'fa-info-circle' : 'fa-check-circle';
  const alertIconColor = (p: string) => p === 'alta' ? '#ffad46' : p === 'media' ? '#1572e8' : '#31ce36';

  return (
    <div className="page-inner">

      {/* ── KPIs animales ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { val: kpis?.total_animales ?? 0,        label: 'Total Animales',        color: '#1572e8', icon: 'fa-paw' },
          { val: kpis?.listos_para_venta ?? 0,     label: 'Listos para Venta',     color: '#31ce36', icon: 'fa-tag' },
          { val: kpis?.cerdas_reproductoras ?? 0,  label: 'Cerdas Reproductoras',  color: '#ffad46', icon: 'fa-venus' },
          { val: kpis?.mortalidad_ultimo_mes ?? 0, label: 'Mortalidad (30 días)',   color: '#f25961', icon: 'fa-skull' },
        ].map(k => (
          <div key={k.label} className="card">
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: k.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`fas ${k.icon}`} style={{ fontSize: '20px', color: k.color }}></i>
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: k.color, lineHeight: 1 }}>{k.val}</div>
                <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', marginTop: '4px' }}>{k.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Resumen financiero del mes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Ingresos del Mes',   val: finance?.totales?.ingresos ?? 0,  color: '#31ce36', icon: 'fa-arrow-up' },
          { label: 'Gastos del Mes',     val: finance?.totales?.gastos ?? 0,    color: '#f25961', icon: 'fa-arrow-down' },
          { label: 'Utilidad del Mes',   val: finance?.totales?.utilidad ?? 0,  color: '#1572e8', icon: 'fa-balance-scale' },
        ].map(k => (
          <div key={k.label} className="card">
            <div style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <i className={`fas ${k.icon}`} style={{ color: k.color, fontSize: '14px' }}></i>
                <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>{k.label}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: k.color }}>{fmt(k.val)}</div>
            </div>
          </div>
        ))}
        <div className="card">
          <div style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <i className="fas fa-percentage" style={{ color: '#6f42c1', fontSize: '14px' }}></i>
              <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>Margen</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#6f42c1' }}>{finance?.totales?.margen ?? 0}%</div>
          </div>
        </div>
      </div>

      {/* ── Desglose de Costos ── */}
      {costs && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 className="card-title" style={{ margin: 0 }}>
              <i className="fas fa-chart-pie" style={{ marginRight: '8px', color: '#f25961' }}></i>Desglose de Costos
            </h5>
            <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
              <span style={{ color: '#6c757d' }}>
                Este mes: <strong style={{ color: '#f25961' }}>{fmtUSD(costs.totalMes)}</strong>
              </span>
              <span style={{ color: '#6c757d' }}>
                Acumulado total: <strong style={{ color: '#1a2035' }}>{fmtUSD(costs.totalAcumulado)}</strong>
              </span>
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            {/* Cards por categoría */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {costs.costos.map(c => {
                const pct = costs.totalAcumulado > 0 ? (c.total / costs.totalAcumulado * 100) : 0;
                return (
                  <div key={c.categoria} style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px', borderLeft: `4px solid ${c.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <i className={`fas ${c.icon}`} style={{ color: c.color, fontSize: '16px' }}></i>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: '#1a2035' }}>{c.categoria}</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: c.color, marginBottom: '4px' }}>
                      {fmtUSD(c.total)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '8px' }}>
                      Este mes: <strong>{fmtUSD(c.mes)}</strong>
                    </div>
                    {/* Barra de proporción */}
                    <div style={{ background: '#e9ecef', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c.color, borderRadius: '4px', transition: 'width 0.6s ease' }}></div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '3px', textAlign: 'right' }}>{pct.toFixed(1)}% del total</div>
                  </div>
                );
              })}
            </div>

            {/* Barra apilada visual */}
            {costs.totalAcumulado > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', marginBottom: '6px' }}>DISTRIBUCIÓN ACUMULADA</div>
                <div style={{ display: 'flex', height: '20px', borderRadius: '10px', overflow: 'hidden', gap: '2px' }}>
                  {costs.costos.filter(c => c.total > 0).map(c => (
                    <div key={c.categoria}
                      title={`${c.categoria}: ${fmtUSD(c.total)} (${(c.total / costs.totalAcumulado * 100).toFixed(1)}%)`}
                      style={{ flex: c.total, background: c.color, transition: 'flex 0.6s ease' }}>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {costs.costos.filter(c => c.total > 0).map(c => (
                    <div key={c.categoria} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6c757d' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: c.color, flexShrink: 0 }}></div>
                      {c.categoria}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Inventario + Acciones + Alertas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

        <div className="card">
          <div className="card-header">
            <h5 className="card-title"><i className="fas fa-list" style={{ marginRight: '8px' }}></i>Inventario por Categoría</h5>
          </div>
          <div style={{ padding: '20px' }}>
            {kpis?.inventario && kpis.inventario.length > 0 ? kpis.inventario.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < kpis.inventario.length - 1 ? '1px solid #ebedf2' : 'none' }}>
                <span style={{ textTransform: 'capitalize', fontWeight: '500', color: '#1a2035' }}>{item.categoria}</span>
                <span style={{ background: '#1572e8', color: 'white', padding: '2px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>{item.cantidad}</span>
              </div>
            )) : (
              <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px 0' }}>Sin animales registrados</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h5 className="card-title"><i className="fas fa-bolt" style={{ marginRight: '8px' }}></i>Acciones Rápidas</h5>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {[
                { to: '/animals',   icon: 'fa-paw',        label: 'Registrar Animal',  cls: 'btn-primary' },
                { to: '/weights',   icon: 'fa-weight',     label: 'Registrar Peso',    cls: 'btn-success' },
                { to: '/health',    icon: 'fa-medkit',     label: 'Evento Sanitario',  cls: 'btn-warning' },
                { to: '/nutrition', icon: 'fa-utensils',   label: 'Alimentación',      cls: 'btn-info'    },
                { to: '/finance',   icon: 'fa-dollar-sign',label: 'Registrar Gasto',   cls: 'btn-danger'  },
                { to: '/reports',   icon: 'fa-chart-bar',  label: 'Ver Reportes',      cls: 'btn-secondary'},
              ].map(a => (
                <Link key={a.to} to={a.to} className={`btn ${a.cls}`} style={{ textDecoration: 'none', padding: '12px', textAlign: 'center' }}>
                  <i className={`fas ${a.icon}`} style={{ display: 'block', fontSize: '20px', marginBottom: '6px' }}></i>
                  <div style={{ fontSize: '12px', fontWeight: '600' }}>{a.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h5 className="card-title"><i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>Alertas</h5>
          </div>
          <div style={{ padding: '20px' }}>
            {alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {alerts.map((alert, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: alertColor(alert.prioridad), borderRadius: '8px', border: `1px solid ${alertBorder(alert.prioridad)}` }}>
                    <i className={`fas ${alertIcon(alert.prioridad)}`} style={{ fontSize: '18px', color: alertIconColor(alert.prioridad), flexShrink: 0 }}></i>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1a2035', fontSize: '13px' }}>{alert.titulo}</div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>{alert.mensaje}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#31ce36' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '36px', marginBottom: '10px', display: 'block' }}></i>
                <p style={{ margin: 0, fontWeight: '600' }}>Sin alertas pendientes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
