import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalAnimals: number;
  activeAnimals: number;
  readyForSale: number;
  pregnantSows: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  profitMargin: number;
  feedConversion: number;
}

const ModernDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const mockStats: DashboardStats = {
        totalAnimals: 1247,
        activeAnimals: 1189,
        readyForSale: 23,
        pregnantSows: 45,
        monthlyRevenue: 125000,
        monthlyExpenses: 87500,
        profitMargin: 30.2,
        feedConversion: 2.8
      };
      
      setTimeout(() => {
        setStats(mockStats);
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

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

  return (
    <div className="page-inner">
      {/* KPIs Principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1572e8', marginBottom: '10px' }}>
              {stats?.totalAnimals.toLocaleString()}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
              Total Animales
            </div>
            <div style={{ fontSize: '12px', color: '#31ce36', fontWeight: '600', marginTop: '5px' }}>
              <i className="fas fa-arrow-up" style={{ marginRight: '5px' }}></i>
              +12 esta semana
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#31ce36', marginBottom: '10px' }}>
              {stats?.readyForSale}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
              Listos para Venta
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
              Peso promedio: 105kg
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#ffad46', marginBottom: '10px' }}>
              {stats?.pregnantSows}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
              Cerdas Gestantes
            </div>
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '5px' }}>
              8 partos próximos
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1572e8', marginBottom: '10px' }}>
              {stats?.feedConversion}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
              Conversión Alimenticia
            </div>
            <div style={{ fontSize: '12px', color: '#31ce36', fontWeight: '600', marginTop: '5px' }}>
              <i className="fas fa-arrow-up" style={{ marginRight: '5px' }}></i>
              Mejorando
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Financieras */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h5 style={{ margin: 0, color: '#1a2035', fontWeight: '600' }}>
                <i className="fas fa-dollar-sign" style={{ marginRight: '8px', color: '#31ce36' }}></i>
                Ingresos del Mes
              </h5>
              <i className="fas fa-chart-line" style={{ fontSize: '24px', color: '#31ce36' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#31ce36', marginBottom: '10px' }}>
              {formatCurrency(stats?.monthlyRevenue || 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              +15.3% vs mes anterior
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h5 style={{ margin: 0, color: '#1a2035', fontWeight: '600' }}>
                <i className="fas fa-credit-card" style={{ marginRight: '8px', color: '#f25961' }}></i>
                Gastos del Mes
              </h5>
              <i className="fas fa-chart-line-down" style={{ fontSize: '24px', color: '#f25961' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#f25961', marginBottom: '10px' }}>
              {formatCurrency(stats?.monthlyExpenses || 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              +8.7% vs mes anterior
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h5 style={{ margin: 0, color: '#1a2035', fontWeight: '600' }}>
                <i className="fas fa-percentage" style={{ marginRight: '8px', color: '#1572e8' }}></i>
                Margen de Ganancia
              </h5>
              <i className="fas fa-bullseye" style={{ fontSize: '24px', color: '#1572e8' }}></i>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1572e8', marginBottom: '10px' }}>
              {stats?.profitMargin}%
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Meta: 35%
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas y Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="fas fa-bolt" style={{ marginRight: '8px' }}></i>
              Acciones Rápidas
            </h5>
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
              <Link to="/reproduction" className="btn btn-danger" style={{ textDecoration: 'none', padding: '15px', textAlign: 'center' }}>
                <i className="fas fa-heart" style={{ display: 'block', fontSize: '24px', marginBottom: '8px' }}></i>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>Control Reproductivo</div>
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
              Alertas Importantes
            </h5>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '20px', color: '#ffad46' }}></i>
                <div>
                  <div style={{ fontWeight: '600', color: '#1a2035' }}>Stock de Alimento Bajo</div>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>Concentrado de engorde: 2 días restantes</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#d1ecf1', borderRadius: '8px', border: '1px solid #bee5eb' }}>
                <i className="fas fa-syringe" style={{ fontSize: '20px', color: '#1572e8' }}></i>
                <div>
                  <div style={{ fontWeight: '600', color: '#1a2035' }}>Vacunación Programada</div>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>15 animales requieren vacuna triple</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#d4edda', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '20px', color: '#31ce36' }}></i>
                <div>
                  <div style={{ fontWeight: '600', color: '#1a2035' }}>Meta Alcanzada</div>
                  <div style={{ fontSize: '13px', color: '#6c757d' }}>Conversión alimenticia mejoró 5%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;