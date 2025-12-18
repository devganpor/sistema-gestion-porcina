const { query } = require('../config/database');

const createFinanceTables = async () => {
  try {
    // Tabla gastos
    await query(`
      CREATE TABLE IF NOT EXISTS gastos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATE NOT NULL,
        categoria TEXT NOT NULL,
        subcategoria TEXT,
        descripcion TEXT NOT NULL,
        monto REAL NOT NULL,
        proveedor TEXT,
        factura TEXT,
        animal_id INTEGER,
        ubicacion_id INTEGER,
        usuario_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id),
        FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);

    // Tabla ingresos
    await query(`
      CREATE TABLE IF NOT EXISTS ingresos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha DATE NOT NULL,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        monto REAL NOT NULL,
        comprador TEXT,
        factura TEXT,
        animal_id INTEGER,
        peso_venta REAL,
        precio_kg REAL,
        usuario_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);

    // Tabla costos por animal
    await query(`
      CREATE TABLE IF NOT EXISTS costos_animales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        fecha DATE NOT NULL,
        categoria TEXT NOT NULL,
        monto REAL NOT NULL,
        descripcion TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id)
      )
    `);

    console.log('✅ Tablas financieras creadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error creando tablas financieras:', error);
  }
};

createFinanceTables().then(() => {
  console.log('🎉 Migración financiera completada');
  process.exit(0);
});
