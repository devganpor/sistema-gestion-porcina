import React, { useState, useEffect } from 'react';
import api from '../services/authService';
import { useNotifications, useErrorHandler } from './NotificationSystem';

interface KPIData {
  totalAnimales: number;
  animalesActivos: number;
  cerdosReproductores: number;
  lechonesPendientes: number;
  pesoPromedio: number;
  alertas: Alert[];
  ventasDelMes: number;
  gastosDelMes: number;
  rentabilidad: number;
}

interface Alert {
  id: number;
  tipo: string;
  mensaje: string;
  prioridad: 'alta' | 'media' | 'baja';
  fecha: string;
}

const Dashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess } = useNotifications();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    loadDashboardData();
    // Actualizar cada 5 minutos
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/dashboard/kpis');
      setKpis(response.data);
    } catch (error) {
      handleError(error, 'Error cargando datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      await api.post('/admin/backup');
      showSuccess('Backup creado', 'El backup se ha creado exitosamente');
    } catch (error) {
      handleError(error, 'Error creando backup');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="error-state">
        <h3>Error cargando datos</h3>
        <button className="btn btn-primary" onClick={loadDashboardData}>
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">📊 Dashboard de Gestión</h1>
          <p className="dashboard-subtitle">
            Resumen ejecutivo de tu granja porcina
          </p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={createBackup}>
            💾 Crear Backup
          </button>
          <button className="btn btn-primary" onClick={loadDashboardData}>
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <div className="kpi-icon">🐷</div>
          <div className="kpi-content">
            <h3 className="kpi-value">{kpis.totalAnimales}</h3>
            <p className="kpi-label">Total Animales</p>
            <span className="kpi-change positive">
              {kpis.animalesActivos} activos
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-icon">🐽</div>
          <div className="kpi-content">
            <h3 className="kpi-value">{kpis.cerdosReproductores}</h3>
            <p className="kpi-label">Reproductores</p>
            <span className="kpi-change">
              En producción
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-icon">🍼</div>
          <div className="kpi-content">
            <h3 className="kpi-value">{kpis.lechonesPendientes}</h3>
            <p className="kpi-label">Lechones</p>
            <span className="kpi-change">
              Pendientes destete
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-info">
          <div className="kpi-icon">⚖️</div>
          <div className="kpi-content">
            <h3 className="kpi-value">{kpis.pesoPromedio.toFixed(1)} kg</h3>
            <p className="kpi-label">Peso Promedio</p>
            <span className="kpi-change">
              Última semana
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-success">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <h3 className="kpi-value">${kpis.ventasDelMes.toLocaleString()}</h3>
            <p className="kpi-label">Ventas del Mes</p>
            <span className="kpi-change positive">
              +{((kpis.ventasDelMes / (kpis.ventasDelMes + kpis.gastosDelMes)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-danger">
          <div className="kpi-icon">💸</div>
          <div className="kpi-content">
            <h3 className="kpi-value">${kpis.gastosDelMes.toLocaleString()}</h3>
            <p className="kpi-label">Gastos del Mes</p>
            <span className="kpi-change">
              Operativos
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-primary">
          <div className="kpi-icon">📈</div>
          <div className="kpi-content">
            <h3 className="kpi-value">{kpis.rentabilidad.toFixed(1)}%</h3>
            <p className="kpi-label">Rentabilidad</p>
            <span className={`kpi-change ${kpis.rentabilidad > 0 ? 'positive' : 'negative'}`}>
              {kpis.rentabilidad > 0 ? 'Ganancia' : 'Pérdida'}
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-content">
            <h3 className="kpi-value">{kpis.alertas.length}</h3>
            <p className="kpi-label">Alertas Activas</p>
            <span className="kpi-change">
              Requieren atención
            </span>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {kpis.alertas.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🚨 Alertas del Sistema</h3>
            <div className="badge badge-warning">{kpis.alertas.length} alertas</div>
          </div>
          <div className="alerts-container">
            {kpis.alertas.map(alerta => (
              <div key={alerta.id} className={`alert alert-${alerta.prioridad}`}>
                <div className="alert-icon">
                  {alerta.prioridad === 'alta' ? '🔴' : 
                   alerta.prioridad === 'media' ? '🟡' : '🔵'}
                </div>
                <div className="alert-content">
                  <h4 className="alert-title">{alerta.tipo}</h4>
                  <p className="alert-message">{alerta.mensaje}</p>
                  <span className="alert-date">
                    {new Date(alerta.fecha).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones Rápidas */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">⚡ Acciones Rápidas</h3>
        </div>
        <div className="quick-actions">
          <button className="quick-action-btn" onClick={() => window.location.href = '/animals'}>
            <div className="quick-action-icon">🐷</div>
            <span>Registrar Animal</span>
          </button>
          <button className="quick-action-btn" onClick={() => window.location.href = '/weights'}>
            <div className="quick-action-icon">⚖️</div>
            <span>Registrar Peso</span>
          </button>
          <button className="quick-action-btn" onClick={() => window.location.href = '/health'}>
            <div className="quick-action-icon">💉</div>
            <span>Evento Sanitario</span>
          </button>
          <button className="quick-action-btn" onClick={() => window.location.href = '/reproduction'}>
            <div className="quick-action-icon">❤️</div>
            <span>Ciclo Reproductivo</span>
          </button>
          <button className="quick-action-btn" onClick={() => window.location.href = '/finance'}>
            <div className="quick-action-icon">💰</div>
            <span>Registrar Gasto</span>
          </button>
          <button className="quick-action-btn" onClick={() => window.location.href = '/reports'}>
            <div className="quick-action-icon">📊</div>
            <span>Ver Reportes</span>
          </button>
        </div>
      </div>

      {/* Información del Sistema */}
      <div className="system-info">
        <div className="system-info-item">
          <span className="system-info-label">Última actualización:</span>
          <span className="system-info-value">{new Date().toLocaleString()}</span>
        </div>
        <div className="system-info-item">
          <span className="system-info-label">Estado del sistema:</span>
          <span className="system-info-value status-online">🟢 En línea</span>
        </div>
        <div className="system-info-item">
          <span className="system-info-label">Versión:</span>
          <span className="system-info-value">v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;