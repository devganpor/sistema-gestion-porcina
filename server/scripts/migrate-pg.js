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
        nombre VARCHAR(100) UNIQUE NOT NULL,
        descripcion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Limpiar duplicados y agregar UNIQUE constraint a razas.nombre
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'razas_nombre_key' AND conrelid = 'razas'::regclass
        ) THEN
          DELETE FROM razas r1 USING razas r2
          WHERE r1.id > r2.id AND LOWER(r1.nombre) = LOWER(r2.nombre);
          ALTER TABLE razas ADD CONSTRAINT razas_nombre_key UNIQUE (nombre);
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ubicaciones (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        tipo VARCHAR(50),
        capacidad_maxima INTEGER,
        descripcion TEXT,
        activa BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Limpiar duplicados y agregar UNIQUE constraint a ubicaciones.nombre
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'ubicaciones_nombre_key' AND conrelid = 'ubicaciones'::regclass
        ) THEN
          DELETE FROM ubicaciones u1 USING ubicaciones u2
          WHERE u1.id > u2.id AND LOWER(u1.nombre) = LOWER(u2.nombre);
          ALTER TABLE ubicaciones ADD CONSTRAINT ubicaciones_nombre_key UNIQUE (nombre);
        END IF;
      END $$;
    `);

    // Migrar columna 'capacidad' -> 'capacidad_maxima' si existe la versión antigua
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='ubicaciones' AND column_name='capacidad'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name='ubicaciones' AND column_name='capacidad_maxima'
        ) THEN
          ALTER TABLE ubicaciones RENAME COLUMN capacidad TO capacidad_maxima;
        END IF;
      END $$;
    `);
    // Agregar columna 'tipo' si no existe
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ubicaciones' AND column_name='tipo')
        THEN ALTER TABLE ubicaciones ADD COLUMN tipo VARCHAR(50); END IF;
      END $$;
    `);
    // Agregar columna 'etiqueta' para identificacion personalizada
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ubicaciones' AND column_name='etiqueta')
        THEN ALTER TABLE ubicaciones ADD COLUMN etiqueta VARCHAR(100); END IF;
      END $$;
    `);
    // Agregar columna 'secuencia' para orden
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ubicaciones' AND column_name='secuencia')
        THEN ALTER TABLE ubicaciones ADD COLUMN secuencia INTEGER; END IF;
      END $$;
    `);
    // Reasignar secuencias correctamente: independiente por tipo, ordenado por id de creacion
    await client.query(`
      UPDATE ubicaciones u
      SET secuencia = sub.rn
      FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY tipo
                 ORDER BY id
               ) as rn
        FROM ubicaciones
      ) sub
      WHERE u.id = sub.id;
    `);
    // Renombrar al formato estandar todas las ubicaciones
    await client.query(`
      UPDATE ubicaciones
      SET nombre = (
        CASE tipo
          WHEN 'granja'      THEN 'Granja '
          WHEN 'galpon'      THEN 'Galpon '
          WHEN 'corral'      THEN 'Corral '
          WHEN 'maternidad'  THEN 'Maternidad '
          WHEN 'aislamiento' THEN 'Aislamiento '
          ELSE initcap(tipo) || ' '
        END || lpad(secuencia::text, 4, '0')
      );
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

    // Agregar fecha_celo si no existe (migracion)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ciclos_reproductivos' AND column_name='fecha_celo')
        THEN ALTER TABLE ciclos_reproductivos ADD COLUMN fecha_celo DATE; END IF;
      END $$;
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

    // === MIGRACIONES DE COLUMNAS (ejecutar antes de índices) ===
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ubicaciones' AND column_name='capacidad')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ubicaciones' AND column_name='capacidad_maxima')
        THEN ALTER TABLE ubicaciones RENAME COLUMN capacidad TO capacidad_maxima; END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='animales' AND column_name='ubicacion_id')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='animales' AND column_name='ubicacion_actual_id')
        THEN ALTER TABLE animales RENAME COLUMN ubicacion_id TO ubicacion_actual_id; END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_sanitarios' AND column_name='fecha_evento')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_sanitarios' AND column_name='fecha')
        THEN ALTER TABLE eventos_sanitarios RENAME COLUMN fecha_evento TO fecha; END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='animales' AND column_name='fecha_salida')
        THEN ALTER TABLE animales ADD COLUMN fecha_salida DATE; END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='animales' AND column_name='motivo_salida')
        THEN ALTER TABLE animales ADD COLUMN motivo_salida VARCHAR(255); END IF;
      END $$;
    `);
    // gastos: fecha_gasto -> fecha
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='fecha_gasto')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='fecha')
        THEN ALTER TABLE gastos RENAME COLUMN fecha_gasto TO fecha; END IF;
      END $$;
    `);
    // gastos: categoria_gasto -> categoria
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='categoria_gasto')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='categoria')
        THEN ALTER TABLE gastos RENAME COLUMN categoria_gasto TO categoria; END IF;
      END $$;
    `);
    // ingresos: fecha_ingreso -> fecha
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='fecha_ingreso')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='fecha')
        THEN ALTER TABLE ingresos RENAME COLUMN fecha_ingreso TO fecha; END IF;
      END $$;
    `);
    // ingresos: tipo_ingreso -> tipo
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='tipo_ingreso')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='tipo')
        THEN ALTER TABLE ingresos RENAME COLUMN tipo_ingreso TO tipo; END IF;
      END $$;
    `);
    // pesajes: fecha -> fecha_pesaje
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pesajes' AND column_name='fecha')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pesajes' AND column_name='fecha_pesaje')
        THEN ALTER TABLE pesajes RENAME COLUMN fecha TO fecha_pesaje; END IF;
      END $$;
    `);
    // pesajes: add usuario_id if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pesajes' AND column_name='usuario_id')
        THEN ALTER TABLE pesajes ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id); END IF;
      END $$;
    `);
    // ingresos: add missing columns
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='animal_id') THEN ALTER TABLE ingresos ADD COLUMN animal_id INTEGER REFERENCES animales(id); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='peso_venta') THEN ALTER TABLE ingresos ADD COLUMN peso_venta DECIMAL(6,2); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='precio_kg') THEN ALTER TABLE ingresos ADD COLUMN precio_kg DECIMAL(8,2); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='comprador') THEN ALTER TABLE ingresos ADD COLUMN comprador VARCHAR(100); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='factura') THEN ALTER TABLE ingresos ADD COLUMN factura VARCHAR(100); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='usuario_id') THEN ALTER TABLE ingresos ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id); END IF; END $$;`);
    // gastos: add missing columns
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='animal_id') THEN ALTER TABLE gastos ADD COLUMN animal_id INTEGER REFERENCES animales(id); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='ubicacion_id') THEN ALTER TABLE gastos ADD COLUMN ubicacion_id INTEGER REFERENCES ubicaciones(id); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='subcategoria') THEN ALTER TABLE gastos ADD COLUMN subcategoria VARCHAR(100); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='proveedor') THEN ALTER TABLE gastos ADD COLUMN proveedor VARCHAR(100); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='factura') THEN ALTER TABLE gastos ADD COLUMN factura VARCHAR(100); END IF; END $$;`);
    await client.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='usuario_id') THEN ALTER TABLE gastos ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id); END IF; END $$;`);
    console.log('✅ Migraciones de columnas completadas');

    // === ÍNDICES ===
    await client.query(`CREATE INDEX IF NOT EXISTS idx_animales_estado ON animales(estado)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_animales_categoria ON animales(categoria)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_animales_sexo ON animales(sexo)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_animales_ubicacion ON animales(ubicacion_actual_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pesajes_animal ON pesajes(animal_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pesajes_fecha ON pesajes(fecha_pesaje)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_eventos_animal ON eventos_sanitarios(animal_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vacunaciones_animal ON vacunaciones(animal_id)`);

    // Índices en gastos e ingresos usando la columna correcta según lo que exista
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='fecha') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_gastos_fecha') THEN
            CREATE INDEX idx_gastos_fecha ON gastos(fecha);
          END IF;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gastos' AND column_name='fecha_gasto') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_gastos_fecha') THEN
            CREATE INDEX idx_gastos_fecha ON gastos(fecha_gasto);
          END IF;
        END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='fecha') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ingresos_fecha') THEN
            CREATE INDEX idx_ingresos_fecha ON ingresos(fecha);
          END IF;
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingresos' AND column_name='fecha_ingreso') THEN
          IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_ingresos_fecha') THEN
            CREATE INDEX idx_ingresos_fecha ON ingresos(fecha_ingreso);
          END IF;
        END IF;
      END $$;
    `);
    console.log('✅ Índices creados exitosamente');
    console.log('📊 Insertando datos iniciales...');

    // Solo insertar el usuario admin — razas y ubicaciones las crea el usuario desde la app
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('Admin2025!', 12);

    await client.query(`
      INSERT INTO usuarios (email, password_hash, nombre, rol)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@ganpor.com', adminPassword, 'Administrador', 'administrador']);

    // === TABLAS DE NUTRICIÓN ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS dietas (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        categoria_animal VARCHAR(50),
        proteina_porcentaje DECIMAL(5,2),
        energia_kcal DECIMAL(8,2),
        fibra_porcentaje DECIMAL(5,2),
        costo_por_kg DECIMAL(10,2) DEFAULT 0,
        descripcion TEXT,
        activa BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        tipo VARCHAR(50),
        proteina_porcentaje DECIMAL(5,2),
        energia_kcal DECIMAL(8,2),
        fibra_porcentaje DECIMAL(5,2),
        costo_por_kg DECIMAL(10,2) DEFAULT 0,
        stock_actual DECIMAL(10,2) DEFAULT 0,
        stock_minimo DECIMAL(10,2) DEFAULT 0,
        unidad_medida VARCHAR(20) DEFAULT 'kg',
        proveedor VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS dieta_ingredientes (
        id SERIAL PRIMARY KEY,
        dieta_id INTEGER REFERENCES dietas(id) ON DELETE CASCADE,
        ingrediente_id INTEGER REFERENCES ingredientes(id),
        porcentaje DECIMAL(5,2) NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS registro_alimentacion (
        id SERIAL PRIMARY KEY,
        ubicacion_id INTEGER REFERENCES ubicaciones(id),
        dieta_id INTEGER REFERENCES dietas(id),
        cantidad_kg DECIMAL(8,2) NOT NULL,
        fecha_suministro DATE NOT NULL,
        hora_suministro TIME,
        responsable_id INTEGER REFERENCES usuarios(id),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversion_alimenticia (
        id SERIAL PRIMARY KEY,
        animal_id INTEGER REFERENCES animales(id),
        periodo_inicio DATE,
        periodo_fin DATE,
        peso_inicial DECIMAL(6,2),
        peso_final DECIMAL(6,2),
        alimento_consumido DECIMAL(8,2),
        conversion_calculada DECIMAL(6,3),
        ganancia_diaria DECIMAL(6,3),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // === PLANES DE ALIMENTACIÓN ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS planes_alimentacion (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT,
        total_animales INTEGER NOT NULL DEFAULT 1,
        kg_por_saco DECIMAL(6,2) NOT NULL DEFAULT 40,
        fecha_inicio DATE NOT NULL,
        activo BOOLEAN DEFAULT true,
        usuario_id INTEGER REFERENCES usuarios(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS plan_etapas (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER REFERENCES planes_alimentacion(id) ON DELETE CASCADE,
        semana INTEGER NOT NULL,
        alimento VARCHAR(100),
        dieta_id INTEGER REFERENCES dietas(id) ON DELETE SET NULL,
        cad_kg_animal DECIMAL(6,3) NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL
      )
    `);
    // Agregar dieta_id a plan_etapas si no existe
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plan_etapas' AND column_name='dieta_id')
        THEN ALTER TABLE plan_etapas ADD COLUMN dieta_id INTEGER REFERENCES dietas(id) ON DELETE SET NULL; END IF;
      END $$;
    `);
    // Migrar dias_inicio/dias_fin -> fecha_inicio/fecha_fin si existe la version antigua
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plan_etapas' AND column_name='dias_inicio')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plan_etapas' AND column_name='fecha_inicio')
        THEN
          ALTER TABLE plan_etapas ADD COLUMN fecha_inicio DATE;
          ALTER TABLE plan_etapas ADD COLUMN fecha_fin DATE;
          UPDATE plan_etapas pe SET
            fecha_inicio = pa.fecha_inicio + (pe.dias_inicio - 1) * INTERVAL '1 day',
            fecha_fin    = pa.fecha_inicio + (pe.dias_fin   - 1) * INTERVAL '1 day'
          FROM planes_alimentacion pa WHERE pe.plan_id = pa.id;
          ALTER TABLE plan_etapas ALTER COLUMN fecha_inicio SET NOT NULL;
          ALTER TABLE plan_etapas ALTER COLUMN fecha_fin    SET NOT NULL;
          ALTER TABLE plan_etapas DROP COLUMN dias_inicio;
          ALTER TABLE plan_etapas DROP COLUMN dias_fin;
        END IF;
      END $$;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_plan_etapas_plan ON plan_etapas(plan_id)`);

    // === TRAZABILIDAD DE ANIMALES ===
    // Valor de compra en animales
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='animales' AND column_name='valor_compra')
        THEN ALTER TABLE animales ADD COLUMN valor_compra DECIMAL(12,2) DEFAULT 0; END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='animales' AND column_name='fecha_ingreso')
        THEN ALTER TABLE animales ADD COLUMN fecha_ingreso DATE; END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='animales' AND column_name='origen')
        THEN ALTER TABLE animales ADD COLUMN origen VARCHAR(50) DEFAULT 'nacimiento'; END IF;
      END $$;
    `);

    // Historial de movimientos de ubicación
    await client.query(`
      CREATE TABLE IF NOT EXISTS movimientos_ubicacion (
        id SERIAL PRIMARY KEY,
        animal_id INTEGER REFERENCES animales(id) ON DELETE CASCADE,
        ubicacion_origen_id INTEGER REFERENCES ubicaciones(id),
        ubicacion_destino_id INTEGER REFERENCES ubicaciones(id),
        fecha DATE NOT NULL,
        motivo VARCHAR(255),
        costo_acumulado_momento DECIMAL(12,2) DEFAULT 0,
        peso_momento DECIMAL(6,2),
        usuario_id INTEGER REFERENCES usuarios(id),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_movimientos_animal ON movimientos_ubicacion(animal_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_ubicacion(fecha)`);

    // Distribución de alimentación por animal
    await client.query(`
      CREATE TABLE IF NOT EXISTS alimentacion_animal (
        id SERIAL PRIMARY KEY,
        registro_alimentacion_id INTEGER REFERENCES registro_alimentacion(id) ON DELETE CASCADE,
        animal_id INTEGER REFERENCES animales(id) ON DELETE CASCADE,
        ubicacion_id INTEGER REFERENCES ubicaciones(id),
        fecha DATE NOT NULL,
        kg_asignados DECIMAL(8,4) NOT NULL,
        costo_asignado DECIMAL(10,4) NOT NULL DEFAULT 0,
        animales_en_ubicacion INTEGER NOT NULL DEFAULT 1,
        dieta_nombre VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alimentacion_animal ON alimentacion_animal(animal_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alimentacion_fecha ON alimentacion_animal(fecha)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_alimentacion_registro ON alimentacion_animal(registro_alimentacion_id)`);

    // === ÍNDICES GENÉTICOS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS indices_geneticos (
        id SERIAL PRIMARY KEY,
        animal_id INTEGER REFERENCES animales(id) ON DELETE CASCADE,
        fertilidad DECIMAL(5,2) DEFAULT 0,
        habilidad_materna DECIMAL(5,2) DEFAULT 0,
        conversion_alimenticia DECIMAL(5,2) DEFAULT 0,
        ganancia_diaria DECIMAL(5,2) DEFAULT 0,
        indice_seleccion DECIMAL(5,2) DEFAULT 0,
        fecha_calculo DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_indices_animal ON indices_geneticos(animal_id)`);

    // === TABLA DE AUDIT LOGS EN BASE DE DATOS ===
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
        usuario_email VARCHAR(255),
        usuario_nombre VARCHAR(255),
        accion VARCHAR(50) NOT NULL,
        modulo VARCHAR(100),
        descripcion TEXT,
        entidad VARCHAR(100),
        entidad_id VARCHAR(100),
        ip VARCHAR(50),
        user_agent TEXT,
        metodo VARCHAR(10),
        ruta VARCHAR(255),
        datos_anteriores JSONB,
        datos_nuevos JSONB,
        exitoso BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_logs(usuario_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_accion ON audit_logs(accion)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_modulo ON audit_logs(modulo)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_fecha ON audit_logs(created_at DESC)`);

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
