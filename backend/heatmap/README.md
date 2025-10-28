# Heatmap Backend

## Overview
- `backend/exhibition-map-backend/index.js` boots an Express API that exposes heatmap data, data-generator controls, and Telegram notification endpoints.
- PostgreSQL (`heatmap_db.js`) backs the service. Tables used at runtime: `buildings`, `current_status`, and `building_history`.
- Real-time occupancy values are produced by the data generator (`utils/dataGenerator.js`) and persisted every cycle. Historical rows fuel the EMA predictor (`utils/emaPrediction.js`).
- Optional Telegram alerts (`telegram_notifications/*`) push low-occupancy building updates to subscribed users.

## Runtime Flow
1. On start, the server loads environment variables from `.env`, establishes a PG pool, and attempts to initialize both the Telegram service and the data generator.
2. `dataGenerator.initialize()` caches building metadata. If `building_history` is sparse it backfills historical rows via `generateHistoricalData()`.
3. A repeating timer (default 10 s) writes fresh occupancy observations to `current_status` and appends them to `building_history`.
4. Heatmap routes (`routes/heatmap.js`) join `buildings` with `current_status`, enrich each row with a short-term EMA forecast, and return JSON to the frontend.
5. Telegram scheduler polls the same tables (default 10 s) and sends notifications when occupancy falls below the configured threshold.

## Key Endpoints
- `GET /heatmap/map-data` – live building snapshot with EMA predictions.
- `GET /heatmap/building/:buildingId/history?hours=N` – historical series plus 15-minute EMA projection for a single building.
- Responses include `prediction_confidence`, `prediction_method`, and `prediction_horizon_minutes` so clients can surface forecast metadata.
- `GET /telegram/status` / `POST /telegram/test` / `GET /telegram/buildings` – monitor or exercise the Telegram notification pipeline.
- `GET /generator/status`, `POST /generator/start`, `POST /generator/stop`, `POST /generator/generate-historical` – manage synthetic data creation.

## Configuration
- `.env` keys: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `PORT` (or `BACKEND_HEATMAP_SERVICE_PORT`).
- `utils/dataGenerator.js` controls timing and occupancy heuristics. The helper `resolveIntervalSeconds()` accepts legacy minute-based payloads.
- Telegram defaults live in `telegram_notifications/config.js` (threshold, interval, logging flags).

## Prediction Model
- `utils/emaPrediction.js` hosts the Exponential Moving Average logic (initialization, trend calculation, batch forecasts, and error metrics).
- Holt-style prediction has been removed; only EMA is invoked by the API. If EMA cannot run (insufficient points), the service falls back to the latest observed count.

## Development & Testing
- Install dependencies: `npm install` within `backend/exhibition-map-backend`.
- Development server: `npm run dev` (nodemon).
- Production run: `npm start` or `node index.js`.
- Test helpers under `test-*.js` and `debug-*.js` target manual inspection of generator output, DB contents, and notification delivery.

## Maintenance Notes
- Ensure the `buildings` table is populated before starting the generator; otherwise the API will return 503 (no data).
- Historical growth can be trimmed with SQL retention policies if the `building_history` table becomes large.
- When adjusting generator cadence, align Telegram scheduler intervals (`telegram_notifications/index.js`) to avoid overwhelming subscribers.
