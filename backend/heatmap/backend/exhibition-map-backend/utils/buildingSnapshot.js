const pool = require('../heatmap_db');
const { predictBuildingOccupancy } = require('./emaPrediction');

const nameMap = {
  B1: 'Engineering Carpentry Shop',
  B2: 'Engineering Workshop',
  B3: 'B3',
  B4: 'Generator Room',
  B5: 'B5',
  B6: 'Structure Lab',
  B7: 'Administrative Building',
  B8: 'Canteen',
  B9: 'Lecture Room 10/11',
  B10: 'Engineering Library',
  B11: 'Department of Chemical and process Engineering',
  B12: 'Security Unit',
  B13: 'Drawing Office 2',
  B14: 'Faculty Canteen',
  B15: 'Department of Manufacturing and Industrial Engineering',
  B16: 'Professor E.O.E. Perera Theater',
  B17: 'Electronic Lab',
  B18: 'Washrooms',
  B19: 'Electrical and Electronic Workshop',
  B20: 'Department of Computer Engineering',
  B21: 'B21',
  B22: 'Environmental Lab',
  B23: 'Applied Mechanics Lab',
  B24: 'New Mechanics Lab',
  B25: 'B25',
  B26: 'B26',
  B27: 'B27',
  B28: 'Materials Lab',
  B29: 'Thermodynamics Lab',
  B30: 'Fluids Lab',
  B31: 'Surveying and Soil Lab',
  B32: 'Department of Engineering Mathematics',
  B33: 'Drawing Office 1',
  B34: 'Department of Electrical and Electronic Engineering'
};

const getHeatmapColor = (current, capacity) => {
  if (capacity <= 0) return '#cccccc';
  const ratio = current / capacity;
  if (ratio < 0.2) return '#22c55e';
  if (ratio < 0.5) return '#eab308';
  if (ratio < 0.8) return '#f97316';
  return '#ef4444';
};

const fetchHistory = (id) => pool.query(
  `SELECT current_crowd, timestamp
     FROM building_history
    WHERE building_id = $1
      AND timestamp >= NOW() - INTERVAL '6 hours'
    ORDER BY timestamp ASC`,
  [id]
);

const computeHistoryStats = (historyRows) => {
  if (!historyRows || !historyRows.length) {
    return {
      averageCrowd: null,
      sampleCount: 0,
      windowHours: null,
      latestTimestamp: null
    };
  }

  const total = historyRows.reduce((sum, row) => sum + (Number(row.current_crowd) || 0), 0);
  const averageCrowd = total / historyRows.length;
  const firstTimestamp = historyRows[0]?.timestamp || null;
  const lastTimestamp = historyRows[historyRows.length - 1]?.timestamp || null;
  let windowHours = null;

  if (firstTimestamp && lastTimestamp) {
    const diffMs = new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime();
    windowHours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
  }

  return {
    averageCrowd,
    sampleCount: historyRows.length,
    windowHours,
    latestTimestamp: lastTimestamp
  };
};

const buildPrediction = (historyRows, fallback) => {
  if (historyRows.length < 3) {
    return {
      predicted: fallback,
      confidence: 'low',
      method: 'fallback'
    };
  }

  const series = historyRows.map((row) => ({
    timestamp: row.timestamp,
    current_count: row.current_crowd
  }));

  try {
    const prediction = predictBuildingOccupancy(series, {
      hoursAhead: 1,
      periods: 12,
      minDataPoints: 3
    });

    if (prediction && prediction.method !== 'fallback') {
      return {
        predicted: Math.round(prediction.prediction),
        confidence: prediction.confidence,
        method: prediction.method
      };
    }
  } catch (error) {
    console.error('Prediction error:', error.message);
  }

  return {
    predicted: fallback,
    confidence: 'low',
    method: 'fallback'
  };
};

async function getCurrentSnapshot() {
  const { rows } = await pool.query(
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

  if (!rows.length) {
    return [];
  }

  const histories = await Promise.all(rows.map((row) => fetchHistory(row.building_id)));

  const snapshot = [];

  rows.forEach((row, index) => {
    const fallback = Math.round(row.current_crowd || 0);
    const historyRows = histories[index].rows || [];
    const prediction = buildPrediction(historyRows, fallback);
    const historyStats = computeHistoryStats(historyRows);

    snapshot.push({
      building_id: row.building_id,
      building_name: nameMap[row.building_id] || row.building_name,
      building_capacity: row.building_capacity,
      current_crowd: fallback,
      predicted_count: prediction.predicted,
      prediction_confidence: prediction.confidence,
      prediction_method: prediction.method,
      color: row.color || getHeatmapColor(fallback, row.building_capacity),
      status_timestamp: row.status_timestamp,
      history_average_crowd: historyStats.averageCrowd,
      history_sample_count: historyStats.sampleCount,
      history_window_hours: historyStats.windowHours,
      history_latest_timestamp: historyStats.latestTimestamp
    });
  });

  return snapshot;
}

module.exports = { getCurrentSnapshot };
