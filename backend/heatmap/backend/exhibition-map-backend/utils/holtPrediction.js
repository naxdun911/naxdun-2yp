/**
 * Holt's Linear Trend Method Implementation
 * 
 * This algorithm is used for forecasting time series data that exhibits a trend.
 * It uses two smoothing parameters:
 * - Alpha (α): Controls the rate of learning for the level component
 * - Beta (β): Controls the rate of learning for the trend component
 * 
 * The method maintains two components:
 * - Level (Lt): The smoothed estimate of the current value
 * - Trend (Tt): The smoothed estimate of the current trend
 * 
 * Formulas:
 * Lt = α * Xt + (1 - α) * (Lt-1 + Tt-1)
 * Tt = β * (Lt - Lt-1) + (1 - β) * Tt-1
 * Forecast: Ft+h = Lt + h * Tt
 */

class HoltLinearTrend {
  constructor(alpha = 0.3, beta = 0.3) {
    this.alpha = alpha; // Level smoothing parameter (0 < α < 1)
    this.beta = beta;   // Trend smoothing parameter (0 < β < 1)
    this.level = null;  // Current level estimate
    this.trend = null;  // Current trend estimate
    this.initialized = false;
  }

  /**
   * Initialize the model with the first few data points
   * @param {Array} data - Array of {timestamp, value} objects
   */
  initialize(data) {
    if (data.length < 2) {
      throw new Error('Need at least 2 data points to initialize Holt\'s method');
    }

    // Initialize level with the first observation
    this.level = data[0].value;
    
    // Initialize trend with the difference between first two observations
    this.trend = data[1].value - data[0].value;
    
    this.initialized = true;
  }

  /**
   * Update the model with a new observation
   * @param {number} value - New observation value
   */
  update(value) {
    if (!this.initialized) {
      throw new Error('Model must be initialized before updating');
    }

    const previousLevel = this.level;
    
    // Update level: Lt = α * Xt + (1 - α) * (Lt-1 + Tt-1)
    this.level = this.alpha * value + (1 - this.alpha) * (previousLevel + this.trend);
    
    // Update trend: Tt = β * (Lt - Lt-1) + (1 - β) * Tt-1
    this.trend = this.beta * (this.level - previousLevel) + (1 - this.beta) * this.trend;
  }

  /**
   * Make a forecast h steps ahead
   * @param {number} steps - Number of steps ahead to forecast
   * @returns {number} Forecasted value
   */
  forecast(steps = 1) {
    if (!this.initialized) {
      throw new Error('Model must be initialized before forecasting');
    }

    // Forecast: Ft+h = Lt + h * Tt
    return Math.max(0, Math.round(this.level + steps * this.trend));
  }

  /**
   * Fit the model to historical data and return forecasts
   * @param {Array} data - Array of {timestamp, value} objects sorted by timestamp
   * @param {number} forecastSteps - Number of steps to forecast
   * @returns {Object} {fitted: Array, forecasts: Array, metrics: Object}
   */
  fit(data, forecastSteps = 1) {
    if (data.length < 3) {
      // Not enough data for meaningful prediction
      const lastValue = data.length > 0 ? data[data.length - 1].value : 0;
      return {
        fitted: data.map(d => ({ ...d, fitted: d.value })),
        forecasts: Array(forecastSteps).fill(lastValue),
        metrics: { mse: 0, mae: 0, mape: 0 }
      };
    }

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Initialize with first two points
    this.initialize(sortedData.slice(0, 2));
    
    const fitted = [];
    const errors = [];
    
    // Fit the model to historical data
    for (let i = 0; i < sortedData.length; i++) {
      const actual = sortedData[i].value;
      
      if (i >= 2) {
        // Update model with previous observation
        this.update(sortedData[i - 1].value);
      }
      
      // Make one-step-ahead forecast
      const forecast = i < 2 ? actual : this.forecast(1);
      
      fitted.push({
        ...sortedData[i],
        fitted: forecast
      });
      
      if (i >= 2) {
        const error = actual - forecast;
        errors.push({ error, actual, forecast });
      }
    }
    
    // Update with the last observation for final forecasting
    if (sortedData.length > 2) {
      this.update(sortedData[sortedData.length - 1].value);
    }
    
    // Generate forecasts
    const forecasts = [];
    for (let h = 1; h <= forecastSteps; h++) {
      forecasts.push(this.forecast(h));
    }
    
    // Calculate error metrics
    const metrics = this.calculateMetrics(errors);
    
    return { fitted, forecasts, metrics };
  }

  /**
   * Calculate error metrics for model evaluation
   * @param {Array} errors - Array of {error, actual, forecast} objects
   * @returns {Object} Error metrics
   */
  calculateMetrics(errors) {
    if (errors.length === 0) {
      return { mse: 0, mae: 0, mape: 0 };
    }

    const n = errors.length;
    const mse = errors.reduce((sum, e) => sum + e.error * e.error, 0) / n;
    const mae = errors.reduce((sum, e) => sum + Math.abs(e.error), 0) / n;
    
    // MAPE (Mean Absolute Percentage Error) - avoid division by zero
    const mape = errors.reduce((sum, e) => {
      return sum + (e.actual !== 0 ? Math.abs(e.error / e.actual) : 0);
    }, 0) / n * 100;
    
    return {
      mse: Math.round(mse * 100) / 100,
      mae: Math.round(mae * 100) / 100,
      mape: Math.round(mape * 100) / 100
    };
  }

  /**
   * Auto-tune parameters using grid search
   * @param {Array} data - Historical data
   * @param {Object} options - Tuning options
   * @returns {Object} Best parameters and metrics
   */
  static autoTune(data, options = {}) {
    const alphaRange = options.alphaRange || [0.1, 0.2, 0.3, 0.4, 0.5];
    const betaRange = options.betaRange || [0.1, 0.2, 0.3, 0.4, 0.5];
    
    let bestParams = { alpha: 0.3, beta: 0.3 };
    let bestMSE = Infinity;
    
    for (const alpha of alphaRange) {
      for (const beta of betaRange) {
        try {
          const model = new HoltLinearTrend(alpha, beta);
          const result = model.fit(data, 1);
          
          if (result.metrics.mse < bestMSE) {
            bestMSE = result.metrics.mse;
            bestParams = { alpha, beta };
          }
        } catch (error) {
          // Skip invalid parameter combinations
          continue;
        }
      }
    }
    
    return {
      bestParams,
      bestMSE,
      metrics: new HoltLinearTrend(bestParams.alpha, bestParams.beta).fit(data, 1).metrics
    };
  }
}

/**
 * Utility function to predict building occupancy
 * @param {Array} historicalData - Array of {timestamp, current_count} objects
 * @param {Object} options - Prediction options
 * @returns {Object} Prediction results
 */
function predictBuildingOccupancy(historicalData, options = {}) {
  const {
    forecastSteps = 1,
    autoTune = true,
    alpha = 0.3,
    beta = 0.3,
    minDataPoints = 5
  } = options;

  // Convert data format
  const data = historicalData.map(item => ({
    timestamp: item.timestamp,
    value: item.current_count
  }));

  if (data.length < minDataPoints) {
    // Not enough data - return simple average or last value
    const lastValue = data.length > 0 ? data[data.length - 1].value : 0;
    return {
      prediction: lastValue,
      confidence: 'low',
      method: 'fallback',
      forecasts: Array(forecastSteps).fill(lastValue),
      metrics: null
    };
  }

  try {
    let model;
    let modelParams = { alpha, beta };

    if (autoTune) {
      const tuningResult = HoltLinearTrend.autoTune(data);
      modelParams = tuningResult.bestParams;
    }

    model = new HoltLinearTrend(modelParams.alpha, modelParams.beta);
    const result = model.fit(data, forecastSteps);

    const prediction = result.forecasts[0];
    const confidence = result.metrics.mape < 20 ? 'high' : result.metrics.mape < 40 ? 'medium' : 'low';

    return {
      prediction,
      confidence,
      method: 'holt_linear_trend',
      forecasts: result.forecasts,
      metrics: result.metrics,
      parameters: modelParams,
      fitted: result.fitted
    };

  } catch (error) {
    console.error('Error in Holt prediction:', error.message);
    
    // Fallback to simple prediction
    const lastValue = data.length > 0 ? data[data.length - 1].value : 0;
    return {
      prediction: lastValue,
      confidence: 'low',
      method: 'fallback',
      forecasts: Array(forecastSteps).fill(lastValue),
      metrics: null,
      error: error.message
    };
  }
}

module.exports = {
  HoltLinearTrend,
  predictBuildingOccupancy
};