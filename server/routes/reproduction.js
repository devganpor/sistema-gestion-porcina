const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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

router.post('/cycles', authenticateToken, [
  body('cerda_id').isInt(),
  body('fecha_inicio').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { cerda_id, fecha_inicio } = req.body;
    const cycleCount = await query(
      'SELECT COUNT(*) as count FROM ciclos_reproductivos WHERE cerda_id = $1',
      [cerda_id]
    );
    const numero_ciclo = parseInt(cycleCount.rows[0].count) + 1;

    await query(
      'INSERT INTO ciclos_reproductivos (cerda_id, fecha_inicio, numero_ciclo) VALUES ($1,$2,$3)',
      [cerda_id, fecha_inicio, numero_ciclo]
    );
    res.status(201).json({ message: 'Ciclo reproductivo creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando ciclo reproductivo' });
  }
});

router.post('/service', authenticateToken, [
  body('ciclo_id').isInt(),
  body('cerda_id').isInt(),
  body('verraco_id').isInt(),
  body('fecha').isDate(),
  body('tipo').isIn(['natural', 'artificial'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { ciclo_id, cerda_id, verraco_id, fecha, hora, tipo, numero_servicio } = req.body;
    const fechaParto = new Date(fecha);
    fechaParto.setDate(fechaParto.getDate() + 114);

    await query(
      `UPDATE ciclos_reproductivos
       SET fecha_servicio=$1, verraco_id=$2, fecha_parto_esperado=$3, estado='servicio'
       WHERE id=$4`,
      [fecha, verraco_id, fechaParto.toISOString().split('T')[0], ciclo_id]
    );
    res.status(201).json({ message: 'Servicio registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando servicio' });
  }
});

router.post('/birth', authenticateToken, [
  body('ciclo_id').isInt(),
  body('fecha_real').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { ciclo_id, fecha_real, lechones_vivos, lechones_muertos, observaciones } = req.body;
    await query(
      `UPDATE ciclos_reproductivos
       SET fecha_parto_real=$1, lechones_vivos=$2, lechones_muertos=$3, observaciones=$4, estado='parto'
       WHERE id=$5`,
      [fecha_real, lechones_vivos, lechones_muertos, observaciones, ciclo_id]
    );
    res.status(201).json({ message: 'Parto registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando parto' });
  }
});

router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = [];
    const proximosPartos = await query(`
      SELECT fecha_parto_esperado, a.identificador_unico, a.nombre
      FROM ciclos_reproductivos cr
      JOIN animales a ON cr.cerda_id = a.id
      WHERE cr.fecha_parto_esperado BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND cr.estado = 'servicio'
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

router.get('/sows', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, identificador_unico, nombre FROM animales
      WHERE sexo='hembra' AND categoria='reproductor' AND estado='activo'
      ORDER BY identificador_unico
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo cerdas reproductoras' });
  }
});

router.get('/boars', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, identificador_unico, nombre FROM animales
      WHERE sexo='macho' AND categoria='reproductor' AND estado='activo'
      ORDER BY identificador_unico
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo verracos' });
  }
});

router.put('/cycles/:id', authenticateToken, async (req, res) => {
  try {
    const { cerda_id, fecha_inicio } = req.body;
    await query(
      'UPDATE ciclos_reproductivos SET cerda_id=$1, fecha_inicio=$2 WHERE id=$3',
      [cerda_id, fecha_inicio, req.params.id]
    );
    res.json({ message: 'Ciclo actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando ciclo' });
  }
});

router.delete('/cycles/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM ciclos_reproductivos WHERE id=$1', [req.params.id]);
    res.json({ message: 'Ciclo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando ciclo' });
  }
});

module.exports = router;
