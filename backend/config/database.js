const { Pool } = require('pg');
require('dotenv').config();

// Check if we should use mock database
const USE_MOCK_DB = process.env.USE_MOCK_DB === 'true';

if (USE_MOCK_DB) {
  console.log('Using mock database for testing...');
  module.exports = require('./mockDatabase');
} else {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'linknest_mdu',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456'
  });

  // Test database connection
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection error:', err);
      console.log('Tip: Set USE_MOCK_DB=true in .env to use mock database for testing');
    } else {
      console.log('Database connected successfully at:', res.rows[0].now);
    }
  });

  module.exports = pool;
}
