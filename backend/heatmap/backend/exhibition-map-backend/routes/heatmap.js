const express = require("express");
const axios = require("axios");
const pool = require('../heatmap_db'); // pg Pool instance
const { predictBuildingOccupancy } = require('../utils/emaPrediction');

const router = express.Router();

// URL of the API that gives building data
//this is for local testing with sample_buildings.js
//add correct API URL when deploying
const CCTV_API_URL = process.env.CCTV_API_URL || process.env.VITE_KIOSK_NOTIFICATION_API_URL || "http://localhost:3897/api/buildings";

// Define API base URL for QR API
const API_BASE_URL = "https://ulckzxbsufwjlsyxxzoz.supabase.co/rest/v1";
//https://ulckzxbsufwjlsyxxzoz.supabase.co/rest/v1/BUILDING?select=total_count&building_id=eq
// Define headers
const headers = {
  apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsY2t6eGJzdWZ3amxzeXh4em96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTAwODcsImV4cCI6MjA3MzU4NjA4N30.J8MMNsdLQh6dw7QC1pFtWIZsYV5e2S2iRfWD_vWMsPM",
  Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsY2t6eGJzdWZ3amxzeXh4em96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTAwODcsImV4cCI6MjA3MzU4NjA4N30.J8MMNsdLQh6dw7QC1pFtWIZsYV5e2S2iRfWD_vWMsPM"
};



//module.exports = getMapID;

// Function to calculate heatmap color
function getHeatmapColor(current, capacity) {
  if (capacity <= 0) return "#cccccc"; // gray for invalid capacity
  const ratio = current / capacity;

  if (ratio < 0.2) return "#22c55e"; // green
  if (ratio < 0.5) return "#eab308"; // light green
  if (ratio < 0.8) return "#f97316"; // yellow
  //if (ratio < 0.9) return "#ef4444"; // orange
  return "#ef4444"; // red
}
// Route to serve map data sourced from current_status (generator output)
router.get("/map-data", async (req, res) => {
  try {
    const dbResult = await pool.query(
      `SELECT b.building_id,
              b.building_name,
              b.building_capacity,
              cs.current_crowd,
              cs.color,
              cs.status_timestamp
         FROM buildings b
         JOIN current_status cs ON b.building_id = cs.building_id
        ORDER BY b.building_id`
    );

<<<<<<< Updated upstream
<<<<<<< Updated upstream
    let useCache = true;

    if (dbResult.rows.length > 0) {
      // check if any row is older than 1 minutes
      console.log("--------------------------------------");
      for (let row of dbResult.rows) {
        const diff = (now - new Date(row.status_timestamp)) / 1000 / 60; // diff in minutes
        console.log(`Building ${row.building_id} data age: ${diff.toFixed(2)} minutes`);
        if (diff > 0.002) {
          useCache = false;
          console.log(`Cache expired for building_id ${row.building_id}, fetching fresh data.`);
          break;
        }
      }
    } else {
      useCache = false; // no data in DB
    }

    if (useCache) {
      // Return cached data from DB with EMA predictions
      const cachedDataWithPredictions = [];
      
      for (const row of dbResult.rows) {
        let predictedCount = row.current_crowd; // Default to current count
        let predictionConfidence = 'low';
        let predictionMethod = 'fallback';
        
        try {
          // Get recent historical data for EMA prediction (1 hour ahead)
          const historyResult = await pool.query(
            `SELECT current_crowd, timestamp 
             FROM building_history 
             WHERE building_id = $1 
               AND timestamp >= NOW() - INTERVAL '6 hours'
             ORDER BY timestamp ASC`,
            [row.building_id]
          );
          
          if (historyResult.rows.length >= 3) {
            const historicalData = historyResult.rows.map(histRow => ({
              timestamp: histRow.timestamp,
              current_count: histRow.current_crowd
            }));
            
            const prediction = predictBuildingOccupancy(historicalData, {
              hoursAhead: 1,
              periods: 12,
              minDataPoints: 3
            });
            
            if (prediction && prediction.method !== 'fallback') {
              predictedCount = prediction.prediction;
              predictionConfidence = prediction.confidence;
              predictionMethod = prediction.method;
            }
          }
        } catch (predictionError) {
          console.error(`EMA prediction error for building ${row.building_id}:`, predictionError.message);
        }
        
        cachedDataWithPredictions.push({
          ...row,
          predicted_count: predictedCount,
          prediction_confidence: predictionConfidence,
          prediction_method: predictionMethod
        });
      }
      
      return res.json({
        success: true,
        source: "Database Cache",
        data: cachedDataWithPredictions
      });
    }

    // 2️ Otherwise fetch from API
    console.log("Fetching fresh data from sample buildings...");
    
    // Use sample data directly instead of making HTTP call to avoid infinite loop
    const sampleBuildings = [
      { id: 1, building_id: "B1", Build_Name: "Engineering Carpentry Shop", total_count: 30 },
      { id: 2, building_id: "B2", Build_Name: "Engineering Workshop", total_count: 10 },
      { id: 3, building_id: "B3", Build_Name: "", total_count: 0 },
      { id: 4, building_id: "B4", Build_Name: "Generator Room", total_count: 30 },
      { id: 5, building_id: "B5", Build_Name: "", total_count: 70 },
      { id: 6, building_id: "B6", Build_Name: "Structure Lab", total_count: 90 },
      { id: 7, building_id: "B7", Build_Name: "Administrative Building", total_count: 90 },
      { id: 8, building_id: "B8", Build_Name: "Canteen", total_count: 40 },
      { id: 9, building_id: "B9", Build_Name: "Lecture Room 10/11", total_count: 40 },
      { id: 10, building_id: "B10", Build_Name: "Engineering Library", total_count: 0 },
      { id: 11, building_id: "B11", Build_Name: "Department of Chemical and process Engineering", total_count: 0 },
      { id: 12, building_id: "B12", Build_Name: "Security Unit", total_count: 40 },
      { id: 13, building_id: "B13", Build_Name: "Drawing Office 2", total_count: 70 },
      { id: 14, building_id: "B14", Build_Name: "Faculty Canteen", total_count: 0 },
      { id: 15, building_id: "B15", Build_Name: "Department of Manufacturing and Industrial Engineering", total_count: 0 },
      { id: 16, building_id: "B16", Build_Name: "Professor E.O.E. Perera Theater", total_count: 50 },
      { id: 17, building_id: "B17", Build_Name: "Electronic Lab", total_count: 0 },
      { id: 18, building_id: "B18", Build_Name: "Washrooms", total_count: 0 },
      { id: 19, building_id: "B19", Build_Name: "Electrical and Electronic Workshop", total_count: 66 },
      { id: 20, building_id: "B20", Build_Name: "Department of Computer Engineering", total_count: 0 },
      { id: 21, building_id: "B21", Build_Name: "", total_count: 67 },
      { id: 22, building_id: "B22", Build_Name: "Environmental Lab", total_count: 33 },
      { id: 23, building_id: "B23", Build_Name: "Applied Mechanics Lab", total_count: 0 },
      { id: 24, building_id: "B24", Build_Name: "New Mechanics Lab", total_count: 80 },
      { id: 25, building_id: "B25", Build_Name: "", total_count: 100 },
      { id: 26, building_id: "B26", Build_Name: "", total_count: 0 },
      { id: 27, building_id: "B27", Build_Name: "", total_count: 0 },
      { id: 28, building_id: "B28", Build_Name: "Materials Lab", total_count: 0 },
      { id: 29, building_id: "B29", Build_Name: "Thermodynamics Lab", total_count: 0 },
      { id: 30, building_id: "B30", Build_Name: "Fluids Lab", total_count: 20 },
      { id: 31, building_id: "B31", Build_Name: "Surveying and Soil Lab", total_count: 0 },
      { id: 32, building_id: "B32", Build_Name: "Department of Engineering Mathematics", total_count: 68 },
      { id: 33, building_id: "B33", Build_Name: "Drawing Office 1", total_count: 0 },
      { id: 34, building_id: "B34", Build_Name: "Department of Electrical and Electronic Engineering ", total_count: 70 }
    ];
    
    const buildings = sampleBuildings;
    //console.log(`Fetched ${buildings} buildings from API.`);
    
    const coloredBuildings = [];
=======
    if (dbResult.rows.length === 0) {
      return res.status(503).json({
        success: false,
        error: "No building occupancy data available. Ensure the data generator is running."
      });
    }

    const dataWithPredictions = [];
>>>>>>> Stashed changes

=======
    if (dbResult.rows.length === 0) {
      return res.status(503).json({
        success: false,
        error: "No building occupancy data available. Ensure the data generator is running."
      });
    }

    const dataWithPredictions = [];

>>>>>>> Stashed changes
    for (const row of dbResult.rows) {
      let predictedCount = row.current_crowd;
      let predictionConfidence = 'low';
      let predictionMethod = 'fallback';

      try {
        const historyResult = await pool.query(
          `SELECT current_crowd, timestamp
             FROM building_history
            WHERE building_id = $1
              AND timestamp >= NOW() - INTERVAL '6 hours'
            ORDER BY timestamp ASC`,
          [row.building_id]
        );

        if (historyResult.rows.length >= 3) {
          const historicalData = historyResult.rows.map(histRow => ({
            timestamp: histRow.timestamp,
            current_count: histRow.current_crowd
          }));

          const prediction = predictBuildingOccupancy(historicalData, {
            hoursAhead: 1,
            periods: 12,
            minDataPoints: 3
          });

          if (prediction && prediction.method !== 'fallback') {
            predictedCount = prediction.prediction;
            predictionConfidence = prediction.confidence;
            predictionMethod = prediction.method;
          }
        }
      } catch (predictionError) {
        console.error(`EMA prediction error for building ${row.building_id}:`, predictionError.message);
      }

      const color = row.color || getHeatmapColor(row.current_crowd, row.building_capacity);

      dataWithPredictions.push({
        building_id: row.building_id,
        building_name: row.building_name,
        current_crowd: row.current_crowd,
        building_capacity: row.building_capacity,
        color,
        status_timestamp: row.status_timestamp,
        predicted_count: predictedCount,
        prediction_confidence: predictionConfidence,
        prediction_method: predictionMethod
      });
    }

    res.json({
      success: true,
      source: "Current Status",
      data: dataWithPredictions
    });

  } catch (error) {
    console.error("Error fetching building data:", error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

// Route to get historical data and predictions for a specific building
router.get("/building/:buildingId/history", async (req, res) => {
  try {
    const { buildingId } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    
    // Get building info
    const buildingResult = await pool.query(
      "SELECT building_id, building_name, building_capacity FROM buildings WHERE building_id = $1",
      [buildingId]
    );
    
    if (buildingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Building not found"
      });
    }
    
    const building = buildingResult.rows[0];
    
    // Get current status
    const currentResult = await pool.query(
      "SELECT current_crowd, color, status_timestamp FROM current_status WHERE building_id = $1",
      [buildingId]
    );
    
    // Get historical data
    const historyResult = await pool.query(
      `SELECT current_crowd, timestamp 
       FROM building_history 
       WHERE building_id = $1 
         AND timestamp >= NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp ASC`,
      [buildingId]
    );
    
    // Format historical data for prediction
    const historicalData = historyResult.rows.map(row => ({
      timestamp: row.timestamp,
      current_count: row.current_crowd,
      occupancy_rate: building.building_capacity > 0 
        ? Math.round((row.current_crowd / building.building_capacity) * 100) 
        : 0
    }));
    
    // Generate predictions using EMA method (1 hour ahead)
    let prediction = null;
    if (historicalData.length > 0) {
      try {
        prediction = predictBuildingOccupancy(historicalData, {
          hoursAhead: 1,
          periods: 12,
          minDataPoints: 3
        });
      } catch (error) {
        console.error('EMA prediction error for building', buildingId, ':', error.message);
      }
    }
    
    // Get current data
    const currentCount = currentResult.rows.length > 0 ? currentResult.rows[0].current_crowd : 0;
    const currentColor = currentResult.rows.length > 0 ? currentResult.rows[0].color : '#cccccc';
    const lastUpdated = currentResult.rows.length > 0 ? currentResult.rows[0].status_timestamp : null;
    
    res.json({
      success: true,
      data: {
        buildingId: building.building_id,
        buildingName: building.building_name,
        capacity: building.building_capacity,
        currentCount,
        currentColor,
        lastUpdated,
        predictedCount: prediction ? prediction.prediction : currentCount,
        predictionConfidence: prediction ? prediction.confidence : 'low',
        predictionMethod: prediction ? prediction.method : 'fallback',
        history: historicalData,
        prediction: prediction
      }
    });
    
  } catch (error) {
    console.error("Error fetching building history:", error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

