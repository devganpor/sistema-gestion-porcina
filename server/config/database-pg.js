const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Convierte placeholders ? a $1, $2, $3... para PostgreSQL
const convertPlaceholders = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const query = async (sql, params = []) => {
  try {
    const pgSql = convertPlaceholders(sql);
    const client = await pool.connect();
    const result = await client.query(pgSql, params);
    client.release();
    return { rows: result.rows };
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

module.exports = { query, pool };
