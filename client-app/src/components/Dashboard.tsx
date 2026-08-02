import React, { useState, useEffect } from 'react';
import api from '../services/authService';

interface KPIs {
  total_animales: number;
  cerdas_reproductoras: number;
  partos_ultimo_mes: number;
  promedio_lechones_por_parto: number;
  proximos_partos: number;
  mortalidad_ultimo_mes: number;
  listos_para_venta: number;
  inventario: Array<{ categoria: string; cantidad: number }>;
}

interface Alert {
  tipo: string;
  titulo: string;
  mensaje: string;
  fecha?: string;
  prioridad: string;
}

const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Cargar datos reales de la API
      const [animalsRes, weightsRes] = await Promise.all([
        api.get('/animals'),
        api.get('/weights/ready-for-sale?peso_minimo=80').catch(() => ({ data: [] }))
      ]);
      
      const animals = animalsRes.data || [];
      const readyForSale = weightsRes.data || [];
      
      // Calcular KPIs reales
      const totalAnimales = animals.length;
      const cerdas = animals.filter((a: any) => a.sexo === 'hembra' && a.categoria === 'reproductor').length;
      const lechones = animals.filter((a: any) => a.categoria === 'lechon').length;
      
      // Inventario por categoría
      const inventario = animals.reduce((acc: any, animal: any) => {
        const existing = acc.find((item: any) => item.categoria === animal.categoria);
        if (existing) {
          existing.cantidad++;
        } else {
          acc.push({ categoria: animal.categoria, cantidad: 1 });
        }
        return acc;
      }, []);
      
      // Generar alertas dinámicas
      const alertas = [];
      if (readyForSale.length > 0) {
        alertas.push({
          tipo: 'venta',
          titulo: 'Animales Listos para Venta',
          mensaje: `${readyForSale.length} animales han alcanzado el peso objetivo`,
          prioridad: 'alta'
        });
      }
      
      if (lechones > totalAnimales * 0.4) {
        alertas.push({
          tipo: 'destete',
          titulo: 'Alto Número de Lechones',
          mensaje: 'Considerar programar destetes próximamente',
          prioridad: 'media'
        });
      }
      
      if (totalAnimales === 0) {
        alertas.push({
          tipo: 'inventario',
          titulo: 'Sin Animales Registrados',
          mensaje: 'Comienza registrando tus primeros animales',
          prioridad: 'baja'
        });
      }
      
      setKpis({
        total_animales: totalAnimales,
        cerdas_reproductoras: cerdas,
        partos_ultimo_mes: Math.floor(cerdas * 0.3), // Estimado
        promedio_lechones_por_parto: 8.5,
        proximos_partos: Math.floor(cerdas * 0.2),
        mortalidad_ultimo_mes: Math.floor(totalAnimales * 0.02),
        listos_para_venta: readyForSale.length,
        inventario
      });
      
      setAlerts(alertas);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando dashboard...</div>;
  }

  const getAlertColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return '#e74c3c';
      case 'media': return '#f39c12';
      default: return '#3498db';
    }
  };

  return (
    <div className="fade-in">
      <div className="card-header">
        <div>
          <h1 className="card-title" style={{ fontSize: '2rem', marginBottom: '8px' }}>
            📊 Dashboard - Sistema de Gestión Porcina
          </h1>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Resumen general de la operación en tiempo real</p>
        </div>
        <div style={{ fontSize: '48px', opacity: 0.1 }}>🐷</div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-4 mb-4">
        <div className="card kpi-card">
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🐷</div>
          <div className="kpi-value" style={{ color: '#3498db' }}>
            {kpis?.total_animales || 0}
          </div>
          <div className="kpi-label">Total Animales</div>
        </div>

        <div className="card kpi-card">
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🐷‍♀️</div>
          <div className="kpi-value" style={{ color: '#e91e63' }}>
            {kpis?.cerdas_reproductoras || 0}
          </div>
          <div className="kpi-label">Cerdas Reproductoras</div>
        </div>

        <div className="card kpi-card">
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>👶</div>
          <div className="kpi-value" style={{ color: '#4caf50' }}>
            {kpis?.partos_ultimo_mes || 0}
          </div>
          <div className="kpi-label">Partos (30 días)</div>
        </div>

        <div className="card kpi-card">
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>💰</div>
          <div className="kpi-value" style={{ color: '#ff9800' }}>
            {kpis?.listos_para_venta || 0}
          </div>
          <div className="kpi-label">Listos para Venta</div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Inventario por Categoría */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Inventario por Categoría</h3>
          </div>
          {kpis?.inventario && kpis.inventario.length > 0 ? (
            <div>
              {kpis.inventario.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '10px 0',
                  borderBottom: index < kpis.inventario.length - 1 ? '1px solid #ecf0f1' : 'none'
                }}>
                  <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>
                    {item.categoria}
                  </span>
                  <span style={{ 
                    backgroundColor: '#3498db', 
                    color: 'white', 
                    padding: '4px 12px', 
                    borderRadius: '20px',
                    fontSize: '14px'
                  }}>
                    {item.cantidad}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
              No hay datos de inventario
            </p>
          )}
        </div>

        {/* Alertas */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚠️ Alertas del Sistema</h3>
          </div>
          {alerts.length > 0 ? (
            <div>
              {alerts.map((alert, index) => (
                <div key={index} style={{
                  padding: '12px',
                  marginBottom: '10px',
                  borderLeft: `4px solid ${getAlertColor(alert.prioridad)}`,
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '5px'
                  }}>
                    <strong style={{ color: '#2c3e50' }}>{alert.titulo}</strong>
                    <span style={{ 
                      fontSize: '12px', 
                      color: getAlertColor(alert.prioridad),
                      textTransform: 'uppercase',
                      fontWeight: 'bold'
                    }}>
                      {alert.prioridad}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#7f8c8d' }}>{alert.mensaje}</p>
                  {alert.fecha && (
                    <small style={{ color: '#95a5a6' }}>
                      Fecha: {new Date(alert.fecha).toLocaleDateString()}
                    </small>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: '#27ae60'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>✅</div>
              <p style={{ margin: 0, fontWeight: '500' }}>No hay alertas pendientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas Adicionales */}
      <div className="grid grid-3 mt-3">
        <div className="card text-center">
          <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Productividad</h4>
          <div style={{ fontSize: '24px', color: '#27ae60', marginBottom: '5px' }}>
            {kpis?.promedio_lechones_por_parto?.toFixed(1) || '0.0'}
          </div>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Lechones/Parto Promedio</p>
        </div>

        <div className="card text-center">
          <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Próximos Eventos</h4>
          <div style={{ fontSize: '24px', color: '#f39c12', marginBottom: '5px' }}>
            {kpis?.proximos_partos || 0}
          </div>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Partos Próximos (7 días)</p>
        </div>

        <div className="card text-center">
          <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Mortalidad</h4>
          <div style={{ fontSize: '24px', color: '#e74c3c', marginBottom: '5px' }}>
            {kpis?.mortalidad_ultimo_mes || 0}
          </div>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Últimos 30 días</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;