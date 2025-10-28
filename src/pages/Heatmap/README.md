# Heatmap Frontend

## Page Structure
- `CrowdManagement.tsx` orchestrates the heatmap dashboard. On mount it polls `GET /heatmap/map-data` every 10 s, normalises payloads, and passes them to child widgets. A graceful loading/error state is shared via `utils/uiHelpers.jsx`.
- `SvgHeatmap.jsx` embeds `campus.svg`, paints shapes with live colours, and injects a rich popup that includes a nested `BuildingHistoryChart`. It also exposes a searchable building list, zoom controls, and live summary counters.
- `BuildingHistoryChart.tsx` (Recharts + axios) renders the per-building history fetched from `GET /heatmap/building/:id/history`. It automatically formats timestamps and shows basic stats (peak, average, point count).
- `BuildingOccupancyChart.tsx` displays portfolio-level trends (current vs predicted) using Recharts line charts and summary cards, honouring the backend-provided 15-minute forecast horizon.
- `utils/uiHelpers.jsx` provides lightweight loading/error components and reusable style tokens.

## Data & Refresh Behaviour
- Environment variable `VITE_HEATMAP_API_URL` controls the backend base URL; defaults to `http://localhost:3897` for local dev.
- Polling cadence is fixed at 10 s inside `CrowdManagement.tsx`. The component keeps the last successful dataset so transient failures do not blank the UI.
- The popup inside `SvgHeatmap.jsx` lazily requests building history only when a region is clicked, reducing network chatter.

## Dependencies
- Charts: `recharts` for both history and aggregate charts.
- Icons: `lucide-react` for consistent SVG icons across the page.
- HTTP: `axios` for history lookups (inside chart/popup) and the native `fetch` API for the main map polling.

## Removed Legacy Components
- Older `HeatMap.jsx`, `BuildingChartsModal.tsx`, and `utils/api.js` helpers were unused and have been deleted in favour of the SVG-driven experience. Keep new work aligned with `CrowdManagement.tsx` to avoid resurrecting stale code paths.

## Extending the Page
- Prefer co-locating any new widgets under `src/pages/Heatmap/` and wire them through `CrowdManagement.tsx`.
- When expanding popup content, consider extracting shared logic from `SvgHeatmap.jsx` into focused hooks/utilities to keep the file manageable.
- Use Tailwind/utility classes sparingly inside inline styles; the current layout relies heavily on inline CSS for SVG overlays.
