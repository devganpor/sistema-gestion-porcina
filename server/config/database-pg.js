const { Pool } = require('pg');

// Configuración para Railway PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Wrapper para promesas compatible con SQLite
const query = async (sql, params = []) => {
  try {
    const client = await pool.connect();
    const result = await client.query(sql, params);
    client.release();
    return { rows: result.rows };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

module.exports = { query, pool };