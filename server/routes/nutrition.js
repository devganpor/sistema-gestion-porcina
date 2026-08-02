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

    // Obtener costo_por_kg de la dieta
    const dietaRes = await query('SELECT nombre, costo_por_kg FROM dietas WHERE id=$1', [dieta_id]);
    if (dietaRes.rows.length === 0) return res.status(404).json({ error: 'Dieta no encontrada' });
    const dieta = dietaRes.rows[0];
    const costo_por_kg = parseFloat(dieta.costo_por_kg || 0);
    const costo_total_registro = parseFloat(cantidad_kg) * costo_por_kg;

    // Insertar registro de alimentación
    const result = await query(`
      INSERT INTO registro_alimentacion (ubicacion_id, dieta_id, cantidad_kg, fecha_suministro, hora_suministro, responsable_id, observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id
    `, [ubicacion_id, dieta_id, cantidad_kg, fecha_suministro, hora_suministro || null, req.user.id, observaciones]);
    const registro_id = result.rows[0].id;

    // Obtener animales activos en esa ubicación en esa fecha
    const animalesRes = await query(
      `SELECT id FROM animales WHERE ubicacion_actual_id=$1 AND estado='activo'`,
      [ubicacion_id]
    );
    const animales = animalesRes.rows;
    const n = animales.length;

    if (n > 0) {
      const kg_por_animal = parseFloat(cantidad_kg) / n;
      const costo_por_animal = costo_total_registro / n;
      const client = await require('../config/database-pg').pool.connect();
      try {
        await client.query('BEGIN');
        for (const animal of animales) {
          await client.query(
            `INSERT INTO alimentacion_animal
             (registro_alimentacion_id, animal_id, ubicacion_id, fecha, kg_asignados, costo_asignado, animales_en_ubicacion, dieta_nombre)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [registro_id, animal.id, ubicacion_id, fecha_suministro, kg_por_animal, costo_por_animal, n, dieta.nombre]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error distribuyendo alimentación:', err);
      } finally {
        client.release();
      }
    }

    res.json({
      id: registro_id,
      message: 'Alimentación registrada exitosamente',
      animales_distribuidos: n,
      costo_total: costo_total_registro,
      kg_por_animal: n > 0 ? (parseFloat(cantidad_kg) / n).toFixed(4) : 0
    });
  } catch (error) {
    console.error(error);
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

// ===================== PLANES DE ALIMENTACIÓN =====================

// Listar planes
router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, u.nombre as usuario_nombre,
        COUNT(e.id) as total_etapas,
        COALESCE(SUM(e.fecha_fin::date - e.fecha_inicio::date + 1), 0) as total_dias
      FROM planes_alimentacion p
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      LEFT JOIN plan_etapas e ON p.id = e.plan_id
      WHERE p.activo = true
      GROUP BY p.id, u.nombre
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo planes' });
  }
});

// Detalle de un plan con etapas y proyección día a día
router.get('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const [planRes, etapasRes] = await Promise.all([
      query('SELECT * FROM planes_alimentacion WHERE id=$1', [req.params.id]),
      query('SELECT * FROM plan_etapas WHERE plan_id=$1 ORDER BY semana', [req.params.id])
    ]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan no encontrado' });
    const plan = planRes.rows[0];
    const etapas = etapasRes.rows;

    // Generar proyección día a día
    const dias = [];
    etapas.forEach(etapa => {
      const start = new Date(etapa.fecha_inicio);
      const end   = new Date(etapa.fecha_fin);
      let current = new Date(start);
      let diaNum = 1;
      // calcular número de día absoluto desde fecha_inicio del plan
      const planStart = new Date(plan.fecha_inicio);
      while (current <= end) {
        const diaAbsoluto = Math.round((current - planStart) / 86400000) + 1;
        const consumoDiarioTotal = Math.round(parseFloat(etapa.cad_kg_animal) * plan.total_animales);
        const sacosDiarios = Math.ceil(consumoDiarioTotal / parseFloat(plan.kg_por_saco));
        dias.push({
          dia: diaAbsoluto,
          fecha: current.toISOString().split('T')[0],
          semana: etapa.semana,
          alimento: etapa.alimento,
          cad_kg_animal: parseFloat(etapa.cad_kg_animal),
          total_animales: plan.total_animales,
          consumo_diario_total: consumoDiarioTotal,
          sacos_diarios: sacosDiarios
        });
        current.setDate(current.getDate() + 1);
        diaNum++;
      }
    });

    // Resumen por etapa
    const resumenEtapas = etapas.map(e => {
      const start = new Date(e.fecha_inicio);
      const end   = new Date(e.fecha_fin);
      const diasEtapa = Math.round((end - start) / 86400000) + 1;
      const consumoEtapa = parseFloat(e.cad_kg_animal) * plan.total_animales * diasEtapa;
      return {
        semana: e.semana,
        alimento: e.alimento,
        cad_kg_animal: parseFloat(e.cad_kg_animal),
        fecha_inicio: e.fecha_inicio,
        fecha_fin: e.fecha_fin,
        dias: diasEtapa,
        consumo_total_kg: Math.round(consumoEtapa),
        sacos_etapa: Math.ceil(consumoEtapa / parseFloat(plan.kg_por_saco))
      };
    });

    res.json({ plan, etapas, dias, resumenEtapas });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo detalle del plan' });
  }
});

// Crear plan con etapas
router.post('/plans', authenticateToken, async (req, res) => {
  const { nombre, descripcion, total_animales, kg_por_saco, fecha_inicio, etapas } = req.body;
  if (!nombre || !total_animales || !fecha_inicio || !Array.isArray(etapas) || etapas.length === 0)
    return res.status(400).json({ error: 'Faltan campos requeridos' });

  const client = await require('../config/database-pg').pool.connect();
  try {
    await client.query('BEGIN');
    const planRes = await client.query(
      `INSERT INTO planes_alimentacion (nombre, descripcion, total_animales, kg_por_saco, fecha_inicio, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [nombre, descripcion || null, total_animales, kg_por_saco || 40, fecha_inicio, req.user.id]
    );
    const planId = planRes.rows[0].id;
    for (const e of etapas) {
      await client.query(
        `INSERT INTO plan_etapas (plan_id, semana, alimento, cad_kg_animal, fecha_inicio, fecha_fin)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [planId, e.semana, e.alimento || null, e.cad_kg_animal, e.fecha_inicio, e.fecha_fin]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id: planId, message: 'Plan creado exitosamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Error creando plan' });
  } finally {
    client.release();
  }
});

// Eliminar plan
router.delete('/plans/:id', authenticateToken, async (req, res) => {
  try {
    await query('UPDATE planes_alimentacion SET activo=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Plan eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando plan' });
  }
});

module.exports = router;
