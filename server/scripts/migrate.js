const { query } = require('../config/database');

const createTables = async () => {
  try {
    // Tabla usuarios
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        rol TEXT DEFAULT 'tecnico',
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla razas
    await query(`
      CREATE TABLE IF NOT EXISTS razas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla ubicaciones
    await query(`
      CREATE TABLE IF NOT EXISTS ubicaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        capacidad_maxima INTEGER,
        ubicacion_padre_id INTEGER,
        estado TEXT DEFAULT 'activo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ubicacion_padre_id) REFERENCES ubicaciones(id)
      )
    `);

    // Tabla animales
    await query(`
      CREATE TABLE IF NOT EXISTS animales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identificador_unico TEXT UNIQUE NOT NULL,
        nombre TEXT,
        sexo TEXT NOT NULL,
        raza_id INTEGER,
        fecha_nacimiento DATE,
        peso_nacimiento REAL,
        madre_id INTEGER,
        padre_id INTEGER,
        categoria TEXT NOT NULL,
        estado TEXT DEFAULT 'activo',
        ubicacion_actual_id INTEGER,
        foto_url TEXT,
        fecha_ingreso DATE DEFAULT CURRENT_DATE,
        fecha_salida DATE,
        motivo_salida TEXT,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (raza_id) REFERENCES razas(id),
        FOREIGN KEY (madre_id) REFERENCES animales(id),
        FOREIGN KEY (padre_id) REFERENCES animales(id),
        FOREIGN KEY (ubicacion_actual_id) REFERENCES ubicaciones(id)
      )
    `);

    // Tabla pesajes
    await query(`
      CREATE TABLE IF NOT EXISTS pesajes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        peso REAL NOT NULL,
        fecha_pesaje DATE NOT NULL,
        observaciones TEXT,
        usuario_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);

    // Tabla eventos sanitarios
    await query(`
      CREATE TABLE IF NOT EXISTS eventos_sanitarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        tipo_evento TEXT NOT NULL,
        fecha DATE NOT NULL,
        descripcion TEXT NOT NULL,
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
        lote TEXT NOT NULL,
        proxima_dosis DATE,
        responsable TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id)
      )
    `);

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id)
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id)
      )
    `);

    // Tabla movimientos de ubicación
    await query(`
      CREATE TABLE IF NOT EXISTS movimientos_ubicacion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        animal_id INTEGER,
        ubicacion_origen_id INTEGER,
        ubicacion_destino_id INTEGER,
        fecha_movimiento DATE NOT NULL,
        motivo TEXT,
        usuario_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (animal_id) REFERENCES animales(id),
        FOREIGN KEY (ubicacion_origen_id) REFERENCES ubicaciones(id),
        FOREIGN KEY (ubicacion_destino_id) REFERENCES ubicaciones(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);

    // Tabla ciclos reproductivos
    await query(`
      CREATE TABLE IF NOT EXISTS ciclos_reproductivos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cerda_id INTEGER,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE,
        numero_ciclo INTEGER NOT NULL,
        estado TEXT DEFAULT 'activo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cerda_id) REFERENCES animales(id)
      )
    `);

    // Tabla celos
    await query(`
      CREATE TABLE IF NOT EXISTS celos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ciclo_id INTEGER,
        fecha_deteccion DATE NOT NULL,
        intensidad TEXT,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ciclo_id) REFERENCES ciclos_reproductivos(id)
      )
    `);

    // Tabla servicios
    await query(`
      CREATE TABLE IF NOT EXISTS servicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ciclo_id INTEGER,
        cerda_id INTEGER,
        verraco_id INTEGER,
        fecha DATE NOT NULL,
        hora TIME,
        tipo TEXT NOT NULL,
        numero_servicio INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ciclo_id) REFERENCES ciclos_reproductivos(id),
        FOREIGN KEY (cerda_id) REFERENCES animales(id),
        FOREIGN KEY (verraco_id) REFERENCES animales(id)
      )
    `);

    // Tabla gestaciones
    await query(`
      CREATE TABLE IF NOT EXISTS gestaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        servicio_id INTEGER,
        fecha_confirmacion DATE,
        metodo_confirmacion TEXT,
        resultado INTEGER,
        fecha_parto_esperado DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (servicio_id) REFERENCES servicios(id)
      )
    `);

    // Tabla partos
    await query(`
      CREATE TABLE IF NOT EXISTS partos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        gestacion_id INTEGER,
        fecha_real DATE NOT NULL,
        lechones_vivos INTEGER DEFAULT 0,
        lechones_muertos INTEGER DEFAULT 0,
        lechones_momificados INTEGER DEFAULT 0,
        peso_promedio REAL,
        duracion_minutos INTEGER,
        complicaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (gestacion_id) REFERENCES gestaciones(id)
      )
    `);

    console.log('✅ Tablas creadas exitosamente');
    
    // Insertar datos iniciales
    await insertInitialData();
    
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
  }
};

const insertInitialData = async () => {
  try {
    // Usuario administrador por defecto
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@granja.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const adminExists = await query('SELECT id FROM usuarios WHERE email = ?', [adminEmail]);
    if (adminExists.rows.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      await query(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        ['Administrador', adminEmail, hashedPassword, 'administrador']
      );
      console.log('✅ Usuario administrador creado');
      console.log(`📧 Email: ${adminEmail}`);
      if (!process.env.ADMIN_PASSWORD) {
        console.log('⚠️  Usando contraseña por defecto. Configura ADMIN_PASSWORD en .env');
      }
    }

    // Razas básicas
    const razasBasicas = ['Yorkshire', 'Landrace', 'Duroc', 'Hampshire', 'Pietrain'];
    for (const raza of razasBasicas) {
      const exists = await query('SELECT id FROM razas WHERE nombre = ?', [raza]);
      if (exists.rows.length === 0) {
        await query('INSERT INTO razas (nombre) VALUES (?)', [raza]);
      }
    }
    console.log('✅ Razas básicas insertadas');

    // Ubicaciones básicas
    const ubicaciones = [
      { nombre: 'Corral 1', tipo: 'corral', capacidad: 50 },
      { nombre: 'Corral 2', tipo: 'corral', capacidad: 50 },
      { nombre: 'Galpón A', tipo: 'galpon', capacidad: 100 },
      { nombre: 'Galpón B', tipo: 'galpon', capacidad: 100 },
      { nombre: 'Maternidad', tipo: 'maternidad', capacidad: 20 },
      { nombre: 'Cuarentena', tipo: 'cuarentena', capacidad: 10 }
    ];
    
    for (const ubicacion of ubicaciones) {
      const exists = await query('SELECT id FROM ubicaciones WHERE nombre = ?', [ubicacion.nombre]);
      if (exists.rows.length === 0) {
        await query(
          'INSERT INTO ubicaciones (nombre, tipo, capacidad_maxima) VALUES (?, ?, ?)',
          [ubicacion.nombre, ubicacion.tipo, ubicacion.capacidad]
        );
      }
    }
    console.log('✅ Ubicaciones básicas creadas');

  } catch (error) {
    console.error('❌ Error insertando datos iniciales:', error);
  }
};

createTables().then(() => {
  console.log('🎉 Migración completada');
  process.exit(0);
});