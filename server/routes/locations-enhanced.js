const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Middleware CSRF simple para desarrollo
const validateCSRF = (req, res, next) => next();

// Obtener todas las ubicaciones con estructura jerárquica
router.get('/', authenticateToken, async (req, res) => {
  try {
    const ubicaciones = await query(`
      SELECT u.*, 
        COUNT(a.id) as animales_actuales,
        CASE 
          WHEN u.capacidad_maxima > 0 THEN ROUND((COUNT(a.id) * 100.0 / u.capacidad_maxima), 1)
          ELSE 0 
        END as porcentaje_ocupacion,
        up.nombre as ubicacion_padre_nombre,
        CASE 
          WHEN COUNT(a.id) >= u.capacidad_maxima AND u.capacidad_maxima > 0 THEN 'sobrepoblado'
          WHEN COUNT(a.id) >= u.capacidad_maxima * 0.9 AND u.capacidad_maxima > 0 THEN 'casi_lleno'
          ELSE 'normal'
        END as estado_ocupacion
      FROM ubicaciones u
      LEFT JOIN ubicaciones up ON u.ubicacion_padre_id = up.id
      LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
      WHERE u.estado = 'activo'
      GROUP BY u.id
      ORDER BY u.ubicacion_padre_id, u.nombre
    `);
    
    res.json(ubicaciones.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ubicaciones' });
  }
});

// Mover animal con historial completo
router.post('/move-animal', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { animal_id, nueva_ubicacion_id, motivo } = req.body;
    
    // Obtener ubicación actual del animal
    const animalActual = await query(
      'SELECT ubicacion_actual_id FROM animales WHERE id = ?',
      [animal_id]
    );
    
    if (animalActual.rows.length === 0) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }
    
    const ubicacionOrigen = animalActual.rows[0].ubicacion_actual_id;
    
    // Verificar capacidad
    const ubicacion = await query(
      'SELECT capacidad_maxima FROM ubicaciones WHERE id = ?',
      [nueva_ubicacion_id]
    );
    
    if (ubicacion.rows.length === 0) {
      return res.status(404).json({ error: 'Ubicación no encontrada' });
    }
    
    const capacidadMaxima = ubicacion.rows[0].capacidad_maxima;
    
    if (capacidadMaxima > 0) {
      const ocupacionActual = await query(
        'SELECT COUNT(*) as total FROM animales WHERE ubicacion_actual_id = ? AND estado = "activo"',
        [nueva_ubicacion_id]
      );
      
      if (ocupacionActual.rows[0].total >= capacidadMaxima) {
        return res.status(400).json({ error: 'La ubicación ha alcanzado su capacidad máxima' });
      }
    }
    
    // Registrar movimiento en historial
    await query(`
      INSERT INTO movimientos_animales (animal_id, ubicacion_origen_id, ubicacion_destino_id, fecha_movimiento, motivo, responsable_id)
      VALUES (?, ?, ?, date('now'), ?, ?)
    `, [animal_id, ubicacionOrigen, nueva_ubicacion_id, motivo, req.user.id]);
    
    // Actualizar ubicación del animal
    await query(
      'UPDATE animales SET ubicacion_actual_id = ? WHERE id = ?',
      [nueva_ubicacion_id, animal_id]
    );
    
    res.json({ message: 'Animal movido exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error moviendo animal' });
  }
});

// Obtener historial de movimientos
router.get('/movements/:animalId', authenticateToken, async (req, res) => {
  try {
    const { animalId } = req.params;
    
    const movimientos = await query(`
      SELECT ma.*, 
        uo.nombre as ubicacion_origen_nombre,
        ud.nombre as ubicacion_destino_nombre,
        u.nombre as responsable_nombre
      FROM movimientos_animales ma
      LEFT JOIN ubicaciones uo ON ma.ubicacion_origen_id = uo.id
      LEFT JOIN ubicaciones ud ON ma.ubicacion_destino_id = ud.id
      LEFT JOIN usuarios u ON ma.responsable_id = u.id
      WHERE ma.animal_id = ?
      ORDER BY ma.fecha_movimiento DESC, ma.created_at DESC
    `, [animalId]);
    
    res.json(movimientos.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo historial de movimientos' });
  }
});

// Obtener equipamiento de una ubicación
router.get('/:id/equipment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const equipamiento = await query(`
      SELECT *,
        CASE 
          WHEN proximo_mantenimiento <= date('now') THEN 'vencido'
          WHEN proximo_mantenimiento <= date('now', '+7 days') THEN 'proximo'
          ELSE 'normal'
        END as estado_mantenimiento
      FROM equipamiento
      WHERE ubicacion_id = ?
      ORDER BY nombre
    `, [id]);
    
    res.json(equipamiento.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo equipamiento' });
  }
});

// Agregar equipamiento
router.post('/:id/equipment', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, descripcion, fecha_instalacion, costo, vida_util_anos } = req.body;
    
    const proximoMantenimiento = new Date();
    proximoMantenimiento.setMonth(proximoMantenimiento.getMonth() + 6);
    
    const result = await query(`
      INSERT INTO equipamiento (ubicacion_id, nombre, tipo, descripcion, fecha_instalacion, costo, vida_util_anos, proximo_mantenimiento)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, nombre, tipo, descripcion, fecha_instalacion, costo, vida_util_anos, proximoMantenimiento.toISOString().split('T')[0]]);
    
    res.json({ id: result.lastID, message: 'Equipamiento agregado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error agregando equipamiento' });
  }
});

// Programar mantenimiento
router.post('/:id/maintenance', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_mantenimiento, fecha_programada, descripcion, costo } = req.body;
    
    const result = await query(`
      INSERT INTO mantenimiento_instalaciones (ubicacion_id, tipo_mantenimiento, fecha_programada, descripcion, costo, responsable_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, tipo_mantenimiento, fecha_programada, descripcion, costo, req.user.id]);
    
    res.json({ id: result.lastID, message: 'Mantenimiento programado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error programando mantenimiento' });
  }
});

// Obtener alertas de ubicaciones
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alertas = [];
    
    // Alertas de sobrepoblación
    const sobrepoblacion = await query(`
      SELECT u.nombre, COUNT(a.id) as animales_actuales, u.capacidad_maxima
      FROM ubicaciones u
      LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
      WHERE u.capacidad_maxima > 0
      GROUP BY u.id
      HAVING COUNT(a.id) >= u.capacidad_maxima
    `);
    
    sobrepoblacion.rows.forEach(row => {
      alertas.push({
        tipo: 'sobrepoblacion',
        mensaje: `${row.nombre} está sobrepoblado (${row.animales_actuales}/${row.capacidad_maxima})`,
        severidad: 'alta',
        ubicacion: row.nombre
      });
    });
    
    // Alertas de mantenimiento vencido
    const mantenimientoVencido = await query(`
      SELECT u.nombre, mi.tipo_mantenimiento, mi.fecha_programada
      FROM mantenimiento_instalaciones mi
      JOIN ubicaciones u ON mi.ubicacion_id = u.id
      WHERE mi.fecha_programada < date('now') AND mi.estado = 'pendiente'
    `);
    
    mantenimientoVencido.rows.forEach(row => {
      alertas.push({
        tipo: 'mantenimiento_vencido',
        mensaje: `Mantenimiento vencido en ${row.nombre}: ${row.tipo_mantenimiento}`,
        severidad: 'media',
        ubicacion: row.nombre,
        fecha_vencimiento: row.fecha_programada
      });
    });
    
    res.json(alertas);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo alertas' });
  }
});

module.exports = router;