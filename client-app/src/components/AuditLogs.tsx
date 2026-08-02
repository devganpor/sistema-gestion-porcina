import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/authService';

interface AuditLog {
  id: number;
  usuario_id: number;
  usuario_email: string;
  usuario_nombre: string;
  accion: string;
  modulo: string;
  descripcion: string;
  entidad: string;
  entidad_id: string;
  ip: string;
  user_agent: string;
  metodo: string;
  ruta: string;
  datos_nuevos: any;
  exitoso: boolean;
  created_at: string;
}

interface Stats {
  totales: { total: string | number; exitosos: string | number; fallidos: string | number };
  por_accion: { accion: string; total: string | number }[];
  por_modulo: { modulo: string; total: string | number }[];
  por_usuario: { usuario_nombre: string; usuario_email: string; total: string | number }[];
  por_dia: { fecha: string; total: string | number }[];
  fallidos: AuditLog[];
}

const ACCION_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  CREATE: { color: '#31ce36', icon: 'fa-plus-circle',   label: 'Creación'      },
  UPDATE: { color: '#ffad46', icon: 'fa-edit',           label: 'Actualización' },
  DELETE: { color: '#f25961', icon: 'fa-trash',          label: 'Eliminación'   },
  LOGIN:  { color: '#1572e8', icon: 'fa-sign-in-alt',    label: 'Login'         },
  LOGOUT: { color: '#6c757d', icon: 'fa-sign-out-alt',   label: 'Logout'        },
};

const fmt = (d: string) => new Date(d).toLocaleString('es-CO', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

const AuditLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'stats'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [filters, setFilters] = useState({
    buscar: '', accion: '', modulo: '', exitoso: '',
    fecha_inicio: thirtyDaysAgo, fecha_fin: today, usuario_id: ''
  });

  const loadLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: 50, ...filters };
      Object.keys(params).forEach(k => { if (!params[k] && params[k] !== false) delete params[k]; });
      const res = await api.get('/audit', { params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/audit/stats', {
        params: { fecha_inicio: filters.fecha_inicio, fecha_fin: filters.fecha_fin }
      });
      setStats(res.data);
    } catch { setStats(null); }
  }, [filters.fecha_inicio, filters.fecha_fin]);

  useEffect(() => { loadLogs(1); }, []);
  useEffect(() => { if (activeTab === 'stats') loadStats(); }, [activeTab]);

  const handleSearch = () => { loadLogs(1); if (activeTab === 'stats') loadStats(); };
  const handleClear = () => {
    setFilters({ buscar: '', accion: '', modulo: '', exitoso: '',
                 fecha_inicio: thirtyDaysAgo, fecha_fin: today, usuario_id: '' });
  };

  const accionBadge = (accion: string, exitoso: boolean) => {
    const cfg = ACCION_CONFIG[accion] || { color: '#6c757d', icon: 'fa-circle', label: accion };
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
        background: exitoso ? cfg.color + '20' : '#f2596120',
        color: exitoso ? cfg.color : '#f25961',
        border: `1px solid ${exitoso ? cfg.color + '40' : '#f2596140'}` }}>
        <i className={`fas ${cfg.icon}`}></i>
        {cfg.label}
      </span>
    );
  };

  const MODULOS = ['Animales','Reproducción','Pesajes','Sanidad','Finanzas',
                   'Ubicaciones','Nutrición','Genealogía','Usuarios','Autenticación','Reportes'];

  return (
    <div className="page-inner">
      <div className="card">
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #1a2035 0%, #2d3561 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h4 className="card-title" style={{ margin: 0, color: 'white' }}>
                <i className="fas fa-shield-alt" style={{ marginRight: '10px' }}></i>
                Auditoría del Sistema
              </h4>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                Registro completo de acciones por usuario — {total.toLocaleString()} eventos
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['logs', 'stats'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    fontWeight: '600', fontSize: '13px',
                    background: activeTab === t ? 'white' : 'rgba(255,255,255,0.15)',
                    color: activeTab === t ? '#1a2035' : 'white' }}>
                  <i className={`fas ${t === 'logs' ? 'fa-list' : 'fa-chart-bar'}`} style={{ marginRight: '6px' }}></i>
                  {t === 'logs' ? 'Registros' : 'Estadísticas'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 25px' }}>
          {/* Filtros */}
          <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Buscar</label>
                <input className="form-control" placeholder="Usuario, descripción, ruta..."
                  value={filters.buscar} onChange={e => setFilters({ ...filters, buscar: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} style={{ fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Acción</label>
                <select className="form-control" value={filters.accion} onChange={e => setFilters({ ...filters, accion: e.target.value })} style={{ fontSize: '13px' }}>
                  <option value="">Todas</option>
                  {Object.entries(ACCION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Módulo</label>
                <select className="form-control" value={filters.modulo} onChange={e => setFilters({ ...filters, modulo: e.target.value })} style={{ fontSize: '13px' }}>
                  <option value="">Todos</option>
                  {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Estado</label>
                <select className="form-control" value={filters.exitoso} onChange={e => setFilters({ ...filters, exitoso: e.target.value })} style={{ fontSize: '13px' }}>
                  <option value="">Todos</option>
                  <option value="true">Exitoso</option>
                  <option value="false">Fallido</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Desde</label>
                <input type="date" className="form-control" value={filters.fecha_inicio}
                  onChange={e => setFilters({ ...filters, fecha_inicio: e.target.value })} style={{ fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', display: 'block', marginBottom: '4px' }}>Hasta</label>
                <input type="date" className="form-control" value={filters.fecha_fin}
                  onChange={e => setFilters({ ...filters, fecha_fin: e.target.value })} style={{ fontSize: '13px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSearch}>
                <i className="fas fa-search" style={{ marginRight: '6px' }}></i>Buscar
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleClear}>
                <i className="fas fa-times" style={{ marginRight: '6px' }}></i>Limpiar
              </button>
            </div>
          </div>

          {/* TAB: REGISTROS */}
          {activeTab === 'logs' && (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                  Cargando registros...
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Fecha / Hora</th>
                          <th>Usuario</th>
                          <th>Acción</th>
                          <th>Módulo</th>
                          <th>Descripción</th>
                          <th>IP</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: 'center', color: '#6c757d', padding: '30px' }}>
                            No se encontraron registros con los filtros aplicados
                          </td></tr>
                        ) : logs.map(log => (
                          <tr key={log.id} style={{ background: log.exitoso ? 'transparent' : '#fff5f5' }}>
                            <td style={{ whiteSpace: 'nowrap', color: '#6c757d', fontSize: '12px' }}>
                              {fmt(log.created_at)}
                            </td>
                            <td>
                              <div style={{ fontWeight: '600', color: '#1a2035' }}>{log.usuario_nombre || '—'}</div>
                              <div style={{ fontSize: '11px', color: '#6c757d' }}>{log.usuario_email || 'Sistema'}</div>
                            </td>
                            <td>{accionBadge(log.accion, log.exitoso)}</td>
                            <td>
                              <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '11px',
                                background: '#e9ecef', color: '#495057', fontWeight: '600' }}>
                                {log.modulo || '—'}
                              </span>
                            </td>
                            <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {log.descripcion || log.ruta}
                            </td>
                            <td style={{ fontSize: '11px', color: '#6c757d', fontFamily: 'monospace' }}>
                              {log.ip || '—'}
                            </td>
                            <td>
                              <button className="btn btn-primary btn-sm" title="Ver detalle"
                                onClick={() => setSelectedLog(log)}>
                                <i className="fas fa-eye"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {pages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                      <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => loadLogs(page - 1)}>
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <span style={{ fontSize: '13px', color: '#6c757d' }}>
                        Página {page} de {pages} — {total.toLocaleString()} registros
                      </span>
                      <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => loadLogs(page + 1)}>
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* TAB: ESTADÍSTICAS */}
          {activeTab === 'stats' && stats && (
            <div>
              {/* Totales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                  { label: 'Total Eventos', value: Number(stats.totales.total).toLocaleString(), color: '#1572e8', icon: 'fa-list' },
                  { label: 'Exitosos', value: Number(stats.totales.exitosos).toLocaleString(), color: '#31ce36', icon: 'fa-check-circle' },
                  { label: 'Fallidos', value: Number(stats.totales.fallidos).toLocaleString(), color: '#f25961', icon: 'fa-times-circle' },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'white', border: `2px solid ${s.color}20`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <i className={`fas ${s.icon}`} style={{ fontSize: '24px', color: s.color, marginBottom: '8px', display: 'block' }}></i>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                {/* Por acción */}
                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px' }}>
                  <h6 style={{ fontWeight: '700', color: '#1a2035', marginBottom: '14px' }}>
                    <i className="fas fa-bolt" style={{ marginRight: '8px', color: '#ffad46' }}></i>
                    Acciones más frecuentes
                  </h6>
                  {stats.por_accion.map((a, i) => {
                    const cfg = ACCION_CONFIG[a.accion] || { color: '#6c757d', icon: 'fa-circle', label: a.accion };
                    const pct = Math.round(Number(a.total) / Number(stats.totales.total) * 100);
                    return (
                      <div key={i} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: cfg.color }}>
                            <i className={`fas ${cfg.icon}`} style={{ marginRight: '6px' }}></i>{cfg.label}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{Number(a.total).toLocaleString()}</span>
                        </div>
                        <div style={{ height: '6px', background: '#dee2e6', borderRadius: '3px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: '3px', transition: 'width 0.5s' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Por módulo */}
                <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px' }}>
                  <h6 style={{ fontWeight: '700', color: '#1a2035', marginBottom: '14px' }}>
                    <i className="fas fa-th-large" style={{ marginRight: '8px', color: '#1572e8' }}></i>
                    Módulos más activos
                  </h6>
                  {stats.por_modulo.map((m, i) => {
                    const pct = Math.round(Number(m.total) / Number(stats.totales.total) * 100);
                    return (
                      <div key={i} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600' }}>{m.modulo}</span>
                          <span style={{ fontSize: '13px', fontWeight: '700' }}>{Number(m.total).toLocaleString()}</span>
                        </div>
                        <div style={{ height: '6px', background: '#dee2e6', borderRadius: '3px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: '#1572e8', borderRadius: '3px', transition: 'width 0.5s' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top usuarios */}
              <div style={{ background: '#f8f9fa', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <h6 style={{ fontWeight: '700', color: '#1a2035', marginBottom: '14px' }}>
                  <i className="fas fa-users" style={{ marginRight: '8px', color: '#31ce36' }}></i>
                  Usuarios más activos
                </h6>
                <div className="table-responsive">
                  <table className="table" style={{ fontSize: '13px', marginBottom: 0 }}>
                    <thead>
                      <tr><th>Usuario</th><th>Email</th><th style={{ textAlign: 'right' }}>Acciones</th></tr>
                    </thead>
                    <tbody>
                      {stats.por_usuario.map((u, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '600' }}>{u.usuario_nombre || '—'}</td>
                          <td style={{ color: '#6c757d' }}>{u.usuario_email}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#1572e8' }}>
                            {Number(u.total).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Eventos fallidos */}
              {stats.fallidos.length > 0 && (
                <div style={{ background: '#fff5f5', border: '1px solid #f5c6cb', borderRadius: '10px', padding: '16px' }}>
                  <h6 style={{ fontWeight: '700', color: '#721c24', marginBottom: '14px' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                    Eventos fallidos recientes
                  </h6>
                  <div className="table-responsive">
                    <table className="table" style={{ fontSize: '12px', marginBottom: 0 }}>
                      <thead>
                        <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Descripción</th><th>IP</th></tr>
                      </thead>
                      <tbody>
                        {stats.fallidos.map((f, i) => (
                          <tr key={i} style={{ background: '#fff5f5' }}>
                            <td style={{ whiteSpace: 'nowrap', color: '#6c757d' }}>{fmt(f.created_at)}</td>
                            <td style={{ fontWeight: '600' }}>{f.usuario_nombre || f.usuario_email || 'Anónimo'}</td>
                            <td>{accionBadge(f.accion, false)}</td>
                            <td>{f.descripcion || f.ruta}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{f.ip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal detalle de log */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ background: 'linear-gradient(135deg, #1a2035, #2d3561)', color: 'white' }}>
              <h5 className="card-title" style={{ color: 'white', margin: 0 }}>
                <i className="fas fa-search" style={{ marginRight: '10px' }}></i>
                Detalle del Evento #{selectedLog.id}
              </h5>
              <button onClick={() => setSelectedLog(null)} style={{ position: 'absolute', top: '15px', right: '15px',
                background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'white' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              {[
                ['Fecha / Hora', fmt(selectedLog.created_at)],
                ['Usuario', `${selectedLog.usuario_nombre || '—'} (${selectedLog.usuario_email || 'Sistema'})`],
                ['Acción', selectedLog.accion],
                ['Módulo', selectedLog.modulo || '—'],
                ['Descripción', selectedLog.descripcion || '—'],
                ['Método HTTP', selectedLog.metodo || '—'],
                ['Ruta', selectedLog.ruta || '—'],
                ['IP', selectedLog.ip || '—'],
                ['Estado', selectedLog.exitoso ? '✅ Exitoso' : '❌ Fallido'],
              ].map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0', alignItems: 'flex-start' }}>
                  <span style={{ minWidth: '130px', fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontSize: '13px', color: '#1a2035', wordBreak: 'break-all' }}>{value}</span>
                </div>
              ))}
              {selectedLog.datos_nuevos && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase', marginBottom: '6px' }}>Datos enviados</div>
                  <pre style={{ background: '#f8f9fa', borderRadius: '6px', padding: '12px', fontSize: '11px',
                    overflow: 'auto', maxHeight: '200px', margin: 0, color: '#1a2035' }}>
                    {JSON.stringify(selectedLog.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.user_agent && (
                <div style={{ marginTop: '12px', fontSize: '11px', color: '#adb5bd', wordBreak: 'break-all' }}>
                  <strong>User Agent:</strong> {selectedLog.user_agent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
