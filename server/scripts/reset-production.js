const { pool } = require('../config/database-pg');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Limpiando base de datos...');

    await client.query(`
      TRUNCATE TABLE tratamientos, vacunaciones, eventos_sanitarios,
        ciclos_reproductivos, pesajes, ingresos, gastos,
        animales, medicamentos, ubicaciones, razas, usuarios
      RESTART IDENTITY CASCADE
    `);

    console.log('✅ Datos eliminados');
    console.log('👤 Creando usuario administrador...');

    const adminPassword = await bcrypt.hash('Admin2025!', 12);
    await client.query(`
      INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
      VALUES ($1, $2, $3, $4, true)
    `, ['admin@ganpor.com', adminPassword, 'Administrador', 'administrador']);

    // Datos de catálogo base (razas y ubicaciones)
    const razas = [
      ['Yorkshire', 'Raza prolífica y maternal'],
      ['Landrace', 'Excelente para producción de carne'],
      ['Duroc', 'Buena ganancia de peso'],
      ['Hampshire', 'Carne magra de calidad'],
      ['Pietrain', 'Alta proporción de carne magra']
    ];
    for (const [nombre, descripcion] of razas) {
      await client.query(
        `INSERT INTO razas (nombre, descripcion) VALUES ($1, $2)`,
        [nombre, descripcion]
      );
    }

    const ubicaciones = [
      ['Corral 1', 'corral', 20, 'Corral principal'],
      ['Corral 2', 'corral', 15, 'Corral secundario'],
      ['Galpón A', 'galpon', 50, 'Galpón para lechones'],
      ['Galpón B', 'galpon', 40, 'Galpón para engorde'],
      ['Maternidad', 'maternidad', 10, 'Área de partos'],
      ['Cuarentena', 'aislamiento', 5, 'Área de aislamiento']
    ];
    for (const [nombre, tipo, capacidad, descripcion] of ubicaciones) {
      await client.query(
        `INSERT INTO ubicaciones (nombre, tipo, capacidad_maxima, descripcion) VALUES ($1, $2, $3, $4)`,
        [nombre, tipo, capacidad, descripcion]
      );
    }

    console.log('🎉 Base de datos lista para producción');
    console.log('📧 Usuario: admin@ganpor.com');
    console.log('🔑 Contraseña: Admin2025!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch(() => process.exit(1));
