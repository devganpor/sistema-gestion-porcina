const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

const resetDatabase = async () => {
  try {
    console.log('🔄 Reseteando base de datos...');
    
    // Eliminar todas las tablas
    const tables = [
      'partos', 'gestaciones', 'servicios', 'celos', 'ciclos_reproductivos',
      'pesajes', 'eventos_sanitarios', 'vacunaciones', 'gastos', 'ingresos',
      'movimientos_ubicacion', 'animales', 'ubicaciones', 'razas', 'usuarios'
    ];
    
    for (const table of tables) {
      try {
        await query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✅ Tabla ${table} eliminada`);
      } catch (error) {
        console.log(`⚠️  Tabla ${table} no existía`);
      }
    }
    
    console.log('🎉 Base de datos reseteada completamente');
    console.log('📝 Ejecuta "node scripts/migrate.js" para recrear las tablas');
    
  } catch (error) {
    console.error('❌ Error reseteando base de datos:', error);
  }
  
  process.exit(0);
};

resetDatabase();