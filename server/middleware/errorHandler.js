const { AuditLogger } = require('../services/AuditLogger');

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const auditLogger = new AuditLogger();

  auditLogger.log({
    usuario_id:     req.user?.id || null,
    usuario_email:  req.user?.email || null,
    usuario_nombre: req.user?.nombre || null,
    accion:         'ERROR',
    modulo:         'Sistema',
    descripcion:    err.message,
    ruta:           req.path,
    metodo:         req.method,
    ip:             req.ip,
    user_agent:     req.get('User-Agent'),
    exitoso:        false
  });

  // Errores operacionales conocidos
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Errores de constraint PostgreSQL
  if (err.code === '23505') {
    return res.status(400).json({
      error: 'El registro ya existe',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referencia inválida a otro registro',
      timestamp: new Date().toISOString()
    });
  }

  // Errores de constraint SQLite (compatibilidad local)
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(400).json({
      error: 'El registro ya existe',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGN_KEY') {
    return res.status(400).json({
      error: 'Referencia inválida a otro registro',
      timestamp: new Date().toISOString()
    });
  }

  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { details: err.message, stack: err.stack })
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, errorHandler, asyncHandler };