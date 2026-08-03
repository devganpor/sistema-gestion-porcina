const { query } = require('../config/database-auto');

class MetricsService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      activeUsers: new Set(),
      lastReset: new Date()
    };
  }

  incrementRequests() { this.metrics.requests++; }
  incrementErrors()   { this.metrics.errors++; }

  recordResponseTime(time) {
    this.metrics.responseTime.push(time);
    if (this.metrics.responseTime.length > 1000) this.metrics.responseTime.shift();
  }

  addActiveUser(userId) { this.metrics.activeUsers.add(userId); }

  getMetrics() {
    const avg = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;
    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0
        ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
      averageResponseTime: Math.round(avg),
      activeUsers: this.metrics.activeUsers.size,
      uptime: Math.floor((Date.now() - this.metrics.lastReset.getTime()) / 1000),
      timestamp: new Date().toISOString()
    };
  }

  async getDatabaseMetrics() {
    try {
      const [animals, locations, weights, health] = await Promise.all([
        query(`SELECT COUNT(*) as count FROM animales WHERE estado = 'activo'`),
        query(`SELECT COUNT(*) as count FROM ubicaciones`),
        query(`SELECT COUNT(*) as count FROM pesajes WHERE fecha_pesaje >= CURRENT_DATE - INTERVAL '30 days'`),
        query(`SELECT COUNT(*) as count FROM eventos_sanitarios WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'`)
      ]);
      return {
        totalAnimals:          animals.rows[0].count,
        totalLocations:        locations.rows[0].count,
        weightsLastMonth:      weights.rows[0].count,
        healthEventsLastMonth: health.rows[0].count
      };
    } catch (error) {
      console.error('Error obteniendo métricas de BD:', error);
      return null;
    }
  }

  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      activeUsers: new Set(),
      lastReset: new Date()
    };
  }

  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      this.incrementRequests();
      if (req.user) this.addActiveUser(req.user.id);
      res.on('finish', () => {
        this.recordResponseTime(Date.now() - startTime);
        if (res.statusCode >= 400) this.incrementErrors();
      });
      next();
    };
  }
}

module.exports = MetricsService;
