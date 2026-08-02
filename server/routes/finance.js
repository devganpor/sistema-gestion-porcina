const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/expenses', authenticateToken, [
  body('fecha').isDate(),
  body('categoria').notEmpty(),
  body('descripcion').notEmpty(),
  body('monto').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id } = req.body;
    await query(
      'INSERT INTO gastos (fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id, usuario_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id, req.user.id]
    );
    res.status(201).json({ message: 'Gasto registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando gasto' });
  }
});

router.post('/income', authenticateToken, [
  body('fecha').isDate(),
  body('tipo').notEmpty(),
  body('descripcion').notEmpty(),
  body('monto').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg } = req.body;
    await query(
      'INSERT INTO ingresos (fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg, usuario_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg, req.user.id]
    );

    if (animal_id && tipo === 'venta_animal') {
      await query(
        'UPDATE animales SET estado=$1, fecha_salida=$2, motivo_salida=$3 WHERE id=$4',
        ['vendido', fecha, 'Venta', animal_id]
      );
    }
    res.status(201).json({ message: 'Ingreso registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando ingreso' });
  }
});

router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, categoria } = req.query;
    const params = [];
    let conditions = '';

    if (fecha_inicio) { params.push(fecha_inicio); conditions += ` AND g.fecha >= $${params.length}`; }
    if (fecha_fin)    { params.push(fecha_fin);    conditions += ` AND g.fecha <= $${params.length}`; }
    if (categoria)    { params.push(categoria);    conditions += ` AND g.categoria = $${params.length}`; }

    const result = await query(`
      SELECT g.*, a.identificador_unico as animal_identificador, u.nombre as ubicacion_nombre
      FROM gastos g
      LEFT JOIN animales a ON g.animal_id = a.id
      LEFT JOIN ubicaciones u ON g.ubicacion_id = u.id
      WHERE 1=1${conditions}
      ORDER BY g.fecha DESC
    `, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo gastos' });
  }
});

router.get('/income', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, tipo } = req.query;
    const params = [];
    let conditions = '';

    if (fecha_inicio) { params.push(fecha_inicio); conditions += ` AND i.fecha >= $${params.length}`; }
    if (fecha_fin)    { params.push(fecha_fin);    conditions += ` AND i.fecha <= $${params.length}`; }
    if (tipo)         { params.push(tipo);         conditions += ` AND i.tipo = $${params.length}`; }

    const result = await query(`
      SELECT i.*, a.identificador_unico as animal_identificador
      FROM ingresos i
      LEFT JOIN animales a ON i.animal_id = a.id
      WHERE 1=1${conditions}
      ORDER BY i.fecha DESC
    `, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ingresos' });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    const [gastos, ingresos, totalGastos, totalIngresos] = await Promise.all([
      query(`SELECT SUM(monto) as total, categoria, COUNT(*) as cantidad FROM gastos WHERE fecha BETWEEN $1 AND $2 GROUP BY categoria`, [fechaInicio, fechaFin]),
      query(`SELECT SUM(monto) as total, tipo, COUNT(*) as cantidad FROM ingresos WHERE fecha BETWEEN $1 AND $2 GROUP BY tipo`, [fechaInicio, fechaFin]),
      query(`SELECT SUM(monto) as total FROM gastos WHERE fecha BETWEEN $1 AND $2`, [fechaInicio, fechaFin]),
      query(`SELECT SUM(monto) as total FROM ingresos WHERE fecha BETWEEN $1 AND $2`, [fechaInicio, fechaFin])
    ]);

    const totalG = parseFloat(totalGastos.rows[0].total || 0);
    const totalI = parseFloat(totalIngresos.rows[0].total || 0);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      gastos: gastos.rows,
      ingresos: ingresos.rows,
      totales: {
        gastos: totalG,
        ingresos: totalI,
        utilidad: totalI - totalG,
        margen: totalI > 0 ? ((totalI - totalG) / totalI * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo resumen financiero' });
  }
});

router.get('/animal-cost/:id', authenticateToken, async (req, res) => {
  try {
    const [gastosDirectos, costoTotal, animal] = await Promise.all([
      query(`SELECT SUM(monto) as total, categoria FROM gastos WHERE animal_id=$1 GROUP BY categoria`, [req.params.id]),
      query(`SELECT SUM(monto) as total FROM gastos WHERE animal_id=$1`, [req.params.id]),
      query(`SELECT identificador_unico, nombre, categoria, fecha_nacimiento, estado FROM animales WHERE id=$1`, [req.params.id])
    ]);
    res.json({
      animal: animal.rows[0],
      gastos_por_categoria: gastosDirectos.rows,
      costo_total: parseFloat(costoTotal.rows[0].total || 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo costo del animal' });
  }
});

router.put('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id } = req.body;
    await query(
      'UPDATE gastos SET fecha=$1, categoria=$2, subcategoria=$3, descripcion=$4, monto=$5, proveedor=$6, factura=$7, animal_id=$8, ubicacion_id=$9 WHERE id=$10',
      [fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id, req.params.id]
    );
    res.json({ message: 'Gasto actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando gasto' });
  }
});

router.delete('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM gastos WHERE id=$1', [req.params.id]);
    res.json({ message: 'Gasto eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando gasto' });
  }
});

router.put('/income/:id', authenticateToken, async (req, res) => {
  try {
    const { fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg } = req.body;
    await query(
      'UPDATE ingresos SET fecha=$1, tipo=$2, descripcion=$3, monto=$4, comprador=$5, factura=$6, animal_id=$7, peso_venta=$8, precio_kg=$9 WHERE id=$10',
      [fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg, req.params.id]
    );
    res.json({ message: 'Ingreso actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando ingreso' });
  }
});

router.delete('/income/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM ingresos WHERE id=$1', [req.params.id]);
    res.json({ message: 'Ingreso eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando ingreso' });
  }
});

module.exports = router;
