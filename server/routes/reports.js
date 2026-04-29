const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Reporte reproductivo
router.get('/reproductive', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    // Servicios realizados
    const servicios = await query(`
      SELECT COUNT(*) as total, tipo, 
             strftime('%Y-%m', fecha) as mes
      FROM servicios 
      WHERE fecha BETWEEN ? AND ?
      GROUP BY tipo, mes
      ORDER BY mes
    `, [fechaInicio, fechaFin]);

    // Partos por mes
    const partos = await query(`
      SELECT COUNT(*) as total_partos,
             AVG(lechones_vivos) as promedio_lechones,
             SUM(lechones_vivos) as total_lechones,
             strftime('%Y-%m', fecha_real) as mes
      FROM partos 
      WHERE fecha_real BETWEEN ? AND ?
      GROUP BY mes
      ORDER BY mes
    `, [fechaInicio, fechaFin]);

    // Tasa de parición
    const tasaParicion = await query(`
      SELECT 
        COUNT(DISTINCT s.cerda_id) as cerdas_servidas,
        COUNT(DISTINCT p.gestacion_id) as partos_realizados
      FROM servicios s
      LEFT JOIN gestaciones g ON s.id = g.servicio_id
      LEFT JOIN partos p ON g.id = p.gestacion_id
      WHERE s.fecha BETWEEN ? AND ?
    `, [fechaInicio, fechaFin]);

    res.json({
      periodo: { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      servicios: servicios.rows,
      partos: partos.rows,
      tasa_paricion: tasaParicion.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte reproductivo' });
  }
});

// Reporte de mortalidad
router.get('/mortality', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fechaInicio = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];

    // Mortalidad por categoría
    const mortalidadCategoria = await query(`
      SELECT categoria, COUNT(*) as muertes,
             AVG(julianday(fecha_salida) - julianday(fecha_nacimiento)) as edad_promedio_dias
      FROM animales 
      WHERE estado = 'muerto' 
      AND fecha_salida BETWEEN ? AND ?
      GROUP BY categoria
    `, [fechaInicio, fechaFin]);

    // Mortalidad por mes
    const mortalidadMes = await query(`
      SELECT strftime('%Y-%m', fecha_salida) as mes,
             COUNT(*) as muertes,
             categoria
      FROM animales 
      WHERE estado = 'muerto' 
      AND fecha_salida BETWEEN ? AND ?
      GROUP BY mes, categoria
      ORDER BY mes
    `, [fechaInicio, fechaFin]);

    // Causas principales
    const causas = await query(`
      SELECT motivo_salida, COUNT(*) as cantidad
      FROM animales 
      WHERE estado = 'muerto' 
      AND fecha_salida BETWEEN ? AND ?
      GROUP BY motivo_salida
      ORDER BY cantidad DESC
    `, [fechaInicio, fechaFin]);

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

// Reporte de crecimiento
router.get('/growth', authenticateToken, async (req, res) => {
  try {
    const { categoria } = req.query;

    let whereClause = "WHERE a.estado = 'activo'";
    const params = [];
    
    if (categoria) {
      whereClause += " AND a.categoria = ?";
      params.push(categoria);
    }

    // Estadísticas de crecimiento
    const crecimiento = await query(`
      SELECT a.categoria,
             COUNT(DISTINCT a.id) as total_animales,
             AVG(p.peso) as peso_promedio,
             MIN(p.peso) as peso_minimo,
             MAX(p.peso) as peso_maximo
      FROM animales a
      JOIN pesajes p ON a.id = p.animal_id
      ${whereClause}
      AND p.fecha_pesaje >= date('now', '-30 days')
      GROUP BY a.categoria
    `, params);

    // Ganancia diaria promedio por categoría
    const gananciasDiarias = await query(`
      SELECT a.categoria,
             AVG(
               (p2.peso - p1.peso) / 
               (julianday(p2.fecha_pesaje) - julianday(p1.fecha_pesaje))
             ) as ganancia_diaria_promedio
      FROM animales a
      JOIN pesajes p1 ON a.id = p1.animal_id
      JOIN pesajes p2 ON a.id = p2.animal_id
      ${whereClause}
      AND p2.fecha_pesaje > p1.fecha_pesaje
      AND p1.fecha_pesaje >= date('now', '-90 days')
      GROUP BY a.categoria
    `, params);

    res.json({
      estadisticas_crecimiento: crecimiento.rows,
      ganancias_diarias: gananciasDiarias.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte de crecimiento' });
  }
});

// Reporte de inventario
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    // Inventario actual
    const inventario = await query(`
      SELECT categoria, sexo, COUNT(*) as cantidad,
             AVG(julianday('now') - julianday(fecha_nacimiento)) as edad_promedio_dias
      FROM animales 
      WHERE estado = 'activo'
      GROUP BY categoria, sexo
      ORDER BY categoria, sexo
    `);

    // Animales por ubicación
    const ubicaciones = await query(`
      SELECT u.nombre as ubicacion, u.tipo, u.capacidad_maxima,
             COUNT(a.id) as ocupacion_actual,
             a.categoria
      FROM ubicaciones u
      LEFT JOIN animales a ON u.id = a.ubicacion_actual_id AND a.estado = 'activo'
      GROUP BY u.id, u.nombre, u.tipo, u.capacidad_maxima, a.categoria
      ORDER BY u.tipo, u.nombre
    `);

    // Próximas ventas (animales cerca del peso objetivo)
    const proximasVentas = await query(`
      SELECT a.identificador_unico, a.categoria,
             p.peso as ultimo_peso,
             (100 - p.peso) as kg_faltantes,
             CASE 
               WHEN gd.ganancia_diaria > 0 THEN 
                 ROUND((100 - p.peso) / gd.ganancia_diaria)
               ELSE NULL 
             END as dias_estimados
      FROM animales a
      JOIN pesajes p ON a.id = p.animal_id
      LEFT JOIN (
        SELECT animal_id,
               AVG((p2.peso - p1.peso) / (julianday(p2.fecha_pesaje) - julianday(p1.fecha_pesaje))) as ganancia_diaria
        FROM pesajes p1
        JOIN pesajes p2 ON p1.animal_id = p2.animal_id AND p2.fecha_pesaje > p1.fecha_pesaje
        WHERE p1.fecha_pesaje >= date('now', '-30 days')
        GROUP BY animal_id
      ) gd ON a.id = gd.animal_id
      WHERE a.estado = 'activo' 
      AND a.categoria IN ('engorde', 'desarrollo')
      AND p.peso >= 80 AND p.peso < 100
      AND p.fecha_pesaje = (SELECT MAX(fecha_pesaje) FROM pesajes WHERE animal_id = a.id)
      ORDER BY kg_faltantes ASC
    `);

    res.json({
      inventario_actual: inventario.rows,
      ocupacion_ubicaciones: ubicaciones.rows,
      proximas_ventas: proximasVentas.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generando reporte de inventario' });
  }
});

module.exports = router;
