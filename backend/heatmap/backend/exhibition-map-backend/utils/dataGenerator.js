/**
 * Data Generator for Building Occupancy
 * 
 * This module generates realistic occupancy data for buildings based on:
 * - Time of day patterns (higher during class hours, lower at night)
 * - Day of week patterns (lower on weekends)
 * - Building capacity constraints
 * - Random variations to simulate real-world behavior
 */

const pool = require('../heatmap_db');

class OccupancyDataGenerator {
  constructor() {
    this.buildings = [];
    this.isRunning = false;
    this.generatorInterval = null;
    this.generationIntervalMinutes = 1; // Generate data every 5 minutes
  }

  /**
   * Initialize generator with building data from database
   */
  async initialize() {
    try {
      const result = await pool.query(
        'SELECT building_id, building_name, building_capacity FROM buildings ORDER BY building_id'
      );
      
      this.buildings = result.rows.map(row => ({
        building_id: row.building_id,
        building_name: row.building_name,
        capacity: row.building_capacity,
        baseOccupancy: this.calculateBaseOccupancy(row.building_name, row.building_capacity),
        variation: 0.2 // 20% random variation
      }));

      console.log(`✅ Data generator initialized with ${this.buildings.length} buildings`);
      return true;
    } catch (error) {
      console.error('❌ Error initializing data generator:', error.message);
      throw error;
    }
  }

  /**
   * Calculate base occupancy rate based on building type
   * @param {string} buildingName - Name of the building
   * @param {number} capacity - Building capacity
   * @returns {number} Base occupancy rate (0-1)
   */
  calculateBaseOccupancy(buildingName, capacity) {
    const name = buildingName.toLowerCase();
    
    // Different building types have different typical occupancy rates
    if (name.includes('canteen') || name.includes('cafeteria')) {
      return 0.4; // Canteens: 40% base
    } else if (name.includes('library')) {
      return 0.5; // Libraries: 50% base
    } else if (name.includes('lab') || name.includes('workshop')) {
      return 0.3; // Labs: 30% base
    } else if (name.includes('lecture') || name.includes('theater')) {
      return 0.6; // Lecture halls: 60% base
    } else if (name.includes('department') || name.includes('administrative')) {
      return 0.25; // Departments: 25% base
    } else if (name.includes('washroom') || name.includes('security')) {
      return 0.15; // Service areas: 15% base
    } else {
      return 0.35; // Default: 35% base
    }
  }

  /**
   * Get time-based multiplier (0-1) based on hour of day
   * @param {number} hour - Hour of day (0-23)
   * @returns {number} Multiplier
   */
  getTimeMultiplier(hour) {
    // University activity pattern
    if (hour >= 0 && hour < 6) return 0.05; // Night: 5%
    if (hour >= 6 && hour < 8) return 0.3; // Early morning: 30%
    if (hour >= 8 && hour < 10) return 1.0; // Morning peak: 100%
    if (hour >= 10 && hour < 12) return 0.9; // Late morning: 90%
    if (hour >= 12 && hour < 14) return 1.2; // Lunch peak: 120%
    if (hour >= 14 && hour < 16) return 0.85; // Afternoon: 85%
    if (hour >= 16 && hour < 18) return 0.7; // Late afternoon: 70%
    if (hour >= 18 && hour < 20) return 0.4; // Evening: 40%
    return 0.15; // Night: 15%
  }

  /**
   * Get day-based multiplier based on day of week
   * @param {number} dayOfWeek - Day of week (0=Sunday, 6=Saturday)
   * @returns {number} Multiplier
   */
  getDayMultiplier(dayOfWeek) {
    // Weekdays: normal activity, Weekends: reduced
    if (dayOfWeek === 0) return 0.2; // Sunday: 20%
    if (dayOfWeek === 6) return 0.3; // Saturday: 30%
    return 1.0; // Weekdays: 100%
  }

  /**
   * Add random variation to simulate real-world behavior
   * @param {number} value - Base value
   * @param {number} variation - Variation factor (0-1)
   * @returns {number} Value with random variation
   */
  addRandomVariation(value, variation) {
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * variation;
    return value * randomFactor;
  }

  /**
   * Generate occupancy count for a specific building at current time
   * @param {Object} building - Building object
   * @returns {number} Generated occupancy count
   */
  generateOccupancyForBuilding(building) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Calculate occupancy based on multiple factors
    const timeMultiplier = this.getTimeMultiplier(hour);
    const dayMultiplier = this.getDayMultiplier(dayOfWeek);
    
    // Base calculation
    let occupancy = building.capacity * building.baseOccupancy * timeMultiplier * dayMultiplier;
    
    // Add random variation
    occupancy = this.addRandomVariation(occupancy, building.variation);
    
    // Ensure within bounds [0, capacity]
    occupancy = Math.max(0, Math.min(building.capacity, Math.round(occupancy)));
    
    return occupancy;
  }

  /**
   * Generate data for all buildings
   * @returns {Array} Array of building data with generated occupancy
   */
  generateDataForAllBuildings() {
    const timestamp = new Date();
    const generatedData = [];

    for (const building of this.buildings) {
      const currentCount = this.generateOccupancyForBuilding(building);
      
      generatedData.push({
        building_id: building.building_id,
        building_name: building.building_name,
        current_count: currentCount,
        capacity: building.capacity,
        timestamp: timestamp,
        occupancy_rate: Math.round((currentCount / building.capacity) * 100)
      });
    }

    return generatedData;
  }

  /**
   * Calculate heatmap color based on occupancy
   * @param {number} current - Current count
   * @param {number} capacity - Building capacity
   * @returns {string} Hex color code
   */
  getHeatmapColor(current, capacity) {
    if (capacity <= 0) return "#cccccc";
    const ratio = current / capacity;

    if (ratio < 0.2) return "#22c55e"; // green
    if (ratio < 0.5) return "#eab308"; // yellow
    if (ratio < 0.8) return "#f97316"; // orange
    return "#ef4444"; // red
  }

  /**
   * Write generated data to database
   * @param {Array} generatedData - Generated building data
   */
  async writeToDatabase(generatedData) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const data of generatedData) {
        const color = this.getHeatmapColor(data.current_count, data.capacity);
        const timestamp = data.timestamp;

        // Update current_status table
        await client.query(
          `INSERT INTO current_status (building_id, current_crowd, color, status_timestamp)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (building_id)
           DO UPDATE SET current_crowd = EXCLUDED.current_crowd,
                         color = EXCLUDED.color,
                         status_timestamp = EXCLUDED.status_timestamp`,
          [data.building_id, data.current_count, color, timestamp]
        );

        // Insert into building_history for historical tracking
        await client.query(
          `INSERT INTO building_history (building_id, current_crowd, timestamp)
           VALUES ($1, $2, $3)`,
          [data.building_id, data.current_count, timestamp]
        );
      }

      await client.query('COMMIT');
      console.log(`✅ Generated and saved data for ${generatedData.length} buildings at ${new Date().toLocaleTimeString()}`);
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error writing generated data to database:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Start the data generator
   * @param {number} intervalMinutes - Generation interval in minutes
   */
  async start(intervalMinutes = 5) {
    if (this.isRunning) {
      console.log('⚠️ Data generator is already running');
      return;
    }

    if (this.buildings.length === 0) {
      await this.initialize();
    }

    this.generationIntervalMinutes = intervalMinutes;
    this.isRunning = true;

    // Generate initial data immediately
    try {
      const data = this.generateDataForAllBuildings();
      await this.writeToDatabase(data);
    } catch (error) {
      console.error('❌ Error generating initial data:', error.message);
    }

    // Set up periodic generation
    this.generatorInterval = setInterval(async () => {
      try {
        const data = this.generateDataForAllBuildings();
        await this.writeToDatabase(data);
      } catch (error) {
        console.error('❌ Error in data generation cycle:', error.message);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`🚀 Data generator started - generating data every ${intervalMinutes} minute(s)`);
  }

  /**
   * Stop the data generator
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Data generator is not running');
      return;
    }

    if (this.generatorInterval) {
      clearInterval(this.generatorInterval);
      this.generatorInterval = null;
    }

    this.isRunning = false;
    console.log('🛑 Data generator stopped');
  }

  /**
   * Get generator status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      buildingsCount: this.buildings.length,
      intervalMinutes: this.generationIntervalMinutes,
      nextGenerationIn: this.isRunning 
        ? `${this.generationIntervalMinutes} minutes` 
        : 'Not running'
    };
  }

  /**
   * Generate historical data for past hours (useful for initial setup)
   * @param {number} hoursBack - Number of hours to generate data for
   * @param {number} intervalMinutes - Interval between data points
   */
  async generateHistoricalData(hoursBack = 24, intervalMinutes = 5) {
    console.log(`📊 Generating historical data for past ${hoursBack} hours...`);
    
    if (this.buildings.length === 0) {
      await this.initialize();
    }

    const dataPoints = (hoursBack * 60) / intervalMinutes;
    const now = new Date();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = dataPoints; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
        
        for (const building of this.buildings) {
          const hour = timestamp.getHours();
          const dayOfWeek = timestamp.getDay();
          
          const timeMultiplier = this.getTimeMultiplier(hour);
          const dayMultiplier = this.getDayMultiplier(dayOfWeek);
          
          let occupancy = building.capacity * building.baseOccupancy * timeMultiplier * dayMultiplier;
          occupancy = this.addRandomVariation(occupancy, building.variation);
          occupancy = Math.max(0, Math.min(building.capacity, Math.round(occupancy)));

          // Insert into history
          await client.query(
            `INSERT INTO building_history (building_id, current_crowd, timestamp)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [building.building_id, occupancy, timestamp]
          );
        }
      }

      await client.query('COMMIT');
      console.log(`✅ Generated ${dataPoints} historical data points for ${this.buildings.length} buildings`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error generating historical data:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Create singleton instance
const dataGenerator = new OccupancyDataGenerator();

module.exports = dataGenerator;
