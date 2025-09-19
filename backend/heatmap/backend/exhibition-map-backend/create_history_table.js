const pool = require('./heatmap_db');

async function createTable() {
  try {
    // Create building_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS building_history (
        id SERIAL PRIMARY KEY,
        building_id VARCHAR(10) NOT NULL,
        current_crowd INT NOT NULL CHECK (current_crowd >= 0),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_building_history 
          FOREIGN KEY (building_id) 
          REFERENCES buildings(building_id) 
          ON DELETE CASCADE
      )
    `);
    console.log('✅ building_history table created');

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_building_history_building_id ON building_history(building_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_building_history_timestamp ON building_history(timestamp)`);
    console.log('✅ Indexes created');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createTable();