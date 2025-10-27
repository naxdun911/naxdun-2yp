// db.js - PostgreSQL Connection Pool Setup

require('dotenv').config();
const { Pool } = require('pg');

// Build pool config from environment variables and coerce types
const poolConfig = {
  user: String(process.env.DATABASE_USER || 'postgres'),
  host: String(process.env.DATABASE_HOST || 'localhost'),
  database: String(process.env.DATABASE_NAME || 'heatmap_db'),
  // Ensure password is a string (avoids `client password must be a string` errors)
  password: String(process.env.DATABASE_PASSWORD || '1234'),
  port: parseInt(String(process.env.DATABASE_PORT || '5432'), 10),
};

// Debug: log the type of the password value (do NOT log the password itself)
console.log(`DB pool config - host=${poolConfig.host}, database=${poolConfig.database}, passwordType=${typeof poolConfig.password}`);

// Create a new PostgreSQL pool using the config
const pool = new Pool(poolConfig);

// Test the connection when the module is loaded
pool.connect()
  .then(client => {
    console.log('✅ Successfully connected to PostgreSQL database');
    client.release();
  })
  .catch(err => {
    console.error('❌ Error connecting to the database:', err.message);
    console.error('Full error:', err);
  });

// Export the pool to use in your API routes
module.exports = pool;
