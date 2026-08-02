const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Obtener razas (debe ir antes de /:id)
router.get('/razas', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM razas ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo razas' });
  }
});

// Obtener todos los animales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { categoria, estado, ubicacion } = req.query;
    let sql = `
      SELECT a.*, r.nombre as raza_nombre, u.nombre as ubicacion_nombre,
             m.identificador_unico as madre_id_nombre, p.identificador_unico as padre_id_nombre
      FROM animales a
      LEFT JOIN razas r ON a.raza_id = r.id
      LEFT JOIN ubicaciones u ON a.ubicacion_actual_id = u.id
      LEFT JOIN animales m ON a.madre_id = m.id
      LEFT JOIN animales p ON a.padre_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (categoria) {
      sql += ` AND a.categoria = ?`;
      params.push(categoria);
    }
    if (estado) {
      sql += ` AND a.estado = ?`;
      params.push(estado);
    }
    if (ubicacion) {
      sql += ` AND a.ubicacion_actual_id = ?`;
      params.push(ubicacion);
    }

    sql += ' ORDER BY a.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo animales' });
  }
});

// Crear animal
router.post('/', authenticateToken, csrfProtection, [
  body('identificador_unico').trim().isLength({ min: 1, max: 50 }),
  body('sexo').isIn(['macho', 'hembra']),
  body('categoria').isIn(['lechon', 'recria', 'desarrollo', 'engorde', 'reproductor'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Datos inválidos', 400);
  }

    const {
      identificador_unico, nombre, sexo, raza_id, fecha_nacimiento,
      peso_nacimiento, madre_id, padre_id, categoria, ubicacion_actual_id, observaciones
    } = req.body;

    const result = await query(
      `INSERT INTO animales (identificador_unico, nombre, sexo, raza_id, fecha_nacimiento, 
       peso_nacimiento, madre_id, padre_id, categoria, ubicacion_actual_id, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [identificador_unico, nombre, sexo, raza_id, fecha_nacimiento, peso_nacimiento,
       madre_id, padre_id, categoria, ubicacion_actual_id, observaciones]
    );

    if (!result.rows || result.rows.length === 0) {
      throw new AppError('Error creando el animal', 500);
    }
    
    res.status(201).json({
      message: 'Animal creado exitosamente',
      animal: result.rows[0]
    });
}));

// Obtener animal por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, r.nombre as raza_nombre, u.nombre as ubicacion_nombre
       FROM animales a
       LEFT JOIN razas r ON a.raza_id = r.id
       LEFT JOIN ubicaciones u ON a.ubicacion_actual_id = u.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo animal' });
  }
});

// Actualizar animal
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validar campos permitidos para evitar SQL injection
    const allowedFields = [
      'identificador_unico', 'nombre', 'sexo', 'raza_id', 'fecha_nacimiento',
      'peso_nacimiento', 'madre_id', 'padre_id', 'categoria', 'ubicacion_actual_id',
      'observaciones', 'estado', 'fecha_salida', 'motivo_salida'
    ];
    
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }
    
    const setClause = Object.keys(filteredUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(filteredUpdates), id];

    const result = await query(
      `UPDATE animales SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Animal actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando animal' });
  }
});

// Eliminar animal (físicamente)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si tiene registros relacionados
    const pesajes = await query('SELECT COUNT(*) as count FROM pesajes WHERE animal_id = ?', [id]);
    const eventos = await query('SELECT COUNT(*) as count FROM eventos_sanitarios WHERE animal_id = ?', [id]);
    
    if (pesajes.rows[0].count > 0 || eventos.rows[0].count > 0) {
      // Soft delete si tiene registros
      await query(
        'UPDATE animales SET estado = ?, fecha_salida = ?, motivo_salida = ? WHERE id = ?',
        ['eliminado', new Date().toISOString().split('T')[0], 'Eliminado del sistema', id]
      );
      res.json({ message: 'Animal marcado como eliminado (tiene registros asociados)' });
    } else {
      // Hard delete si no tiene registros
      await query('DELETE FROM animales WHERE id = ?', [id]);
      res.json({ message: 'Animal eliminado completamente' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando animal' });
  }
});

module.exports = router;
