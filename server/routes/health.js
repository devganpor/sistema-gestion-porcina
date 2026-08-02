const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/medications', authenticateToken, async (req, res) => {
  try {
    const result = await query(`SELECT * FROM medicamentos ORDER BY nombre`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo medicamentos' });
  }
});

router.post('/medications', authenticateToken, [
  body('nombre').notEmpty(),
  body('tipo').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento } = req.body;
    await query(
      'INSERT INTO medicamentos (nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento) VALUES ($1, $2, $3, $4, $5, $6)',
      [nombre, tipo, dias_retiro || 0, dosis_recomendada, stock_actual || 0, fecha_vencimiento]
    );
    res.status(201).json({ message: 'Medicamento creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando medicamento' });
  }
});

router.post('/events', authenticateToken, [
  body('animal_id').isInt(),
  body('tipo_evento').notEmpty(),
  body('fecha').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo } = req.body;
    await query(
      'INSERT INTO eventos_sanitarios (animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo]
    );
    res.status(201).json({ message: 'Evento sanitario registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando evento sanitario' });
  }
});

// Listar todos los eventos sanitarios
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT es.*, a.identificador_unico as animal_identificador
      FROM eventos_sanitarios es
      JOIN animales a ON es.animal_id = a.id
      ORDER BY es.fecha DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo eventos sanitarios' });
  }
});

router.get('/events/animal/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM eventos_sanitarios WHERE animal_id = $1 ORDER BY fecha DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo eventos sanitarios' });
  }
});

router.post('/vaccinations', authenticateToken, [
  body('animal_id').isInt(),
  body('vacuna').notEmpty(),
  body('fecha_aplicacion').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { animal_id, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable } = req.body;
    await query(
      'INSERT INTO vacunaciones (animal_id, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable) VALUES ($1, $2, $3, $4, $5, $6)',
      [animal_id, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable]
    );
    res.status(201).json({ message: 'Vacunación registrada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando vacunación' });
  }
});

// Listar todas las vacunaciones
router.get('/vaccinations', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT v.*, a.identificador_unico as animal_identificador
      FROM vacunaciones v
      JOIN animales a ON v.animal_id = a.id
      ORDER BY v.fecha_aplicacion DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo vacunaciones' });
  }
});

router.get('/vaccinations/upcoming', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT v.*, a.identificador_unico, a.nombre as animal_nombre
      FROM vacunaciones v
      JOIN animales a ON v.animal_id = a.id
      WHERE v.proxima_dosis BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND a.estado = 'activo'
      ORDER BY v.proxima_dosis
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo vacunaciones próximas' });
  }
});

router.get('/medications/expiring', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM medicamentos
      WHERE fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
      ORDER BY fecha_vencimiento
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo medicamentos por vencer' });
  }
});

router.get('/withdrawal', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT a.id, a.identificador_unico, a.nombre,
             t.fecha_fin, m.nombre as medicamento, m.dias_retiro
      FROM animales a
      JOIN eventos_sanitarios es ON a.id = es.animal_id
      JOIN tratamientos t ON es.id = t.evento_sanitario_id
      JOIN medicamentos m ON t.medicamento_id = m.id
      WHERE t.fecha_fin >= CURRENT_DATE - (m.dias_retiro || ' days')::INTERVAL
      AND a.estado = 'activo'
      ORDER BY t.fecha_fin DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo animales en retiro' });
  }
});

router.put('/medications/:id', authenticateToken, async (req, res) => {
  try {
    const { nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento } = req.body;
    await query(
      'UPDATE medicamentos SET nombre=$1, tipo=$2, dias_retiro=$3, dosis_recomendada=$4, stock_actual=$5, fecha_vencimiento=$6 WHERE id=$7',
      [nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento, req.params.id]
    );
    res.json({ message: 'Medicamento actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando medicamento' });
  }
});

router.delete('/medications/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM medicamentos WHERE id=$1', [req.params.id]);
    res.json({ message: 'Medicamento eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando medicamento' });
  }
});

module.exports = router;
