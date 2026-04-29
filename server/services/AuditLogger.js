const fs = require('fs');
const path = require('path');

class AuditLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.logFile = path.join(this.logDir, 'audit.log');
    
    // Crear directorio de logs si no existe
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(action, userId, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      userAgent: details.userAgent || 'Unknown',
      ip: details.ip || 'Unknown',
      details: details.data || {},
      success: details.success !== false
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Error escribiendo log de auditoría:', error);
    }
  }

  // Métodos específicos para diferentes acciones
  logLogin(userId, ip, userAgent, success = true) {
    this.log('LOGIN', userId, { ip, userAgent, success });
  }

  logLogout(userId, ip, userAgent) {
    this.log('LOGOUT', userId, { ip, userAgent });
  }

  logCreate(userId, entity, data, ip, userAgent) {
    this.log('CREATE', userId, { 
      ip, 
      userAgent, 
      data: { entity, ...data } 
    });
  }

  logUpdate(userId, entity, id, changes, ip, userAgent) {
    this.log('UPDATE', userId, { 
      ip, 
      userAgent, 
      data: { entity, id, changes } 
    });
  }

  logDelete(userId, entity, id, ip, userAgent) {
    this.log('DELETE', userId, { 
      ip, 
      userAgent, 
      data: { entity, id } 
    });
  }

  logAccess(userId, resource, ip, userAgent) {
    this.log('ACCESS', userId, { 
      ip, 
      userAgent, 
      data: { resource } 
    });
  }

  // Obtener logs con filtros
  getLogs(filters = {}) {
    try {
      const logContent = fs.readFileSync(this.logFile, 'utf8');
      const logs = logContent.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .reverse(); // Más recientes primero

      let filteredLogs = logs;

      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }

      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action);
      }

      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= new Date(filters.endDate)
        );
      }

      if (filters.limit) {
        filteredLogs = filteredLogs.slice(0, filters.limit);
      }

      return filteredLogs;
    } catch (error) {
      console.error('Error leyendo logs:', error);
      return [];
    }
  }

  // Rotar logs cuando sean muy grandes
  rotateLogs() {
    try {
      const stats = fs.statSync(this.logFile);
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (stats.size > maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = path.join(this.logDir, `audit_${timestamp}.log`);
        
        fs.renameSync(this.logFile, rotatedFile);
        console.log(`📋 Log rotado: ${rotatedFile}`);
      }
    } catch (error) {
      console.error('Error rotando logs:', error);
    }
  }
}

// Middleware para logging automático
const auditMiddleware = (auditLogger) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log solo para operaciones importantes
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const userId = req.user?.id || 'anonymous';
        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        
        let action = 'UNKNOWN';
        let entity = 'unknown';
        
        // Determinar acción basada en la ruta
        const path = req.path;
        if (path.includes('/animals')) entity = 'animal';
        else if (path.includes('/reproduction')) entity = 'reproduction';
        else if (path.includes('/weights')) entity = 'weight';
        else if (path.includes('/health')) entity = 'health';
        else if (path.includes('/finance')) entity = 'finance';
        else if (path.includes('/locations')) entity = 'location';
        
        if (req.method === 'POST') action = 'CREATE';
        else if (req.method === 'PUT') action = 'UPDATE';
        else if (req.method === 'DELETE') action = 'DELETE';
        
        const success = res.statusCode < 400;
        
        auditLogger.log(action, userId, {
          ip,
          userAgent,
          success,
          data: {
            entity,
            method: req.method,
            path: req.path,
            body: req.body,
            params: req.params
          }
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = { AuditLogger, auditMiddleware };
