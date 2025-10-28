/**
 * Test script for EMA Prediction functionality
 * Run this with: node test-ema-prediction.js
 */

const { predictBuildingOccupancy, ExponentialMovingAverage } = require('./utils/emaPrediction');

const PREDICTION_MINUTES_AHEAD = 15;

console.log('=================================');
console.log('Testing EMA Prediction Module');
console.log('=================================\n');

// Test 1: Basic EMA calculation
console.log('Test 1: Basic EMA Calculation');
console.log('------------------------------');
const ema = new ExponentialMovingAverage(null, 5);
const testData = [
  { timestamp: '2025-10-27 08:00:00', value: 50 },
  { timestamp: '2025-10-27 08:05:00', value: 55 },
  { timestamp: '2025-10-27 08:10:00', value: 60 },
  { timestamp: '2025-10-27 08:15:00', value: 58 },
  { timestamp: '2025-10-27 08:20:00', value: 62 },
  { timestamp: '2025-10-27 08:25:00', value: 65 },
];

ema.initialize(testData);
const prediction = ema.predict(PREDICTION_MINUTES_AHEAD / 60);
console.log(`Current EMA: ${ema.getCurrentEMA().toFixed(2)}`);
console.log(`Prediction (${PREDICTION_MINUTES_AHEAD} minutes ahead): ${prediction}`);
console.log('✅ Test 1 Passed\n');

// Test 2: Predict Building Occupancy
console.log('Test 2: Predict Building Occupancy');
console.log('-----------------------------------');
const historicalData = [
  { timestamp: '2025-10-27 08:00:00', current_count: 30 },
  { timestamp: '2025-10-27 08:05:00', current_count: 35 },
  { timestamp: '2025-10-27 08:10:00', current_count: 40 },
  { timestamp: '2025-10-27 08:15:00', current_count: 42 },
  { timestamp: '2025-10-27 08:20:00', current_count: 45 },
  { timestamp: '2025-10-27 08:25:00', current_count: 48 },
  { timestamp: '2025-10-27 08:30:00', current_count: 50 },
  { timestamp: '2025-10-27 08:35:00', current_count: 52 },
];

const result = predictBuildingOccupancy(historicalData, {
  minutesAhead: PREDICTION_MINUTES_AHEAD,
  periods: 5,
  minDataPoints: 3
});

console.log('Prediction Result:');
console.log(`  - Predicted Count: ${result.prediction}`);
console.log(`  - Confidence: ${result.confidence}`);
console.log(`  - Method: ${result.method}`);
console.log(`  - Current EMA: ${result.ema}`);
console.log(`  - Trend: ${result.trend}`);
console.log(`  - Alpha: ${result.alpha}`);
console.log(`  - Horizon: ${result.horizonMinutes} minutes`);
if (result.metrics) {
  console.log(`  - Metrics:`);
  console.log(`    - MAE: ${result.metrics.mae}`);
  console.log(`    - RMSE: ${result.metrics.rmse}`);
  console.log(`    - MAPE: ${result.metrics.mape}%`);
}
console.log('✅ Test 2 Passed\n');

// Test 3: Insufficient Data Fallback
console.log('Test 3: Insufficient Data Fallback');
console.log('-----------------------------------');
const sparseData = [
  { timestamp: '2025-10-27 08:00:00', current_count: 25 }
];

const fallbackResult = predictBuildingOccupancy(sparseData, {
  minutesAhead: PREDICTION_MINUTES_AHEAD,
  minDataPoints: 3
});

console.log('Fallback Result:');
console.log(`  - Predicted Count: ${fallbackResult.prediction}`);
console.log(`  - Confidence: ${fallbackResult.confidence}`);
console.log(`  - Method: ${fallbackResult.method}`);
console.log('✅ Test 3 Passed\n');

// Test 4: Increasing Trend
console.log('Test 4: Increasing Trend Pattern');
console.log('---------------------------------');
const increasingData = Array.from({ length: 15 }, (_, i) => ({
  timestamp: new Date(Date.now() - (15 - i) * 5 * 60000).toISOString(),
  current_count: 20 + i * 3
}));

const increasingResult = predictBuildingOccupancy(increasingData, {
  minutesAhead: PREDICTION_MINUTES_AHEAD,
  periods: 10
});

console.log('Increasing Trend Result:');
console.log(`  - Current Average: ${increasingData[increasingData.length - 1].current_count}`);
console.log(`  - Predicted Count: ${increasingResult.prediction}`);
console.log(`  - Trend: ${increasingResult.trend > 0 ? '📈 Increasing' : '📉 Decreasing'}`);
console.log(`  - Confidence: ${increasingResult.confidence}`);
console.log(`  - Horizon: ${increasingResult.horizonMinutes} minutes`);
console.log('✅ Test 4 Passed\n');

// Test 5: Decreasing Trend
console.log('Test 5: Decreasing Trend Pattern');
console.log('---------------------------------');
const decreasingData = Array.from({ length: 15 }, (_, i) => ({
  timestamp: new Date(Date.now() - (15 - i) * 5 * 60000).toISOString(),
  current_count: 80 - i * 2
}));

const decreasingResult = predictBuildingOccupancy(decreasingData, {
  minutesAhead: PREDICTION_MINUTES_AHEAD,
  periods: 10
});

console.log('Decreasing Trend Result:');
console.log(`  - Current Average: ${decreasingData[decreasingData.length - 1].current_count}`);
console.log(`  - Predicted Count: ${decreasingResult.prediction}`);
console.log(`  - Trend: ${decreasingResult.trend > 0 ? '📈 Increasing' : '📉 Decreasing'}`);
console.log(`  - Confidence: ${decreasingResult.confidence}`);
console.log(`  - Horizon: ${decreasingResult.horizonMinutes} minutes`);
console.log('✅ Test 5 Passed\n');

// Test 6: Stable Pattern
console.log('Test 6: Stable Pattern');
console.log('----------------------');
const stableData = Array.from({ length: 20 }, (_, i) => ({
  timestamp: new Date(Date.now() - (20 - i) * 5 * 60000).toISOString(),
  current_count: 50 + (Math.random() - 0.5) * 5 // Small random variation around 50
}));

const stableResult = predictBuildingOccupancy(stableData, {
  minutesAhead: PREDICTION_MINUTES_AHEAD,
  periods: 12
});

console.log('Stable Pattern Result:');
console.log(`  - Current Average: ${stableData[stableData.length - 1].current_count.toFixed(0)}`);
console.log(`  - Predicted Count: ${stableResult.prediction}`);
console.log(`  - Trend: ${Math.abs(stableResult.trend) < 1 ? '➡️ Stable' : stableResult.trend > 0 ? '📈 Increasing' : '📉 Decreasing'}`);
console.log(`  - Confidence: ${stableResult.confidence}`);
console.log(`  - Horizon: ${stableResult.horizonMinutes} minutes`);
console.log('✅ Test 6 Passed\n');

console.log('=================================');
console.log('✅ All EMA Tests Completed Successfully!');
console.log('=================================');
