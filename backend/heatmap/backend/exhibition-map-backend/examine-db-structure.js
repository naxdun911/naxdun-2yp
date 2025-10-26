require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  database: process.env.DATABASE_NAME || 'heatmap_db',
  password: process.env.DATABASE_PASSWORD || '1234',
  port: process.env.DATABASE_PORT || 5432,
});

async function examineDatabase() {
    try {
        console.log('🔍 Examining database structure...');
        
        // Check buildings table structure
        const buildingsSchema = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'buildings'
            ORDER BY ordinal_position
        `);
        console.log('\n📊 Buildings table structure:');
        console.table(buildingsSchema.rows);
        
        // Check current_status table structure
        const statusSchema = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'current_status'
            ORDER BY ordinal_position
        `);
        console.log('\n📈 Current_status table structure:');
        console.table(statusSchema.rows);
        
        // Sample data from buildings
        const buildingsData = await pool.query('SELECT * FROM buildings LIMIT 5');
        console.log('\n🏢 Sample buildings data:');
        console.table(buildingsData.rows);
        
        // Sample data from current_status
        const statusData = await pool.query('SELECT * FROM current_status LIMIT 5');
        console.log('\n📊 Sample current_status data:');
        console.table(statusData.rows);
        
    } catch (err) {
        console.error('❌ Error examining database:', err.message);
    } finally {
        pool.end();
    }
}

examineDatabase();