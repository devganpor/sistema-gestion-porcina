const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Registrar gasto
router.post('/expenses', authenticateToken, [
  body('fecha').isDate(),
  body('categoria').notEmpty(),
  body('descripcion').notEmpty(),
  body('monto').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id } = req.body;

    await query(
      'INSERT INTO gastos (fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id, req.user.id]
    );

    res.status(201).json({ message: 'Gasto registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando gasto' });
  }
});

// Registrar ingreso
router.post('/income', authenticateToken, [
  body('fecha').isDate(),
  body('tipo').notEmpty(),
  body('descripcion').notEmpty(),
  body('monto').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg } = req.body;

    await query(
      'INSERT INTO ingresos (fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg, req.user.id]
    );

    // Si es venta de animal, actualizar estado
    if (animal_id && tipo === 'venta_animal') {
      await query(
        'UPDATE animales SET estado = ?, fecha_salida = ?, motivo_salida = ? WHERE id = ?',
        ['vendido', fecha, 'Venta', animal_id]
      );
    }

    res.status(201).json({ message: 'Ingreso registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando ingreso' });
  }
});

// Obtener gastos
router.get('/expenses', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, categoria } = req.query;
    let sql = `
      SELECT g.*, a.identificador_unico as animal_identificador, u.nombre as ubicacion_nombre
      FROM gastos g
      LEFT JOIN animales a ON g.animal_id = a.id
      LEFT JOIN ubicaciones u ON g.ubicacion_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (fecha_inicio) {
      sql += ` AND g.fecha >= ?`;
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      sql += ` AND g.fecha <= ?`;
      params.push(fecha_fin);
    }
    if (categoria) {
      sql += ` AND g.categoria = ?`;
      params.push(categoria);
    }

    sql += ' ORDER BY g.fecha DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo gastos' });
  }
});

// Obtener ingresos
router.get('/income', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, tipo } = req.query;
    let sql = `
      SELECT i.*, a.identificador_unico as animal_identificador
      FROM ingresos i
      LEFT JOIN animales a ON i.animal_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (fecha_inicio) {
      sql += ` AND i.fecha >= ?`;
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      sql += ` AND i.fecha <= ?`;
      params.push(fecha_fin);
    }
    if (tipo) {
      sql += ` AND i.tipo = ?`;
      params.push(tipo);
    }

    sql += ' ORDER BY i.fecha DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ingresos' });
  }
});

// Resumen financiero
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    // Total gastos
    const gastos = await query(`
      SELECT 
        SUM(monto) as total,
        categoria,
        COUNT(*) as cantidad
      FROM gastos 
      WHERE fecha BETWEEN ? AND ?
      GROUP BY categoria
    `, [fechaInicio, fechaFin]);

    // Total ingresos
    const ingresos = await query(`
      SELECT 
        SUM(monto) as total,
        tipo,
        COUNT(*) as cantidad
      FROM ingresos 
      WHERE fecha BETWEEN ? AND ?
      GROUP BY tipo
    `, [fechaInicio, fechaFin]);

    // Totales generales
    const totalGastos = await query(`
      SELECT SUM(monto) as total FROM gastos WHERE fecha BETWEEN ? AND ?
    `, [fechaInicio, fechaFin]);

    const totalIngresos = await query(`
      SELECT SUM(monto) as total FROM ingresos WHERE fecha BETWEEN ? AND ?
    `, [fechaInicio, fechaFin]);

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

// Costo por animal
router.get('/animal-cost/:id', authenticateToken, async (req, res) => {
  try {
    const animalId = req.params.id;

    // Gastos directos del animal
    const gastosDirectos = await query(`
      SELECT SUM(monto) as total, categoria
      FROM gastos 
      WHERE animal_id = ?
      GROUP BY categoria
    `, [animalId]);

    // Costo total
    const costoTotal = await query(`
      SELECT SUM(monto) as total FROM gastos WHERE animal_id = ?
    `, [animalId]);

    // Información del animal
    const animal = await query(`
      SELECT identificador_unico, nombre, categoria, fecha_nacimiento, estado
      FROM animales WHERE id = ?
    `, [animalId]);

    res.json({
      animal: animal.rows[0],
      gastos_por_categoria: gastosDirectos.rows,
      costo_total: parseFloat(costoTotal.rows[0].total || 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo costo del animal' });
  }
});

// Actualizar gasto
router.put('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id } = req.body;

    await query(
      'UPDATE gastos SET fecha = ?, categoria = ?, subcategoria = ?, descripcion = ?, monto = ?, proveedor = ?, factura = ?, animal_id = ?, ubicacion_id = ? WHERE id = ?',
      [fecha, categoria, subcategoria, descripcion, monto, proveedor, factura, animal_id, ubicacion_id, id]
    );

    res.json({ message: 'Gasto actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando gasto' });
  }
});

// Eliminar gasto
router.delete('/expenses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM gastos WHERE id = ?', [id]);
    res.json({ message: 'Gasto eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando gasto' });
  }
});

// Actualizar ingreso
router.put('/income/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg } = req.body;

    await query(
      'UPDATE ingresos SET fecha = ?, tipo = ?, descripcion = ?, monto = ?, comprador = ?, factura = ?, animal_id = ?, peso_venta = ?, precio_kg = ? WHERE id = ?',
      [fecha, tipo, descripcion, monto, comprador, factura, animal_id, peso_venta, precio_kg, id]
    );

    res.json({ message: 'Ingreso actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando ingreso' });
  }
});

// Eliminar ingreso
router.delete('/income/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM ingresos WHERE id = ?', [id]);
    res.json({ message: 'Ingreso eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando ingreso' });
  }
});

module.exports = router;
