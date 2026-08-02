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

interface Alert {
  tipo: string;
  titulo: string;
  mensaje: string;
  prioridad: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

const ModernDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [finance, setFinance] = useState<FinancialSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/kpis'),
      api.get('/finance/summary').catch(() => ({ data: null })),
      api.get('/dashboard/alerts').catch(() => ({ data: [] }))
    ]).then(([kpisRes, financeRes, alertsRes]) => {
      setKpis(kpisRes.data);
      setFinance(financeRes.data);
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
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1572e8' }}>{kpis?.total_animales ?? 0}</div>
            <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', marginTop: '8px' }}>Total Animales</div>
          </div>
        </div>
        <div className="card">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#31ce36' }}>{kpis?.listos_para_venta ?? 0}</div>
            <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', marginTop: '8px' }}>Listos para Venta</div>
          </div>
        </div>
        <div className="card">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#ffad46' }}>{kpis?.cerdas_reproductoras ?? 0}</div>
            <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', marginTop: '8px' }}>Cerdas Reproductoras</div>
          </div>
        </div>
        <div className="card">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#f25961' }}>{kpis?.mortalidad_ultimo_mes ?? 0}</div>
            <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase', marginTop: '8px' }}>Mortalidad (30 días)</div>
          </div>
        </div>
      </div>

      {/* Financiero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ padding: '25px' }}>
            <h5 style={{ margin: '0 0 15px', color: '#1a2035', fontWeight: '600' }}>
              <i className="fas fa-dollar-sign" style={{ marginRight: '8px', color: '#31ce36' }}></i>Ingresos del Mes
            </h5>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#31ce36' }}>
              {formatCurrency(finance?.totales?.ingresos ?? 0)}
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ padding: '25px' }}>
            <h5 style={{ margin: '0 0 15px', color: '#1a2035', fontWeight: '600' }}>
              <i className="fas fa-credit-card" style={{ marginRight: '8px', color: '#f25961' }}></i>Gastos del Mes
            </h5>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f25961' }}>
              {formatCurrency(finance?.totales?.gastos ?? 0)}
            </div>
          </div>
        </div>
        <div className="card">
          <div style={{ padding: '25px' }}>
            <h5 style={{ margin: '0 0 15px', color: '#1a2035', fontWeight: '600' }}>
              <i className="fas fa-percentage" style={{ marginRight: '8px', color: '#1572e8' }}></i>Margen de Ganancia
            </h5>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1572e8' }}>
              {finance?.totales?.margen ?? 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Inventario + Acciones + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

        {/* Inventario por categoría */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title"><i className="fas fa-list" style={{ marginRight: '8px' }}></i>Inventario por Categoría</h5>
          </div>
          <div style={{ padding: '20px' }}>
            {kpis?.inventario && kpis.inventario.length > 0 ? kpis.inventario.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < kpis.inventario.length - 1 ? '1px solid #ebedf2' : 'none' }}>
                <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{item.categoria}</span>
                <span style={{ background: '#1572e8', color: 'white', padding: '2px 12px', borderRadius: '20px', fontSize: '14px' }}>{item.cantidad}</span>
              </div>
            )) : (
              <p style={{ color: '#6c757d', textAlign: 'center', padding: '20px 0' }}>Sin animales registrados</p>
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title"><i className="fas fa-bolt" style={{ marginRight: '8px' }}></i>Acciones Rápidas</h5>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
              <Link to="/animals" className="btn btn-primary" style={{ textDecoration: 'none', padding: '15px', textAlign: 'center' }}>
                <i className="fas fa-paw" style={{ display: 'block', fontSize: '24px', marginBottom: '8px' }}></i>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Registrar Animal</div>
              </Link>
              <Link to="/weights" className="btn btn-success" style={{ textDecoration: 'none', padding: '15px', textAlign: 'center' }}>
                <i className="fas fa-weight" style={{ display: 'block', fontSize: '24px', marginBottom: '8px' }}></i>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Registrar Peso</div>
              </Link>
              <Link to="/health" className="btn btn-warning" style={{ textDecoration: 'none', padding: '15px', textAlign: 'center' }}>
                <i className="fas fa-medkit" style={{ display: 'block', fontSize: '24px', marginBottom: '8px' }}></i>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Evento Sanitario</div>
              </Link>
              <Link to="/finance" className="btn btn-danger" style={{ textDecoration: 'none', padding: '15px', textAlign: 'center' }}>
                <i className="fas fa-dollar-sign" style={{ display: 'block', fontSize: '24px', marginBottom: '8px' }}></i>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Registrar Gasto</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Alertas */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title"><i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>Alertas</h5>
          </div>
          <div style={{ padding: '20px' }}>
            {alerts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alerts.map((alert, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: alertColor(alert.prioridad), borderRadius: '8px', border: `1px solid ${alertBorder(alert.prioridad)}` }}>
                    <i className={`fas ${alertIcon(alert.prioridad)}`} style={{ fontSize: '20px', color: alertIconColor(alert.prioridad) }}></i>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1a2035' }}>{alert.titulo}</div>
                      <div style={{ fontSize: '13px', color: '#6c757d' }}>{alert.mensaje}</div>
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
