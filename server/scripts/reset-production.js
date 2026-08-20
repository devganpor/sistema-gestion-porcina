const { pool } = require('../config/database-pg');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Limpiando todos los datos...');

    await client.query(`
      TRUNCATE TABLE
        audit_logs,
        tratamientos,
        vacunaciones,
        eventos_sanitarios,
        ciclos_reproductivos,
        pesajes,
        ingresos,
        gastos,
        alimentacion_animal,
        movimientos_ubicacion,
        indices_geneticos,
        plan_etapas,
        planes_alimentacion,
        conversion_alimenticia,
        registro_alimentacion,
        dieta_ingredientes,
        dietas,
        ingredientes,
        medicamento_lotes,
        medicamentos,
        animales,
        ubicaciones,
        razas,
        usuarios
      RESTART IDENTITY CASCADE
    `);

    console.log('✅ Datos eliminados');
    console.log('👤 Creando usuario administrador...');

    const adminPassword = await bcrypt.hash('Admin2025!', 12);
    await client.query(`
      INSERT INTO usuarios (email, password_hash, nombre, rol, activo)
      VALUES ($1, $2, $3, $4, true)
    `, ['admin@ganpor.com', adminPassword, 'Administrador', 'administrador']);

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
