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
  
  // Log del error
  auditLogger.log({
    userId: req.user?.id || 'anonymous',
    action: 'ERROR',
    resource: req.path,
    details: {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    },
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Errores operacionales conocidos
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Errores de base de datos SQLite
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

  // Error genérico para producción
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
