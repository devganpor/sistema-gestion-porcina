const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Obtener medicamentos
router.get('/medications', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM medicamentos 
      ORDER BY nombre
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo medicamentos' });
  }
});

// Crear medicamento
router.post('/medications', authenticateToken, [
  body('nombre').notEmpty(),
  body('tipo').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento } = req.body;

    await query(
      'INSERT INTO medicamentos (nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, tipo, dias_retiro || 0, dosis_recomendada, stock_actual || 0, fecha_vencimiento]
    );

    res.status(201).json({ message: 'Medicamento creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando medicamento' });
  }
});

// Registrar evento sanitario
router.post('/events', authenticateToken, [
  body('animal_id').isInt(),
  body('tipo_evento').notEmpty(),
  body('fecha').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo } = req.body;

    await query(
      'INSERT INTO eventos_sanitarios (animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo]
    );

    res.status(201).json({ message: 'Evento sanitario registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando evento sanitario' });
  }
});

// Obtener eventos sanitarios de un animal
router.get('/events/animal/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM eventos_sanitarios 
      WHERE animal_id = ? 
      ORDER BY fecha DESC
    `, [req.params.id]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo eventos sanitarios' });
  }
});

// Registrar vacunación
router.post('/vaccinations', authenticateToken, [
  body('animal_id').isInt(),
  body('vacuna').notEmpty(),
  body('fecha_aplicacion').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { animal_id, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable } = req.body;

    await query(
      'INSERT INTO vacunaciones (animal_id, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable) VALUES (?, ?, ?, ?, ?, ?)',
      [animal_id, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable]
    );

    res.status(201).json({ message: 'Vacunación registrada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando vacunación' });
  }
});

// Obtener vacunaciones próximas
router.get('/vaccinations/upcoming', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT v.*, a.identificador_unico, a.nombre as animal_nombre
      FROM vacunaciones v
      JOIN animales a ON v.animal_id = a.id
      WHERE v.proxima_dosis BETWEEN date('now') AND date('now', '+30 days')
      AND a.estado = 'activo'
      ORDER BY v.proxima_dosis
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo vacunaciones próximas' });
  }
});

// Obtener medicamentos por vencer
router.get('/medications/expiring', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM medicamentos 
      WHERE fecha_vencimiento BETWEEN date('now') AND date('now', '+60 days')
      ORDER BY fecha_vencimiento
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo medicamentos por vencer' });
  }
});

// Animales en período de retiro
router.get('/withdrawal', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT a.id, a.identificador_unico, a.nombre,
             t.fecha_fin, m.nombre as medicamento, m.dias_retiro
      FROM animales a
      JOIN eventos_sanitarios es ON a.id = es.animal_id
      JOIN tratamientos t ON es.id = t.evento_sanitario_id
      JOIN medicamentos m ON t.medicamento_id = m.id
      WHERE t.fecha_fin >= date('now', '-' || m.dias_retiro || ' days')
      AND a.estado = 'activo'
      ORDER BY t.fecha_fin DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo animales en retiro' });
  }
});

// Actualizar medicamento
router.put('/medications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento } = req.body;

    await query(
      'UPDATE medicamentos SET nombre = ?, tipo = ?, dias_retiro = ?, dosis_recomendada = ?, stock_actual = ?, fecha_vencimiento = ? WHERE id = ?',
      [nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento, id]
    );

    res.json({ message: 'Medicamento actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando medicamento' });
  }
});

// Eliminar medicamento
router.delete('/medications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM medicamentos WHERE id = ?', [id]);
    res.json({ message: 'Medicamento eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando medicamento' });
  }
});

module.exports = router;
