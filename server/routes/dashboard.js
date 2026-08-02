const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/kpis', authenticateToken, asyncHandler(async (req, res) => {
  const [inventario, total, cerdas, mortalidad, listosVenta] = await Promise.all([
    query(`SELECT categoria, COUNT(*) as cantidad FROM animales WHERE estado = 'activo' GROUP BY categoria`),
    query(`SELECT COUNT(*) as total FROM animales WHERE estado = 'activo'`),
    query(`SELECT COUNT(*) as total FROM animales WHERE estado = 'activo' AND sexo = 'hembra' AND categoria = 'reproductor'`),
    query(`SELECT COUNT(*) as total FROM animales WHERE estado = 'muerto' AND fecha_salida >= CURRENT_DATE - INTERVAL '30 days'`),
    query(`
      SELECT COUNT(DISTINCT a.id) as total
      FROM animales a
      JOIN pesajes p ON a.id = p.animal_id
      WHERE a.estado = 'activo'
      AND a.categoria IN ('engorde', 'desarrollo')
      AND p.peso >= 100
      AND p.fecha_pesaje = (SELECT MAX(p2.fecha_pesaje) FROM pesajes p2 WHERE p2.animal_id = a.id)
    `)
  ]);

  res.json({
    inventario: inventario.rows,
    total_animales: parseInt(total.rows[0].total),
    cerdas_reproductoras: parseInt(cerdas.rows[0].total),
    mortalidad_ultimo_mes: parseInt(mortalidad.rows[0].total),
    listos_para_venta: parseInt(listosVenta.rows[0].total)
  });
}));

router.get('/alerts', authenticateToken, asyncHandler(async (req, res) => {
  const alerts = [];

  const sobrepoblacion = await query(`
    SELECT u.nombre, u.capacidad_maxima, COUNT(a.id) as ocupacion_actual
    FROM ubicaciones u
    LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
    WHERE u.capacidad_maxima > 0
    GROUP BY u.id, u.nombre, u.capacidad_maxima
    HAVING COUNT(a.id) > u.capacidad_maxima
  `);

  sobrepoblacion.rows.forEach(row => {
    alerts.push({
      tipo: 'sobrepoblacion',
      titulo: 'Sobrepoblación',
      mensaje: `${row.nombre}: ${row.ocupacion_actual}/${row.capacidad_maxima} animales`,
      prioridad: 'alta'
    });
  });

  const vacunasProximas = await query(`
    SELECT COUNT(*) as total FROM vacunaciones
    WHERE proxima_dosis BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  `);
  if (parseInt(vacunasProximas.rows[0].total) > 0) {
    alerts.push({
      tipo: 'vacunacion',
      titulo: 'Vacunaciones Próximas',
      mensaje: `${vacunasProximas.rows[0].total} animales requieren vacunación en los próximos 7 días`,
      prioridad: 'media'
    });
  }

  const medicamentosVencer = await query(`
    SELECT COUNT(*) as total FROM medicamentos
    WHERE fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  `);
  if (parseInt(medicamentosVencer.rows[0].total) > 0) {
    alerts.push({
      tipo: 'medicamento',
      titulo: 'Medicamentos por Vencer',
      mensaje: `${medicamentosVencer.rows[0].total} medicamentos vencen en los próximos 30 días`,
      prioridad: 'media'
    });
  }

  res.json(alerts);
}));

module.exports = router;
