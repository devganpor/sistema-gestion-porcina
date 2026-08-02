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

    const [crecimiento] = await Promise.all([
      query(`
        SELECT a.categoria,
               COUNT(DISTINCT a.id) as total_animales,
               AVG(p.peso) as peso_promedio,
               MIN(p.peso) as peso_minimo,
               MAX(p.peso) as peso_maximo
        FROM animales a
        JOIN pesajes p ON a.id = p.animal_id
        WHERE a.estado = 'activo'${catFilter}
        AND p.fecha_pesaje >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY a.categoria
      `, params)
    ]);

    res.json({ estadisticas_crecimiento: crecimiento.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte de crecimiento' });
  }
});

router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const [inventario, ubicaciones] = await Promise.all([
      query(`
        SELECT categoria, sexo, COUNT(*) as cantidad,
               AVG(EXTRACT(EPOCH FROM (CURRENT_DATE - fecha_nacimiento))/86400) as edad_promedio_dias
        FROM animales WHERE estado = 'activo'
        GROUP BY categoria, sexo ORDER BY categoria, sexo
      `),
      query(`
        SELECT u.nombre as ubicacion, u.tipo, u.capacidad_maxima,
               COUNT(a.id) as ocupacion_actual, a.categoria
        FROM ubicaciones u
        LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
        GROUP BY u.id, u.nombre, u.tipo, u.capacidad_maxima, a.categoria
        ORDER BY u.tipo, u.nombre
      `)
    ]);

    res.json({
      inventario_actual: inventario.rows,
      ocupacion_ubicaciones: ubicaciones.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte de inventario' });
  }
});

module.exports = router;
