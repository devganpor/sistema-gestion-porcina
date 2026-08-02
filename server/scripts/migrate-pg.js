const { pool } = require('../config/database-pg');

async function createTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Creando tablas en PostgreSQL...');

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS razas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ubicaciones (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        tipo VARCHAR(50),
        capacidad_maxima INTEGER,
        descripcion TEXT,
        activa BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        ubicacion_actual_id INTEGER REFERENCES ubicaciones(id),
        peso_nacimiento DECIMAL(5,2),
        fecha_salida DATE,
        motivo_salida VARCHAR(255),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS medicamentos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        tipo VARCHAR(50),
        dias_retiro INTEGER DEFAULT 0,
        dosis_recomendada VARCHAR(100),
        stock_actual INTEGER DEFAULT 0,
        fecha_vencimiento DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS eventos_sanitarios (
        id SERIAL PRIMARY KEY,
        animal_id INTEGER REFERENCES animales(id),
        tipo_evento VARCHAR(100) NOT NULL,
        fecha DATE NOT NULL,
        descripcion TEXT,
        tratamiento TEXT,
        veterinario VARCHAR(100),
        costo DECIMAL(10,2),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS vacunaciones (
        id SERIAL PRIMARY KEY,
        animal_id INTEGER REFERENCES animales(id),
        vacuna VARCHAR(100) NOT NULL,
        fecha_aplicacion DATE NOT NULL,
        lote VARCHAR(50),
        proxima_dosis DATE,
        responsable VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tratamientos (
        id SERIAL PRIMARY KEY,
        evento_sanitario_id INTEGER REFERENCES eventos_sanitarios(id),
        medicamento_id INTEGER REFERENCES medicamentos(id),
        fecha_inicio DATE,
        fecha_fin DATE,
        dosis VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        subcategoria VARCHAR(100),
        descripcion TEXT NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        proveedor VARCHAR(100),
        factura VARCHAR(100),
        animal_id INTEGER REFERENCES animales(id),
        ubicacion_id INTEGER REFERENCES ubicaciones(id),
        usuario_id INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ingresos (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL,
        tipo VARCHAR(100) NOT NULL,
        descripcion TEXT NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        comprador VARCHAR(100),
        factura VARCHAR(100),
        animal_id INTEGER REFERENCES animales(id),
        peso_venta DECIMAL(6,2),
        precio_kg DECIMAL(8,2),
        usuario_id INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tablas creadas exitosamente');
    console.log('📊 Insertando datos iniciales...');

    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('Admin2025!', 12);

    await client.query(`
      INSERT INTO usuarios (email, password_hash, nombre, rol)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@granja.com', adminPassword, 'Administrador', 'administrador']);

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
        INSERT INTO ubicaciones (nombre, tipo, capacidad_maxima, descripcion)
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
