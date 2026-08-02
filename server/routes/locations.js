const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Obtener todas las ubicaciones
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.*, up.nombre as ubicacion_padre_nombre,
             COUNT(a.id) as animales_actuales
      FROM ubicaciones u
      LEFT JOIN ubicaciones up ON u.ubicacion_padre_id = up.id
      LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
      GROUP BY u.id, up.nombre
      ORDER BY u.tipo, u.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ubicaciones' });
  }
});

// Crear ubicación
router.post('/', authenticateToken, csrfProtection, [
  body('nombre').trim().isLength({ min: 1, max: 100 }),
  body('tipo').isIn(['granja', 'galpon', 'corral'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Datos inválidos', 400);
  }

    const { nombre, tipo, capacidad_maxima, ubicacion_padre_id } = req.body;

    const result = await query(
      'INSERT INTO ubicaciones (nombre, tipo, capacidad_maxima, ubicacion_padre_id) VALUES (?, ?, ?, ?)',
      [nombre, tipo, capacidad_maxima, ubicacion_padre_id]
    );

    if (!result.lastID) {
      throw new AppError('Error creando la ubicación', 500);
    }
    
    res.status(201).json({
      message: 'Ubicación creada exitosamente',
      id: result.lastID
    });
}));

// Mover animal a nueva ubicación
router.post('/move-animal', authenticateToken, [
  body('animal_id').isInt(),
  body('nueva_ubicacion_id').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { animal_id, nueva_ubicacion_id, motivo } = req.body;

    // Verificar capacidad
    const capacidadCheck = await query(`
      SELECT u.capacidad_maxima, COUNT(a.id) as ocupacion_actual
      FROM ubicaciones u
      LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
      WHERE u.id = ?
      GROUP BY u.id, u.capacidad_maxima
    `, [nueva_ubicacion_id]);

    if (capacidadCheck.rows.length > 0) {
      const { capacidad_maxima, ocupacion_actual } = capacidadCheck.rows[0];
      if (capacidad_maxima && ocupacion_actual >= capacidad_maxima) {
        return res.status(400).json({ error: 'Ubicación sin capacidad disponible' });
      }
    }

    // Actualizar ubicación del animal
    const result = await query(
      'UPDATE animales SET ubicacion_actual_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [nueva_ubicacion_id, animal_id]
    );

    res.json({ message: 'Animal movido exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error moviendo animal' });
  }
});

// Obtener ocupación por ubicación
router.get('/occupancy', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.nombre, u.tipo, u.capacidad_maxima,
             COUNT(a.id) as ocupacion_actual,
             CASE 
               WHEN u.capacidad_maxima > 0 THEN 
                 ROUND((COUNT(a.id) * 100.0 / u.capacidad_maxima), 2)
               ELSE 0 
             END as porcentaje_ocupacion
      FROM ubicaciones u
      LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
      WHERE u.tipo = 'corral'
      GROUP BY u.id, u.nombre, u.tipo, u.capacidad_maxima
      ORDER BY porcentaje_ocupacion DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ocupación' });
  }
});

// Actualizar ubicación
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, capacidad_maxima, ubicacion_padre_id } = req.body;

    await query(
      'UPDATE ubicaciones SET nombre = ?, tipo = ?, capacidad_maxima = ?, ubicacion_padre_id = ? WHERE id = ?',
      [nombre, tipo, capacidad_maxima, ubicacion_padre_id, id]
    );

    res.json({ message: 'Ubicación actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando ubicación' });
  }
});

// Eliminar ubicación
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que no tenga animales
    const animalesCheck = await query(
      'SELECT COUNT(*) as count FROM animales WHERE ubicacion_actual_id = ? AND estado = "activo"',
      [id]
    );
    
    if (animalesCheck.rows[0].count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar una ubicación con animales' });
    }

    await query('DELETE FROM ubicaciones WHERE id = ?', [id]);
    res.json({ message: 'Ubicación eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando ubicación' });
  }
});

module.exports = router;
