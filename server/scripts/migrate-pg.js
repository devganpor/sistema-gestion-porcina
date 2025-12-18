const { pool } = require('../config/database-pg');

async function createTables() {
  console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL);
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando tablas en PostgreSQL...');

    // Usuarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nombre VARCHAR(255),
        rol VARCHAR(50) DEFAULT 'usuario',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Razas
    await client.query(`
      CREATE TABLE IF NOT EXISTS razas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ubicaciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS ubicaciones (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        tipo VARCHAR(50),
        capacidad INTEGER,
        descripcion TEXT,
        activa BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Animales
    await client.query(`
      CREATE TABLE IF NOT EXISTS animales (
        id SERIAL PRIMARY KEY,
        identificador_unico VARCHAR(50) UNIQUE NOT NULL,
        nombre VARCHAR(100),
        sexo VARCHAR(10) NOT NULL,
        fecha_nacimiento DATE,
        raza_id INTEGER REFERENCES razas(id),
        padre_id INTEGER REFERENCES animales(id),
        madre_id INTEGER REFERENCES animales(id),
        categoria VARCHAR(50),
        estado VARCHAR(50) DEFAULT 'activo',
        ubicacion_id INTEGER REFERENCES ubicaciones(id),
        peso_nacimiento DECIMAL(5,2),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Pesajes
    await client.query(`
      CREATE TABLE IF NOT EXISTS pesajes (
        id SERIAL PRIMARY KEY,
        animal_id INTEGER REFERENCES animales(id),
        peso DECIMAL(6,2) NOT NULL,
        fecha_pesaje DATE NOT NULL,
        edad_dias INTEGER,
        ganancia_diaria DECIMAL(6,2),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ciclos reproductivos
    await client.query(`
      CREATE TABLE IF NOT EXISTS ciclos_reproductivos (
        id SERIAL PRIMARY KEY,
        cerda_id INTEGER REFERENCES animales(id),
        numero_ciclo INTEGER,
        fecha_inicio DATE,
        estado VARCHAR(50) DEFAULT 'abierto',
        fecha_celo DATE,
        fecha_servicio DATE,
        verraco_id INTEGER REFERENCES animales(id),
        fecha_parto_esperado DATE,
        fecha_parto_real DATE,
        lechones_vivos INTEGER,
        lechones_muertos INTEGER,
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Eventos sanitarios
    await client.query(`
      CREATE TABLE IF NOT EXISTS eventos_sanitarios (
        id SERIAL PRIMARY KEY,
        animal_id INTEGER REFERENCES animales(id),
        tipo_evento VARCHAR(100) NOT NULL,
        fecha_evento DATE NOT NULL,
        descripcion TEXT,
        medicamento VARCHAR(100),
        dosis VARCHAR(50),
        veterinario VARCHAR(100),
        costo DECIMAL(10,2),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Gastos
    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        concepto VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        monto DECIMAL(10,2) NOT NULL,
        fecha_gasto DATE NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ingresos
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingresos (
        id SERIAL PRIMARY KEY,
        concepto VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        monto DECIMAL(10,2) NOT NULL,
        fecha_ingreso DATE NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tablas creadas exitosamente');

    // Insertar datos iniciales
    console.log('📊 Insertando datos iniciales...');

    // Usuario admin
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await client.query(`
      INSERT INTO usuarios (email, password_hash, nombre, rol) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO NOTHING
    `, ['admin@granja.com', adminPassword, 'Administrador', 'admin']);

    // Razas
    const razas = [
      ['Yorkshire', 'Raza prolífica y maternal'],
      ['Landrace', 'Excelente para producción de carne'],
      ['Duroc', 'Buena ganancia de peso'],
      ['Hampshire', 'Carne magra de calidad'],
      ['Pietrain', 'Alta proporción de carne magra']
    ];

    for (const [nombre, descripcion] of razas) {
      await client.query(`
        INSERT INTO razas (nombre, descripcion) 
        VALUES ($1, $2) 
        ON CONFLICT DO NOTHING
      `, [nombre, descripcion]);
    }

    // Ubicaciones
    const ubicaciones = [
      ['Corral 1', 'corral', 20, 'Corral principal para reproductores'],
      ['Corral 2', 'corral', 15, 'Corral secundario'],
      ['Galpón A', 'galpon', 50, 'Galpón para lechones'],
      ['Galpón B', 'galpon', 40, 'Galpón para engorde'],
      ['Maternidad', 'maternidad', 10, 'Área de partos'],
      ['Cuarentena', 'aislamiento', 5, 'Área de aislamiento']
    ];

    for (const [nombre, tipo, capacidad, descripcion] of ubicaciones) {
      await client.query(`
        INSERT INTO ubicaciones (nombre, tipo, capacidad, descripcion) 
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT DO NOTHING
      `, [nombre, tipo, capacidad, descripcion]);
    }

    console.log('✅ Datos iniciales insertados');
    console.log('🎉 Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('✅ Migración PostgreSQL completada');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

module.exports = { createTables };
