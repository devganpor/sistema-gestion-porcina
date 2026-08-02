const { query } = require('../config/database-auto');

// Mapeo de rutas a módulos legibles
const MODULO_MAP = {
  '/api/animals':      'Animales',
  '/api/reproduction': 'Reproducción',
  '/api/weights':      'Pesajes',
  '/api/health':       'Sanidad',
  '/api/finance':      'Finanzas',
  '/api/locations':    'Ubicaciones',
  '/api/nutrition':    'Nutrición',
  '/api/genealogy':    'Genealogía',
  '/api/users':        'Usuarios',
  '/api/auth':         'Autenticación',
  '/api/reports':      'Reportes',
};

function detectarModulo(ruta) {
  for (const [prefix, nombre] of Object.entries(MODULO_MAP)) {
    if (ruta.startsWith(prefix)) return nombre;
  }
  return 'Sistema';
}

function detectarDescripcion(method, ruta, body) {
  const modulo = detectarModulo(ruta);
  const id = ruta.match(/\/(\d+)/)?.[1];

  if (ruta.includes('/auth/login'))  return 'Inicio de sesión';
  if (ruta.includes('/auth/logout')) return 'Cierre de sesión';
  if (ruta.includes('/bulk'))        return `Carga masiva en ${modulo}`;
  if (ruta.includes('/movimiento'))  return `Traslado de animal`;
  if (ruta.includes('/trazabilidad'))return `Consulta trazabilidad animal ${id || ''}`;

  if (method === 'POST')   return `Creación en ${modulo}`;
  if (method === 'PUT')    return `Actualización en ${modulo}${id ? ' #' + id : ''}`;
  if (method === 'DELETE') return `Eliminación en ${modulo}${id ? ' #' + id : ''}`;
  if (method === 'GET')    return `Consulta en ${modulo}`;
  return `Acción en ${modulo}`;
}

class AuditLogger {
  async log({ usuario_id, usuario_email, usuario_nombre, accion, modulo, descripcion,
               entidad, entidad_id, ip, user_agent, metodo, ruta,
               datos_anteriores, datos_nuevos, exitoso = true }) {
    try {
      await query(
        `INSERT INTO audit_logs
         (usuario_id, usuario_email, usuario_nombre, accion, modulo, descripcion,
          entidad, entidad_id, ip, user_agent, metodo, ruta,
          datos_anteriores, datos_nuevos, exitoso)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          usuario_id || null,
          usuario_email || null,
          usuario_nombre || null,
          accion,
          modulo || null,
          descripcion || null,
          entidad || null,
          entidad_id ? String(entidad_id) : null,
          ip || null,
          user_agent || null,
          metodo || null,
          ruta || null,
          datos_anteriores ? JSON.stringify(datos_anteriores) : null,
          datos_nuevos ? JSON.stringify(datos_nuevos) : null,
          exitoso
        ]
      );
    } catch (err) {
      // No romper el flujo si falla el log
      console.error('AuditLogger error:', err.message);
    }
  }

  // Métodos de conveniencia
  logLogin(userId, email, nombre, ip, userAgent, success = true) {
    return this.log({ usuario_id: userId, usuario_email: email, usuario_nombre: nombre,
      accion: 'LOGIN', modulo: 'Autenticación',
      descripcion: success ? 'Inicio de sesión exitoso' : 'Intento de login fallido',
      ip, user_agent: userAgent, metodo: 'POST', ruta: '/api/auth/login', exitoso: success });
  }

  logLogout(userId, email, nombre, ip, userAgent) {
    return this.log({ usuario_id: userId, usuario_email: email, usuario_nombre: nombre,
      accion: 'LOGOUT', modulo: 'Autenticación', descripcion: 'Cierre de sesión',
      ip, user_agent: userAgent, metodo: 'POST', ruta: '/api/auth/logout', exitoso: true });
  }
}

// Middleware automático — captura todas las mutaciones
const auditMiddleware = (auditLogger) => {
  return (req, res, next) => {
    // Solo loguear métodos que modifican datos + GET sensibles
    const logMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (!logMethods.includes(req.method)) return next();

    // Excluir rutas de bajo valor
    const skip = ['/api/csrf-token', '/health', '/api/auth/refresh'];
    if (skip.some(s => req.path.startsWith(s))) return next();

    const originalJson = res.json.bind(res);
    res.json = function(data) {
      const exitoso = res.statusCode < 400;
      const user = req.user;
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const ruta = req.originalUrl || req.path;
      const modulo = detectarModulo(ruta);
      const descripcion = detectarDescripcion(req.method, ruta, req.body);
      const accionMap = { POST: 'CREATE', PUT: 'UPDATE', DELETE: 'DELETE', PATCH: 'UPDATE' };
      const entidad_id = req.params?.id || data?.id || data?.animal?.id || null;

      // Sanitizar body — no guardar passwords
      const bodyClean = req.body ? { ...req.body } : {};
      delete bodyClean.password;
      delete bodyClean.password_hash;
      delete bodyClean.token;

      auditLogger.log({
        usuario_id:     user?.id || null,
        usuario_email:  user?.email || null,
        usuario_nombre: user?.nombre || null,
        accion:         accionMap[req.method] || req.method,
        modulo,
        descripcion,
        entidad:        modulo,
        entidad_id,
        ip,
        user_agent:     req.get('User-Agent'),
        metodo:         req.method,
        ruta,
        datos_nuevos:   Object.keys(bodyClean).length > 0 ? bodyClean : null,
        exitoso
      });

      return originalJson(data);
    };

    next();
  };
};

module.exports = { AuditLogger, auditMiddleware };
