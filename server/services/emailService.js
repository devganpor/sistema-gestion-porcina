const sendgridService = require('./sendgridService');

class EmailService {
  async sendEmail(to, subject, html, text = null) {
    return await sendgridService.sendEmail(to, subject, html, text);
  }

  async sendAlert(to, title, message, type = 'info') {
    return await sendgridService.sendAlert(to, title, message, type);
  }

  async testConnection() {
    return await sendgridService.testConnection();
  }
}

module.exports = new EmailService();