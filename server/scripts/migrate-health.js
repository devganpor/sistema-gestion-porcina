const { query } = require('../config/database');

const createHealthTables = async () => {
  try {
    // Tabla medicamentos
    await query(`
      CREATE TABLE IF NOT EXISTS medicamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        dias_retiro INTEGER DEFAULT 0,
        dosis_recomendada TEXT,
        stock_actual INTEGER DEFAULT 0,
        fecha_vencimiento DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla eventos sanitarios
    await query(`
      CREATE TABLE IF NOT EXISTS eventos_sanitarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        tipo_evento TEXT NOT NULL,
        fecha DATE NOT NULL,
        descripcion TEXT,
        tratamiento TEXT,
        veterinario TEXT,
        costo REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id)
      )
    `);

    // Tabla vacunaciones
    await query(`
      CREATE TABLE IF NOT EXISTS vacunaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        vacuna TEXT NOT NULL,
        fecha_aplicacion DATE NOT NULL,
        lote TEXT,
        proxima_dosis DATE,
        responsable TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id)
      )
    `);

    // Tabla tratamientos
    await query(`
      CREATE TABLE IF NOT EXISTS tratamientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evento_sanitario_id INTEGER,
        medicamento_id INTEGER,
        dosis TEXT,
        via_administracion TEXT,
        frecuencia_dias INTEGER,
        duracion_dias INTEGER,
        fecha_inicio DATE,
        fecha_fin DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evento_sanitario_id) REFERENCES eventos_sanitarios(id),
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)
      )
    `);

    console.log('✅ Tablas de sanidad creadas exitosamente');
    
    // Insertar medicamentos básicos
    await insertHealthData();
    
  } catch (error) {
    console.error('❌ Error creando tablas de sanidad:', error);
  }
};

const insertHealthData = async () => {
  try {
    const medicamentosBasicos = [
      ['Ivermectina', 'Antiparasitario', 14, '1ml/50kg', 100, '2025-12-31'],
      ['Penicilina', 'Antibiótico', 21, '2ml/10kg', 50, '2025-06-30'],
      ['Oxitetraciclina', 'Antibiótico', 28, '1ml/10kg', 75, '2025-08-15'],
      ['Hierro Dextrano', 'Suplemento', 0, '2ml IM', 200, '2026-01-31'],
      ['Vacuna Circovirus', 'Vacuna', 0, '2ml IM', 30, '2025-03-15']
    ];

    for (const med of medicamentosBasicos) {
      const exists = await query('SELECT id FROM medicamentos WHERE nombre = ?', [med[0]]);
      if (exists.rows.length === 0) {
        await query(
          'INSERT INTO medicamentos (nombre, tipo, dias_retiro, dosis_recomendada, stock_actual, fecha_vencimiento) VALUES (?, ?, ?, ?, ?, ?)',
          med
        );
      }
    }
    console.log('✅ Medicamentos básicos insertados');

  } catch (error) {
    console.error('❌ Error insertando datos de sanidad:', error);
  }
};

createHealthTables().then(() => {
  console.log('🎉 Migración de sanidad completada');
  process.exit(0);
});