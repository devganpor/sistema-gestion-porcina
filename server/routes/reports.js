const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/reproductive', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    const [partos, tasaParicion] = await Promise.all([
      query(`
        SELECT COUNT(*) as total_partos,
               AVG(lechones_vivos) as promedio_lechones,
               SUM(lechones_vivos) as total_lechones,
               TO_CHAR(DATE_TRUNC('month', fecha_parto_real), 'YYYY-MM') as mes
        FROM ciclos_reproductivos
        WHERE fecha_parto_real BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('month', fecha_parto_real)
        ORDER BY mes
      `, [fechaInicio, fechaFin]),
      query(`
        SELECT COUNT(*) as ciclos_servicio,
               COUNT(fecha_parto_real) as partos_realizados
        FROM ciclos_reproductivos
        WHERE fecha_servicio BETWEEN $1 AND $2
      `, [fechaInicio, fechaFin])
    ]);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      partos: partos.rows,
      tasa_paricion: tasaParicion.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte reproductivo' });
  }
});

router.get('/mortality', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    const [mortalidadCategoria, mortalidadMes, causas] = await Promise.all([
      query(`
        SELECT categoria, COUNT(*) as muertes,
               AVG(EXTRACT(EPOCH FROM (fecha_salida - fecha_nacimiento))/86400) as edad_promedio_dias
        FROM animales
        WHERE estado = 'muerto' AND fecha_salida BETWEEN $1 AND $2
        GROUP BY categoria
      `, [fechaInicio, fechaFin]),
      query(`
        SELECT TO_CHAR(DATE_TRUNC('month', fecha_salida), 'YYYY-MM') as mes,
               COUNT(*) as muertes, categoria
        FROM animales
        WHERE estado = 'muerto' AND fecha_salida BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('month', fecha_salida), categoria
        ORDER BY mes
      `, [fechaInicio, fechaFin]),
      query(`
        SELECT motivo_salida, COUNT(*) as cantidad
        FROM animales
        WHERE estado = 'muerto' AND fecha_salida BETWEEN $1 AND $2
        GROUP BY motivo_salida ORDER BY cantidad DESC
      `, [fechaInicio, fechaFin])
    ]);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      mortalidad_categoria: mortalidadCategoria.rows,
      mortalidad_mes: mortalidadMes.rows,
      causas_principales: causas.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte de mortalidad' });
  }
});

router.get('/growth', authenticateToken, async (req, res) => {
  try {
    const { categoria } = req.query;
    const params = [];
    let catFilter = '';
    if (categoria) { params.push(categoria); catFilter = ` AND a.categoria = $${params.length}`; }

    const crecimiento = await query(`
      SELECT a.categoria,
             COUNT(DISTINCT a.id) as total_animales,
             ROUND(AVG(p.peso)::numeric, 2) as peso_promedio,
             ROUND(MIN(p.peso)::numeric, 2) as peso_minimo,
             ROUND(MAX(p.peso)::numeric, 2) as peso_maximo
      FROM animales a
      JOIN pesajes p ON a.id = p.animal_id
      WHERE a.estado = 'activo'${catFilter}
      AND p.fecha_pesaje >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY a.categoria
    `, params);

    res.json({ estadisticas_crecimiento: crecimiento.rows });
  } catch (error) {
    console.error('Error reporte crecimiento:', error.message);
    res.status(500).json({ error: 'Error generando reporte de crecimiento' });
  }
});

router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const [inventario, ubicaciones] = await Promise.all([
      query(`
        SELECT categoria, sexo, COUNT(*) as cantidad,
               ROUND(AVG(CURRENT_DATE - fecha_nacimiento)) as edad_promedio_dias
        FROM animales WHERE estado = 'activo'
        GROUP BY categoria, sexo ORDER BY categoria, sexo
      `),
      query(`
        SELECT u.nombre as ubicacion, u.tipo, u.capacidad_maxima,
               COUNT(a.id) as ocupacion_actual
        FROM ubicaciones u
        LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
        GROUP BY u.id, u.nombre, u.tipo, u.capacidad_maxima
        ORDER BY u.tipo, u.nombre
      `)
    ]);

    res.json({
      inventario_actual: inventario.rows,
      ocupacion_ubicaciones: ubicaciones.rows
    });
  } catch (error) {
    console.error('Error reporte inventario:', error.message);
    res.status(500).json({ error: 'Error generando reporte de inventario' });
  }
});

router.get('/production', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, categoria } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
    const params = [fechaInicio, fechaFin];
    let catFilter = '';
    if (categoria) { params.push(categoria); catFilter = ` AND a.categoria = $${params.length}`; }

    const [pesajes, vendidos] = await Promise.all([
      query(`
        SELECT a.categoria,
               COUNT(DISTINCT a.id) as total_animales,
               AVG(p.peso) as peso_promedio,
               AVG(p.ganancia_diaria) as ganancia_diaria_promedio,
               TO_CHAR(DATE_TRUNC('month', p.fecha_pesaje), 'YYYY-MM') as mes
        FROM animales a
        JOIN pesajes p ON a.id = p.animal_id
        WHERE p.fecha_pesaje BETWEEN $1 AND $2${catFilter}
        GROUP BY a.categoria, DATE_TRUNC('month', p.fecha_pesaje)
        ORDER BY mes, a.categoria
      `, params),
      query(`
        SELECT COUNT(*) as total_vendidos,
               AVG(EXTRACT(EPOCH FROM (fecha_salida - fecha_nacimiento))/86400) as dias_promedio_mercado
        FROM animales
        WHERE estado = 'vendido' AND fecha_salida BETWEEN $1 AND $2
      `, [fechaInicio, fechaFin])
    ]);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      produccion_mensual: pesajes.rows,
      ventas_resumen: vendidos.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte de producción' });
  }
});

router.get('/financial', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    const [ingresos, gastos, resumen] = await Promise.all([
      query(`
        SELECT TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') as mes,
               SUM(monto) as total_ingresos, COUNT(*) as cantidad
        FROM transacciones
        WHERE tipo = 'ingreso' AND fecha BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('month', fecha)
        ORDER BY mes
      `, [fechaInicio, fechaFin]),
      query(`
        SELECT categoria, SUM(monto) as total_gastos, COUNT(*) as cantidad,
               TO_CHAR(DATE_TRUNC('month', fecha), 'YYYY-MM') as mes
        FROM transacciones
        WHERE tipo = 'gasto' AND fecha BETWEEN $1 AND $2
        GROUP BY categoria, DATE_TRUNC('month', fecha)
        ORDER BY mes, total_gastos DESC
      `, [fechaInicio, fechaFin]),
      query(`
        SELECT
          SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
          SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as total_gastos,
          SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as utilidad_neta
        FROM transacciones
        WHERE fecha BETWEEN $1 AND $2
      `, [fechaInicio, fechaFin])
    ]);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      ingresos_mensuales: ingresos.rows,
      gastos_categoria: gastos.rows,
      resumen: resumen.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte financiero' });
  }
});

router.get('/feeding', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    const [consumo, ingredientes] = await Promise.all([
      query(`
        SELECT TO_CHAR(DATE_TRUNC('month', r.fecha_suministro), 'YYYY-MM') as mes,
               d.nombre as dieta,
               SUM(r.cantidad_kg) as total_kg,
               COUNT(*) as registros,
               ROUND(AVG(r.cantidad_kg)::numeric, 2) as promedio_kg
        FROM registro_alimentacion r
        LEFT JOIN dietas d ON r.dieta_id = d.id
        WHERE r.fecha_suministro BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('month', r.fecha_suministro), d.nombre
        ORDER BY mes
      `, [fechaInicio, fechaFin]),
      query(`
        SELECT nombre, tipo, stock_actual, stock_minimo, unidad_medida,
               costo_por_kg,
               ROUND((stock_actual * costo_por_kg)::numeric, 2) as valor_inventario
        FROM ingredientes
        ORDER BY tipo, nombre
      `)
    ]);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      consumo_mensual: consumo.rows,
      inventario_ingredientes: ingredientes.rows
    });
  } catch (error) {
    console.error('Error reporte alimentacion:', error.message);
    res.status(500).json({ error: 'Error generando reporte de alimentación' });
  }
});

module.exports = router;
