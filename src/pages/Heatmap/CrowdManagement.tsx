import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Users, Activity, Clock, RefreshCw, MessageCircle, Bell, ExternalLink } from 'lucide-react';
import SvgHeatmap from "./SvgHeatmap.jsx";
import BuildingOccupancyChart from "./BuildingOccupancyChart.tsx";
import SmartNotifications from "./SmartNotifications.tsx";
import PageHeader from "./PageHeader.tsx";
import { LoadingView, ErrorView } from "./utils/uiHelpers";

interface CrowdData {
  buildingId: string;  // Changed from number to string to match database
  buildingName: string;
  currentCount: number;
  predictedCount: number;
  timestamp: string;
  color: string;
  capacity: number;  // Made required since we have it in database
  predictionHorizonMinutes?: number;
}

interface ApiBuilding {
  building_id: string;
  building_name?: string | null;
  current_crowd?: number | null;
  predicted_count?: number | null;
  status_timestamp?: string | null;
  color?: string | null;
  building_capacity?: number | null;
  prediction_horizon_minutes?: number | null;
}

const DEFAULT_PREDICTION_HORIZON_MINUTES = 15;

const CrowdManagement: React.FC = () => {
  const heatmapApiUrl = useMemo(
    () => import.meta.env.VITE_HEATMAP_API_URL || "http://localhost:3897",
    []
  );
  const [crowdData, setCrowdData] = useState<CrowdData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<"pdf" | "csv" | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Fetch real data from the heatmap API
  const response = await fetch(`${heatmapApiUrl}/heatmap/map-data`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
  const result: { success: boolean; data: ApiBuilding[]; error?: string } = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch building data');
      }
      
      // Transform API data to match our interface
      const apiData: CrowdData[] = result.data.map((building: ApiBuilding) => {
        return {
          buildingId: building.building_id,
          buildingName: building.building_name || `Building ${building.building_id}`,
          currentCount: building.current_crowd ?? 0,
          predictedCount: (building.predicted_count ?? building.current_crowd) ?? 0,
          timestamp: building.status_timestamp ?? new Date().toLocaleTimeString(),
          color: building.color ?? '#cccccc',
          capacity: building.building_capacity ?? 100,
          predictionHorizonMinutes: building.prediction_horizon_minutes ?? DEFAULT_PREDICTION_HORIZON_MINUTES
        };
      });
      
      setCrowdData(apiData);
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch crowd data';
      console.error('Error fetching crowd data:', err);
      setError(message);
      
      // Don't clear data on error, keep showing last successful data
      // setCrowdData([]);
    } finally {
      setLoading(false);
    }
  }, [heatmapApiUrl]);

  // Fetch crowd data initially and set up auto-refresh
  useEffect(() => {
    if (crowdData.length === 0) {
      setLoading(true);
    }
    fetchData();

    // Set up auto-refresh
    intervalRef.current = setInterval(() => {
      fetchData();
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchData, crowdData.length]);

  const downloadReport = async (format: "pdf" | "csv"): Promise<void> => {
    try {
      setDownloadingFormat(format);
      const response = await fetch(`${heatmapApiUrl}/reports/building-occupancy?format=${format}`);
      if (!response.ok) {
        throw new Error(`Failed to generate ${format.toUpperCase()} report`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.href = url;
      link.download = `crowd-report-${stamp}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Report download failed:", downloadError);
    } finally {
      setDownloadingFormat(null);
    }
  };

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
          <ErrorView error={error} onRetry={fetchData} />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Page Header */}
        <PageHeader />

        {/* Heat Map Section */}
        <div className="mb-8">
          <SvgHeatmap />
        </div>

        <div className="mb-8 bg-white border border-gray-100 rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Snapshot Reports</h2>
              <p className="text-sm text-gray-600 mt-1">
                Capture the latest crowd snapshot as a PDF or CSV download.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => downloadReport("pdf")}
                disabled={downloadingFormat === "pdf"}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {downloadingFormat === "pdf" ? "Preparing PDF..." : "Download PDF"}
              </button>
              <button
                onClick={() => downloadReport("csv")}
                disabled={downloadingFormat === "csv"}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-sm font-semibold shadow hover:bg-gray-200 disabled:opacity-60"
              >
                {downloadingFormat === "csv" ? "Preparing CSV..." : "Download CSV"}
              </button>
            </div>
          </div>
        </div>

        {/* Building Occupancy Chart Component */}
        <BuildingOccupancyChart crowdData={crowdData} />

        {/* Smart Notifications Component */}
        <SmartNotifications />
        
      </div>
    </div>
  );
};

export default CrowdManagement;