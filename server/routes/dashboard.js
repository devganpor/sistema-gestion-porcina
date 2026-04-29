const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Dashboard principal con KPIs
router.get('/kpis', authenticateToken, asyncHandler(async (req, res) => {
  const kpis = {};

    // Inventario total por categoría
    const inventario = await query(`
      SELECT categoria, COUNT(*) as cantidad
      FROM animales
      WHERE estado = 'activo'
      GROUP BY categoria
    `);
    kpis.inventario = inventario.rows;

    // Total de animales activos
    const totalAnimales = await query(`
      SELECT COUNT(*) as total FROM animales WHERE estado = 'activo'
    `);
    kpis.total_animales = parseInt(totalAnimales.rows[0].total);

    // Cerdas reproductoras activas
    const cerdasReproductoras = await query(`
      SELECT COUNT(*) as total 
      FROM animales 
      WHERE estado = 'activo' AND sexo = 'hembra' AND categoria = 'reproductor'
    `);
    kpis.cerdas_reproductoras = parseInt(cerdasReproductoras.rows[0].total);

    // Partos en los últimos 30 días
    const partosRecientes = await query(`
      SELECT COUNT(*) as total, AVG(lechones_vivos) as promedio_lechones
      FROM partos
      WHERE fecha_real >= date('now', '-30 days')
    `);
    kpis.partos_ultimo_mes = parseInt(partosRecientes.rows[0].total || 0);
    kpis.promedio_lechones_por_parto = parseFloat(partosRecientes.rows[0].promedio_lechones || 0);

    // Próximos partos (7 días)
    const proximosPartos = await query(`
      SELECT COUNT(*) as total
      FROM gestaciones g
      WHERE g.fecha_parto_esperado BETWEEN date('now') AND date('now', '+7 days')
      AND g.resultado = 1
    `);
    kpis.proximos_partos = parseInt(proximosPartos.rows[0].total);

    // Mortalidad últimos 30 días
    const mortalidad = await query(`
      SELECT COUNT(*) as total
      FROM animales
      WHERE estado = 'muerto' AND fecha_salida >= date('now', '-30 days')
    `);
    kpis.mortalidad_ultimo_mes = parseInt(mortalidad.rows[0].total);

    // Animales listos para venta (>= 100kg)
    const listosVenta = await query(`
      SELECT COUNT(DISTINCT a.id) as total
      FROM animales a
      JOIN pesajes p ON a.id = p.animal_id
      WHERE a.estado = 'activo' 
      AND a.categoria IN ('engorde', 'desarrollo')
      AND p.peso >= 100
      AND p.fecha_pesaje = (
        SELECT MAX(fecha_pesaje) 
        FROM pesajes p2 
        WHERE p2.animal_id = a.id
      )
    `);
    kpis.listos_para_venta = parseInt(listosVenta.rows[0].total);

    res.json(kpis);
}));

// Gráfico de crecimiento promedio por categoría
router.get('/growth-chart', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT a.categoria, 
             AVG(p.peso) as peso_promedio,
             COUNT(p.id) as total_pesajes
      FROM animales a
      JOIN pesajes p ON a.id = p.animal_id
      WHERE a.estado = 'activo'
      AND p.fecha_pesaje >= date('now', '-90 days')
      GROUP BY a.categoria
      ORDER BY 
        CASE a.categoria
          WHEN 'lechon' THEN 1
          WHEN 'recria' THEN 2
          WHEN 'desarrollo' THEN 3
          WHEN 'engorde' THEN 4
          WHEN 'reproductor' THEN 5
        END
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo datos de crecimiento' });
  }
});

// Resumen reproductivo
router.get('/reproduction-summary', authenticateToken, async (req, res) => {
  try {
    // Servicios últimos 30 días
    const servicios = await query(`
      SELECT COUNT(*) as total, tipo
      FROM servicios
      WHERE fecha >= date('now', '-30 days')
      GROUP BY tipo
    `);

    // Gestaciones confirmadas
    const gestaciones = await query(`
      SELECT 
        COUNT(*) as total_confirmadas,
        COUNT(CASE WHEN resultado = 1 THEN 1 END) as positivas,
        COUNT(CASE WHEN resultado = 0 THEN 1 END) as negativas
      FROM gestaciones
      WHERE fecha_confirmacion >= date('now', '-30 days')
    `);

    res.json({
      servicios: servicios.rows,
      gestaciones: gestaciones.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo resumen reproductivo' });
  }
});

// Alertas del sistema
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const alerts = [];

    // Partos próximos (7 días)
    const proximosPartos = await query(`
      SELECT g.fecha_parto_esperado, a.identificador_unico, a.nombre
      FROM gestaciones g
      JOIN servicios s ON g.servicio_id = s.id
      JOIN animales a ON s.cerda_id = a.id
      WHERE g.fecha_parto_esperado BETWEEN date('now') AND date('now', '+7 days')
      AND g.resultado = 1
      ORDER BY g.fecha_parto_esperado
    `);

    proximosPartos.rows.forEach(row => {
      alerts.push({
        tipo: 'parto_proximo',
        titulo: 'Parto Próximo',
        mensaje: `${row.identificador_unico} - ${row.nombre || 'Sin nombre'}`,
        fecha: row.fecha_parto_esperado,
        prioridad: 'alta'
      });
    });

    // Ubicaciones sobrepobladas
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
        prioridad: 'media'
      });
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo alertas' });
  }
});

module.exports = router;
