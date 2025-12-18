// Auto-detect database based on environment
if (process.env.DATABASE_URL) {
  // Railway PostgreSQL
  module.exports = require('./database-pg');
} else {
  // Local SQLite
  module.exports = require('./database');
}
