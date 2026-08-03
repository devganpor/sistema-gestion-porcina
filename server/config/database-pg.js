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
  const pgSql = convertPlaceholders(sql);
  const client = await pool.connect();
  try {
    const result = await client.query(pgSql, params);
    return { rows: result.rows };
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { query, pool };
