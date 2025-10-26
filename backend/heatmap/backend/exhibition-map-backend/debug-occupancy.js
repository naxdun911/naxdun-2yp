require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  database: process.env.DATABASE_NAME || 'heatmap_db',
  password: process.env.DATABASE_PASSWORD || '1234',
  port: process.env.DATABASE_PORT || 5432,
});

async function investigateOccupancyIssue() {
    try {
        console.log('🔍 Investigating occupancy data issue...\n');

        // Check all buildings data
        console.log('1️⃣ All Buildings Data:');
        const buildingsResult = await pool.query('SELECT * FROM buildings ORDER BY building_id');
        console.table(buildingsResult.rows);

        // Check all current status data
        console.log('\n2️⃣ All Current Status Data:');
        const statusResult = await pool.query('SELECT * FROM current_status ORDER BY building_id');
        console.table(statusResult.rows);

        // Check the join query like telegram service uses
        console.log('\n3️⃣ Joined Data (like telegram service):');
        const joinedResult = await pool.query(`
            SELECT 
                b.building_id,
                b.building_name,
                b.building_capacity,
                cs.current_crowd,
                cs.color,
                cs.status_timestamp,
                (cs.current_crowd::decimal / b.building_capacity::decimal) * 100 as occupancy_percentage
            FROM buildings b
            INNER JOIN current_status cs ON b.building_id = cs.building_id
            WHERE 
                b.building_capacity > 0
                AND b.building_name IS NOT NULL 
                AND b.building_name != ''
            ORDER BY occupancy_percentage DESC
        `);
        console.table(joinedResult.rows);

        // Check specifically buildings with >0% occupancy
        console.log('\n4️⃣ Buildings with >0% occupancy:');
        const nonZeroResult = await pool.query(`
            SELECT 
                b.building_id,
                b.building_name,
                b.building_capacity,
                cs.current_crowd,
                (cs.current_crowd::decimal / b.building_capacity::decimal) * 100 as occupancy_percentage
            FROM buildings b
            INNER JOIN current_status cs ON b.building_id = cs.building_id
            WHERE 
                b.building_capacity > 0
                AND cs.current_crowd > 0
                AND b.building_name IS NOT NULL 
                AND b.building_name != ''
            ORDER BY occupancy_percentage DESC
        `);
        console.table(nonZeroResult.rows);

        // Check for any data type issues
        console.log('\n5️⃣ Data Type Check:');
        const dataTypeResult = await pool.query(`
            SELECT 
                building_id,
                current_crowd,
                pg_typeof(current_crowd) as crowd_type,
                building_capacity,
                pg_typeof(building_capacity) as capacity_type
            FROM current_status cs
            JOIN buildings b USING(building_id)
            LIMIT 5
        `);
        console.table(dataTypeResult.rows);

    } catch (error) {
        console.error('❌ Error investigating occupancy:', error.message);
    } finally {
        pool.end();
    }
}

investigateOccupancyIssue();