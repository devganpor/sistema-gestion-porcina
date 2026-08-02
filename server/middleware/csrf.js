const crypto = require('crypto');

const csrfProtection = (req, res, next) => {
  // CSRF temporalmente deshabilitado para desarrollo
  next();
};

const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
};

module.exports = { csrfProtection, generateCSRFToken };
