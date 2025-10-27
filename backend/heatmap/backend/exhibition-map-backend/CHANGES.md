# Backend Changes: EMA Prediction & Data Generator

## Overview
This document describes the changes made to replace Holt's Linear prediction with Exponential Moving Average (EMA) prediction and implement an automated data generator.

## Changes Summary

### 1. **New EMA Prediction Module** (`utils/emaPrediction.js`)
- Replaced Holt's Linear Trend prediction with Exponential Moving Average
- Predicts building occupancy **1 hour ahead** based on historical data
- More responsive to recent changes in occupancy patterns
- Simpler and more efficient than Holt's Linear method

**Key Features:**
- Configurable smoothing factor (alpha) and periods
- Automatic confidence calculation based on data variability
- Error metrics (MAE, RMSE, MAPE) for model evaluation
- Fallback mechanism for insufficient data

**API:**
```javascript
const { predictBuildingOccupancy } = require('./utils/emaPrediction');

const result = predictBuildingOccupancy(historicalData, {
  hoursAhead: 1,      // Predict 1 hour ahead
  periods: 12,         // Use 12 periods for smoothing
  minDataPoints: 3     // Minimum data required
});

// Result contains:
// - prediction: predicted count
// - confidence: 'high', 'medium', or 'low'
// - method: 'exponential_moving_average'
// - ema: current EMA value
// - trend: current trend direction
// - metrics: error metrics
```

### 2. **Data Generator Module** (`utils/dataGenerator.js`)
- Automatically generates realistic occupancy data for all buildings
- Considers time-of-day and day-of-week patterns
- Writes data to existing database structure
- Supports historical data generation for initial setup

**Features:**
- **Time-based patterns**: Higher occupancy during class hours (8am-6pm)
- **Day-based patterns**: Lower occupancy on weekends
- **Building-specific patterns**: Different base occupancy for different building types
- **Random variations**: Simulates real-world behavior
- **Capacity constraints**: Ensures counts don't exceed building capacity

**Automatic Data Generation:**
- Generates data every **10 seconds** by default
- Writes to `current_status` and `building_history` tables
- Automatically generates 1 hour of historical data on first run

### 3. **Updated Routes** (`routes/heatmap.js`)
- Replaced `holtPrediction` import with `emaPrediction`
- Updated all prediction calls to use EMA method
- Changed prediction window from 24 hours to 6 hours (more relevant recent data)
- Added `prediction_method` field to API responses
- **No changes to API endpoints or response structure** (frontend compatible)

**API Endpoints Remain Unchanged:**
- `GET /heatmap/map-data` - Get current building data with predictions
- `GET /heatmap/building/:buildingId/history` - Get building history and predictions

### 4. **Updated Main Server** (`index.js`)
- Integrated data generator service
- Auto-initializes and starts data generator on server startup
- Generates historical data if database is empty
- Added new data generator management endpoints

**New Endpoints:**
- `GET /generator/status` - Check generator status
- `POST /generator/start` - Start data generator
- `POST /generator/stop` - Stop data generator
- `POST /generator/generate-historical` - Generate historical data

### 5. **Testing** (`test-ema-prediction.js`)
- Comprehensive test suite for EMA prediction
- Tests various scenarios: increasing trend, decreasing trend, stable pattern
- Validates fallback behavior
- Run with: `node test-ema-prediction.js`

## Files Changed

### Modified Files:
1. `routes/heatmap.js` - Updated to use EMA predictions
2. `index.js` - Integrated data generator service

### New Files:
1. `utils/emaPrediction.js` - EMA prediction implementation
2. `utils/dataGenerator.js` - Data generator service
3. `test-ema-prediction.js` - Test suite

### Unchanged Files (Still Compatible):
- `heatmap_db.js` - Database connection (no changes)
- `.env` - Environment variables (no changes)
- `package.json` - Dependencies (no new packages needed)
- All database tables - No schema changes

## Database Interaction

The data generator writes to existing tables:
- `current_status` - Current occupancy and color for each building
- `building_history` - Historical occupancy records
- `buildings` - Building metadata (read-only for generator)

**No database schema changes required!**

## How It Works

### Data Flow:
```
Data Generator (every 5 min)
    ↓
Generate realistic occupancy data
    ↓
Write to database tables:
  - current_status
  - building_history
    ↓
Frontend requests data via /heatmap/map-data
    ↓
Backend retrieves data from database
    ↓
EMA prediction calculates 1-hour forecast
    ↓
Response sent to frontend (same format as before)
```

### Prediction Process:
1. Fetch last 6 hours of historical data for building
2. Initialize EMA model with historical data
3. Calculate current EMA and trend
4. Predict occupancy 1 hour ahead
5. Calculate confidence based on data variability
6. Return prediction with current data

## Frontend Compatibility

✅ **No frontend changes required!**

- All API endpoints remain the same
- Response format is identical
- Added fields are backward compatible:
  - `prediction_method` (new field)
  - `predicted_count` (existing field, improved calculation)
  - `prediction_confidence` (existing field)

## Configuration

### Data Generator Settings (in code):
```javascript
// Default generation interval
generationIntervalMinutes: 5

// Time-based multipliers
- Night (12am-6am): 5%
- Morning (8am-10am): 100%
- Lunch (12pm-2pm): 120%
- Evening (6pm-8pm): 40%

// Day-based multipliers
- Weekdays: 100%
- Saturday: 30%
- Sunday: 20%
```

### EMA Prediction Settings:
```javascript
// Default configuration
{
  hoursAhead: 1,        // Predict 1 hour ahead
  periods: 12,          // 12 periods for smoothing
  minDataPoints: 3      // Minimum 3 data points required
}
```

## Starting the System

1. **Install dependencies** (if not already installed):
   ```bash
   cd backend/heatmap/backend/exhibition-map-backend
   npm install
   ```

2. **Ensure database is running** (PostgreSQL)

3. **Start the backend**:
   ```bash
   npm run dev
   ```

4. **Automatic initialization**:
  - Data generator automatically initializes
  - If database is empty, generates 1 hour of historical data
  - Starts generating data every 10 seconds
  - EMA predictions are calculated on each API request

## Testing

### Test EMA Prediction:
```bash
node test-ema-prediction.js
```

### Test Data Generator:
```bash
# Start the backend
npm run dev

# Check generator status
curl http://localhost:3897/generator/status

# View generated data
curl http://localhost:3897/heatmap/map-data
```

### Test Predictions:
```bash
# Get building history with predictions
curl http://localhost:3897/heatmap/building/B1/history
```

## API Examples

### Get Map Data with Predictions:
```bash
GET http://localhost:3897/heatmap/map-data
```

Response:
```json
{
  "success": true,
  "source": "Database Cache",
  "data": [
    {
      "building_id": "B1",
      "building_name": "Engineering Carpentry Shop",
      "current_crowd": 45,
      "building_capacity": 100,
      "color": "#eab308",
      "status_timestamp": "2025-10-27T10:30:00",
      "predicted_count": 52,
      "prediction_confidence": "high",
      "prediction_method": "exponential_moving_average"
    }
  ]
}
```

### Get Building History:
```bash
GET http://localhost:3897/heatmap/building/B1/history?hours=24
```

### Control Data Generator:
```bash
# Stop generator
POST http://localhost:3897/generator/stop

# Start generator with 10-minute interval
POST http://localhost:3897/generator/start
Body: { "intervalMinutes": 10 }

# Generate historical data
POST http://localhost:3897/generator/generate-historical
Body: { "hoursBack": 48, "intervalMinutes": 5 }
```

## Benefits of Changes

### EMA vs Holt's Linear:
1. **Simpler**: Fewer parameters to tune
2. **Faster**: Less computational overhead
3. **More responsive**: Reacts quickly to recent changes
4. **More stable**: Better for short-term predictions
5. **More accurate**: For 1-hour predictions with frequent data updates

### Data Generator:
1. **Realistic data**: Simulates actual usage patterns
2. **Consistent testing**: No need for external data sources
3. **Historical data**: Automatic backfill for testing
4. **Customizable**: Easy to adjust patterns and behaviors
5. **Autonomous**: Runs automatically without manual intervention

## Troubleshooting

### Data Generator Not Starting:
- Check database connection in `.env`
- Ensure `buildings` table has data
- Check console logs for error messages

### Predictions Not Working:
- Ensure sufficient historical data (at least 3 data points)
- Check if data generator is running: `GET /generator/status`
- Verify database has recent data in `building_history` table

### Frontend Not Showing Predictions:
- API response format is unchanged
- Check browser console for errors
- Verify `predicted_count` field in API response

## Future Enhancements

Possible improvements:
1. Add more sophisticated prediction models (ARIMA, Prophet)
2. Implement seasonal pattern detection
3. Add special event handling (exams, holidays)
4. Support for multiple prediction horizons
5. Machine learning-based occupancy prediction
6. Real-time prediction accuracy monitoring

## Notes

- **No sensitive files modified**: `.env`, `package.json` remain unchanged
- **Database schema unchanged**: All existing tables work as before
- **Frontend compatible**: No API breaking changes
- **Old prediction file**: `utils/holtPrediction.js` can be safely removed or kept as reference
- **Backward compatible**: System can fall back to last known value if prediction fails
