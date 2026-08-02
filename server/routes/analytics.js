const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/kpis', authenticateToken, asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 6;

  const [mortalidad, ganancia, inventario, finanzas, pesosEngorde] = await Promise.all([
    // Mortalidad pre-destete: lechones muertos / total lechones nacidos
    query(`
      SELECT
        CASE WHEN SUM(lechones_vivos + COALESCE(lechones_muertos,0)) > 0
          THEN ROUND(SUM(COALESCE(lechones_muertos,0))::numeric / SUM(lechones_vivos + COALESCE(lechones_muertos,0)) * 100, 1)
          ELSE 0 END as mortalidad_pre_destete,
        CASE WHEN COUNT(*) > 0
          THEN ROUND(AVG(lechones_vivos)::numeric, 1)
          ELSE 0 END as promedio_lechones
      FROM ciclos_reproductivos
      WHERE fecha_parto_real >= CURRENT_DATE - INTERVAL '1 year'
        AND lechones_vivos IS NOT NULL
    `),
    // Ganancia diaria promedio (últimos 90 días)
    query(`
      SELECT ROUND(AVG(
        (p2.peso - p1.peso) / NULLIF(p2.fecha_pesaje - p1.fecha_pesaje, 0) * 1000
      )::numeric, 0) as ganancia_diaria_g
      FROM pesajes p1
      JOIN pesajes p2 ON p1.animal_id = p2.animal_id AND p2.fecha_pesaje > p1.fecha_pesaje
      JOIN animales a ON a.id = p1.animal_id
      WHERE a.estado = 'activo'
        AND a.categoria IN ('engorde','desarrollo','recria')
        AND p1.fecha_pesaje >= CURRENT_DATE - INTERVAL '90 days'
    `),
    // Total animales activos
    query(`SELECT COUNT(*) as total FROM animales WHERE estado = 'activo'`),
    // Finanzas del período
    query(`
      SELECT
        COALESCE(SUM(i.monto),0) as total_ingresos,
        COALESCE((SELECT SUM(monto) FROM gastos WHERE fecha >= CURRENT_DATE - ($1 || ' months')::interval),0) as total_gastos
      FROM ingresos i
      WHERE i.fecha >= CURRENT_DATE - ($1 || ' months')::interval
    `, [months]),
    // Días promedio a mercado (animales vendidos)
    query(`
      SELECT ROUND(AVG(fecha_salida - fecha_nacimiento)::numeric, 0) as dias_mercado
      FROM animales
      WHERE estado = 'vendido'
        AND fecha_salida IS NOT NULL
        AND fecha_nacimiento IS NOT NULL
        AND fecha_salida >= CURRENT_DATE - INTERVAL '1 year'
    `)
  ]);

  const ingresos = parseFloat(finanzas.rows[0].total_ingresos) || 0;
  const gastos = parseFloat(finanzas.rows[0].total_gastos) || 0;
  const roi = ingresos > 0 ? ((ingresos - gastos) / gastos * 100).toFixed(1) : 0;
  const costoKg = gastos > 0 && inventario.rows[0].total > 0
    ? Math.round(gastos / inventario.rows[0].total)
    : 0;

  res.json({
    mortalidad_pre_destete: parseFloat(mortalidad.rows[0].mortalidad_pre_destete) || 0,
    promedio_lechones: parseFloat(mortalidad.rows[0].promedio_lechones) || 0,
    ganancia_diaria: parseInt(ganancia.rows[0].ganancia_diaria_g) || 0,
    dias_mercado: parseInt(pesosEngorde.rows[0].dias_mercado) || 0,
    costo_kg_producido: costoKg,
    roi: parseFloat(roi),
    total_ingresos: ingresos,
    total_gastos: gastos
  });
}));

router.get('/trends', authenticateToken, asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 6;

  const [ingresos, gastos, animales] = await Promise.all([
    query(`
      SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'Mon') as mes,
             DATE_TRUNC('month', fecha) as fecha_orden,
             SUM(monto) as total
      FROM ingresos
      WHERE fecha >= CURRENT_DATE - ($1 || ' months')::interval
      GROUP BY DATE_TRUNC('month', fecha)
      ORDER BY fecha_orden
    `, [months]),
    query(`
      SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'Mon') as mes,
             DATE_TRUNC('month', fecha) as fecha_orden,
             SUM(monto) as total
      FROM gastos
      WHERE fecha >= CURRENT_DATE - ($1 || ' months')::interval
      GROUP BY DATE_TRUNC('month', fecha)
      ORDER BY fecha_orden
    `, [months]),
    query(`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as mes,
             DATE_TRUNC('month', created_at) as fecha_orden,
             COUNT(*) as total
      FROM animales
      WHERE created_at >= CURRENT_DATE - ($1 || ' months')::interval
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY fecha_orden
    `, [months])
  ]);

  // Combinar por mes
  const meses = new Map();
  ingresos.rows.forEach(r => meses.set(r.mes, { mes: r.mes, ingresos: parseFloat(r.total) || 0, gastos: 0, animales: 0 }));
  gastos.rows.forEach(r => {
    if (!meses.has(r.mes)) meses.set(r.mes, { mes: r.mes, ingresos: 0, gastos: 0, animales: 0 });
    meses.get(r.mes).gastos = parseFloat(r.total) || 0;
  });
  animales.rows.forEach(r => {
    if (!meses.has(r.mes)) meses.set(r.mes, { mes: r.mes, ingresos: 0, gastos: 0, animales: 0 });
    meses.get(r.mes).animales = parseInt(r.total) || 0;
  });

  res.json(Array.from(meses.values()));
}));

module.exports = router;
