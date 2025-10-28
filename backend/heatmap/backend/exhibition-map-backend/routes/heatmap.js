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
    let snapshot = [];

    try {
      snapshot = await getCurrentSnapshot();
    } catch (snapshotError) {
      console.error('Snapshot helper failed, falling back to direct query:', snapshotError.message);
    }

    if (snapshot.length === 0) {
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

      if (dbResult.rows.length === 0) {
        return res.status(503).json({
          success: false,
          error: "No building occupancy data available. Ensure the data generator is running."
        });
      }

      const dataWithPredictions = [];

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

      snapshot = dataWithPredictions;
    }

    res.json({
      success: true,
      source: "Current Status",
      data: snapshot
    });

  } catch (error) {
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
    
  // Get historical data for the requested window
    const historyResult = await pool.query(
      `SELECT current_crowd, timestamp 
       FROM building_history 
       WHERE building_id = $1 
         AND timestamp >= NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp ASC`,
      [buildingId]
    );
    
    // Format historical data for prediction and add an occupancy percent for charts
    const historicalData = historyResult.rows.map(row => ({
      timestamp: row.timestamp,
      current_count: row.current_crowd,
      occupancy_rate: building.building_capacity > 0 
        ? Math.round((row.current_crowd / building.building_capacity) * 100) 
        : 0
    }));
    
    // Generate predictions using EMA method (15 minutes ahead)
    let prediction = null;
    if (historicalData.length > 0) {
      try {
        prediction = predictBuildingOccupancy(historicalData, {
          minutesAhead: PREDICTION_MINUTES_AHEAD,
          periods: 12,
          minDataPoints: 3
        });
      } catch (error) {
        console.error('EMA prediction error for building', buildingId, ':', error.message);
      }
    }
    
  // Current data snapshot (falls back to zero/neutral color when absent)
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
        predictionHorizonMinutes: prediction ? (prediction.horizonMinutes ?? PREDICTION_MINUTES_AHEAD) : PREDICTION_MINUTES_AHEAD,
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

