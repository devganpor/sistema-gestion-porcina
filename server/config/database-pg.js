const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000
});

// Convierte placeholders ? a $1, $2, $3... para PostgreSQL
const convertPlaceholders = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const query = async (sql, params = []) => {
  const pgSql = convertPlaceholders(sql);
  try {
    const result = await pool.query(pgSql, params);
    return { rows: result.rows };
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

module.exports = { query, pool };
