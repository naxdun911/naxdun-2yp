// db.js - PostgreSQL Connection Pool Setup

require('dotenv').config();
const { Pool } = require('pg');

// Create a new PostgreSQL pool using environment variables
const pool = new Pool({
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  database: process.env.DATABASE_NAME || 'heatmap_db',
  password: process.env.DATABASE_PASSWORD || '1234',
  port: process.env.DATABASE_PORT || 5432,
});

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
