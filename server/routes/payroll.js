const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Crear tabla si no existe (auto-migración)
const initTable = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS nomina (
        id SERIAL PRIMARY KEY,
        empleado VARCHAR(150) NOT NULL,
        cargo VARCHAR(100) NOT NULL,
        periodo_inicio DATE NOT NULL,
        periodo_fin DATE NOT NULL,
        salario_base NUMERIC(12,2) NOT NULL DEFAULT 0,
        bonificaciones NUMERIC(12,2) NOT NULL DEFAULT 0,
        deducciones NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_pago NUMERIC(12,2) NOT NULL,
        animal_id INTEGER REFERENCES animales(id) ON DELETE SET NULL,
        observaciones TEXT,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    console.error('Error creando tabla nomina:', e.message);
  }
};
initTable();

// GET /api/payroll/summary — resumen de nómina por período (debe ir ANTES de /:id)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    const [total, porCargo] = await Promise.all([
      query(`SELECT SUM(total_pago) as total, COUNT(*) as cantidad FROM nomina WHERE periodo_inicio >= $1 AND periodo_fin <= $2`, [fechaInicio, fechaFin]),
      query(`SELECT cargo, SUM(total_pago) as total, COUNT(*) as cantidad FROM nomina WHERE periodo_inicio >= $1 AND periodo_fin <= $2 GROUP BY cargo`, [fechaInicio, fechaFin])
    ]);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      total_pagado: parseFloat(total.rows[0].total || 0),
      cantidad_pagos: parseInt(total.rows[0].cantidad || 0),
      por_cargo: porCargo.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo resumen de nómina' });
  }
});

// GET /api/payroll — listar registros de nómina
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const params = [];
    let conditions = '';

    if (fecha_inicio) { params.push(fecha_inicio); conditions += ` AND n.periodo_inicio >= $${params.length}`; }
    if (fecha_fin)    { params.push(fecha_fin);    conditions += ` AND n.periodo_fin <= $${params.length}`; }

    const result = await query(`
      SELECT n.*, u.nombre as registrado_por_nombre
      FROM nomina n
      LEFT JOIN usuarios u ON n.usuario_id = u.id
      WHERE 1=1${conditions}
      ORDER BY n.periodo_inicio DESC
    `, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo nómina' });
  }
});

// POST /api/payroll — registrar pago de nómina y crear gasto asociado
router.post('/', authenticateToken, [
  body('empleado').notEmpty(),
  body('cargo').notEmpty(),
  body('periodo_inicio').isDate(),
  body('periodo_fin').isDate(),
  body('salario_base').isFloat({ min: 0 }),
  body('total_pago').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      empleado, cargo, periodo_inicio, periodo_fin,
      salario_base, bonificaciones = 0, deducciones = 0, total_pago,
      animal_id, observaciones
    } = req.body;

    // Insertar en tabla nomina
    const nominaResult = await query(
      `INSERT INTO nomina (empleado, cargo, periodo_inicio, periodo_fin, salario_base, bonificaciones, deducciones, total_pago, animal_id, observaciones, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [empleado, cargo, periodo_inicio, periodo_fin, salario_base, bonificaciones, deducciones, total_pago, animal_id || null, observaciones || null, req.user.id]
    );

    const nominaId = nominaResult.rows[0].id;

    // Registrar automáticamente como gasto en la tabla gastos
    await query(
      `INSERT INTO gastos (fecha, categoria, subcategoria, descripcion, monto, animal_id, ubicacion_id, usuario_id)
       VALUES ($1, 'Nómina', $2, $3, $4, $5, NULL, $6)`,
      [periodo_fin, cargo, `Nómina: ${empleado} (${periodo_inicio} al ${periodo_fin})`, total_pago, animal_id || null, req.user.id]
    );

    res.status(201).json({ message: 'Nómina registrada y gasto generado exitosamente', id: nominaId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error registrando nómina' });
  }
});

// PUT /api/payroll/:id — actualizar registro de nómina
router.put('/:id', authenticateToken, [
  body('empleado').notEmpty(),
  body('total_pago').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { empleado, cargo, periodo_inicio, periodo_fin, salario_base, bonificaciones = 0, deducciones = 0, total_pago, animal_id, observaciones } = req.body;

    await query(
      `UPDATE nomina SET empleado=$1, cargo=$2, periodo_inicio=$3, periodo_fin=$4, salario_base=$5, bonificaciones=$6, deducciones=$7, total_pago=$8, animal_id=$9, observaciones=$10 WHERE id=$11`,
      [empleado, cargo, periodo_inicio, periodo_fin, salario_base, bonificaciones, deducciones, total_pago, animal_id || null, observaciones || null, req.params.id]
    );

    res.json({ message: 'Nómina actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando nómina' });
  }
});

// DELETE /api/payroll/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await query('DELETE FROM nomina WHERE id=$1', [req.params.id]);
    res.json({ message: 'Registro de nómina eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando nómina' });
  }
});

module.exports = router;
