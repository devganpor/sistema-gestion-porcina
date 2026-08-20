const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

router.get('/razas', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM razas ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo razas' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { categoria, estado, ubicacion } = req.query;
    const params = [];
    let conditions = '';

    if (categoria) { params.push(categoria); conditions += ` AND a.categoria = $${params.length}`; }
    if (estado)    { params.push(estado);    conditions += ` AND a.estado = $${params.length}`; }
    if (ubicacion) { params.push(ubicacion); conditions += ` AND a.ubicacion_actual_id = $${params.length}`; }

    const result = await query(`
      SELECT a.*, r.nombre as raza_nombre, u.nombre as ubicacion_nombre,
             m.identificador_unico as madre_id_nombre, p.identificador_unico as padre_id_nombre
      FROM animales a
      LEFT JOIN razas r ON a.raza_id = r.id
      LEFT JOIN ubicaciones u ON a.ubicacion_actual_id = u.id
      LEFT JOIN animales m ON a.madre_id = m.id
      LEFT JOIN animales p ON a.padre_id = p.id
      WHERE 1=1${conditions}
      ORDER BY a.created_at DESC
    `, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo animales' });
  }
});

router.post('/', authenticateToken, csrfProtection, [
  body('identificador_unico').trim().isLength({ min: 1, max: 50 }),
  body('sexo').isIn(['macho', 'hembra']),
  body('categoria').isIn(['lechon', 'recria', 'desarrollo', 'engorde', 'reproductor'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Datos inválidos', 400);

  const {
    identificador_unico, nombre, sexo, raza_id, fecha_nacimiento,
    peso_nacimiento, madre_id, padre_id, categoria, ubicacion_actual_id,
    observaciones, valor_compra, fecha_ingreso, origen
  } = req.body;

  const result = await query(
    `INSERT INTO animales (identificador_unico, nombre, sexo, raza_id, fecha_nacimiento,
     peso_nacimiento, madre_id, padre_id, categoria, ubicacion_actual_id, observaciones,
     valor_compra, fecha_ingreso, origen)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [identificador_unico, nombre, sexo, raza_id, fecha_nacimiento,
     peso_nacimiento, madre_id, padre_id, categoria, ubicacion_actual_id, observaciones,
     valor_compra || 0, fecha_ingreso || null, origen || 'nacimiento']
  );

  if (!result.rows || result.rows.length === 0) throw new AppError('Error creando el animal', 500);
  res.status(201).json({ message: 'Animal creado exitosamente', animal: result.rows[0] });
}));

router.post('/bulk', authenticateToken, asyncHandler(async (req, res) => {
  const { animales } = req.body;
  if (!Array.isArray(animales) || animales.length === 0)
    throw new AppError('Se requiere un arreglo de animales', 400);
  if (animales.length > 500)
    throw new AppError('Máximo 500 animales por carga', 400);

  // Cargar catálogos para validar nombres
  const [razasRes, ubicacionesRes, animalesRes] = await Promise.all([
    query('SELECT id, LOWER(nombre) as nombre FROM razas'),
    query('SELECT id, LOWER(nombre) as nombre FROM ubicaciones'),
    query('SELECT id, LOWER(identificador_unico) as identificador_unico FROM animales')
  ]);
  const razaMap = new Map(razasRes.rows.map(r => [r.nombre, r.id]));
  const ubicacionMap = new Map(ubicacionesRes.rows.map(r => [r.nombre, r.id]));
  const existingIds = new Set(animalesRes.rows.map(r => r.identificador_unico));

  const VALID_SEXOS = ['macho', 'hembra'];
  const VALID_CATEGORIAS = ['lechon', 'recria', 'desarrollo', 'engorde', 'reproductor'];
  const VALID_ESTADOS = ['activo', 'vendido', 'muerto', 'eliminado'];

  const results = [];
  const toInsert = [];

  animales.forEach((row, i) => {
    const fila = i + 2; // fila Excel (encabezado = 1)
    const errores = [];

    const id = (row.identificador_unico || '').toString().trim();
    if (!id) errores.push('identificador_unico es requerido');
    else if (id.length > 50) errores.push('identificador_unico máximo 50 caracteres');
    else if (existingIds.has(id.toLowerCase())) errores.push(`identificador_unico '${id}' ya existe en el sistema`);

    const sexo = (row.sexo || '').toString().trim().toLowerCase();
    if (!VALID_SEXOS.includes(sexo)) errores.push(`sexo debe ser: ${VALID_SEXOS.join(', ')}`);

    const categoria = (row.categoria || '').toString().trim().toLowerCase();
    if (!VALID_CATEGORIAS.includes(categoria)) errores.push(`categoria debe ser: ${VALID_CATEGORIAS.join(', ')}`);

    const estado = row.estado ? (row.estado || '').toString().trim().toLowerCase() : 'activo';
    if (!VALID_ESTADOS.includes(estado)) errores.push(`estado debe ser: ${VALID_ESTADOS.join(', ')}`);

    let fecha_nacimiento = null;
    if (row.fecha_nacimiento) {
      const d = new Date(row.fecha_nacimiento);
      if (isNaN(d.getTime())) errores.push('fecha_nacimiento formato inválido (use YYYY-MM-DD)');
      else fecha_nacimiento = d.toISOString().split('T')[0];
    }

    let peso_nacimiento = null;
    if (row.peso_nacimiento !== undefined && row.peso_nacimiento !== '') {
      const p = parseFloat(row.peso_nacimiento);
      if (isNaN(p) || p <= 0 || p > 10) errores.push('peso_nacimiento debe ser número entre 0 y 10');
      else peso_nacimiento = p;
    }

    let raza_id = null;
    if (row.raza) {
      raza_id = razaMap.get(row.raza.toString().trim().toLowerCase()) || null;
      if (!raza_id) errores.push(`raza '${row.raza}' no encontrada (use nombre exacto)`);
    }

    let ubicacion_actual_id = null;
    if (row.ubicacion) {
      ubicacion_actual_id = ubicacionMap.get(row.ubicacion.toString().trim().toLowerCase()) || null;
      if (!ubicacion_actual_id) errores.push(`ubicacion '${row.ubicacion}' no encontrada (use nombre exacto)`);
    }

    // Campos de trazabilidad
    const VALID_ORIGENES = ['nacimiento', 'compra'];
    const origen = row.origen ? (row.origen || '').toString().trim().toLowerCase() : 'nacimiento';
    if (!VALID_ORIGENES.includes(origen)) errores.push(`origen debe ser: ${VALID_ORIGENES.join(', ')}`);

    let valor_compra = 0;
    if (row.valor_compra !== undefined && row.valor_compra !== '') {
      const vc = parseFloat(row.valor_compra);
      if (isNaN(vc) || vc < 0) errores.push('valor_compra debe ser un número mayor o igual a 0');
      else valor_compra = vc;
    }

    let fecha_ingreso = null;
    if (row.fecha_ingreso) {
      const fi = new Date(row.fecha_ingreso);
      if (isNaN(fi.getTime())) errores.push('fecha_ingreso formato inválido (use YYYY-MM-DD)');
      else fecha_ingreso = fi.toISOString().split('T')[0];
    }

    if (errores.length > 0) {
      results.push({ fila, identificador_unico: id || `(fila ${fila})`, estado: 'error', errores });
    } else {
      toInsert.push({
        fila,
        identificador_unico: id,
        nombre: (row.nombre || '').toString().trim() || null,
        sexo, categoria, estado,
        fecha_nacimiento, peso_nacimiento, raza_id, ubicacion_actual_id,
        origen, valor_compra, fecha_ingreso,
        observaciones: (row.observaciones || '').toString().trim() || null
      });
    }
  });

  // Insertar válidos en transacción
  if (toInsert.length > 0) {
    const client = await require('../config/database-pg').pool.connect();
    try {
      await client.query('BEGIN');
      for (const a of toInsert) {
        try {
          await client.query(
            `INSERT INTO animales (identificador_unico, nombre, sexo, categoria, estado,
             fecha_nacimiento, peso_nacimiento, raza_id, ubicacion_actual_id,
             origen, valor_compra, fecha_ingreso, observaciones)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [a.identificador_unico, a.nombre, a.sexo, a.categoria, a.estado,
             a.fecha_nacimiento, a.peso_nacimiento, a.raza_id, a.ubicacion_actual_id,
             a.origen, a.valor_compra, a.fecha_ingreso, a.observaciones]
          );
          results.push({ fila: a.fila, identificador_unico: a.identificador_unico, estado: 'ok', errores: [] });
        } catch (err) {
          results.push({ fila: a.fila, identificador_unico: a.identificador_unico, estado: 'error', errores: [err.detail || err.message] });
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const ok = results.filter(r => r.estado === 'ok').length;
  const errCount = results.filter(r => r.estado === 'error').length;
  res.json({ insertados: ok, errores: errCount, resultados: results });
}));

router.get('/:id/trazabilidad', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Animal — obligatorio
    const animalRes = await query(`
      SELECT a.*, r.nombre as raza_nombre, u.nombre as ubicacion_nombre
      FROM animales a
      LEFT JOIN razas r ON a.raza_id = r.id
      LEFT JOIN ubicaciones u ON a.ubicacion_actual_id = u.id
      WHERE a.id = $1
    `, [id]);
    if (animalRes.rows.length === 0) return res.status(404).json({ error: 'Animal no encontrado' });
    const animal = animalRes.rows[0];

    // Cada fuente es independiente — si falla, devuelve array vacío
    const safe = async (fn) => { try { return await fn(); } catch(e) { console.error('TRAZA partial error:', e.message); return { rows: [] }; } };

    const [gastosRes, eventosRes, vacunasRes, movimientosRes, ingresosRes, alimentacionRes, pesajesRes, ciclosRes] = await Promise.all([
      safe(() => query(`SELECT fecha, categoria, descripcion, monto FROM gastos WHERE animal_id=$1 ORDER BY fecha`, [id])),
      safe(() => query(`SELECT fecha, tipo_evento, descripcion, COALESCE(costo,0) as costo, veterinario, tratamiento FROM eventos_sanitarios WHERE animal_id=$1 ORDER BY fecha`, [id])),
      safe(() => query(`SELECT fecha_aplicacion as fecha, vacuna as descripcion FROM vacunaciones WHERE animal_id=$1 ORDER BY fecha_aplicacion`, [id])),
      safe(() => query(`
        SELECT mu.fecha, mu.motivo, mu.costo_acumulado_momento, mu.peso_momento, mu.observaciones,
               uo.nombre as origen_nombre, ud.nombre as destino_nombre
        FROM movimientos_ubicacion mu
        LEFT JOIN ubicaciones uo ON mu.ubicacion_origen_id=uo.id
        LEFT JOIN ubicaciones ud ON mu.ubicacion_destino_id=ud.id
        WHERE mu.animal_id=$1 ORDER BY mu.fecha`, [id])),
      safe(() => query(`
        SELECT COALESCE(fecha, fecha_ingreso::date) as fecha,
               COALESCE(tipo, tipo_ingreso) as tipo,
               descripcion, monto,
               COALESCE(peso_venta, NULL) as peso_venta,
               COALESCE(precio_kg, NULL) as precio_kg,
               COALESCE(comprador, NULL) as comprador
        FROM ingresos WHERE animal_id=$1 ORDER BY 1`, [id])),
      safe(() => query(`SELECT fecha, dieta_nombre, kg_asignados, costo_asignado FROM alimentacion_animal WHERE animal_id=$1 ORDER BY fecha`, [id])),
      safe(() => query(`SELECT peso, fecha_pesaje, observaciones FROM pesajes WHERE animal_id=$1 ORDER BY fecha_pesaje`, [id])),
      safe(() => query(`
        SELECT cr.numero_ciclo, cr.fecha_inicio, cr.fecha_celo, cr.fecha_servicio,
               cr.fecha_parto_esperado, cr.fecha_parto_real,
               cr.lechones_vivos, cr.lechones_muertos, cr.estado, cr.observaciones,
               v.identificador_unico as verraco_id
        FROM ciclos_reproductivos cr
        LEFT JOIN animales v ON cr.verraco_id=v.id
        WHERE cr.cerda_id=$1 ORDER BY cr.fecha_inicio`, [id]))
    ]);

    const timeline = [];

    const fechaIngreso = animal.fecha_ingreso || animal.fecha_nacimiento || animal.created_at;
    timeline.push({ fecha: fechaIngreso, tipo: 'ingreso',
      descripcion: animal.origen === 'compra' ? 'Compra del animal' : 'Nacimiento / Ingreso al sistema',
      monto: parseFloat(animal.valor_compra || 0), icono: 'fa-sign-in-alt', color: '#1572e8' });

    gastosRes.rows.forEach(g => timeline.push({ fecha: g.fecha, tipo: 'gasto',
      descripcion: `${g.categoria}${g.descripcion ? ' — ' + g.descripcion : ''}`,
      monto: parseFloat(g.monto), icono: 'fa-dollar-sign', color: '#f25961' }));

    eventosRes.rows.forEach(e => timeline.push({ fecha: e.fecha, tipo: 'sanitario',
      descripcion: `${e.tipo_evento}${e.descripcion ? ' — ' + e.descripcion : ''}${e.tratamiento ? ' | Tto: ' + e.tratamiento : ''}${e.veterinario ? ' (Dr. ' + e.veterinario + ')' : ''}`,
      monto: parseFloat(e.costo), icono: 'fa-syringe', color: '#ffad46' }));

    vacunasRes.rows.forEach(v => timeline.push({ fecha: v.fecha, tipo: 'vacuna',
      descripcion: `Vacuna: ${v.descripcion}`,
      monto: 0, icono: 'fa-shield-alt', color: '#31ce36' }));

    pesajesRes.rows.forEach(p => timeline.push({ fecha: p.fecha_pesaje, tipo: 'pesaje',
      descripcion: `Pesaje: ${parseFloat(p.peso).toFixed(2)} kg${p.observaciones ? ' — ' + p.observaciones : ''}`,
      monto: 0, icono: 'fa-weight', color: '#6f42c1', peso_momento: parseFloat(p.peso) }));

    ciclosRes.rows.forEach(c => {
      if (c.fecha_celo) timeline.push({ fecha: c.fecha_celo, tipo: 'reproductivo',
        descripcion: `Celo detectado — Ciclo #${c.numero_ciclo}`, monto: 0, icono: 'fa-heart', color: '#e83e8c' });
      if (c.fecha_servicio) timeline.push({ fecha: c.fecha_servicio, tipo: 'reproductivo',
        descripcion: `Servicio/Monta — Ciclo #${c.numero_ciclo}${c.verraco_id ? ' (Verraco: ' + c.verraco_id + ')' : ''}`,
        monto: 0, icono: 'fa-venus-mars', color: '#e83e8c' });
      if (c.fecha_parto_real) timeline.push({ fecha: c.fecha_parto_real, tipo: 'reproductivo',
        descripcion: `Parto — Ciclo #${c.numero_ciclo}: ${c.lechones_vivos||0} vivos, ${c.lechones_muertos||0} muertos${c.observaciones ? ' — ' + c.observaciones : ''}`,
        monto: 0, icono: 'fa-baby', color: '#e83e8c' });
    });

    movimientosRes.rows.forEach(m => timeline.push({ fecha: m.fecha, tipo: 'movimiento',
      descripcion: `Traslado: ${m.origen_nombre||'?'} → ${m.destino_nombre||'?'}${m.motivo ? ' (' + m.motivo + ')' : ''}`,
      monto: 0, icono: 'fa-exchange-alt', color: '#6c757d',
      costo_acumulado_momento: parseFloat(m.costo_acumulado_momento||0), peso_momento: m.peso_momento, extra: m.observaciones }));

    ingresosRes.rows.forEach(i => timeline.push({ fecha: i.fecha, tipo: 'ingreso_venta',
      descripcion: `${i.tipo||'Ingreso'}${i.descripcion ? ' - ' + i.descripcion : ''}${i.comprador ? ' (Comprador: ' + i.comprador + ')' : ''}${i.peso_venta ? ' | ' + i.peso_venta + ' kg' : ''}`,
      monto: parseFloat(i.monto), icono: 'fa-hand-holding-usd', color: '#31ce36' }));

    const alimentacionPorFecha = {};
    alimentacionRes.rows.forEach(a => {
      const key = String(a.fecha).split('T')[0];
      if (!alimentacionPorFecha[key]) alimentacionPorFecha[key] = { kg: 0, costo: 0, dietas: new Set() };
      alimentacionPorFecha[key].kg += parseFloat(a.kg_asignados);
      alimentacionPorFecha[key].costo += parseFloat(a.costo_asignado);
      if (a.dieta_nombre) alimentacionPorFecha[key].dietas.add(a.dieta_nombre);
    });
    Object.entries(alimentacionPorFecha).forEach(([fecha, data]) => timeline.push({ fecha, tipo: 'alimentacion',
      descripcion: `Alimentación: ${data.kg.toFixed(2)} kg${data.dietas.size > 0 ? ' (' + [...data.dietas].join(', ') + ')' : ''}`,
      monto: data.costo, icono: 'fa-utensils', color: '#20c997' }));

    timeline.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const costoAlimentacion = alimentacionRes.rows.reduce((s, a) => s + parseFloat(a.costo_asignado), 0);
    const costoTotal = parseFloat(animal.valor_compra||0)
      + gastosRes.rows.reduce((s, g) => s + parseFloat(g.monto), 0)
      + eventosRes.rows.reduce((s, e) => s + parseFloat(e.costo), 0)
      + costoAlimentacion;
    const ingresoTotal = ingresosRes.rows.reduce((s, i) => s + parseFloat(i.monto), 0);

    const pesoInicial = pesajesRes.rows.length > 0 ? parseFloat(pesajesRes.rows[0].peso) : null;
    const pesoActual  = pesajesRes.rows.length > 0 ? parseFloat(pesajesRes.rows[pesajesRes.rows.length-1].peso) : null;
    const diasVida = animal.fecha_nacimiento ? Math.round((Date.now() - new Date(animal.fecha_nacimiento).getTime()) / 86400000) : null;
    const gdp = (pesoInicial !== null && pesoActual !== null && diasVida > 0)
      ? ((pesoActual - pesoInicial) / diasVida).toFixed(3) : null;

    const resumen = {
      valor_compra: parseFloat(animal.valor_compra||0),
      gastos_directos: gastosRes.rows.reduce((s, g) => s + parseFloat(g.monto), 0),
      costos_sanitarios: eventosRes.rows.reduce((s, e) => s + parseFloat(e.costo), 0),
      costo_alimentacion: costoAlimentacion,
      kg_alimentacion_total: alimentacionRes.rows.reduce((s, a) => s + parseFloat(a.kg_asignados), 0),
      total_pesajes: pesajesRes.rows.length,
      peso_inicial: pesoInicial,
      peso_actual: pesoActual,
      ganancia_diaria_promedio: gdp,
      total_ciclos: ciclosRes.rows.length,
      total_movimientos: movimientosRes.rows.length,
      costo_total: costoTotal,
      ingreso_total: ingresoTotal,
      resultado: ingresoTotal - costoTotal
    };

    res.json({ animal, timeline, resumen, movimientos: movimientosRes.rows });
  } catch (error) {
    console.error('TRAZABILIDAD ERROR:', error);
    res.status(500).json({ error: error.message || 'Error obteniendo trazabilidad' });
  }
});

// POST /:id/movimiento — registrar traslado de ubicación
router.post('/:id/movimiento', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { ubicacion_destino_id, fecha, motivo, peso_momento, observaciones } = req.body;
    if (!ubicacion_destino_id || !fecha) return res.status(400).json({ error: 'ubicacion_destino_id y fecha son requeridos' });

    const animalRes = await query('SELECT ubicacion_actual_id FROM animales WHERE id=$1', [id]);
    if (animalRes.rows.length === 0) return res.status(404).json({ error: 'Animal no encontrado' });

    const ubicacion_origen_id = animalRes.rows[0].ubicacion_actual_id;

    // Calcular costo acumulado hasta este momento (incluye alimentacion)
    const costoRes = await query(`
      SELECT
        COALESCE((SELECT valor_compra FROM animales WHERE id=$1), 0) +
        COALESCE((SELECT SUM(monto) FROM gastos WHERE animal_id=$1), 0) +
        COALESCE((SELECT SUM(costo) FROM eventos_sanitarios WHERE animal_id=$1 AND costo > 0), 0) +
        COALESCE((SELECT SUM(costo_asignado) FROM alimentacion_animal WHERE animal_id=$1), 0)
      AS total
    `, [id]);
    const costo_acumulado = parseFloat(costoRes.rows[0].total || 0);

    await query(`
      INSERT INTO movimientos_ubicacion (animal_id, ubicacion_origen_id, ubicacion_destino_id, fecha, motivo, costo_acumulado_momento, peso_momento, usuario_id, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [id, ubicacion_origen_id, ubicacion_destino_id, fecha, motivo, costo_acumulado, peso_momento, req.user.id, observaciones]);

    await query('UPDATE animales SET ubicacion_actual_id=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2', [ubicacion_destino_id, id]);

    res.status(201).json({ message: 'Movimiento registrado exitosamente', costo_acumulado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registrando movimiento' });
  }
});

// GET /:id y PUT /:id van DESPUÉS de todas las subrutas para que Express no los capture primero
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, r.nombre as raza_nombre, u.nombre as ubicacion_nombre
       FROM animales a
       LEFT JOIN razas r ON a.raza_id = r.id
       LEFT JOIN ubicaciones u ON a.ubicacion_actual_id = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Animal no encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo animal' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'identificador_unico', 'nombre', 'sexo', 'raza_id', 'fecha_nacimiento',
      'peso_nacimiento', 'madre_id', 'padre_id', 'categoria', 'ubicacion_actual_id',
      'observaciones', 'estado', 'fecha_salida', 'motivo_salida',
      'valor_compra', 'fecha_ingreso', 'origen'
    ];
    const filteredUpdates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) filteredUpdates[key] = req.body[key];
    });
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }
    const keys = Object.keys(filteredUpdates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(filteredUpdates), req.params.id];
    await query(
      `UPDATE animales SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
      values
    );
    res.json({ message: 'Animal actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando animal' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const client = await require('../config/database-pg').pool.connect();
  try {
    const { id } = req.params;

    const animalRes = await client.query('SELECT id FROM animales WHERE id=$1', [id]);
    if (animalRes.rows.length === 0) return res.status(404).json({ error: 'Animal no encontrado' });

    await client.query('BEGIN');
    await client.query('DELETE FROM tratamientos WHERE evento_sanitario_id IN (SELECT id FROM eventos_sanitarios WHERE animal_id=$1)', [id]);
    await client.query('DELETE FROM alimentacion_animal WHERE animal_id=$1', [id]);
    await client.query('DELETE FROM movimientos_ubicacion WHERE animal_id=$1', [id]);
    await client.query('DELETE FROM indices_geneticos WHERE animal_id=$1', [id]);
    await client.query('DELETE FROM ciclos_reproductivos WHERE cerda_id=$1 OR verraco_id=$1', [id, id]);
    await client.query('DELETE FROM vacunaciones WHERE animal_id=$1', [id]);
    await client.query('DELETE FROM eventos_sanitarios WHERE animal_id=$1', [id]);
    await client.query('DELETE FROM pesajes WHERE animal_id=$1', [id]);
    await client.query('DELETE FROM gastos WHERE animal_id=$1', [id]);
    await client.query('DELETE FROM ingresos WHERE animal_id=$1', [id]);
    await client.query('UPDATE animales SET madre_id=NULL WHERE madre_id=$1', [id]);
    await client.query('UPDATE animales SET padre_id=NULL WHERE padre_id=$1', [id]);
    await client.query('DELETE FROM animales WHERE id=$1', [id]);
    await client.query('COMMIT');

    res.json({ message: 'Animal eliminado completamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('DELETE animal error:', error);
    res.status(500).json({ error: error.message || 'Error eliminando animal' });
  } finally {
    client.release();
  }
});

module.exports = router;
