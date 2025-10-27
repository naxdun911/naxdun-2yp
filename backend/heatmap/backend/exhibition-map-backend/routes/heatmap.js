const express = require("express");
const axios = require("axios");
const pool = require('../heatmap_db'); // pg Pool instance
const { predictBuildingOccupancy } = require('../utils/holtPrediction');

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
function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (obj.hasOwnProperty(key)) {
      if(key=="Build_Name") result["building_name"] = obj[key];
      if(key=="building_id") result["building_id"] = obj[key];
      if(key=="total_count") result["current_crowd"] = obj[key];
      
      //result[key] = obj[key];
    }
    return result;
  }, {});
}
async function fetchCapacities() {
  const capacityResult = await pool.query("SELECT building_id, building_capacity FROM buildings");
  const capacityMap = {};
  for (let row of capacityResult.rows) {
    capacityMap[row.building_id] = row.building_capacity;
  }
  return capacityMap;
}



// Route to serve map data with caching
router.get("/map-data", async (req, res) => {
  try {
    // 1️ Check if cached data is recent (less than 1 minutes)
    const dbResult = await pool.query("SELECT b.building_id,b.building_name,cs.current_crowd,b.building_capacity,cs.color,cs.status_timestamp FROM buildings b JOIN current_status cs ON b.building_id = cs.building_id");
    const now = new Date();
    const capacityMap = await fetchCapacities();

    let useCache = true;

    if (dbResult.rows.length > 0) {
      // check if any row is older than 1 minutes (changed from 0.002 to 1 for real-time updates)
      console.log("--------------------------------------");
      for (let row of dbResult.rows) {
        const diff = (now - new Date(row.status_timestamp)) / 1000 / 60; // diff in minutes
        console.log(`Building ${row.building_id} data age: ${diff.toFixed(2)} minutes`);
        if (diff > 0.25) { // Cache expires after 15 seconds (0.25 minutes)
          useCache = false;
          console.log(`Cache expired for building_id ${row.building_id}, fetching fresh data.`);
          break;
        }
      }
    } else {
      useCache = false; // no data in DB
    }

    if (useCache) {
      // Return cached data from DB with predictions
      const cachedDataWithPredictions = [];
      
      for (const row of dbResult.rows) {
        let predictedCount = row.current_crowd; // Default to current count
        let predictionConfidence = 'low';
        
        try {
          // Get recent historical data for prediction
          const historyResult = await pool.query(
            `SELECT current_crowd, timestamp 
             FROM building_history 
             WHERE building_id = $1 
               AND timestamp >= NOW() - INTERVAL '24 hours'
             ORDER BY timestamp ASC
             LIMIT 50`,
            [row.building_id]
          );
          
          if (historyResult.rows.length >= 3) {
            const historicalData = historyResult.rows.map(histRow => ({
              timestamp: histRow.timestamp,
              current_count: histRow.current_crowd
            }));
            
            const prediction = predictBuildingOccupancy(historicalData, {
              forecastSteps: 1,
              autoTune: true,
              minDataPoints: 3
            });
            
            if (prediction && prediction.method !== 'fallback') {
              predictedCount = prediction.prediction;
              predictionConfidence = prediction.confidence;
            }
          }
        } catch (predictionError) {
          console.error(`Prediction error for building ${row.building_id}:`, predictionError.message);
        }
        
        cachedDataWithPredictions.push({
          ...row,
          predicted_count: predictedCount,
          prediction_confidence: predictionConfidence
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
    
    // Helper function to generate random crowd count with realistic variation
    const getRandomCrowd = (baseCount, capacity) => {
      // Add random variation between -20% to +30% of base count
      const variation = Math.floor(baseCount * (Math.random() * 0.5 - 0.2));
      const newCount = Math.max(0, Math.min(capacity, baseCount + variation));
      return newCount;
    };
    
    // Use sample data with dynamic random variation to simulate real-time changes
    const sampleBuildings = [
      { id: 1, building_id: "B1", Build_Name: "Engineering Carpentry Shop", total_count: getRandomCrowd(30, 120) },
      { id: 2, building_id: "B2", Build_Name: "Engineering Workshop", total_count: getRandomCrowd(10, 100) },
      { id: 3, building_id: "B3", Build_Name: "", total_count: getRandomCrowd(5, 60) },
      { id: 4, building_id: "B4", Build_Name: "Generator Room", total_count: getRandomCrowd(30, 120) },
      { id: 5, building_id: "B5", Build_Name: "", total_count: getRandomCrowd(70, 120) },
      { id: 6, building_id: "B6", Build_Name: "Structure Lab", total_count: getRandomCrowd(90, 150) },
      { id: 7, building_id: "B7", Build_Name: "Administrative Building", total_count: getRandomCrowd(35, 50) },
      { id: 8, building_id: "B8", Build_Name: "Canteen", total_count: getRandomCrowd(40, 80) },
      { id: 9, building_id: "B9", Build_Name: "Lecture Room 10/11", total_count: getRandomCrowd(120, 200) },
      { id: 10, building_id: "B10", Build_Name: "Engineering Library", total_count: getRandomCrowd(15, 40) },
      { id: 11, building_id: "B11", Build_Name: "Department of Chemical and process Engineering", total_count: getRandomCrowd(35, 80) },
      { id: 12, building_id: "B12", Build_Name: "Security Unit", total_count: getRandomCrowd(20, 60) },
      { id: 13, building_id: "B13", Build_Name: "Drawing Office 2", total_count: getRandomCrowd(25, 40) },
      { id: 14, building_id: "B14", Build_Name: "Faculty Canteen", total_count: getRandomCrowd(45, 80) },
      { id: 15, building_id: "B15", Build_Name: "Department of Manufacturing and Industrial Engineering", total_count: getRandomCrowd(50, 100) },
      { id: 16, building_id: "B16", Build_Name: "Professor E.O.E. Perera Theater", total_count: getRandomCrowd(50, 60) },
      { id: 17, building_id: "B17", Build_Name: "Electronic Lab", total_count: getRandomCrowd(40, 90) },
      { id: 18, building_id: "B18", Build_Name: "Washrooms", total_count: getRandomCrowd(15, 120) },
      { id: 19, building_id: "B19", Build_Name: "Electrical and Electronic Workshop", total_count: getRandomCrowd(35, 70) },
      { id: 20, building_id: "B20", Build_Name: "Department of Computer Engineering", total_count: getRandomCrowd(45, 90) },
      { id: 21, building_id: "B21", Build_Name: "", total_count: getRandomCrowd(60, 120) },
      { id: 22, building_id: "B22", Build_Name: "Environmental Lab", total_count: getRandomCrowd(33, 70) },
      { id: 23, building_id: "B23", Build_Name: "Applied Mechanics Lab", total_count: getRandomCrowd(40, 90) },
      { id: 24, building_id: "B24", Build_Name: "New Mechanics Lab", total_count: getRandomCrowd(80, 150) },
      { id: 25, building_id: "B25", Build_Name: "", total_count: getRandomCrowd(30, 60) },
      { id: 26, building_id: "B26", Build_Name: "", total_count: getRandomCrowd(55, 120) },
      { id: 27, building_id: "B27", Build_Name: "", total_count: getRandomCrowd(70, 160) },
      { id: 28, building_id: "B28", Build_Name: "Materials Lab", total_count: getRandomCrowd(45, 100) },
      { id: 29, building_id: "B29", Build_Name: "Thermodynamics Lab", total_count: getRandomCrowd(50, 100) },
      { id: 30, building_id: "B30", Build_Name: "Fluids Lab", total_count: getRandomCrowd(45, 100) },
      { id: 31, building_id: "B31", Build_Name: "Surveying and Soil Lab", total_count: getRandomCrowd(35, 80) },
      { id: 32, building_id: "B32", Build_Name: "Department of Engineering Mathematics", total_count: getRandomCrowd(30, 60) },
      { id: 33, building_id: "B33", Build_Name: "Drawing Office 1", total_count: getRandomCrowd(55, 120) },
      { id: 34, building_id: "B34", Build_Name: "Department of Electrical and Electronic Engineering ", total_count: getRandomCrowd(60, 120) }
    ];
    
    const buildings = sampleBuildings;
    //console.log(`Fetched ${buildings} buildings from API.`);
    
    const coloredBuildings = [];

    for (let building of buildings) {
      const color = getHeatmapColor(building.total_count, capacityMap[building.building_id] );
      const timestamp = new Date().toLocaleString();

      // Get recent historical data for prediction
      let predictedCount = building.total_count; // Default to current count
      let predictionConfidence = 'low';
      
      // Temporarily disable prediction logic for debugging
      /*
      try {
        const historyResult = await pool.query(
          `SELECT current_crowd, timestamp 
           FROM building_history 
           WHERE building_id = $1 
             AND timestamp >= NOW() - INTERVAL '24 hours'
           ORDER BY timestamp ASC
           LIMIT 50`,
          [building.building_id]
        );
        
        if (historyResult.rows.length >= 3) {
          const historicalData = historyResult.rows.map(row => ({
            timestamp: row.timestamp,
            current_count: row.current_crowd
          }));
          
          const prediction = predictBuildingOccupancy(historicalData, {
            forecastSteps: 1,
            autoTune: true,
            minDataPoints: 3
          });
          
          if (prediction && prediction.method !== 'fallback') {
            predictedCount = prediction.prediction;
            predictionConfidence = prediction.confidence;
          }
        }
      } catch (predictionError) {
        console.error(`Prediction error for building ${building.building_id}:`, predictionError.message);
      }
      */

      coloredBuildings.push({ 
        ...pick(building, ["building_id","Build_Name", "total_count"]),
        building_capacity: capacityMap[building.building_id], 
        color, 
        status_timestamp: timestamp,
        predicted_count: predictedCount,
        prediction_confidence: predictionConfidence
      });

      //console.log(building.total_count,building.building_id);
      // Insert or update current_status table
      await pool.query(
        `INSERT INTO current_status (building_id, current_crowd, color, status_timestamp)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (building_id)
         DO UPDATE SET current_crowd = EXCLUDED.current_crowd,
                       color = EXCLUDED.color,
                       status_timestamp = EXCLUDED.status_timestamp`,
        [building.building_id, building.total_count, color, timestamp]
      );

      // Also insert into building_history for historical tracking
      await pool.query(
        `INSERT INTO building_history (building_id, current_crowd, timestamp)
         VALUES ($1, $2, NOW())`,
        [building.building_id, building.total_count]
      );
    }

    res.json({
      success: true,
      source: "Buildings API",
      data: coloredBuildings,
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
    
    // Generate predictions using Holt's method
    let prediction = null;
    if (historicalData.length > 0) {
      try {
        prediction = predictBuildingOccupancy(historicalData, {
          forecastSteps: 3, // Predict next 3 time periods
          autoTune: true,
          minDataPoints: 3
        });
      } catch (error) {
        console.error('Prediction error for building', buildingId, ':', error.message);
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

