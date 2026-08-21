const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── MEDICAMENTOS ──────────────────────────────────────────────────────────────

router.get('/medications', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT m.*,
        COALESCE(SUM(l.cantidad_actual) FILTER (WHERE l.activo AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)), 0) AS stock_disponible,
        COUNT(l.id) FILTER (WHERE l.activo) AS total_lotes,
        MIN(l.fecha_vencimiento::text) FILTER (WHERE l.activo AND l.fecha_vencimiento IS NOT NULL) AS proximo_vencimiento
      FROM medicamentos m
      LEFT JOIN medicamento_lotes l ON l.medicamento_id = m.id
      GROUP BY m.id
      ORDER BY m.nombre
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo medicamentos' });
  }
});

router.post('/medications', authenticateToken, [body('nombre').notEmpty()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { nombre, tipo, unidad_medida, dias_retiro, dosis_recomendada } = req.body;
    const result = await query(
      'INSERT INTO medicamentos (nombre, tipo, unidad_medida, dias_retiro, dosis_recomendada) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nombre, tipo, unidad_medida || 'ml', dias_retiro || 0, dosis_recomendada]
    );
    res.status(201).json({ message: 'Medicamento creado exitosamente', id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Error creando medicamento' });
  }
});

router.put('/medications/:id', authenticateToken, async (req, res) => {
  try {
    const { nombre, tipo, unidad_medida, dias_retiro, dosis_recomendada } = req.body;
    await query(
      'UPDATE medicamentos SET nombre=$1, tipo=$2, unidad_medida=$3, dias_retiro=$4, dosis_recomendada=$5 WHERE id=$6',
      [nombre, tipo, unidad_medida, dias_retiro, dosis_recomendada, req.params.id]
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

// ── LOTES ─────────────────────────────────────────────────────────────────────

router.get('/medications/:id/lots', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT *, fecha_vencimiento::text, fecha_ingreso::text FROM medicamento_lotes WHERE medicamento_id=$1 ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo lotes' });
  }
});

router.post('/medications/:id/lots', authenticateToken, [
  body('numero_lote').notEmpty(),
  body('cantidad_inicial').isFloat({ min: 0.001 }),
  body('costo_unitario').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { numero_lote, cantidad_inicial, unidad_medida, costo_unitario, fecha_vencimiento, fecha_ingreso, proveedor } = req.body;
    const med = await query('SELECT unidad_medida FROM medicamentos WHERE id=$1', [req.params.id]);
    const unidad = unidad_medida || med.rows[0]?.unidad_medida || 'ml';
    await query(
      `INSERT INTO medicamento_lotes (medicamento_id, numero_lote, cantidad_inicial, cantidad_actual, unidad_medida, costo_unitario, fecha_vencimiento, fecha_ingreso, proveedor)
       VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8)`,
      [req.params.id, numero_lote, cantidad_inicial, unidad, costo_unitario, fecha_vencimiento || null, fecha_ingreso || new Date().toISOString().split('T')[0], proveedor || null]
    );
    res.status(201).json({ message: 'Lote registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando lote' });
  }
});

router.put('/medications/:medId/lots/:lotId', authenticateToken, async (req, res) => {
  try {
    const { numero_lote, cantidad_actual, unidad_medida, costo_unitario, fecha_vencimiento, fecha_ingreso, proveedor, activo } = req.body;
    await query(
      `UPDATE medicamento_lotes SET numero_lote=$1, cantidad_actual=$2, unidad_medida=$3, costo_unitario=$4,
       fecha_vencimiento=$5, fecha_ingreso=$6, proveedor=$7, activo=$8 WHERE id=$9 AND medicamento_id=$10`,
      [numero_lote, cantidad_actual, unidad_medida, costo_unitario, fecha_vencimiento || null, fecha_ingreso, proveedor || null, activo !== false, req.params.lotId, req.params.medId]
    );
    res.json({ message: 'Lote actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando lote' });
  }
});

router.delete('/medications/:medId/lots/:lotId', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM medicamento_lotes WHERE id=$1 AND medicamento_id=$2', [req.params.lotId, req.params.medId]);
    res.json({ message: 'Lote eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando lote' });
  }
});

// ── EVENTOS SANITARIOS ────────────────────────────────────────────────────────

router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, tipo_evento, animal_id, ubicacion_id } = req.query;
    const params = [];
    let conditions = '';
    if (fecha_inicio) { params.push(fecha_inicio); conditions += ` AND es.fecha >= $${params.length}`; }
    if (fecha_fin)    { params.push(fecha_fin);    conditions += ` AND es.fecha <= $${params.length}`; }
    if (tipo_evento)  { params.push(tipo_evento);  conditions += ` AND es.tipo_evento = $${params.length}`; }
    if (animal_id)    { params.push(animal_id);    conditions += ` AND es.animal_id = $${params.length}`; }
    if (ubicacion_id) { params.push(ubicacion_id); conditions += ` AND a.ubicacion_actual_id = $${params.length}`; }

    const result = await query(`
      SELECT es.id, es.animal_id, es.tipo_evento, es.fecha::text, es.descripcion,
             es.tratamiento, es.veterinario, es.costo, es.observaciones,
             a.identificador_unico as animal_identificador, a.nombre as animal_nombre,
             u.nombre as ubicacion_nombre
      FROM eventos_sanitarios es
      JOIN animales a ON es.animal_id = a.id
      LEFT JOIN ubicaciones u ON a.ubicacion_actual_id = u.id
      WHERE 1=1${conditions}
      ORDER BY es.fecha DESC, es.id DESC
      LIMIT 500
    `, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo eventos sanitarios' });
  }
});

router.get('/events/animal/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT *, fecha::text FROM eventos_sanitarios WHERE animal_id=$1 ORDER BY fecha DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo eventos sanitarios' });
  }
});

router.post('/events', authenticateToken, [
  body('tipo_evento').notEmpty(),
  body('fecha').isDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo } = req.body;
    const result = await query(
      'INSERT INTO eventos_sanitarios (animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
      [animal_id, tipo_evento, fecha, descripcion, tratamiento || null, veterinario || null, costo || null]
    );
    res.status(201).json({ message: 'Evento sanitario registrado exitosamente', id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando evento sanitario' });
  }
});

// Registro masivo: aplica el mismo evento a múltiples animales (por corral o lista)
router.post('/events/bulk', authenticateToken, async (req, res) => {
  const { animal_ids, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo_por_animal } = req.body;
  if (!Array.isArray(animal_ids) || animal_ids.length === 0)
    return res.status(400).json({ error: 'animal_ids es requerido' });
  if (!tipo_evento || !fecha)
    return res.status(400).json({ error: 'tipo_evento y fecha son requeridos' });

  const client = await require('../config/database-pg').pool.connect();
  try {
    await client.query('BEGIN');
    let ok = 0;
    for (const aid of animal_ids) {
      await client.query(
        'INSERT INTO eventos_sanitarios (animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [aid, tipo_evento, fecha, descripcion || null, tratamiento || null, veterinario || null, costo_por_animal || null]
      );
      ok++;
    }
    await client.query('COMMIT');
    res.status(201).json({ message: `${ok} eventos registrados exitosamente`, registrados: ok });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error en registro masivo' });
  } finally {
    client.release();
  }
});

router.put('/events/:id', authenticateToken, async (req, res) => {
  try {
    const { tipo_evento, fecha, descripcion, tratamiento, veterinario, costo } = req.body;
    await query(
      'UPDATE eventos_sanitarios SET tipo_evento=$1, fecha=$2, descripcion=$3, tratamiento=$4, veterinario=$5, costo=$6 WHERE id=$7',
      [tipo_evento, fecha, descripcion, tratamiento || null, veterinario || null, costo || null, req.params.id]
    );
    res.json({ message: 'Evento actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando evento sanitario' });
  }
});

router.delete('/events/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM eventos_sanitarios WHERE id=$1', [req.params.id]);
    res.json({ message: 'Evento eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando evento sanitario' });
  }
});

// ── VACUNACIONES ──────────────────────────────────────────────────────────────

router.get('/vaccinations', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, vacuna, ubicacion_id } = req.query;
    const params = [];
    let conditions = '';
    if (fecha_inicio) { params.push(fecha_inicio); conditions += ` AND v.fecha_aplicacion >= $${params.length}`; }
    if (fecha_fin)    { params.push(fecha_fin);    conditions += ` AND v.fecha_aplicacion <= $${params.length}`; }
    if (vacuna)       { params.push(`%${vacuna}%`); conditions += ` AND v.vacuna ILIKE $${params.length}`; }
    if (ubicacion_id) { params.push(ubicacion_id); conditions += ` AND a.ubicacion_actual_id = $${params.length}`; }

    const result = await query(`
      SELECT v.id, v.animal_id, v.vacuna, v.fecha_aplicacion::text, v.lote,
             v.proxima_dosis::text, v.responsable,
             a.identificador_unico as animal_identificador, a.nombre as animal_nombre,
             u.nombre as ubicacion_nombre
      FROM vacunaciones v
      JOIN animales a ON v.animal_id = a.id
      LEFT JOIN ubicaciones u ON a.ubicacion_actual_id = u.id
      WHERE 1=1${conditions}
      ORDER BY v.fecha_aplicacion DESC, v.id DESC
      LIMIT 500
    `, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo vacunaciones' });
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
      'INSERT INTO vacunaciones (animal_id, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable) VALUES ($1,$2,$3,$4,$5,$6)',
      [animal_id, vacuna, fecha_aplicacion, lote || null, proxima_dosis || null, responsable || null]
    );
    res.status(201).json({ message: 'Vacunación registrada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando vacunación' });
  }
});

// Vacunación masiva por lista de animales
router.post('/vaccinations/bulk', authenticateToken, async (req, res) => {
  const { animal_ids, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable } = req.body;
  if (!Array.isArray(animal_ids) || animal_ids.length === 0)
    return res.status(400).json({ error: 'animal_ids es requerido' });
  if (!vacuna || !fecha_aplicacion)
    return res.status(400).json({ error: 'vacuna y fecha_aplicacion son requeridos' });

  const client = await require('../config/database-pg').pool.connect();
  try {
    await client.query('BEGIN');
    let ok = 0;
    for (const aid of animal_ids) {
      await client.query(
        'INSERT INTO vacunaciones (animal_id, vacuna, fecha_aplicacion, lote, proxima_dosis, responsable) VALUES ($1,$2,$3,$4,$5,$6)',
        [aid, vacuna, fecha_aplicacion, lote || null, proxima_dosis || null, responsable || null]
      );
      ok++;
    }
    await client.query('COMMIT');
    res.status(201).json({ message: `${ok} vacunaciones registradas exitosamente`, registrados: ok });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error en vacunación masiva' });
  } finally {
    client.release();
  }
});

router.put('/vaccinations/:id', authenticateToken, async (req, res) => {
  try {
    const { vacuna, fecha_aplicacion, lote, proxima_dosis, responsable } = req.body;
    await query(
      'UPDATE vacunaciones SET vacuna=$1, fecha_aplicacion=$2, lote=$3, proxima_dosis=$4, responsable=$5 WHERE id=$6',
      [vacuna, fecha_aplicacion, lote || null, proxima_dosis || null, responsable || null, req.params.id]
    );
    res.json({ message: 'Vacunación actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando vacunación' });
  }
});

router.delete('/vaccinations/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM vacunaciones WHERE id=$1', [req.params.id]);
    res.json({ message: 'Vacunación eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando vacunación' });
  }
});

router.get('/vaccinations/upcoming', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT v.*, v.fecha_aplicacion::text, v.proxima_dosis::text,
             a.identificador_unico, a.nombre as animal_nombre
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

// ── MEDICAMENTOS EXPIRANDO (desde lotes, no desde medicamentos) ───────────────

router.get('/medications/expiring', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT m.nombre, m.tipo, l.numero_lote, l.cantidad_actual, l.unidad_medida,
             l.fecha_vencimiento::text, l.costo_unitario,
             CURRENT_DATE - l.fecha_vencimiento::date AS dias_para_vencer
      FROM medicamento_lotes l
      JOIN medicamentos m ON l.medicamento_id = m.id
      WHERE l.activo = true
        AND l.fecha_vencimiento IS NOT NULL
        AND l.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
      ORDER BY l.fecha_vencimiento ASC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo medicamentos por vencer' });
  }
});

// ── KPIs SANITARIOS ───────────────────────────────────────────────────────────

router.get('/kpis', authenticateToken, async (req, res) => {
  try {
    const [totales, mes, costoTotal, costoMes, proxVacunas, enRetiro] = await Promise.all([
      query(`SELECT tipo_evento, COUNT(*) as cnt FROM eventos_sanitarios GROUP BY tipo_evento`),
      query(`SELECT COUNT(*) as cnt FROM eventos_sanitarios WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)`),
      query(`SELECT COALESCE(SUM(costo),0) as total FROM eventos_sanitarios WHERE costo > 0`),
      query(`SELECT COALESCE(SUM(costo),0) as total FROM eventos_sanitarios WHERE costo > 0 AND fecha >= DATE_TRUNC('month', CURRENT_DATE)`),
      query(`SELECT COUNT(*) as cnt FROM vacunaciones v JOIN animales a ON v.animal_id=a.id WHERE v.proxima_dosis BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND a.estado='activo'`),
      query(`SELECT COUNT(DISTINCT a.id) as cnt FROM animales a JOIN eventos_sanitarios es ON a.id=es.animal_id WHERE es.tipo_evento='tratamiento' AND es.fecha >= CURRENT_DATE - INTERVAL '7 days' AND a.estado='activo'`)
    ]);
    const porTipo = {};
    totales.rows.forEach(r => { porTipo[r.tipo_evento] = parseInt(r.cnt); });
    res.json({
      por_tipo: porTipo,
      eventos_mes: parseInt(mes.rows[0].cnt),
      costo_total: parseFloat(costoTotal.rows[0].total),
      costo_mes: parseFloat(costoMes.rows[0].total),
      proximas_vacunas: parseInt(proxVacunas.rows[0].cnt),
      animales_en_tratamiento: parseInt(enRetiro.rows[0].cnt)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo KPIs sanitarios' });
  }
});

// ── RETIRO ────────────────────────────────────────────────────────────────────

router.get('/withdrawal', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT a.id, a.identificador_unico, a.nombre,
             t.fecha_fin::text, m.nombre as medicamento, m.dias_retiro
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

// ── APLICAR MEDICAMENTO (FIFO) ────────────────────────────────────────────────

router.post('/medications/apply', authenticateToken, async (req, res) => {
  const client = await (require('../config/database-pg').pool).connect();
  try {
    const { animal_id, medicamento_id, fecha, dosis_aplicada, descripcion, veterinario } = req.body;
    if (!animal_id || !medicamento_id || !dosis_aplicada || !fecha)
      return res.status(400).json({ error: 'animal_id, medicamento_id, fecha y dosis_aplicada son requeridos' });
    const dosis = parseFloat(dosis_aplicada);
    if (isNaN(dosis) || dosis <= 0) return res.status(400).json({ error: 'dosis_aplicada debe ser un número positivo' });

    await client.query('BEGIN');
    const lotesRes = await client.query(
      `SELECT * FROM medicamento_lotes WHERE medicamento_id=$1 AND activo=true AND cantidad_actual>0
         AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
       ORDER BY fecha_vencimiento ASC NULLS LAST, created_at ASC`,
      [medicamento_id]
    );
    const lotes = lotesRes.rows;
    const stockTotal = lotes.reduce((s, l) => s + parseFloat(l.cantidad_actual), 0);
    if (stockTotal < dosis) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stockTotal.toFixed(3)}` });
    }
    let restante = dosis;
    let costoTotal = 0;
    for (const lote of lotes) {
      if (restante <= 0) break;
      const disponible = parseFloat(lote.cantidad_actual);
      const usado = Math.min(disponible, restante);
      costoTotal += usado * parseFloat(lote.costo_unitario);
      restante -= usado;
      const nuevaCantidad = disponible - usado;
      await client.query('UPDATE medicamento_lotes SET cantidad_actual=$1, activo=$2 WHERE id=$3', [nuevaCantidad, nuevaCantidad > 0, lote.id]);
    }
    const medRes = await client.query('SELECT nombre, unidad_medida FROM medicamentos WHERE id=$1', [medicamento_id]);
    const med = medRes.rows[0];
    await client.query(
      `INSERT INTO eventos_sanitarios (animal_id, tipo_evento, fecha, descripcion, tratamiento, veterinario, costo) VALUES ($1,'tratamiento',$2,$3,$4,$5,$6)`,
      [animal_id, fecha, descripcion || `Aplicación de ${med?.nombre}`, `${med?.nombre} — ${dosis} ${med?.unidad_medida || ''}`.trim(), veterinario || null, costoTotal > 0 ? costoTotal.toFixed(4) : null]
    );
    await client.query('COMMIT');
    res.status(201).json({ message: 'Aplicación registrada exitosamente', costo_total: costoTotal.toFixed(4), dosis_aplicada: dosis, unidad: med?.unidad_medida });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error registrando aplicación' });
  } finally {
    client.release();
  }
});

module.exports = router;
