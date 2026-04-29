import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Notification {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  severidad: 'info' | 'warning' | 'error' | 'success';
  leida: boolean;
  fecha: string;
  icono: string;
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Simulación de notificaciones del sistema
      const mockNotifications: Notification[] = [
        {
          id: 1,
          tipo: 'reproductivo',
          titulo: 'Parto Próximo',
          mensaje: 'La cerda #123 tiene parto programado para mañana',
          severidad: 'warning',
          leida: false,
          fecha: new Date().toISOString(),
          icono: '🐷'
        },
        {
          id: 2,
          tipo: 'sanitario',
          titulo: 'Vacunación Pendiente',
          mensaje: '15 animales requieren vacuna triple en los próximos 3 días',
          severidad: 'info',
          leida: false,
          fecha: new Date(Date.now() - 3600000).toISOString(),
          icono: '💉'
        },
        {
          id: 3,
          tipo: 'peso',
          titulo: 'Animales Listos para Venta',
          mensaje: '8 cerdos han alcanzado el peso objetivo de 100kg',
          severidad: 'success',
          leida: true,
          fecha: new Date(Date.now() - 7200000).toISOString(),
          icono: '⚖️'
        },
        {
          id: 4,
          tipo: 'inventario',
          titulo: 'Stock Bajo de Alimento',
          mensaje: 'Concentrado de engorde por debajo del mínimo (50kg restantes)',
          severidad: 'error',
          leida: false,
          fecha: new Date(Date.now() - 10800000).toISOString(),
          icono: '🌾'
        },
        {
          id: 5,
          tipo: 'mantenimiento',
          titulo: 'Mantenimiento Programado',
          mensaje: 'Limpieza de corral #5 programada para hoy',
          severidad: 'info',
          leida: true,
          fecha: new Date(Date.now() - 14400000).toISOString(),
          icono: '🔧'
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, leida: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, leida: true }))
    );
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const getSeverityColor = (severidad: string) => {
    const colors = {
      info: '#3498db',
      warning: '#f39c12',
      error: '#e74c3c',
      success: '#27ae60'
    };
    return colors[severidad as keyof typeof colors] || '#6c757d';
  };

  const getSeverityBg = (severidad: string) => {
    const colors = {
      info: '#e3f2fd',
      warning: '#fff3e0',
      error: '#ffebee',
      success: '#e8f5e8'
    };
    return colors[severidad as keyof typeof colors] || '#f8f9fa';
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.leida;
    if (filter === 'important') return notif.severidad === 'error' || notif.severidad === 'warning';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.leida).length;

  return (
    <div className="fade-in container" style={{ maxWidth: '1000px' }}>
      <div className="card-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="card-title">
              🔔 Centro de Notificaciones
            </h1>
            <p className="card-subtitle">
              Alertas y notificaciones del sistema en tiempo real
            </p>
          </div>
          {unreadCount > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '25px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>📬</span>
              <span style={{ fontWeight: 'bold' }}>{unreadCount} sin leer</span>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="p-3">
          {/* Filtros y Acciones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { key: 'all', label: '📋 Todas', count: notifications.length },
                { key: 'unread', label: '📬 Sin Leer', count: unreadCount },
                { key: 'important', label: '⚠️ Importantes', count: notifications.filter(n => n.severidad === 'error' || n.severidad === 'warning').length }
              ].map(filterOption => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key as any)}
                  style={{
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: filter === filterOption.key ? '#667eea' : '#f8f9fa',
                    color: filter === filterOption.key ? 'white' : '#495057',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {filterOption.label}
                  <span style={{
                    background: filter === filterOption.key ? 'rgba(255,255,255,0.3)' : '#dee2e6',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {filterOption.count}
                  </span>
                </button>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: unreadCount > 0 ? '#28a745' : '#6c757d',
                  color: 'white',
                  cursor: unreadCount > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                ✅ Marcar Todas como Leídas
              </button>
              <button
                onClick={loadNotifications}
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? '🔄 Actualizando...' : '🔄 Actualizar'}
              </button>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="notifications-list">
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
                <div style={{ fontSize: '18px', color: '#667eea' }}>Cargando notificaciones...</div>
              </div>
            )}

            {!loading && filteredNotifications.length === 0 && (
              <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
                <h3 style={{ color: '#495057', marginBottom: '8px' }}>No hay notificaciones</h3>
                <p style={{ color: '#6c757d' }}>
                  {filter === 'unread' ? 'Todas las notificaciones están leídas' : 
                   filter === 'important' ? 'No hay notificaciones importantes' : 
                   'No tienes notificaciones en este momento'}
                </p>
              </div>
            )}

            {!loading && filteredNotifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  background: notification.leida ? '#f8f9fa' : getSeverityBg(notification.severidad),
                  border: `2px solid ${notification.leida ? '#e9ecef' : getSeverityColor(notification.severidad)}`,
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '15px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  opacity: notification.leida ? 0.8 : 1
                }}
                onClick={() => !notification.leida && markAsRead(notification.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '15px', flex: 1 }}>
                    <div style={{ fontSize: '32px' }}>{notification.icono}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <h4 style={{ 
                          margin: 0, 
                          color: getSeverityColor(notification.severidad),
                          fontSize: '18px',
                          fontWeight: '700'
                        }}>
                          {notification.titulo}
                        </h4>
                        {!notification.leida && (
                          <span style={{
                            background: getSeverityColor(notification.severidad),
                            color: 'white',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            NUEVO
                          </span>
                        )}
                      </div>
                      <p style={{ 
                        margin: '0 0 10px 0', 
                        color: '#495057',
                        fontSize: '16px',
                        lineHeight: '1.5'
                      }}>
                        {notification.mensaje}
                      </p>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#6c757d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>🕒</span>
                        <span>{new Date(notification.fecha).toLocaleString()}</span>
                        <span>•</span>
                        <span style={{ 
                          textTransform: 'capitalize',
                          fontWeight: '600',
                          color: getSeverityColor(notification.severidad)
                        }}>
                          {notification.tipo}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                    {!notification.leida && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        style={{
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ✓ Marcar Leída
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;