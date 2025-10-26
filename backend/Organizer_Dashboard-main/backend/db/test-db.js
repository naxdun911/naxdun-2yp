const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'organizer_dashboard',
  password: process.env.DB_PASSWORD || '200209601231',
  port: process.env.DB_PORT || 5432,
});

async function testLocalDBConnection() {
    try {
        console.log('🔍 Testing local PostgreSQL connection...');
        console.log('Config:', {
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'organizer_dashboard',
            port: process.env.DB_PORT || 5432
        });
        
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Local PostgreSQL connection successful!');
        console.log('Server time:', result.rows[0].now);
        client.release();
    } catch (err) {
        console.error('❌ Local PostgreSQL connection error:', err.message);
        console.error('Error code:', err.code);
    } finally {
        pool.end();
    }
}

testLocalDBConnection();