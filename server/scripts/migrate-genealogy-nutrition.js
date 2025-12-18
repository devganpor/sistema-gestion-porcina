const { query } = require('../config/database');

const createGenealogyNutritionTables = async () => {
  try {
    // Tabla lactancias (faltante del módulo reproductivo)
    await query(`
      CREATE TABLE IF NOT EXISTS lactancias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parto_id INTEGER,
        fecha_inicio DATE NOT NULL,
        fecha_destete DATE,
        lechones_destetados INTEGER DEFAULT 0,
        peso_destete_promedio REAL,
        adopciones INTEGER DEFAULT 0,
        mortalidad_predestete INTEGER DEFAULT 0,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parto_id) REFERENCES partos(id)
      )
    `);

    // Tabla líneas genéticas
    await query(`
      CREATE TABLE IF NOT EXISTS lineas_geneticas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        caracteristicas TEXT,
        objetivos_seleccion TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla índices genéticos
    await query(`
      CREATE TABLE IF NOT EXISTS indices_geneticos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        fertilidad REAL DEFAULT 0,
        habilidad_materna REAL DEFAULT 0,
        conversion_alimenticia REAL DEFAULT 0,
        ganancia_diaria REAL DEFAULT 0,
        indice_seleccion REAL DEFAULT 0,
        fecha_calculo DATE DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id)
      )
    `);

    // Tabla dietas
    await query(`
      CREATE TABLE IF NOT EXISTS dietas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        categoria_animal TEXT NOT NULL,
        proteina_porcentaje REAL,
        energia_kcal REAL,
        fibra_porcentaje REAL,
        costo_por_kg REAL,
        descripcion TEXT,
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla ingredientes
    await query(`
      CREATE TABLE IF NOT EXISTS ingredientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        tipo TEXT,
        proteina_porcentaje REAL DEFAULT 0,
        energia_kcal REAL DEFAULT 0,
        fibra_porcentaje REAL DEFAULT 0,
        costo_por_kg REAL,
        stock_actual REAL DEFAULT 0,
        stock_minimo REAL DEFAULT 0,
        unidad_medida TEXT DEFAULT 'kg',
        proveedor TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla composición de dietas
    await query(`
      CREATE TABLE IF NOT EXISTS dieta_ingredientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dieta_id INTEGER,
        ingrediente_id INTEGER,
        porcentaje REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dieta_id) REFERENCES dietas(id),
        FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id)
      )
    `);

    // Tabla registro de alimentación
    await query(`
      CREATE TABLE IF NOT EXISTS registro_alimentacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ubicacion_id INTEGER,
        dieta_id INTEGER,
        cantidad_kg REAL NOT NULL,
        fecha_suministro DATE NOT NULL,
        hora_suministro TIME,
        responsable_id INTEGER,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
        FOREIGN KEY (dieta_id) REFERENCES dietas(id),
        FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
      )
    `);

    // Tabla conversión alimenticia
    await query(`
      CREATE TABLE IF NOT EXISTS conversion_alimenticia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        periodo_inicio DATE NOT NULL,
        periodo_fin DATE NOT NULL,
        peso_inicial REAL NOT NULL,
        peso_final REAL NOT NULL,
        alimento_consumido REAL NOT NULL,
        conversion_calculada REAL NOT NULL,
        ganancia_diaria REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id)
      )
    `);

    // Tabla movimientos de animales (historial completo)
    await query(`
      CREATE TABLE IF NOT EXISTS movimientos_animales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        ubicacion_origen_id INTEGER,
        ubicacion_destino_id INTEGER,
        fecha_movimiento DATE NOT NULL,
        motivo TEXT,
        responsable_id INTEGER,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id),
        FOREIGN KEY (ubicacion_origen_id) REFERENCES ubicaciones(id),
        FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones(id),
        FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
      )
    `);

    // Tabla equipamiento por instalación
    await query(`
      CREATE TABLE IF NOT EXISTS equipamiento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ubicacion_id INTEGER,
        nombre TEXT NOT NULL,
        tipo TEXT,
        descripcion TEXT,
        fecha_instalacion DATE,
        estado TEXT DEFAULT 'activo',
        costo REAL,
        vida_util_anos INTEGER,
        proximo_mantenimiento DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
      )
    `);

    // Tabla mantenimiento de instalaciones
    await query(`
      CREATE TABLE IF NOT EXISTS mantenimiento_instalaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ubicacion_id INTEGER,
        tipo_mantenimiento TEXT NOT NULL,
        fecha_programada DATE NOT NULL,
        fecha_realizada DATE,
        descripcion TEXT,
        costo REAL,
        responsable_id INTEGER,
        estado TEXT DEFAULT 'pendiente',
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
        FOREIGN KEY (responsable_id) REFERENCES usuarios(id)
      )
    `);

    console.log('✅ Tablas de genealogía y nutrición creadas');
    
    // Insertar datos iniciales
    await insertNutritionData();
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
  }
};

const insertNutritionData = async () => {
  try {
    // Ingredientes básicos
    const ingredientes = [
      { nombre: 'Maíz', tipo: 'cereal', proteina: 8.5, energia: 3350, fibra: 2.5, costo: 0.45 },
      { nombre: 'Soya', tipo: 'proteico', proteina: 44.0, energia: 2230, fibra: 7.0, costo: 0.85 },
      { nombre: 'Salvado de Trigo', tipo: 'fibra', proteina: 15.5, energia: 1950, fibra: 12.0, costo: 0.35 },
      { nombre: 'Harina de Pescado', tipo: 'proteico', proteina: 65.0, energia: 2850, fibra: 1.0, costo: 1.20 },
      { nombre: 'Carbonato de Calcio', tipo: 'mineral', proteina: 0, energia: 0, fibra: 0, costo: 0.15 }
    ];

    for (const ing of ingredientes) {
      const exists = await query('SELECT id FROM ingredientes WHERE nombre = ?', [ing.nombre]);
      if (exists.rows.length === 0) {
        await query(`
          INSERT INTO ingredientes (nombre, tipo, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg, stock_actual, stock_minimo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [ing.nombre, ing.tipo, ing.proteina, ing.energia, ing.fibra, ing.costo, 1000, 100]);
      }
    }

    // Dietas básicas por categoría
    const dietas = [
      { nombre: 'Iniciador Lechones', categoria: 'lechon', proteina: 20.0, energia: 3400, fibra: 3.5, costo: 0.75 },
      { nombre: 'Crecimiento', categoria: 'recria', proteina: 18.0, energia: 3300, fibra: 4.0, costo: 0.65 },
      { nombre: 'Desarrollo', categoria: 'desarrollo', proteina: 16.0, energia: 3250, fibra: 4.5, costo: 0.60 },
      { nombre: 'Engorde', categoria: 'engorde', proteina: 14.0, energia: 3200, fibra: 5.0, costo: 0.55 },
      { nombre: 'Gestación', categoria: 'reproductor', proteina: 14.5, energia: 3100, fibra: 6.0, costo: 0.58 },
      { nombre: 'Lactancia', categoria: 'reproductor', proteina: 18.5, energia: 3400, fibra: 4.0, costo: 0.70 }
    ];

    for (const dieta of dietas) {
      const exists = await query('SELECT id FROM dietas WHERE nombre = ?', [dieta.nombre]);
      if (exists.rows.length === 0) {
        await query(`
          INSERT INTO dietas (nombre, categoria_animal, proteina_porcentaje, energia_kcal, fibra_porcentaje, costo_por_kg)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [dieta.nombre, dieta.categoria, dieta.proteina, dieta.energia, dieta.fibra, dieta.costo]);
      }
    }

    // Líneas genéticas básicas
    const lineas = [
      { nombre: 'Línea Materna A', descripcion: 'Alta prolificidad y habilidad materna', caracteristicas: 'Fertilidad superior, buena producción de leche' },
      { nombre: 'Línea Paterna B', descripcion: 'Crecimiento rápido y conversión eficiente', caracteristicas: 'Ganancia diaria alta, buena conversión alimenticia' },
      { nombre: 'Línea Terminal C', descripcion: 'Calidad de carne y rendimiento en canal', caracteristicas: 'Magrez, rendimiento de canal superior' }
    ];

    for (const linea of lineas) {
      const exists = await query('SELECT id FROM lineas_geneticas WHERE nombre = ?', [linea.nombre]);
      if (exists.rows.length === 0) {
        await query(`
          INSERT INTO lineas_geneticas (nombre, descripcion, caracteristicas)
          VALUES (?, ?, ?)
        `, [linea.nombre, linea.descripcion, linea.caracteristicas]);
      }
    }

    console.log('✅ Datos iniciales de nutrición insertados');

  } catch (error) {
    console.error('❌ Error insertando datos de nutrición:', error);
  }
};

createGenealogyNutritionTables().then(() => {
  console.log('🎉 Migración de genealogía y nutrición completada');
  process.exit(0);
});
