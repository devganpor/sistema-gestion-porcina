const crypto = require('crypto');

const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
};

const csrfProtection = (req, res, next) => {
  const token = req.headers['x-csrf-token'] || req.body?._csrf;
  if (!token || token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Token CSRF inválido' });
  }
  next();
};

module.exports = { csrfProtection, generateCSRFToken };
