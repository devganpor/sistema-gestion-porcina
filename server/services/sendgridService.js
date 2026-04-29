let sgMail = null;

try {
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid configurado');
  } else {
    console.log('⚠️ SendGrid no configurado - emails deshabilitados');
  }
} catch (e) {
  console.log('⚠️ SendGrid no disponible:', e.message);
}

class SendGridService {
  async sendEmail(to, subject, html, text = null) {
    if (!sgMail) return { success: false, error: 'SendGrid no configurado' };
    try {
      const msg = {
        to,
        from: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_FROM_NAME },
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '')
      };
      const result = await sgMail.send(msg);
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendAlert(to, title, message, type = 'info') {
    if (!sgMail) return { success: false, error: 'SendGrid no configurado' };
    const colors = { info: '#1572e8', warning: '#ffad46', error: '#f25961', success: '#31ce36' };
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${colors[type]}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">${title}</h2>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <p style="font-size: 16px; line-height: 1.5;">${message}</p>
        </div>
      </div>`;
    return await this.sendEmail(to, `[${type.toUpperCase()}] ${title}`, html);
  }

  async testConnection() {
    if (!sgMail) return { success: false, error: 'SendGrid no configurado' };
    return { success: true, message: 'SendGrid configurado correctamente' };
  }
}

module.exports = new SendGridService();
