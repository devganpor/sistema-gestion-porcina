const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

// Listar todos los pesajes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, a.identificador_unico as animal_identificador
      FROM pesajes p
      JOIN animales a ON p.animal_id = a.id
      ORDER BY p.fecha_pesaje DESC
      LIMIT 500
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo pesajes' });
  }
});

router.get('/animal/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, u.nombre as usuario_nombre
      FROM pesajes p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.animal_id = $1
      ORDER BY p.fecha_pesaje DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo pesajes' });
  }
});

router.post('/', authenticateToken, csrfProtection, [
  body('animal_id').isInt({ min: 1 }),
  body('peso').isFloat({ min: 0, max: 1000 }),
  body('fecha_pesaje').isISO8601()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Datos inválidos', 400);

  const { animal_id, peso, fecha_pesaje, observaciones } = req.body;
  const result = await query(
    'INSERT INTO pesajes (animal_id, peso, fecha_pesaje, observaciones, usuario_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [animal_id, peso, fecha_pesaje, observaciones, req.user.id]
  );
  res.status(201).json({ message: 'Pesaje registrado exitosamente', id: result.rows[0].id });
}));

router.get('/growth-stats/:id', authenticateToken, async (req, res) => {
  try {
    const pesajes = await query(`
      SELECT peso, fecha_pesaje FROM pesajes
      WHERE animal_id = $1 ORDER BY fecha_pesaje ASC
    `, [req.params.id]);

    if (pesajes.rows.length < 2) {
      return res.json({ message: 'Se necesitan al menos 2 pesajes para calcular estadísticas' });
    }

    const rows = pesajes.rows;
    const pesoInicial = parseFloat(rows[0].peso);
    const pesoActual = parseFloat(rows[rows.length - 1].peso);
    const fechaInicial = new Date(rows[0].fecha_pesaje);
    const fechaActual = new Date(rows[rows.length - 1].fecha_pesaje);
    const diasTranscurridos = Math.ceil((fechaActual - fechaInicial) / (1000 * 60 * 60 * 24));
    const gananciaPeso = pesoActual - pesoInicial;
    const gananciaPromedioDiaria = diasTranscurridos > 0 ? gananciaPeso / diasTranscurridos : 0;
    const pesoObjetivo = 100;
    const diasParaObjetivo = gananciaPromedioDiaria > 0 ? Math.ceil((pesoObjetivo - pesoActual) / gananciaPromedioDiaria) : null;

    res.json({
      peso_inicial: pesoInicial,
      peso_actual: pesoActual,
      ganancia_total: gananciaPeso,
      dias_transcurridos: diasTranscurridos,
      ganancia_promedio_diaria: Math.round(gananciaPromedioDiaria * 1000) / 1000,
      dias_para_objetivo: diasParaObjetivo,
      fecha_objetivo_estimada: diasParaObjetivo ?
        new Date(fechaActual.getTime() + diasParaObjetivo * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Error calculando estadísticas de crecimiento' });
  }
});

router.get('/ready-for-sale', authenticateToken, async (req, res) => {
  try {
    const pesoMinimo = req.query.peso_minimo || 100;
    const result = await query(`
      SELECT DISTINCT a.id, a.identificador_unico, a.nombre, a.categoria,
             p.peso as ultimo_peso, p.fecha_pesaje as fecha_ultimo_pesaje,
             u.nombre as ubicacion_nombre
      FROM animales a
      JOIN pesajes p ON a.id = p.animal_id
      LEFT JOIN ubicaciones u ON a.ubicacion_actual_id = u.id
      WHERE a.estado = 'activo'
      AND a.categoria IN ('engorde', 'desarrollo')
      AND p.peso >= $1
      AND p.fecha_pesaje = (SELECT MAX(fecha_pesaje) FROM pesajes p2 WHERE p2.animal_id = a.id)
      ORDER BY p.peso DESC
    `, [pesoMinimo]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo animales listos para venta' });
  }
});

router.put('/:id', authenticateToken, [
  body('peso').isFloat({ min: 0 }),
  body('fecha_pesaje').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { peso, fecha_pesaje, observaciones } = req.body;
    await query(
      'UPDATE pesajes SET peso=$1, fecha_pesaje=$2, observaciones=$3 WHERE id=$4',
      [peso, fecha_pesaje, observaciones, req.params.id]
    );
    res.json({ message: 'Pesaje actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando pesaje' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM pesajes WHERE id=$1', [req.params.id]);
    res.json({ message: 'Pesaje eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando pesaje' });
  }
});

module.exports = router;
