const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const alertService = require('../services/alertService');
const userEmailService = require('../services/userEmailService');
const auth = require('../middleware/auth');

// Test email configuration
router.post('/test', auth, async (req, res) => {
  try {
    const result = await emailService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send test email
router.post('/send-test', auth, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    const result = await emailService.sendAlert(
      email,
      'Prueba de Configuración',
      'Este es un email de prueba del Sistema de Gestión Porcina. Si recibes este mensaje, la configuración es correcta.',
      'success'
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send alert email
router.post('/alert', auth, async (req, res) => {
  try {
    const { email, title, message, type = 'info' } = req.body;
    
    if (!email || !title || !message) {
      return res.status(400).json({ error: 'Email, título y mensaje son requeridos' });
    }

    const result = await emailService.sendAlert(email, title, message, type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send daily report
router.post('/daily-report', auth, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    const result = await alertService.sendDailyReport(email);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current alerts
router.get('/alerts', auth, async (req, res) => {
  try {
    const alerts = await alertService.checkReproductiveAlerts();
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User management emails
router.post('/welcome', auth, async (req, res) => {
  try {
    const { email, name, tempPassword } = req.body;
    
    if (!email || !name || !tempPassword) {
      return res.status(400).json({ error: 'Email, nombre y contraseña temporal son requeridos' });
    }

    const result = await userEmailService.sendWelcomeEmail(email, name, tempPassword);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/password-reset', auth, async (req, res) => {
  try {
    const { email, name, resetToken } = req.body;
    
    if (!email || !name || !resetToken) {
      return res.status(400).json({ error: 'Email, nombre y token son requeridos' });
    }

    const result = await userEmailService.sendPasswordReset(email, name, resetToken);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/account-deactivated', auth, async (req, res) => {
  try {
    const { email, name, reason } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ error: 'Email y nombre son requeridos' });
    }

    const result = await userEmailService.sendAccountDeactivated(email, name, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/role-changed', auth, async (req, res) => {
  try {
    const { email, name, newRole, changedBy } = req.body;
    
    if (!email || !name || !newRole || !changedBy) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const result = await userEmailService.sendRoleChanged(email, name, newRole, changedBy);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;