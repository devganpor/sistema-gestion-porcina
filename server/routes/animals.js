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
    peso_nacimiento, madre_id, padre_id, categoria, ubicacion_actual_id, observaciones
  } = req.body;

  const result = await query(
    `INSERT INTO animales (identificador_unico, nombre, sexo, raza_id, fecha_nacimiento,
     peso_nacimiento, madre_id, padre_id, categoria, ubicacion_actual_id, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [identificador_unico, nombre, sexo, raza_id, fecha_nacimiento,
     peso_nacimiento, madre_id, padre_id, categoria, ubicacion_actual_id, observaciones]
  );

  if (!result.rows || result.rows.length === 0) throw new AppError('Error creando el animal', 500);
  res.status(201).json({ message: 'Animal creado exitosamente', animal: result.rows[0] });
}));

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
      'observaciones', 'estado', 'fecha_salida', 'motivo_salida'
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

    if (errores.length > 0) {
      results.push({ fila, identificador_unico: id || `(fila ${fila})`, estado: 'error', errores });
    } else {
      toInsert.push({
        fila,
        identificador_unico: id,
        nombre: (row.nombre || '').toString().trim() || null,
        sexo, categoria, estado,
        fecha_nacimiento, peso_nacimiento, raza_id, ubicacion_actual_id,
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
             fecha_nacimiento, peso_nacimiento, raza_id, ubicacion_actual_id, observaciones)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [a.identificador_unico, a.nombre, a.sexo, a.categoria, a.estado,
             a.fecha_nacimiento, a.peso_nacimiento, a.raza_id, a.ubicacion_actual_id, a.observaciones]
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

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [pesajes, eventos] = await Promise.all([
      query('SELECT COUNT(*) as count FROM pesajes WHERE animal_id = $1', [id]),
      query('SELECT COUNT(*) as count FROM eventos_sanitarios WHERE animal_id = $1', [id])
    ]);

    if (parseInt(pesajes.rows[0].count) > 0 || parseInt(eventos.rows[0].count) > 0) {
      await query(
        'UPDATE animales SET estado=$1, fecha_salida=$2, motivo_salida=$3 WHERE id=$4',
        ['eliminado', new Date().toISOString().split('T')[0], 'Eliminado del sistema', id]
      );
      res.json({ message: 'Animal marcado como eliminado (tiene registros asociados)' });
    } else {
      await query('DELETE FROM animales WHERE id=$1', [id]);
      res.json({ message: 'Animal eliminado completamente' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando animal' });
  }
});

module.exports = router;
