const express = require('express');
const { query } = require('../config/database-auto');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Árbol genealógico de un animal
router.get('/tree/:animalId', authenticateToken, async (req, res) => {
  try {
    const tree = await buildGenealogyTree(req.params.animalId, parseInt(req.query.generations) || 3);
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo árbol genealógico' });
  }
});

// Consanguinidad entre dos animales
router.get('/consanguinity/:animal1/:animal2', authenticateToken, async (req, res) => {
  try {
    const coefficient = await calculateInbreedingCoefficient(req.params.animal1, req.params.animal2);
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

// Índices genéticos de un animal (calculados desde datos reales)
router.get('/indices/:animalId', authenticateToken, async (req, res) => {
  try {
    const indices = await calculateGeneticIndices(req.params.animalId);
    res.json(indices);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo índices genéticos' });
  }
});

// Recalcular índices genéticos
router.post('/indices/:animalId/calculate', authenticateToken, async (req, res) => {
  try {
    const indices = await calculateGeneticIndices(req.params.animalId);
    res.json(indices);
  } catch (error) {
    res.status(500).json({ error: 'Error calculando índices' });
  }
});

// Recomendador de apareamientos
router.get('/mating-recommendations/:cerdaId', authenticateToken, async (req, res) => {
  try {
    const verracos = await query(`
      SELECT id, identificador_unico, nombre, categoria
      FROM animales
      WHERE sexo = 'macho' AND categoria = 'reproductor' AND estado = 'activo'
      ORDER BY identificador_unico
    `);

    const recommendations = [];
    for (const verraco of verracos.rows) {
      const consanguinity = await calculateInbreedingCoefficient(req.params.cerdaId, verraco.id);
      const score = consanguinity > 0.125 ? 0 : 80 - (consanguinity * 400);
      recommendations.push({
        verraco,
        consanguinity: (consanguinity * 100).toFixed(2),
        score: score.toFixed(2),
        recommendation: consanguinity > 0.125 ? 'No recomendado' : score > 70 ? 'Excelente' : score > 50 ? 'Bueno' : 'Regular'
      });
    }

    recommendations.sort((a, b) => b.score - a.score);
    res.json(recommendations.slice(0, 10));
  } catch (error) {
    res.status(500).json({ error: 'Error generando recomendaciones' });
  }
});

// Ranking de reproductores por ganancia diaria y partos
router.get('/ranking', authenticateToken, async (req, res) => {
  try {
    const { sexo = 'macho', limit = 20 } = req.query;

    const ranking = await query(`
      SELECT a.id, a.identificador_unico, a.nombre, a.sexo, a.categoria,
        COALESCE(
          (SELECT ROUND(AVG(ganancia_diaria)::numeric, 3)
           FROM conversion_alimenticia WHERE animal_id = a.id), 0
        ) as ganancia_diaria_promedio,
        COALESCE(
          (SELECT COUNT(*) FROM ciclos_reproductivos
           WHERE cerda_id = a.id AND fecha_parto_real IS NOT NULL), 0
        ) as total_partos,
        COALESCE(
          (SELECT ROUND(AVG(lechones_vivos)::numeric, 1)
           FROM ciclos_reproductivos
           WHERE cerda_id = a.id AND lechones_vivos IS NOT NULL), 0
        ) as promedio_lechones
      FROM animales a
      WHERE a.sexo = $1 AND a.categoria = 'reproductor' AND a.estado = 'activo'
      ORDER BY ganancia_diaria_promedio DESC
      LIMIT $2
    `, [sexo, parseInt(limit)]);

    res.json(ranking.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo ranking' });
  }
});

// ── Funciones auxiliares ──────────────────────────────────────────────────────

async function buildGenealogyTree(animalId, generations, currentGen = 0) {
  if (currentGen >= generations) return null;

  const result = await query(`
    SELECT a.*, r.nombre as raza_nombre
    FROM animales a
    LEFT JOIN razas r ON a.raza_id = r.id
    WHERE a.id = $1
  `, [animalId]);

  if (result.rows.length === 0) return null;

  const animal = result.rows[0];
  const tree = { ...animal, generation: currentGen, padre: null, madre: null };

  const [padre, madre] = await Promise.all([
    animal.padre_id ? buildGenealogyTree(animal.padre_id, generations, currentGen + 1) : null,
    animal.madre_id ? buildGenealogyTree(animal.madre_id, generations, currentGen + 1) : null
  ]);

  tree.padre = padre;
  tree.madre = madre;
  return tree;
}

async function getAncestors(animalId, generations) {
  const ancestors = [];
  const visited = new Set();

  async function collect(id, gen) {
    if (gen <= 0 || visited.has(id)) return;
    visited.add(id);

    const result = await query('SELECT id, padre_id, madre_id FROM animales WHERE id = $1', [id]);
    if (result.rows.length === 0) return;

    const a = result.rows[0];
    ancestors.push(a);

    await Promise.all([
      a.padre_id ? collect(a.padre_id, gen - 1) : null,
      a.madre_id ? collect(a.madre_id, gen - 1) : null
    ]);
  }

  await collect(animalId, generations);
  return ancestors;
}

async function calculateInbreedingCoefficient(animal1Id, animal2Id) {
  const [ancestors1, ancestors2] = await Promise.all([
    getAncestors(animal1Id, 4),
    getAncestors(animal2Id, 4)
  ]);

  const ids1 = new Set(ancestors1.map(a => a.id));
  const common = ancestors2.filter(a => ids1.has(a.id)).length;
  const total = ancestors1.length + ancestors2.length;
  return total > 0 ? common / total : 0;
}

async function calculateGeneticIndices(animalId) {
  const animalRes = await query('SELECT * FROM animales WHERE id = $1', [animalId]);
  if (animalRes.rows.length === 0) throw new Error('Animal no encontrado');

  const animal = animalRes.rows[0];
  let fertilidad = 0, habilidadMaterna = 0, conversionAlimenticia = 0, gananciaDiaria = 0;

  if (animal.sexo === 'hembra') {
    const partos = await query(`
      SELECT AVG(lechones_vivos) as promedio_lechones, COUNT(*) as total_partos
      FROM ciclos_reproductivos
      WHERE cerda_id = $1 AND lechones_vivos IS NOT NULL
    `, [animalId]);

    if (Number(partos.rows[0].total_partos) > 0) {
      fertilidad = Math.min(100, (parseFloat(partos.rows[0].promedio_lechones) / 12) * 100);
      habilidadMaterna = fertilidad * 0.9; // aproximación sin tabla lactancias
    }
  }

  const conversion = await query(`
    SELECT AVG(conversion_calculada) as conv_promedio, AVG(ganancia_diaria) as gdp_promedio
    FROM conversion_alimenticia
    WHERE animal_id = $1
  `, [animalId]);

  if (conversion.rows[0].conv_promedio) {
    conversionAlimenticia = Math.max(0, 100 - ((parseFloat(conversion.rows[0].conv_promedio) - 2.5) * 20));
    gananciaDiaria = Math.min(100, (parseFloat(conversion.rows[0].gdp_promedio) / 0.8) * 100);
  }

  const indiceSeleccion = fertilidad * 0.25 + habilidadMaterna * 0.25 + conversionAlimenticia * 0.3 + gananciaDiaria * 0.2;

  return {
    animal_id: animalId,
    fertilidad: Math.round(fertilidad * 10) / 10,
    habilidad_materna: Math.round(habilidadMaterna * 10) / 10,
    conversion_alimenticia: Math.round(conversionAlimenticia * 10) / 10,
    ganancia_diaria: Math.round(gananciaDiaria * 10) / 10,
    indice_seleccion: Math.round(indiceSeleccion * 10) / 10,
    fecha_calculo: new Date().toISOString().split('T')[0]
  };
}

module.exports = router;
