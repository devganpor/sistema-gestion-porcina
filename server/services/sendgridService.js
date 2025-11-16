const sgMail = require('@sendgrid/mail');

class SendGridService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const msg = {
        to,
        from: {
          email: process.env.EMAIL_FROM,
          name: process.env.EMAIL_FROM_NAME
        },
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      };

      const result = await sgMail.send(msg);
      console.log('Email enviado via SendGrid');
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('Error SendGrid:', error.response?.body || error.message);
      return { success: false, error: error.message };
    }
  }

  async sendAlert(to, title, message, type = 'info') {
    const colors = {
      info: '#1572e8',
      warning: '#ffad46', 
      error: '#f25961',
      success: '#31ce36'
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${colors[type]}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">${title}</h2>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <p style="font-size: 16px; line-height: 1.5;">${message}</p>
          <hr style="margin: 20px 0;">
          <p style="font-size: 12px; color: #6c757d;">
            Sistema de Gestión Porcina - ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(to, `[${type.toUpperCase()}] ${title}`, html);
  }

  async testConnection() {
    try {
      // SendGrid no tiene test de conexión, pero podemos verificar la API key
      if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'tu_sendgrid_api_key') {
        return { success: false, error: 'API Key de SendGrid no configurada' };
      }
      return { success: true, message: 'SendGrid configurado correctamente' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SendGridService();