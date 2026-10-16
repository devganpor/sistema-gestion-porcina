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
    const { fecha_inicio, fecha_fin, dieta_id, ubicacion_id, categoria_animal, agrupacion } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    // Filtros dinámicos
    const filtros = ['r.fecha_suministro BETWEEN $1 AND $2'];
    const params = [fechaInicio, fechaFin];
    if (dieta_id)        { params.push(dieta_id);        filtros.push(`r.dieta_id = $${params.length}`); }
    if (ubicacion_id)    { params.push(ubicacion_id);    filtros.push(`r.ubicacion_id = $${params.length}`); }
    if (categoria_animal){ params.push(categoria_animal); filtros.push(`d.categoria_animal = $${params.length}`); }
    const where = filtros.join(' AND ');

    // Agrupación temporal configurable — normalizar a fecha local antes de truncar
    const periodoFmt = agrupacion === 'semana' ? 'YYYY-MM-DD' : agrupacion === 'dia' ? 'YYYY-MM-DD' : 'YYYY-MM-DD';
    const trunc      = agrupacion === 'semana' ? 'week'       : agrupacion === 'dia' ? 'day'        : 'month';
    const fechaExpr  = `DATE_TRUNC('${trunc}', (fecha_suministro AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date::timestamp)`;

    const [resumen, porDieta, porUbicacion, porCategoria, detalle, filtrosDisponibles] = await Promise.all([
      // Resumen general del período
      query(`
        SELECT
          COUNT(*)                                          AS total_registros,
          ROUND(SUM(r.cantidad_kg)::numeric, 2)            AS total_kg,
          ROUND(AVG(r.cantidad_kg)::numeric, 2)            AS promedio_kg_registro,
          ROUND(SUM(r.cantidad_kg * d.costo_por_kg)::numeric, 2) AS costo_total,
          COUNT(DISTINCT r.dieta_id)                       AS dietas_usadas,
          COUNT(DISTINCT r.ubicacion_id)                   AS ubicaciones_atendidas
        FROM registro_alimentacion r
        LEFT JOIN dietas d ON r.dieta_id = d.id
        WHERE ${where}
      `, params),

      // Consumo agrupado por período
      query(`
        SELECT
          TO_CHAR(${fechaExpr}, 'YYYY-MM-DD') AS periodo_inicio,
          TO_CHAR(${fechaExpr}, 'DD/MM/YYYY') AS periodo,
          ROUND(SUM(r.cantidad_kg)::numeric, 2)                                AS total_kg,
          ROUND(SUM(r.cantidad_kg * d.costo_por_kg)::numeric, 2)              AS costo_total,
          COUNT(*)                                                             AS registros
        FROM registro_alimentacion r
        LEFT JOIN dietas d ON r.dieta_id = d.id
        WHERE ${where}
        GROUP BY ${fechaExpr}
        ORDER BY ${fechaExpr}
      `, params),

      // Consumo por dieta
      query(`
        SELECT
          d.nombre                                                  AS dieta,
          d.categoria_animal,
          ROUND(SUM(r.cantidad_kg)::numeric, 2)                    AS total_kg,
          ROUND(AVG(r.cantidad_kg)::numeric, 2)                    AS promedio_kg,
          ROUND(SUM(r.cantidad_kg * d.costo_por_kg)::numeric, 2)  AS costo_total,
          ROUND(AVG(d.costo_por_kg)::numeric, 4)                  AS costo_por_kg,
          COUNT(*)                                                  AS registros
        FROM registro_alimentacion r
        LEFT JOIN dietas d ON r.dieta_id = d.id
        WHERE ${where}
        GROUP BY d.id, d.nombre, d.categoria_animal
        ORDER BY total_kg DESC
      `, params),

      // Consumo por ubicación
      query(`
        SELECT
          u.nombre                                                  AS ubicacion,
          u.tipo,
          u.capacidad_maxima,
          ROUND(SUM(r.cantidad_kg)::numeric, 2)                    AS total_kg,
          ROUND(SUM(r.cantidad_kg * d.costo_por_kg)::numeric, 2)  AS costo_total,
          COUNT(*)                                                  AS registros,
          ROUND(SUM(r.cantidad_kg) / NULLIF(u.capacidad_maxima, 0)::numeric, 2) AS kg_por_capacidad
        FROM registro_alimentacion r
        LEFT JOIN dietas d ON r.dieta_id = d.id
        LEFT JOIN ubicaciones u ON r.ubicacion_id = u.id
        WHERE ${where}
        GROUP BY u.id, u.nombre, u.tipo, u.capacidad_maxima
        ORDER BY total_kg DESC
      `, params),

      // Consumo por categoría animal
      query(`
        SELECT
          d.categoria_animal,
          ROUND(SUM(r.cantidad_kg)::numeric, 2)                    AS total_kg,
          ROUND(SUM(r.cantidad_kg * d.costo_por_kg)::numeric, 2)  AS costo_total,
          COUNT(*)                                                  AS registros
        FROM registro_alimentacion r
        LEFT JOIN dietas d ON r.dieta_id = d.id
        WHERE ${where}
        GROUP BY d.categoria_animal
        ORDER BY total_kg DESC
      `, params),

      // Opciones para filtros
      query(`
        SELECT DISTINCT d.id, d.nombre, d.categoria_animal
        FROM dietas d JOIN registro_alimentacion r ON r.dieta_id = d.id
        ORDER BY d.nombre
      `),
    ]);

    // Ubicaciones disponibles
    const ubicacionesDisp = await query(`
      SELECT DISTINCT u.id, u.nombre, u.tipo
      FROM ubicaciones u JOIN registro_alimentacion r ON r.ubicacion_id = u.id
      ORDER BY u.nombre
    `);

    // Tabla temporal con fecha legible
    const temporalResult = await query(`
      SELECT
        TO_CHAR(${fechaExpr}, 'YYYY-MM-DD') AS periodo_orden,
        TO_CHAR(${fechaExpr}, 'DD/MM/YYYY') AS fecha,
        ROUND(SUM(r.cantidad_kg)::numeric, 2)                               AS total_kg,
        ROUND(SUM(r.cantidad_kg * d.costo_por_kg)::numeric, 2)             AS costo_total,
        COUNT(*)                                                            AS registros
      FROM registro_alimentacion r
      LEFT JOIN dietas d ON r.dieta_id = d.id
      WHERE ${where}
      GROUP BY ${fechaExpr}
      ORDER BY ${fechaExpr}
    `, params);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      resumen: resumen.rows[0],
      consumo_temporal_tabla: temporalResult.rows,
      por_dieta: porDieta.rows,
      por_ubicacion: porUbicacion.rows,
      por_categoria: porCategoria.rows,
      filtros_disponibles: {
        dietas: filtrosDisponibles.rows,
        ubicaciones: ubicacionesDisp.rows
      }
    });
  } catch (error) {
    console.error('Error reporte alimentacion:', error.message);
    res.status(500).json({ error: 'Error generando reporte de alimentación: ' + error.message });
  }
});

module.exports = router;
