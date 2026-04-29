const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Obtener ciclos reproductivos
router.get('/cycles', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT cr.*, a.identificador_unico as cerda_identificador, a.nombre as cerda_nombre
      FROM ciclos_reproductivos cr
      JOIN animales a ON cr.cerda_id = a.id
      ORDER BY cr.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ciclos reproductivos' });
  }
});

// Crear ciclo reproductivo
router.post('/cycles', authenticateToken, [
  body('cerda_id').isInt(),
  body('fecha_inicio').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { cerda_id, fecha_inicio } = req.body;
    
    // Obtener número de ciclo
    const cycleCount = await query(
      'SELECT COUNT(*) as count FROM ciclos_reproductivos WHERE cerda_id = ?',
      [cerda_id]
    );
    const numero_ciclo = parseInt(cycleCount.rows[0].count) + 1;

    const result = await query(
      'INSERT INTO ciclos_reproductivos (cerda_id, fecha_inicio, numero_ciclo) VALUES (?, ?, ?)',
      [cerda_id, fecha_inicio, numero_ciclo]
    );

    res.status(201).json({ message: 'Ciclo reproductivo creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando ciclo reproductivo' });
  }
});

// Registrar celo
router.post('/heat', authenticateToken, [
  body('ciclo_id').isInt(),
  body('fecha_deteccion').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ciclo_id, fecha_deteccion, intensidad, observaciones } = req.body;

    const result = await query(
      'INSERT INTO celos (ciclo_id, fecha_deteccion, intensidad, observaciones) VALUES (?, ?, ?, ?)',
      [ciclo_id, fecha_deteccion, intensidad, observaciones]
    );

    res.status(201).json({ message: 'Celo registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando celo' });
  }
});

// Registrar servicio
router.post('/service', authenticateToken, [
  body('ciclo_id').isInt(),
  body('cerda_id').isInt(),
  body('verraco_id').isInt(),
  body('fecha').isDate(),
  body('tipo').isIn(['natural', 'artificial'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ciclo_id, cerda_id, verraco_id, fecha, hora, tipo, numero_servicio } = req.body;

    const result = await query(
      'INSERT INTO servicios (ciclo_id, cerda_id, verraco_id, fecha, hora, tipo, numero_servicio) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ciclo_id, cerda_id, verraco_id, fecha, hora, tipo, numero_servicio || 1]
    );

    // Crear gestación automáticamente
    const fechaParto = new Date(fecha);
    fechaParto.setDate(fechaParto.getDate() + 114); // 114 días de gestación

    // Obtener el ID del servicio insertado
    const servicioId = await query('SELECT last_insert_rowid() as id');
    
    await query(
      'INSERT INTO gestaciones (servicio_id, fecha_parto_esperado) VALUES (?, ?)',
      [servicioId.rows[0].id, fechaParto.toISOString().split('T')[0]]
    );

    res.status(201).json({ message: 'Servicio registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando servicio' });
  }
});

// Confirmar gestación
router.put('/pregnancy/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_confirmacion, metodo_confirmacion, resultado } = req.body;

    const result = await query(
      'UPDATE gestaciones SET fecha_confirmacion = ?, metodo_confirmacion = ?, resultado = ? WHERE id = ?',
      [fecha_confirmacion, metodo_confirmacion, resultado ? 1 : 0, id]
    );

    res.json({ message: 'Gestación confirmada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error confirmando gestación' });
  }
});

// Registrar parto
router.post('/birth', authenticateToken, [
  body('gestacion_id').isInt(),
  body('fecha_real').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      gestacion_id, fecha_real, lechones_vivos, lechones_muertos,
      lechones_momificados, peso_promedio, duracion_minutos, complicaciones
    } = req.body;

    const result = await query(
      `INSERT INTO partos (gestacion_id, fecha_real, lechones_vivos, lechones_muertos, 
       lechones_momificados, peso_promedio, duracion_minutos, complicaciones) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [gestacion_id, fecha_real, lechones_vivos, lechones_muertos,
       lechones_momificados, peso_promedio, duracion_minutos, complicaciones]
    );

    res.status(201).json({ message: 'Parto registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando parto' });
  }
});

// Obtener alertas reproductivas
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = [];

    // Partos próximos (7 días)
    const proximosPartos = await query(`
      SELECT g.fecha_parto_esperado, a.identificador_unico, a.nombre
      FROM gestaciones g
      JOIN servicios s ON g.servicio_id = s.id
      JOIN animales a ON s.cerda_id = a.id
      WHERE g.fecha_parto_esperado BETWEEN date('now') AND date('now', '+7 days')
      AND g.resultado = 1
    `);

    proximosPartos.rows.forEach(row => {
      alerts.push({
        tipo: 'parto_proximo',
        mensaje: `Parto esperado: ${row.identificador_unico} - ${row.nombre}`,
        fecha: row.fecha_parto_esperado,
        prioridad: 'alta'
      });
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo alertas' });
  }
});

// Obtener cerdas reproductoras
router.get('/sows', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, identificador_unico, nombre
      FROM animales
      WHERE sexo = 'hembra' AND categoria = 'reproductor' AND estado = 'activo'
      ORDER BY identificador_unico
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo cerdas reproductoras' });
  }
});

// Obtener verracos
router.get('/boars', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, identificador_unico, nombre
      FROM animales
      WHERE sexo = 'macho' AND categoria = 'reproductor' AND estado = 'activo'
      ORDER BY identificador_unico
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo verracos' });
  }
});

// Actualizar ciclo reproductivo
router.put('/cycles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cerda_id, fecha_inicio } = req.body;

    await query(
      'UPDATE ciclos_reproductivos SET cerda_id = ?, fecha_inicio = ? WHERE id = ?',
      [cerda_id, fecha_inicio, id]
    );

    res.json({ message: 'Ciclo actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando ciclo' });
  }
});

// Eliminar ciclo reproductivo
router.delete('/cycles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM ciclos_reproductivos WHERE id = ?', [id]);
    res.json({ message: 'Ciclo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando ciclo' });
  }
});

module.exports = router;