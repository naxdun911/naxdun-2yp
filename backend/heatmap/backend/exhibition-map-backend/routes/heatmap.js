/**
 * Heatmap API routes
 *
 * Exposes endpoints used by the frontend heatmap to:
 *  - Fetch the current snapshot of all buildings with a short-term (15 min) prediction
 *  - Fetch historical series and prediction for a single building
 *
 * Implementation details:
 *  - Live data comes from tables: buildings, current_status, building_history
 *  - Predictions use Exponential Moving Average (EMA) over the last few hours
 *  - The forecast horizon is standardized to 15 minutes to align UI/UX
 */
const express = require("express");
const pool = require('../heatmap_db'); // pg Pool instance
const { predictBuildingOccupancy } = require('../utils/emaPrediction');
const { getCurrentSnapshot } = require('../utils/buildingSnapshot');

const router = express.Router();

const PREDICTION_MINUTES_AHEAD = 15;

function getHeatmapColor(current, capacity) {
  if (capacity <= 0) return "#cccccc";
  const ratio = current / capacity;
  if (ratio < 0.2) return "#22c55e";
  if (ratio < 0.5) return "#eab308";
  if (ratio < 0.8) return "#f97316";
  return "#ef4444";
}

// Route to serve map data sourced from current_status (generator output)
router.get("/map-data", async (req, res) => {
  try {
    // Pull the latest snapshot by joining static building metadata with the current_status table
    // The join assumes the generator keeps current_status in sync for every building_id
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
    let snapshot = [];

    try {
      snapshot = await getCurrentSnapshot();
    } catch (snapshotError) {
      console.error('Snapshot helper failed, falling back to direct query:', snapshotError.message);
    }

    // Build array to hold enriched building data (current state + prediction)
    const dataWithPredictions = [];

    // Process each building individually to compute its 15-minute forecast
    for (const row of dbResult.rows) {
      // Initialize prediction variables with safe defaults (fallback to current crowd)
      // These act as a safety net if EMA prediction fails or lacks sufficient history
      let predictedCount = row.current_crowd;         // Fallback: assume no change from current
      let predictionConfidence = 'low';                // Signal that this is a weak/fallback prediction
      let predictionMethod = 'fallback';               // Indicate no real model ran
      let predictionHorizonMinutes = PREDICTION_MINUTES_AHEAD;  // Still report 15-min horizon

      try {
        // Fetch last 6 hours of historical data for this building from building_history
        // 6-hour window balances having enough data for EMA while staying recent/relevant
        const historyResult = await pool.query(
          `SELECT current_crowd, timestamp
             FROM building_history
            WHERE building_id = $1
              AND timestamp >= NOW() - INTERVAL '6 hours'
            ORDER BY timestamp ASC`,
          [row.building_id]
        );

        // Only run EMA if we have at least 3 data points (minimum for reliable smoothing)
        // Fewer points would make EMA unstable or meaningless
        if (historyResult.rows.length >= 3) {
          // Transform DB rows into the format expected by the prediction function
          const historicalData = historyResult.rows.map(histRow => ({
            timestamp: histRow.timestamp,
            current_count: histRow.current_crowd
          }));

          // Call EMA predictor with 15-min horizon, 12 periods smoothing, min 3 data points
          const prediction = predictBuildingOccupancy(historicalData, {
            minutesAhead: PREDICTION_MINUTES_AHEAD,  // Forecast 15 minutes into future
            periods: 12,                              // EMA smoothing parameter
            minDataPoints: 3                          // Require at least 3 points
          });

          // If EMA succeeded (not fallback), replace default values with actual prediction
          if (prediction && prediction.method !== 'fallback') {
            predictedCount = prediction.prediction;
            predictionConfidence = prediction.confidence;
            predictionMethod = prediction.method;
            predictionHorizonMinutes = prediction.horizonMinutes ?? PREDICTION_MINUTES_AHEAD;
          }
        }
      } catch (predictionError) {
        // Log but don't crash - fallback defaults will be used for this building
        console.error(`EMA prediction error for building ${row.building_id}:`, predictionError.message);
      }

      // Use color from DB if available, otherwise calculate from occupancy ratio
      // Allows generator to override color logic when needed
      const color = row.color || getHeatmapColor(row.current_crowd, row.building_capacity);

      // Add this building's complete data (current + prediction) to response array
      dataWithPredictions.push({
        building_id: row.building_id,
        building_name: row.building_name,
        current_crowd: row.current_crowd,
        building_capacity: row.building_capacity,
        color,
        status_timestamp: row.status_timestamp,
        predicted_count: predictedCount,              // 15-min forecast or fallback
        prediction_confidence: predictionConfidence,  // 'low'/'medium'/'high' or 'low' if fallback
        prediction_method: predictionMethod,          // 'ema' or 'fallback'
        prediction_horizon_minutes: predictionHorizonMinutes  // Always 15
      });
    }

    snapshot = dataWithPredictions;

    // Send successful response with all buildings enriched with predictions
    res.json({
      success: true,
      source: "Current Status",
      data: snapshot
    });

  } catch (error) {
    // Log error and return 500 status with error message
    console.error("Error fetching building data:", error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

/**
 * GET /heatmap/building/:buildingId/history
 *
 * Returns metadata, current status, time-series history, and a 15-minute
 * EMA prediction for a single building. The history window can be adjusted
 * via the `hours` query parameter (defaults to 24).
 */
router.get("/building/:buildingId/history", async (req, res) => {
  try {
    // Extract buildingId from URL path parameter
    const { buildingId } = req.params;
    // Get time window from query string (default 24 hours if not specified)
    const hours = parseInt(req.query.hours) || 24;
    
    // Fetch building metadata (id, name, capacity) from buildings table
    // Query separately to ensure we can return building info even if current_status is empty
    const buildingResult = await pool.query(
      "SELECT building_id, building_name, building_capacity FROM buildings WHERE building_id = $1",
      [buildingId]
    );
    
    // Return 404 if building doesn't exist in the database
    if (buildingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Building not found"
      });
    }
    
    const building = buildingResult.rows[0];
    
    // Fetch current snapshot (latest occupancy, color, timestamp) from current_status
    // May return empty if generator hasn't run yet
    const currentResult = await pool.query(
      "SELECT current_crowd, color, status_timestamp FROM current_status WHERE building_id = $1",
      [buildingId]
    );
    
    // Fetch time-series history from building_history for the requested time window
    // Hours parameter lets frontend request smaller windows (e.g., 6 hours) for faster load
    const historyResult = await pool.query(
      `SELECT current_crowd, timestamp 
       FROM building_history 
       WHERE building_id = $1 
         AND timestamp >= NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp ASC`,
      [buildingId]
    );
    
    // Transform history rows into enriched objects for frontend consumption
    // Add occupancy_rate percentage for easier chart rendering (not stored in DB)
    const historicalData = historyResult.rows.map(row => ({
      timestamp: row.timestamp,
      current_count: row.current_crowd,
      occupancy_rate: building.building_capacity > 0 
        ? Math.round((row.current_crowd / building.building_capacity) * 100) 
        : 0  // Avoid division by zero
    }));
    
    // Attempt to generate 15-minute EMA prediction if we have at least one data point
    let prediction = null;
    if (historicalData.length > 0) {
      try {
        prediction = predictBuildingOccupancy(historicalData, {
          minutesAhead: PREDICTION_MINUTES_AHEAD,  // 15-minute forecast
          periods: 12,                              // EMA smoothing factor
          minDataPoints: 3                          // Minimum required points
        });
      } catch (error) {
        // Log but continue - response will use fallback values
        console.error('EMA prediction error for building', buildingId, ':', error.message);
      }
    }
    
    // Extract current snapshot values, falling back to safe defaults if current_status is empty
    const currentCount = currentResult.rows.length > 0 ? currentResult.rows[0].current_crowd : 0;
    const currentColor = currentResult.rows.length > 0 ? currentResult.rows[0].color : '#cccccc';  // Gray default
    const lastUpdated = currentResult.rows.length > 0 ? currentResult.rows[0].status_timestamp : null;
    
    // Return comprehensive building data: metadata, current state, prediction, and time-series
    res.json({
      success: true,
      data: {
        buildingId: building.building_id,
        buildingName: building.building_name,
        capacity: building.building_capacity,
        currentCount,                                   // Latest observed count
        currentColor,                                    // Current heatmap color
        lastUpdated,                                     // Timestamp of latest update
        predictedCount: prediction ? prediction.prediction : currentCount,  // EMA forecast or fallback
        predictionConfidence: prediction ? prediction.confidence : 'low',   // Quality indicator
        predictionMethod: prediction ? prediction.method : 'fallback',      // 'ema' or 'fallback'
        predictionHorizonMinutes: prediction ? (prediction.horizonMinutes ?? PREDICTION_MINUTES_AHEAD) : PREDICTION_MINUTES_AHEAD,  // Always 15
        history: historicalData,                         // Array of time-series points
        prediction: prediction                           // Full prediction object (includes raw EMA details)
      }
    });
    
  } catch (error) {
    // Log error and return 500 status with error details
    console.error("Error fetching building history:", error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export router to be mounted in main Express app
module.exports = router;

