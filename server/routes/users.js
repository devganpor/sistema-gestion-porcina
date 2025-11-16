const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Obtener todos los usuarios
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await query(`
      SELECT id, nombre, email, rol, activo, created_at,
        (SELECT COUNT(*) FROM animales WHERE created_at >= date('now', '-30 days')) as actividad_reciente
      FROM usuarios 
      ORDER BY created_at DESC
    `);
    
    res.json(users.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// Crear usuario
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    
    // Verificar si el email ya existe
    const existingUser = await query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await query(`
      INSERT INTO usuarios (nombre, email, password, rol)
      VALUES (?, ?, ?, ?)
    `, [nombre, email, hashedPassword, rol]);
    
    res.json({ id: result.lastID, message: 'Usuario creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// Actualizar usuario
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, rol, activo } = req.body;
    
    await query(`
      UPDATE usuarios 
      SET nombre = ?, email = ?, rol = ?, activo = ?
      WHERE id = ?
    `, [nombre, email, rol, activo, id]);
    
    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// Cambiar contraseña
router.put('/:id/password', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, id]);
    
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando contraseña' });
  }
});

// Obtener logs de auditoría
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    // Simulación de logs de auditoría
    const logs = [
      { id: 1, usuario: 'Admin', accion: 'Crear Animal', fecha: new Date().toISOString(), detalles: 'Animal ID: 123' },
      { id: 2, usuario: 'Veterinario', accion: 'Registrar Vacuna', fecha: new Date().toISOString(), detalles: 'Vacuna: Triple' }
    ];
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo logs' });
  }
});

// Estadísticas de usuarios
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(*) as total_usuarios,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as usuarios_activos,
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