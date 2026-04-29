const express = require('express');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Middleware CSRF simple para desarrollo
const validateCSRF = (req, res, next) => next();

// Obtener árbol genealógico de un animal
router.get('/tree/:animalId', authenticateToken, async (req, res) => {
  try {
    const { animalId } = req.params;
    const generations = parseInt(req.query.generations) || 3;
    
    const tree = await buildGenealogyTree(animalId, generations);
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo árbol genealógico' });
  }
});

// Calcular consanguinidad entre dos animales
router.get('/consanguinity/:animal1/:animal2', authenticateToken, async (req, res) => {
  try {
    const { animal1, animal2 } = req.params;
    
    const coefficient = await calculateInbreedingCoefficient(animal1, animal2);
    const risk = coefficient > 0.125 ? 'alto' : coefficient > 0.0625 ? 'medio' : 'bajo';
    
    res.json({
      coefficient,
      percentage: (coefficient * 100).toFixed(2),
      risk,
      recommendation: coefficient > 0.125 ? 'No recomendado' : 'Aceptable'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error calculando consanguinidad' });
  }
});

// Obtener índices genéticos de un animal
router.get('/indices/:animalId', authenticateToken, async (req, res) => {
  try {
    const { animalId } = req.params;
    
    const indices = await query(`
      SELECT * FROM indices_geneticos 
      WHERE animal_id = ? 
      ORDER BY fecha_calculo DESC 
      LIMIT 1
    `, [animalId]);
    
    if (indices.rows.length === 0) {
      // Calcular índices si no existen
      const calculated = await calculateGeneticIndices(animalId);
      res.json(calculated);
    } else {
      res.json(indices.rows[0]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo índices genéticos' });
  }
});

// Recalcular índices genéticos
router.post('/indices/:animalId/calculate', authenticateToken, validateCSRF, async (req, res) => {
  try {
    const { animalId } = req.params;
    const indices = await calculateGeneticIndices(animalId);
    res.json(indices);
  } catch (error) {
    res.status(500).json({ error: 'Error calculando índices' });
  }
});

// Recomendador de apareamientos
router.get('/mating-recommendations/:cerdaId', authenticateToken, async (req, res) => {
  try {
    const { cerdaId } = req.params;
    
    const verracos = await query(`
      SELECT a.*, ig.indice_seleccion, ig.fertilidad, ig.conversion_alimenticia
      FROM animales a
      LEFT JOIN indices_geneticos ig ON a.id = ig.animal_id
      WHERE a.sexo = 'macho' AND a.categoria = 'reproductor' AND a.estado = 'activo'
      ORDER BY ig.indice_seleccion DESC
    `);
    
    const recommendations = [];
    
    for (const verraco of verracos.rows) {
      const consanguinity = await calculateInbreedingCoefficient(cerdaId, verraco.id);
      const score = calculateMatingScore(verraco, consanguinity);
      
      recommendations.push({
        verraco,
        consanguinity: (consanguinity * 100).toFixed(2),
        score: score.toFixed(2),
        recommendation: consanguinity > 0.125 ? 'No recomendado' : score > 80 ? 'Excelente' : score > 60 ? 'Bueno' : 'Regular'
      });
    }
    
    recommendations.sort((a, b) => b.score - a.score);
    res.json(recommendations.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: 'Error generando recomendaciones' });
  }
});

// Ranking de reproductores
router.get('/ranking', authenticateToken, async (req, res) => {
  try {
    const { sexo = 'macho', limit = 20 } = req.query;
    
    const ranking = await query(`
      SELECT a.*, ig.*, 
        (ig.fertilidad * 0.3 + ig.habilidad_materna * 0.3 + ig.conversion_alimenticia * 0.4) as score_total
      FROM animales a
      JOIN indices_geneticos ig ON a.id = ig.animal_id
      WHERE a.sexo = ? AND a.categoria = 'reproductor' AND a.estado = 'activo'
      ORDER BY score_total DESC
      LIMIT ?
    `, [sexo, parseInt(limit)]);
    
    res.json(ranking.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ranking' });
  }
});

// Funciones auxiliares
async function buildGenealogyTree(animalId, generations, currentGen = 0) {
  if (currentGen >= generations) return null;
  
  const animal = await query(`
    SELECT a.*, r.nombre as raza_nombre
    FROM animales a
    LEFT JOIN razas r ON a.raza_id = r.id
    WHERE a.id = ?
  `, [animalId]);
  
  if (animal.rows.length === 0) return null;
  
  const animalData = animal.rows[0];
  const tree = {
    ...animalData,
    generation: currentGen,
    padre: null,
    madre: null
  };
  
  if (animalData.padre_id) {
    tree.padre = await buildGenealogyTree(animalData.padre_id, generations, currentGen + 1);
  }
  
  if (animalData.madre_id) {
    tree.madre = await buildGenealogyTree(animalData.madre_id, generations, currentGen + 1);
  }
  
  return tree;
}

async function calculateInbreedingCoefficient(animal1Id, animal2Id) {
  // Implementación simplificada del coeficiente de consanguinidad
  const ancestors1 = await getAncestors(animal1Id, 4);
  const ancestors2 = await getAncestors(animal2Id, 4);
  
  let commonAncestors = 0;
  let totalComparisons = 0;
  
  for (const anc1 of ancestors1) {
    for (const anc2 of ancestors2) {
      totalComparisons++;
      if (anc1.id === anc2.id) {
        commonAncestors++;
      }
    }
  }
  
  return totalComparisons > 0 ? commonAncestors / totalComparisons : 0;
}

async function getAncestors(animalId, generations) {
  const ancestors = [];
  
  async function collectAncestors(id, gen) {
    if (gen <= 0) return;
    
    const animal = await query('SELECT * FROM animales WHERE id = ?', [id]);
    if (animal.rows.length === 0) return;
    
    const animalData = animal.rows[0];
    ancestors.push(animalData);
    
    if (animalData.padre_id) await collectAncestors(animalData.padre_id, gen - 1);
    if (animalData.madre_id) await collectAncestors(animalData.madre_id, gen - 1);
  }
  
  await collectAncestors(animalId, generations);
  return ancestors;
}

async function calculateGeneticIndices(animalId) {
  const animal = await query('SELECT * FROM animales WHERE id = ?', [animalId]);
  if (animal.rows.length === 0) throw new Error('Animal no encontrado');
  
  let fertilidad = 0;
  let habilidadMaterna = 0;
  let conversionAlimenticia = 0;
  let gananciaDiaria = 0;
  
  if (animal.rows[0].sexo === 'hembra') {
    // Calcular fertilidad basada en partos
    const partos = await query(`
      SELECT AVG(lechones_vivos) as promedio_lechones, COUNT(*) as total_partos
      FROM partos p
      JOIN gestaciones g ON p.gestacion_id = g.id
      JOIN servicios s ON g.servicio_id = s.id
      WHERE s.cerda_id = ?
    `, [animalId]);
    
    if (partos.rows[0].total_partos > 0) {
      fertilidad = Math.min(100, (partos.rows[0].promedio_lechones / 12) * 100);
    }
    
    // Calcular habilidad materna
    const destetes = await query(`
      SELECT AVG(lechones_destetados) as promedio_destetados
      FROM lactancias l
      JOIN partos p ON l.parto_id = p.id
      JOIN gestaciones g ON p.gestacion_id = g.id
      JOIN servicios s ON g.servicio_id = s.id
      WHERE s.cerda_id = ?
    `, [animalId]);
    
    if (destetes.rows[0].promedio_destetados) {
      habilidadMaterna = Math.min(100, (destetes.rows[0].promedio_destetados / 10) * 100);
    }
  }
  
  // Calcular conversión alimenticia y ganancia diaria
  const conversion = await query(`
    SELECT AVG(conversion_calculada) as conv_promedio, AVG(ganancia_diaria) as gdp_promedio
    FROM conversion_alimenticia
    WHERE animal_id = ?
  `, [animalId]);
  
  if (conversion.rows[0].conv_promedio) {
    conversionAlimenticia = Math.max(0, 100 - ((conversion.rows[0].conv_promedio - 2.5) * 20));
    gananciaDiaria = Math.min(100, (conversion.rows[0].gdp_promedio / 0.8) * 100);
  }
  
  const indiceSeleccion = (fertilidad * 0.25 + habilidadMaterna * 0.25 + conversionAlimenticia * 0.3 + gananciaDiaria * 0.2);
  
  // Guardar índices calculados
  await query(`
    INSERT OR REPLACE INTO indices_geneticos 
    (animal_id, fertilidad, habilidad_materna, conversion_alimenticia, ganancia_diaria, indice_seleccion)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [animalId, fertilidad, habilidadMaterna, conversionAlimenticia, gananciaDiaria, indiceSeleccion]);
  
  return {
    animal_id: animalId,
    fertilidad,
    habilidad_materna: habilidadMaterna,
    conversion_alimenticia: conversionAlimenticia,
    ganancia_diaria: gananciaDiaria,
    indice_seleccion: indiceSeleccion,
    fecha_calculo: new Date().toISOString().split('T')[0]
  };
}

function calculateMatingScore(verraco, consanguinity) {
  let score = 50; // Base score
  
  if (verraco.indice_seleccion) score += verraco.indice_seleccion * 0.4;
  if (verraco.fertilidad) score += verraco.fertilidad * 0.2;
  if (verraco.conversion_alimenticia) score += verraco.conversion_alimenticia * 0.2;
  
  // Penalizar por consanguinidad
  if (consanguinity > 0.125) score -= 50;
  else if (consanguinity > 0.0625) score -= 20;
  
  return Math.max(0, Math.min(100, score));
}

module.exports = router;