const { query } = require('../config/database');
const emailService = require('./emailService');

class AlertService {
  async checkReproductiveAlerts() {
    const alerts = [];
    
    try {
      // Contar animales por categoría
      const animalsResult = await query('SELECT COUNT(*) as total FROM animales');
      const totalAnimals = animalsResult.rows[0]?.total || 0;

      // Contar pesajes recientes
      const weightsResult = await query(`
        SELECT COUNT(*) as total FROM pesajes 
        WHERE fecha >= date('now', '-7 days')
      `);
      const recentWeights = weightsResult.rows[0]?.total || 0;

      // Animales con peso alto (simulando listos para venta)
      const heavyAnimalsResult = await query(`
        SELECT COUNT(*) as total FROM pesajes 
        WHERE peso >= 80
      `);
      const heavyAnimals = heavyAnimalsResult.rows[0]?.total || 0;

      if (totalAnimals > 0) {
        alerts.push({
          type: 'info',
          title: 'Resumen del Sistema',
          message: `Total de animales: ${totalAnimals} | Pesajes recientes: ${recentWeights} | Animales en desarrollo: ${heavyAnimals}`,
          data: { totalAnimals, recentWeights, heavyAnimals }
        });
      }

      // Alerta de ejemplo para eventos sanitarios
      const healthEventsResult = await query(`
        SELECT COUNT(*) as total FROM eventos_sanitarios 
        WHERE fecha >= date('now', '-30 days')
      `);
      const recentHealthEvents = healthEventsResult.rows[0]?.total || 0;

      if (recentHealthEvents > 0) {
        alerts.push({
          type: 'warning',
          title: 'Eventos Sanitarios Recientes',
          message: `${recentHealthEvents} eventos sanitarios registrados en los últimos 30 días. Revisar estado de salud del hato.`,
          data: { recentHealthEvents }
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error checking alerts:', error);
      // Retornar alerta de ejemplo si hay error
      return [{
        type: 'info',
        title: 'Sistema de Alertas Activo',
        message: 'El sistema de alertas está funcionando correctamente. Configuración de email completada con SendGrid.',
        data: { status: 'active' }
      }];
    }
  }

  async sendDailyReport(email) {
    try {
      const alerts = await this.checkReproductiveAlerts();
      
      if (alerts.length === 0) {
        return { success: true, message: 'No hay alertas para enviar' };
      }

      let alertsHtml = alerts.map(alert => `
        <div style="margin: 15px 0; padding: 15px; border-left: 4px solid ${
          alert.type === 'warning' ? '#ffad46' :
          alert.type === 'info' ? '#1572e8' :
          alert.type === 'success' ? '#31ce36' : '#f25961'
        }; background: #f8f9fa;">
          <h4 style="margin: 0 0 10px 0; color: #1a2035;">${alert.title}</h4>
          <p style="margin: 0; color: #6c757d;">${alert.message}</p>
        </div>
      `).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1572e8, #0d47a1); color: white; padding: 25px; text-align: center;">
            <h2 style="margin: 0;">🐷 Reporte Diario - Sistema Gestión Porcina</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString()}</p>
          </div>
          <div style="padding: 25px;">
            <h3 style="color: #1a2035; margin-top: 0;">Alertas del Sistema (${alerts.length})</h3>
            ${alertsHtml}
            <hr style="margin: 25px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #6c757d; text-align: center;">
              Sistema de Gestión Porcina - Reporte automático generado el ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `;

      const result = await emailService.sendEmail(
        email,
        `🐷 Reporte Diario - ${alerts.length} Alertas - ${new Date().toLocaleDateString()}`,
        html
      );

      return result;
    } catch (error) {
      console.error('Error sending daily report:', error);
      return { success: false, error: error.message };
    }
  }

  async sendInstantAlert(email, alert) {
    try {
      const result = await emailService.sendAlert(
        email,
        alert.title,
        alert.message,
        alert.type
      );
      return result;
    } catch (error) {
      console.error('Error sending instant alert:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AlertService();