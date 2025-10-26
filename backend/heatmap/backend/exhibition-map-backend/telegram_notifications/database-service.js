// database-service.js - Service to fetch building capacity data for notifications

const pool = require('../heatmap_db'); // Use existing database connection

class DatabaseService {
    /**
     * Get buildings with less than specified capacity percentage
     * @param {number} thresholdPercentage - Maximum capacity percentage (default: 40)
     * @returns {Array} Array of buildings with low occupancy
     */
    async getLowOccupancyBuildings(thresholdPercentage = 40) {
        try {
            const query = `
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
                    AND (cs.current_crowd::decimal / b.building_capacity::decimal) * 100 < $1
                    AND b.building_name IS NOT NULL 
                    AND b.building_name != ''
                ORDER BY occupancy_percentage ASC
            `;
            
            const result = await pool.query(query, [thresholdPercentage]);
            return result.rows.map(row => ({
                ...row,
                occupancy_percentage: Math.round(row.occupancy_percentage * 10) / 10
            }));
        } catch (error) {
            console.error('❌ Error fetching low occupancy buildings:', error.message);
            throw error;
        }
    }

    /**
     * Get all buildings with their current status
     * @returns {Array} Array of all buildings with status
     */
    async getAllBuildingsStatus() {
        try {
            const query = `
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
                ORDER BY occupancy_percentage ASC
            `;
            
            const result = await pool.query(query);
            return result.rows.map(row => ({
                ...row,
                occupancy_percentage: Math.round(row.occupancy_percentage * 10) / 10
            }));
        } catch (error) {
            console.error('❌ Error fetching all buildings status:', error.message);
            throw error;
        }
    }

    /**
     * Test database connection
     * @returns {boolean} Connection status
     */
    async testConnection() {
        try {
            const result = await pool.query('SELECT NOW()');
            console.log('✅ Database connection test successful');
            return true;
        } catch (error) {
            console.error('❌ Database connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = new DatabaseService();