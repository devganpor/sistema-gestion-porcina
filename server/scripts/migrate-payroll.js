const { query } = require('../config/database-auto');

const migrate = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS nomina (
        id SERIAL PRIMARY KEY,
        empleado VARCHAR(150) NOT NULL,
        cargo VARCHAR(100) NOT NULL,
        periodo_inicio DATE NOT NULL,
        periodo_fin DATE NOT NULL,
        salario_base NUMERIC(12,2) NOT NULL DEFAULT 0,
        bonificaciones NUMERIC(12,2) NOT NULL DEFAULT 0,
        deducciones NUMERIC(12,2) NOT NULL DEFAULT 0,
        total_pago NUMERIC(12,2) NOT NULL,
        animal_id INTEGER REFERENCES animales(id) ON DELETE SET NULL,
        observaciones TEXT,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla nomina creada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración de nómina:', error);
    process.exit(1);
  }
};

migrate();
