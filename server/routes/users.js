const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await query(`
      SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY created_at DESC
    `);
    res.json(users.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const existingUser = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING id',
      [nombre, email, hashedPassword, rol]
    );
    res.json({ id: result.rows[0].id, message: 'Usuario creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { nombre, email, rol, activo } = req.body;
    await query(
      'UPDATE usuarios SET nombre=$1, email=$2, rol=$3, activo=$4 WHERE id=$5',
      [nombre, email, rol, activo, req.params.id]
    );
    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

router.put('/:id/password', authenticateToken, async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.newPassword, 12);
    await query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [hashedPassword, req.params.id]);
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando contraseña' });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) as total_usuarios,
        SUM(CASE WHEN activo = true THEN 1 ELSE 0 END) as usuarios_activos,
        SUM(CASE WHEN rol = 'administrador' THEN 1 ELSE 0 END) as administradores,
        SUM(CASE WHEN rol = 'veterinario' THEN 1 ELSE 0 END) as veterinarios,
        SUM(CASE WHEN rol = 'tecnico' THEN 1 ELSE 0 END) as tecnicos
      FROM usuarios
    `);
    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

module.exports = router;
