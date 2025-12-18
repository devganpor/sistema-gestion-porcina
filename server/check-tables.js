const { query } = require('./config/database-auto');

async function checkTables() {
  try {
    const result = await query("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Tablas disponibles:');
    result.rows.forEach(row => console.log(`  - ${row.name}`));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();
