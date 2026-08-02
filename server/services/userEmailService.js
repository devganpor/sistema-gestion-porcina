const emailService = require('./emailService');

class UserEmailService {
  async sendWelcomeEmail(userEmail, userName, tempPassword) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1572e8, #0d47a1); color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0;">🐷 Bienvenido al Sistema de Gestión Porcina</h2>
        </div>
        <div style="padding: 25px;">
          <h3>¡Hola ${userName}!</h3>
          <p>Tu cuenta ha sido creada exitosamente. Aquí están tus credenciales de acceso:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Email:</strong> ${userEmail}</p>
            <p><strong>Contraseña temporal:</strong> ${tempPassword}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffad46;">
            <p><strong>⚠️ Importante:</strong> Por seguridad, cambia tu contraseña en el primer inicio de sesión.</p>
          </div>
          
          <p style="margin-top: 25px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="background: #1572e8; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Acceder al Sistema
            </a>
          </p>
        </div>
      </div>
    `;

    return await emailService.sendEmail(
      userEmail,
      '🐷 Bienvenido al Sistema de Gestión Porcina',
      html
    );
  }

  async sendPasswordReset(userEmail, userName, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f25961, #e74c3c); color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0;">🔐 Restablecer Contraseña</h2>
        </div>
        <div style="padding: 25px;">
          <h3>Hola ${userName},</h3>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          
          <p style="margin: 25px 0;">
            <a href="${resetUrl}" 
               style="background: #f25961; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </p>
          
          <div style="background: #f8d7da; padding: 15px; border-radius: 8px; border-left: 4px solid #f25961;">
            <p><strong>⏰ Este enlace expira en 1 hora.</strong></p>
            <p>Si no solicitaste este cambio, ignora este email.</p>
          </div>
        </div>
      </div>
    `;

    return await emailService.sendEmail(
      userEmail,
      '🔐 Restablecer Contraseña - Sistema Porcino',
      html
    );
  }

  async sendAccountDeactivated(userEmail, userName, reason) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6c757d; color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0;">⚠️ Cuenta Desactivada</h2>
        </div>
        <div style="padding: 25px;">
          <h3>Hola ${userName},</h3>
          <p>Tu cuenta en el Sistema de Gestión Porcina ha sido desactivada.</p>
          
          ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <p>Si crees que esto es un error, contacta al administrador del sistema.</p>
          </div>
        </div>
      </div>
    `;

    return await emailService.sendEmail(
      userEmail,
      '⚠️ Cuenta Desactivada - Sistema Porcino',
      html
    );
  }

  async sendRoleChanged(userEmail, userName, newRole, changedBy) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #31ce36, #28a745); color: white; padding: 25px; text-align: center;">
          <h2 style="margin: 0;">👤 Rol Actualizado</h2>
        </div>
        <div style="padding: 25px;">
          <h3>Hola ${userName},</h3>
          <p>Tu rol en el sistema ha sido actualizado.</p>
          
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Nuevo rol:</strong> ${newRole}</p>
            <p><strong>Actualizado por:</strong> ${changedBy}</p>
          </div>
          
          <p>Los cambios son efectivos inmediatamente en tu próximo inicio de sesión.</p>
        </div>
      </div>
    `;

    return await emailService.sendEmail(
      userEmail,
      '👤 Rol Actualizado - Sistema Porcino',
      html
    );
  }
}

module.exports = new UserEmailService();
