require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  database: process.env.DATABASE_NAME || 'heatmap_db',
  password: process.env.DATABASE_PASSWORD || '1234',
  port: process.env.DATABASE_PORT || 5432,
});

async function testHeatmapDBConnection() {
    try {
        console.log('🔍 Testing heatmap database connection...');
        console.log('Config:', {
            user: process.env.DATABASE_USER || 'postgres',
            host: process.env.DATABASE_HOST || 'localhost',
            database: process.env.DATABASE_NAME || 'heatmap_db',
            port: process.env.DATABASE_PORT || 5432
        });
        
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Heatmap database connection successful!');
        console.log('Server time:', result.rows[0].now);
        
        // Check if tables exist
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('📊 Available tables:', tablesResult.rows.map(row => row.table_name));
        
        client.release();
    } catch (err) {
        console.error('❌ Heatmap database connection error:', err.message);
        console.error('Error code:', err.code);
    } finally {
        pool.end();
    }
}

testHeatmapDBConnection();