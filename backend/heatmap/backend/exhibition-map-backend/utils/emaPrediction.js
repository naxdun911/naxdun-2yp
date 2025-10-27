/**
 * Exponential Moving Average (EMA) Prediction Implementation
 * 
 * EMA is a type of moving average that places greater weight on the most recent data points.
 * It's more responsive to recent changes compared to Simple Moving Average (SMA).
 * 
 * Formula: EMA_t = α * Value_t + (1 - α) * EMA_(t-1)
 * Where α (alpha) is the smoothing factor: α = 2 / (N + 1)
 * N is the number of periods
 * 
 * For prediction, we use the trend between current and previous EMA values.
 */

class ExponentialMovingAverage {
  constructor(alpha = null, periods = 12) {
    // If alpha not provided, calculate from periods: α = 2/(N+1)
    this.alpha = alpha !== null ? alpha : 2 / (periods + 1);
    this.periods = periods;
    this.ema = null;
    this.previousEma = null;
    this.initialized = false;
    this.history = [];
  }

  /**
   * Initialize EMA with historical data
   * @param {Array} data - Array of {timestamp, value} objects
   */
  initialize(data) {
    if (data.length === 0) {
      throw new Error('Need at least 1 data point to initialize EMA');
    }

    // Start with Simple Moving Average of first N points (or all if less than N)
    const initialPoints = data.slice(0, Math.min(this.periods, data.length));
    const sum = initialPoints.reduce((acc, d) => acc + d.value, 0);
    this.ema = sum / initialPoints.length;
    this.previousEma = this.ema;
    
    // Calculate EMA for remaining points
    for (let i = initialPoints.length; i < data.length; i++) {
      this.update(data[i].value);
    }
    
    this.initialized = true;
    this.history = [...data];
  }

  /**
   * Update EMA with a new value
   * @param {number} value - New observation
   */
  update(value) {
    if (!this.initialized) {
      this.ema = value;
      this.previousEma = value;
      this.initialized = true;
      return;
    }

    this.previousEma = this.ema;
    // EMA = α * Value + (1 - α) * Previous_EMA
    this.ema = this.alpha * value + (1 - this.alpha) * this.previousEma;
  }

  /**
   * Calculate trend and make prediction
   * @param {number} hoursAhead - Number of hours to predict ahead (default 1)
   * @returns {number} Predicted value
   */
  predict(hoursAhead = 1) {
    if (!this.initialized) {
      throw new Error('EMA must be initialized before prediction');
    }

    // Calculate trend from current and previous EMA
    const trend = this.ema - this.previousEma;
    
    // Prediction: Current EMA + (trend * hours ahead)
    const prediction = this.ema + (trend * hoursAhead);
    
    // Ensure non-negative values
    return Math.max(0, Math.round(prediction));
  }

  /**
   * Get current EMA value
   * @returns {number} Current EMA
   */
  getCurrentEMA() {
    return this.ema;
  }

  /**
   * Calculate prediction confidence based on data variability
   * @param {Array} data - Historical data
   * @returns {string} 'high', 'medium', or 'low'
   */
  calculateConfidence(data) {
    if (data.length < 3) return 'low';

    // Calculate coefficient of variation (CV = std_dev / mean)
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    if (mean === 0) return 'low';
    
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    // Lower CV = more stable data = higher confidence
    if (cv < 0.15) return 'high';
    if (cv < 0.35) return 'medium';
    return 'low';
  }

  /**
   * Calculate error metrics for model evaluation
   * @param {Array} actual - Actual values
   * @param {Array} predicted - Predicted values
   * @returns {Object} Error metrics
   */
  static calculateMetrics(actual, predicted) {
    if (actual.length === 0 || actual.length !== predicted.length) {
      return { mae: 0, mape: 0, rmse: 0 };
    }

    const n = actual.length;
    let sumAbsError = 0;
    let sumSquaredError = 0;
    let sumPercentError = 0;
    let validMapeCount = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - predicted[i];
      sumAbsError += Math.abs(error);
      sumSquaredError += error * error;
      
      if (actual[i] !== 0) {
        sumPercentError += Math.abs(error / actual[i]);
        validMapeCount++;
      }
    }

    const mae = sumAbsError / n;
    const rmse = Math.sqrt(sumSquaredError / n);
    const mape = validMapeCount > 0 ? (sumPercentError / validMapeCount) * 100 : 0;

    return {
      mae: Math.round(mae * 100) / 100,
      rmse: Math.round(rmse * 100) / 100,
      mape: Math.round(mape * 100) / 100
    };
  }
}

/**
 * Main function to predict building occupancy using EMA
 * @param {Array} historicalData - Array of {timestamp, current_count} objects
 * @param {Object} options - Prediction options
 * @returns {Object} Prediction results
 */
function predictBuildingOccupancy(historicalData, options = {}) {
  const {
    hoursAhead = 1,
    periods = 12,
    alpha = null,
    minDataPoints = 3
  } = options;

  // Convert data format
  const data = historicalData.map(item => ({
    timestamp: item.timestamp,
    value: item.current_count || item.current_crowd || 0
  }));

  // Handle insufficient data
  if (data.length < minDataPoints) {
    const lastValue = data.length > 0 ? data[data.length - 1].value : 0;
    return {
      prediction: lastValue,
      confidence: 'low',
      method: 'fallback',
      ema: lastValue,
      trend: 0,
      metrics: null
    };
  }

  try {
    // Initialize EMA model
    const emaModel = new ExponentialMovingAverage(alpha, periods);
    emaModel.initialize(data);

    // Make prediction
    const prediction = emaModel.predict(hoursAhead);
    const currentEMA = emaModel.getCurrentEMA();
    const trend = currentEMA - emaModel.previousEma;
    
    // Calculate confidence
    const confidence = emaModel.calculateConfidence(data);

    // Calculate metrics by doing one-step-ahead predictions on historical data
    const actual = [];
    const predicted = [];
    
    if (data.length > periods + 1) {
      for (let i = periods; i < data.length - 1; i++) {
        const trainData = data.slice(0, i + 1);
        const testModel = new ExponentialMovingAverage(alpha, periods);
        testModel.initialize(trainData);
        predicted.push(testModel.predict(1));
        actual.push(data[i + 1].value);
      }
    }

    const metrics = predicted.length > 0 
      ? ExponentialMovingAverage.calculateMetrics(actual, predicted)
      : null;

    return {
      prediction,
      confidence,
      method: 'exponential_moving_average',
      ema: Math.round(currentEMA * 100) / 100,
      trend: Math.round(trend * 100) / 100,
      alpha: emaModel.alpha,
      periods: emaModel.periods,
      metrics,
      dataPoints: data.length
    };

  } catch (error) {
    console.error('Error in EMA prediction:', error.message);
    
    // Fallback to last known value
    const lastValue = data.length > 0 ? data[data.length - 1].value : 0;
    return {
      prediction: lastValue,
      confidence: 'low',
      method: 'fallback',
      ema: lastValue,
      trend: 0,
      metrics: null,
      error: error.message
    };
  }
}

/**
 * Batch predict for multiple buildings
 * @param {Object} buildingsHistoryMap - Map of building_id to historical data
 * @param {Object} options - Prediction options
 * @returns {Object} Map of building_id to prediction results
 */
function batchPredictOccupancy(buildingsHistoryMap, options = {}) {
  const results = {};
  
  for (const [buildingId, historicalData] of Object.entries(buildingsHistoryMap)) {
    try {
      results[buildingId] = predictBuildingOccupancy(historicalData, options);
    } catch (error) {
      console.error(`Error predicting for building ${buildingId}:`, error.message);
      results[buildingId] = {
        prediction: 0,
        confidence: 'low',
        method: 'error',
        error: error.message
      };
    }
  }
  
  return results;
}

module.exports = {
  ExponentialMovingAverage,
  predictBuildingOccupancy,
  batchPredictOccupancy
};
