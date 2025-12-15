require('dotenv').config();
const { createTables } = require('./scripts/migrate-pg');

console.log('🔧 Ejecutando migración manual...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'NO CONFIGURADA');

createTables()
  .then(() => {
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  });