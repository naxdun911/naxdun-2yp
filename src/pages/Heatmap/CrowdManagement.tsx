import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import SvgHeatmap from "./SvgHeatmap.jsx";
import { LoadingView, ErrorView } from "./utils/uiHelpers";

interface CrowdData {
  buildingId: string;  // Changed from number to string to match database
  buildingName: string;
  currentCount: number;
  predictedCount: number;
  timestamp: string;
  color: string;
  capacity: number;  // Made required since we have it in database
}

const CrowdManagement: React.FC = () => {
  const [crowdData, setCrowdData] = useState<CrowdData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Removed viewMode and searchTerm state
  
  // Removed interval and poll options (Horizon, Auto-refresh)

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Fetch real data from the heatmap API
      const HEATMAP_API_URL = import.meta.env.VITE_HEATMAP_API_URL || "http://localhost:3897";
      const response = await fetch(`${HEATMAP_API_URL}/heatmap/map-data`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch building data');
      }
      
      // Transform API data to match our interface
      const apiData: CrowdData[] = result.data.map((building: any, index: number) => {
        const colors = ['#ff6b6b', '#4ecdc4', '#ff9f43', '#6c5ce7', '#a29bfe', '#74b9ff', '#fd79a8', '#fdcb6e', '#6c5ce7', '#55a3ff'];
        
        return {
          buildingId: building.building_id,
          buildingName: building.building_name || `Building ${building.building_id}`,
          currentCount: building.current_crowd || 0,
          predictedCount: building.predicted_count || building.current_crowd || 0,
          timestamp: building.status_timestamp || new Date().toLocaleTimeString(),
          color: building.color || colors[index % colors.length],
          capacity: building.building_capacity || 100
        };
      });
      
      setCrowdData(apiData);
      
    } catch (err: any) {
      console.error('Error fetching crowd data:', err);
      setError(err.message || 'Failed to fetch crowd data');
      
      // Don't clear data on error, keep showing last successful data
      // setCrowdData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch crowd data initially (removed auto-refresh logic)
  useEffect(() => {
    if (crowdData.length === 0) {
      setLoading(true);
    }
    fetchData();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const handleManualRefresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  // Removed search handler

  if (loading) {
    return (
      <div className="pt-24 pb-8 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <LoadingView message="Loading crowd data..." />
        </div>
      </div>
    );
  }

  if (error && crowdData.length === 0) {
    return (
      <div className="pt-24 pb-8 min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <ErrorView error={error} onRetry={handleManualRefresh} />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-8 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8 bg-white p-6 rounded-xl shadow-sm">
          <h1 className="text-3xl font-bold text-gray-800 m-0">Crowd Management</h1>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white border-0 rounded-lg font-medium cursor-pointer transition-all duration-200 shadow-md hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Live Timestamp */}
        <div className="text-sm text-gray-500 mb-6 bg-white px-4 py-3 rounded-lg border-l-4 border-emerald-500">
          <strong>Live Data Time:</strong> {crowdData[0]?.timestamp || "--:--"}
        </div>

        {/* Heat Map Section */}
        <div className="mb-8">
          <SvgHeatmap />
        </div>

        {/* NOTE: Overall Crowd Trend chart has been completely removed */}

        {/* Main Content Layout */}
        <div className="flex flex-col gap-8"></div>
      </div>
    </div>
  );
};

export default CrowdManagement;