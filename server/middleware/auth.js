const jwt = require('jsonwebtoken');
const { query } = require('../config/database-auto');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'secret_key';
    const decoded = jwt.verify(token, secret);
    const user = await query('SELECT id, nombre, email, rol FROM usuarios WHERE id = ? AND activo = 1', [decoded.userId]);
    
    if (user.rows.length === 0) {
      return res.status(403).json({ error: 'Usuario no válido' });
    }

    req.user = user.rows[0];
    next();
  } catch (error) {
    console.error('Error de autenticación:', error.message);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
