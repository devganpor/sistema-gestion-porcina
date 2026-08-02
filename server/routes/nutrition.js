const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Middleware CSRF simple para desarrollo
const validateCSRF = (req, res, next) => next();

// Obtener todas las dietas
router.get('/diets', authenticateToken, async (req, res) => {
  try {
    const dietas = await query(`
      SELECT d.*, 
        COUNT(di.id) as total_ingredientes,
        SUM(di.porcentaje) as porcentaje_total
      FROM dietas d
      LEFT JOIN dieta_ingredientes di ON d.id = di.dieta_id
      WHERE d.activa = 1
      GROUP BY d.id
      ORDER BY d.categoria_animal, d.nombre
    `);
    
    res.json(dietas.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo dietas' });
  }
});

// Crear nueva dieta
router.post('/diets', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { nombre, categoria_animal, proteina_porcentaje, energia_kcal, fibra_porcentaje, descripcion, ingredientes } = req.body;
    
    // Calcular costo basado en ingredientes
    let costoTotal = 0;
    if (ingredientes && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        const ingrediente = await query('SELECT costo_por_kg FROM ingredientes WHERE id = ?', [ing.ingrediente_id]);
        if (ingrediente.rows.length > 0) {
          costoTotal += (ingrediente.rows[0].costo_por_kg * ing.porcentaje / 100);
        }
      }
    }
    
    const result = await query(`
      INSERT INTO dietas (nombre, categoria_animal, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, descripcion)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [nombre, categoria_animal, proteina_porcentaje, energia_kcal, fibra_porcentaje, costoTotal, descripcion]);
    
    const dietaId = result.lastID;
    
    // Insertar ingredientes de la dieta
    if (ingredientes && ingredientes.length > 0) {
      for (const ing of ingredientes) {
        await query(`
          INSERT INTO dieta_ingredientes (dieta_id, ingrediente_id, porcentaje)
          VALUES (?, ?, ?)
        `, [dietaId, ing.ingrediente_id, ing.porcentaje]);
      }
    }
    
    res.json({ id: dietaId, message: 'Dieta creada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando dieta' });
  }
});

// Obtener composición de una dieta
router.get('/diets/:id/composition', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const composicion = await query(`
      SELECT di.*, i.nombre, i.tipo, i.costo_por_kg,
        (i.costo_por_kg * di.porcentaje / 100) as costo_ingrediente
      FROM dieta_ingredientes di
      JOIN ingredientes i ON di.ingrediente_id = i.id
      WHERE di.dieta_id = ?
      ORDER BY di.porcentaje DESC
    `, [id]);
    
    res.json(composicion.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo composición' });
  }
});

// Obtener todos los ingredientes
router.get('/ingredients', authenticateToken, async (req, res) => {
  try {
    const ingredientes = await query(`
      SELECT *, 
        CASE 
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

// Crear ingrediente
router.post('/ingredients', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { nombre, tipo, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, stock_actual, stock_minimo, unidad_medida, proveedor } = req.body;
    
    const result = await query(`
      INSERT INTO ingredientes (nombre, tipo, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, stock_actual, stock_minimo, unidad_medida, proveedor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [nombre, tipo, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, stock_actual, stock_minimo, unidad_medida, proveedor]);
    
    res.json({ id: result.lastID, message: 'Ingrediente creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error creando ingrediente' });
  }
});

// Actualizar stock de ingrediente
router.put('/ingredients/:id/stock', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, tipo_movimiento, observaciones } = req.body;
    
    const ingrediente = await query('SELECT stock_actual FROM ingredientes WHERE id = ?', [id]);
    if (ingrediente.rows.length === 0) {
      return res.status(404).json({ error: 'Ingrediente no encontrado' });
    }
    
    const stockActual = ingrediente.rows[0].stock_actual;
    const nuevoStock = tipo_movimiento === 'entrada' ? stockActual + cantidad : stockActual - cantidad;
    
    if (nuevoStock < 0) {
      return res.status(400).json({ error: 'Stock insuficiente' });
    }
    
    await query('UPDATE ingredientes SET stock_actual = ? WHERE id = ?', [nuevoStock, id]);
    
    res.json({ message: 'Stock actualizado exitosamente', nuevo_stock: nuevoStock });
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando stock' });
  }
});

// Registrar alimentación
router.post('/feeding', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { ubicacion_id, dieta_id, cantidad_kg, fecha_suministro, hora_suministro, observaciones } = req.body;
    
    const result = await query(`
      INSERT INTO registro_alimentacion (ubicacion_id, dieta_id, cantidad_kg, fecha_suministro, hora_suministro, responsable_id, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [ubicacion_id, dieta_id, cantidad_kg, fecha_suministro, hora_suministro, req.user.id, observaciones]);
    
    res.json({ id: result.lastID, message: 'Alimentación registrada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error registrando alimentación' });
  }
});

// Obtener registro de alimentación
router.get('/feeding', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, ubicacion_id } = req.query;
    
    let whereClause = '1=1';
    const params = [];
    
    if (fecha_inicio) {
      whereClause += ' AND ra.fecha_suministro >= ?';
      params.push(fecha_inicio);
    }
    
    if (fecha_fin) {
      whereClause += ' AND ra.fecha_suministro <= ?';
      params.push(fecha_fin);
    }
    
    if (ubicacion_id) {
      whereClause += ' AND ra.ubicacion_id = ?';
      params.push(ubicacion_id);
    }
    
    const registros = await query(`
      SELECT ra.*, u.nombre as ubicacion_nombre, d.nombre as dieta_nombre, d.costo_por_kg,
        (ra.cantidad_kg * d.costo_por_kg) as costo_total,
        us.nombre as responsable_nombre
      FROM registro_alimentacion ra
      JOIN ubicaciones u ON ra.ubicacion_id = u.id
      JOIN dietas d ON ra.dieta_id = d.id
      JOIN usuarios us ON ra.responsable_id = us.id
      WHERE ${whereClause}
      ORDER BY ra.fecha_suministro DESC, ra.hora_suministro DESC
    `, params);
    
    res.json(registros.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo registros de alimentación' });
  }
});

// Calcular conversión alimenticia
router.post('/conversion/:animalId', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { animalId } = req.params;
    const { periodo_inicio, periodo_fin, peso_inicial, peso_final, alimento_consumido } = req.body;
    
    const gananciaPeso = peso_final - peso_inicial;
    const dias = Math.ceil((new Date(periodo_fin) - new Date(periodo_inicio)) / (1000 * 60 * 60 * 24));
    const gananciaDiaria = gananciaPeso / dias;
    const conversionCalculada = alimento_consumido / gananciaPeso;
    
    const result = await query(`
      INSERT INTO conversion_alimenticia (animal_id, periodo_inicio, periodo_fin, peso_inicial, peso_final, alimento_consumido, conversion_calculada, ganancia_diaria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [animalId, periodo_inicio, periodo_fin, peso_inicial, peso_final, alimento_consumido, conversionCalculada, gananciaDiaria]);
    
    res.json({
      id: result.lastID,
      conversion_calculada: conversionCalculada.toFixed(2),
      ganancia_diaria: gananciaDiaria.toFixed(3),
      dias_periodo: dias,
      message: 'Conversión alimenticia calculada exitosamente'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error calculando conversión alimenticia' });
  }
});

// Obtener conversión alimenticia por animal
router.get('/conversion/:animalId', authenticateToken, async (req, res) => {
  try {
    const { animalId } = req.params;
    
    const conversiones = await query(`
      SELECT ca.*, a.identificador_unico, a.nombre
      FROM conversion_alimenticia ca
      JOIN animales a ON ca.animal_id = a.id
      WHERE ca.animal_id = ?
      ORDER BY ca.periodo_inicio DESC
    `, [animalId]);
    
    res.json(conversiones.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo conversiones alimenticias' });
  }
});

// Estadísticas de consumo por ubicación
router.get('/consumption-stats', authenticateToken, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    const stats = await query(`
      SELECT u.nombre as ubicacion, u.tipo,
        SUM(ra.cantidad_kg) as total_consumido,
        SUM(ra.cantidad_kg * d.costo_por_kg) as costo_total,
        AVG(ra.cantidad_kg) as promedio_diario,
        COUNT(DISTINCT ra.fecha_suministro) as dias_alimentacion
      FROM registro_alimentacion ra
      JOIN ubicaciones u ON ra.ubicacion_id = u.id
      JOIN dietas d ON ra.dieta_id = d.id
      WHERE ra.fecha_suministro BETWEEN ? AND ?
      GROUP BY u.id, u.nombre, u.tipo
      ORDER BY total_consumido DESC
    `, [fecha_inicio || '2024-01-01', fecha_fin || new Date().toISOString().split('T')[0]]);
    
    res.json(stats.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo estadísticas de consumo' });
  }
});

// Alertas de inventario bajo
router.get('/inventory-alerts', authenticateToken, async (req, res) => {
  try {
    const alertas = await query(`
      SELECT *, 
        ROUND((stock_actual / stock_minimo) * 100, 1) as porcentaje_stock,
        CASE 
          WHEN stock_actual <= 0 THEN 'critico'
          WHEN stock_actual <= stock_minimo THEN 'bajo'
          WHEN stock_actual <= stock_minimo * 1.5 THEN 'medio'
          ELSE 'normal'
        END as nivel_alerta
      FROM ingredientes
      WHERE stock_actual <= stock_minimo * 1.5
      ORDER BY (stock_actual / stock_minimo) ASC
    `);
    
    res.json(alertas.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo alertas de inventario' });
  }
});

// Proyección de consumo
router.get('/consumption-projection', authenticateToken, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    
    const proyeccion = await query(`
      SELECT i.nombre, i.stock_actual, i.stock_minimo,
        AVG(ra.cantidad_kg * di.porcentaje / 100) as consumo_promedio_diario,
        ROUND(i.stock_actual / (AVG(ra.cantidad_kg * di.porcentaje / 100) * ?), 1) as dias_restantes
      FROM ingredientes i
      LEFT JOIN dieta_ingredientes di ON i.id = di.ingrediente_id
      LEFT JOIN registro_alimentacion ra ON di.dieta_id = ra.dieta_id
      WHERE ra.fecha_suministro >= date('now', '-30 days')
      GROUP BY i.id, i.nombre, i.stock_actual, i.stock_minimo
      HAVING consumo_promedio_diario > 0
      ORDER BY dias_restantes ASC
    `, [parseInt(dias)]);
    
    res.json(proyeccion.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error calculando proyección de consumo' });
  }
});

module.exports = router;
