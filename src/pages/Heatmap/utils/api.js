// Simple API client for the frontend to talk to the backend (code 1)
// Uses VITE_API_BASE if provided, else defaults to http://localhost:5000
// For heatmap backend, use specific port 3897

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_MAIN_API_URL || 'http://localhost:5000';
const HEATMAP_API_BASE = import.meta.env.VITE_HEATMAP_API_BASE || 'http://localhost:3897';

export async function fetchCrowd(intervalMinutes = 30) {
  const url = `${HEATMAP_API_BASE}/heatmap/map-data?interval=${encodeURIComponent(intervalMinutes)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch crowd data (${res.status})`);
  return res.json();
}

export async function fetchBuildingHistoryByName(buildingName) {
  // First, get the current map data to find the building ID by name
  const mapDataUrl = `${HEATMAP_API_BASE}/heatmap/map-data`;
  const mapRes = await fetch(mapDataUrl);
  if (!mapRes.ok) throw new Error(`Failed to fetch map data (${mapRes.status})`);
  const mapData = await mapRes.json();
  
  // Find the building by name
  const building = mapData.buildings?.find(b => 
    b.buildingName === buildingName || b.name === buildingName
  );
  
  if (!building) {
    throw new Error(`Building "${buildingName}" not found`);
  }
  
  // Now fetch the history using the building ID
  const historyUrl = `${HEATMAP_API_BASE}/heatmap/building/${building.buildingId || building.id}/history`;
  const historyRes = await fetch(historyUrl);
  if (!historyRes.ok) throw new Error(`Failed to fetch history for ${buildingName} (${historyRes.status})`);
  
  const historyData = await historyRes.json();
  
  // Transform the data to match the expected format for the frontend
  return historyData.map(item => ({
    timestamp: new Date(item.timestamp).toLocaleTimeString(),
    current_count: item.current_crowd || item.current_count
  }));
}

// Get interval options from frontend env (comma-separated), else default list
export function getIntervalOptions() {
  const raw = import.meta.env.VITE_INTERVALS;
  if (raw && typeof raw === 'string') {
    const arr = raw
      .split(',')
      .map(s => Number(String(s).trim()))
      .filter(n => Number.isFinite(n) && n > 0);
    if (arr.length) return arr;
  }
  // Default candidates commonly supported by the backend
  return [1, 2, 5, 10, 15, 30, 60, 120];
}

// Polling options (seconds) for auto-refresh. From VITE_POLL_SECONDS (comma-separated), else sensible defaults
export function getPollOptions() {
  const raw = import.meta.env.VITE_POLL_SECONDS;
  if (raw && typeof raw === 'string') {
    const arr = raw
      .split(',')
      .map(s => Number(String(s).trim()))
      .filter(n => Number.isFinite(n) && n >= 0);
    if (arr.length) return arr;
  }
  // Include 0 to allow "Paused"
  return [0, 5, 10, 15, 30, 60, 120];
}

// no default export to keep tree-shaking clean