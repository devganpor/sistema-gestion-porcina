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
