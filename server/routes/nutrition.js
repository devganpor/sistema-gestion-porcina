const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

router.get('/diets', authenticateToken, async (req, res) => {
  try {
    const dietas = await query(`
      SELECT d.*,
        COUNT(di.id) as total_ingredientes,
        COALESCE(SUM(di.porcentaje), 0) as porcentaje_total
      FROM dietas d
      LEFT JOIN dieta_ingredientes di ON d.id = di.dieta_id
      WHERE d.activa = true
      GROUP BY d.id
      ORDER BY d.categoria_animal, d.nombre
    `);
    res.json(dietas.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo dietas' });
  }
});

router.post('/diets', authenticateToken, async (req, res) => {
  try {
    const { nombre, categoria_animal, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, descripcion } = req.body;
    const result = await query(`
      INSERT INTO dietas (nombre, categoria_animal, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, descripcion)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [nombre, categoria_animal, proteina_porcentaje || null, energia_kcal || null, fibra_porcentaje || null, costo_por_kg || 0, descripcion]);
    res.json({ id: result.rows[0].id, message: 'Dieta creada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando dieta' });
  }
});

router.put('/diets/:id', authenticateToken, async (req, res) => {
  try {
    const { nombre, categoria_animal, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, descripcion } = req.body;
    await query(`
      UPDATE dietas SET nombre=$1, categoria_animal=$2, proteina_porcentaje=$3,
        energia_kcal=$4, fibra_porcentaje=$5, costo_por_kg=$6, descripcion=$7
      WHERE id=$8
    `, [nombre, categoria_animal, proteina_porcentaje || null, energia_kcal || null, fibra_porcentaje || null, costo_por_kg || 0, descripcion, req.params.id]);
    res.json({ message: 'Dieta actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando dieta' });
  }
});

router.delete('/diets/:id', authenticateToken, async (req, res) => {
  try {
    await query('UPDATE dietas SET activa=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Dieta eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando dieta' });
  }
});

router.get('/diets/:id/composition', authenticateToken, async (req, res) => {
  try {
    const composicion = await query(`
      SELECT di.*, i.nombre, i.tipo, i.costo_por_kg,
        (i.costo_por_kg * di.porcentaje / 100) as costo_ingrediente
      FROM dieta_ingredientes di
      JOIN ingredientes i ON di.ingrediente_id = i.id
      WHERE di.dieta_id = $1
      ORDER BY di.porcentaje DESC
    `, [req.params.id]);
    res.json(composicion.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo composición' });
  }
});

router.get('/ingredients', authenticateToken, async (req, res) => {
  try {
    const ingredientes = await query(`
      SELECT *,
        CASE
          WHEN stock_actual <= 0 THEN 'critico'
          WHEN stock_actual <= stock_minimo THEN 'bajo'
          WHEN stock_actual <= stock_minimo * 1.5 THEN 'medio'
          ELSE 'normal'
        END as nivel_stock
      FROM ingredientes
      ORDER BY nombre
    `);
    res.json(ingredientes.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ingredientes' });
  }
});

router.post('/ingredients', authenticateToken, async (req, res) => {
  try {
    const { nombre, tipo, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, stock_actual, stock_minimo, unidad_medida, proveedor } = req.body;
    const result = await query(`
      INSERT INTO ingredientes (nombre, tipo, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, stock_actual, stock_minimo, unidad_medida, proveedor)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id
    `, [nombre, tipo, proteina_porcentaje || null, energia_kcal || null, fibra_porcentaje || null, costo_por_kg || 0, stock_actual || 0, stock_minimo || 0, unidad_medida || 'kg', proveedor]);
    res.json({ id: result.rows[0].id, message: 'Ingrediente creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando ingrediente' });
  }
});

router.put('/ingredients/:id/stock', authenticateToken, async (req, res) => {
  try {
    const { cantidad, tipo_movimiento } = req.body;
    const ingrediente = await query('SELECT stock_actual FROM ingredientes WHERE id=$1', [req.params.id]);
    if (ingrediente.rows.length === 0) return res.status(404).json({ error: 'Ingrediente no encontrado' });

    const stockActual = parseFloat(ingrediente.rows[0].stock_actual);
    const nuevoStock = tipo_movimiento === 'entrada' ? stockActual + cantidad : stockActual - cantidad;
    if (nuevoStock < 0) return res.status(400).json({ error: 'Stock insuficiente' });

    await query('UPDATE ingredientes SET stock_actual=$1 WHERE id=$2', [nuevoStock, req.params.id]);
    res.json({ message: 'Stock actualizado exitosamente', nuevo_stock: nuevoStock });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando stock' });
  }
});

router.post('/feeding', authenticateToken, async (req, res) => {
  try {
    const { ubicacion_id, dieta_id, cantidad_kg, fecha_suministro, hora_suministro, observaciones } = req.body;
    const result = await query(`
      INSERT INTO registro_alimentacion (ubicacion_id, dieta_id, cantidad_kg, fecha_suministro, hora_suministro, responsable_id, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [ubicacion_id, dieta_id, cantidad_kg, fecha_suministro, hora_suministro || null, req.user.id, observaciones]);
    res.json({ id: result.rows[0].id, message: 'Alimentación registrada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando alimentación' });
  }
});

router.get('/feeding', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, ubicacion_id } = req.query;
    const params = [];
    let conditions = '';

    if (fecha_inicio) { params.push(fecha_inicio); conditions += ` AND ra.fecha_suministro >= $${params.length}`; }
    if (fecha_fin)    { params.push(fecha_fin);    conditions += ` AND ra.fecha_suministro <= $${params.length}`; }
    if (ubicacion_id) { params.push(ubicacion_id); conditions += ` AND ra.ubicacion_id = $${params.length}`; }

    const registros = await query(`
      SELECT ra.*, u.nombre as ubicacion_nombre, d.nombre as dieta_nombre, d.costo_por_kg,
        (ra.cantidad_kg * d.costo_por_kg) as costo_total,
        us.nombre as responsable_nombre
      FROM registro_alimentacion ra
      JOIN ubicaciones u ON ra.ubicacion_id = u.id
      JOIN dietas d ON ra.dieta_id = d.id
      JOIN usuarios us ON ra.responsable_id = us.id
      WHERE 1=1${conditions}
      ORDER BY ra.fecha_suministro DESC
    `, params);
    res.json(registros.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo registros de alimentación' });
  }
});

router.post('/conversion/:animalId', authenticateToken, async (req, res) => {
  try {
    const { periodo_inicio, periodo_fin, peso_inicial, peso_final, alimento_consumido } = req.body;
    const gananciaPeso = peso_final - peso_inicial;
    const dias = Math.ceil((new Date(periodo_fin) - new Date(periodo_inicio)) / (1000 * 60 * 60 * 24));
    const gananciaDiaria = gananciaPeso / dias;
    const conversionCalculada = alimento_consumido / gananciaPeso;

    const result = await query(`
      INSERT INTO conversion_alimenticia (animal_id, periodo_inicio, periodo_fin, peso_inicial, peso_final, alimento_consumido, conversion_calculada, ganancia_diaria)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `, [req.params.animalId, periodo_inicio, periodo_fin, peso_inicial, peso_final, alimento_consumido, conversionCalculada, gananciaDiaria]);

    res.json({
      id: result.rows[0].id,
      conversion_calculada: conversionCalculada.toFixed(2),
      ganancia_diaria: gananciaDiaria.toFixed(3),
      dias_periodo: dias,
      message: 'Conversión alimenticia calculada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error calculando conversión alimenticia' });
  }
});

router.get('/conversion/:animalId', authenticateToken, async (req, res) => {
  try {
    const conversiones = await query(`
      SELECT ca.*, a.identificador_unico, a.nombre
      FROM conversion_alimenticia ca
      JOIN animales a ON ca.animal_id = a.id
      WHERE ca.animal_id = $1
      ORDER BY ca.periodo_inicio DESC
    `, [req.params.animalId]);
    res.json(conversiones.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo conversiones alimenticias' });
  }
});

router.get('/consumption-stats', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    const fi = fecha_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const ff = fecha_fin || new Date().toISOString().split('T')[0];

    const stats = await query(`
      SELECT u.nombre as ubicacion, u.tipo,
        SUM(ra.cantidad_kg) as total_consumido,
        SUM(ra.cantidad_kg * d.costo_por_kg) as costo_total,
        AVG(ra.cantidad_kg) as promedio_diario,
        COUNT(DISTINCT ra.fecha_suministro) as dias_alimentacion
      FROM registro_alimentacion ra
      JOIN ubicaciones u ON ra.ubicacion_id = u.id
      JOIN dietas d ON ra.dieta_id = d.id
      WHERE ra.fecha_suministro BETWEEN $1 AND $2
      GROUP BY u.id, u.nombre, u.tipo
      ORDER BY total_consumido DESC
    `, [fi, ff]);
    res.json(stats.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estadísticas de consumo' });
  }
});

router.get('/inventory-alerts', authenticateToken, async (req, res) => {
  try {
    const alertas = await query(`
      SELECT *,
        CASE WHEN stock_minimo > 0 THEN ROUND((stock_actual / stock_minimo * 100)::numeric, 1) ELSE 0 END as porcentaje_stock,
        CASE
          WHEN stock_actual <= 0 THEN 'critico'
          WHEN stock_actual <= stock_minimo THEN 'bajo'
          WHEN stock_actual <= stock_minimo * 1.5 THEN 'medio'
          ELSE 'normal'
        END as nivel_alerta
      FROM ingredientes
      WHERE stock_actual <= stock_minimo * 1.5
      ORDER BY (CASE WHEN stock_minimo > 0 THEN stock_actual / stock_minimo ELSE 1 END) ASC
    `);
    res.json(alertas.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo alertas de inventario' });
  }
});

module.exports = router;
