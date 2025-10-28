import React, { useState, useEffect, useRef, useCallback } from "react";
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
}

interface ApiBuilding {
  building_id: string;
  building_name?: string | null;
  current_crowd?: number | null;
  predicted_count?: number | null;
  status_timestamp?: string | null;
  color?: string | null;
  building_capacity?: number | null;
}

const CrowdManagement: React.FC = () => {
  const [crowdData, setCrowdData] = useState<CrowdData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

  // Map building IDs to real building names (from SvgHeatmap.jsx)
  const getBuildingName = (buildingId: string, fallbackName?: string): string => {
    const buildingNames: { [key: string]: string } = {
      'B1': 'Engineering Carpentry Shop',
      'B2': 'Engineering Workshop',
      'B3': 'Building B3',
      'B4': 'Generator Room',
      'B5': 'Building B5',
      'B6': 'Structure Lab',
      'B7': 'Administrative Building',
      'B8': 'Canteen',
      'B9': 'Lecture Room 10/11',
      'B10': 'Engineering Library',
      'B11': 'Chemical and Process Engineering',
      'B12': 'Security Unit',
      'B13': 'Drawing Office 2',
      'B14': 'Faculty Canteen',
      'B15': 'Manufacturing and Industrial Engineering',
      'B16': 'Professor E.O.E. Perera Theater',
      'B17': 'Electronic Lab',
      'B18': 'Washrooms',
      'B19': 'Electrical and Electronic Workshop',
      'B20': 'Computer Engineering',
      'B21': 'Building B21',
      'B22': 'Environmental Lab',
      'B23': 'Applied Mechanics Lab',
      'B24': 'New Mechanics Lab',
      'B25': 'Building B25',
      'B26': 'Building B26',
      'B27': 'Building B27',
      'B28': 'Materials Lab',
      'B29': 'Thermodynamics Lab',
      'B30': 'Fluids Lab',
      'B31': 'Surveying and Soil Lab',
      'B32': 'Engineering Mathematics',
      'B33': 'Drawing Office 1',
      'B34': 'Electrical and Electronic Engineering'
    };
    
    return buildingNames[buildingId] || fallbackName || `Building ${buildingId}`;
  };

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Fetch real data from the heatmap API
      const HEATMAP_API_URL = import.meta.env.VITE_HEATMAP_API_URL || "http://localhost:3897";
      const response = await fetch(`${HEATMAP_API_URL}/heatmap/map-data`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
  const result: { success: boolean; data: ApiBuilding[]; error?: string } = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch building data');
      }
      
      // Transform API data to match our interface
  const apiData: CrowdData[] = result.data.map((building: ApiBuilding, index: number) => {
        const colors = ['#ff6b6b', '#4ecdc4', '#ff9f43', '#6c5ce7', '#a29bfe', '#74b9ff', '#fd79a8', '#fdcb6e', '#6c5ce7', '#55a3ff'];
        
        return {
          buildingId: building.building_id,
          buildingName: getBuildingName(building.building_id, building.building_name ?? undefined),
          currentCount: building.current_crowd ?? 0,
          predictedCount: (building.predicted_count ?? building.current_crowd) ?? 0,
          timestamp: building.status_timestamp ?? new Date().toLocaleTimeString(),
          color: building.color ?? colors[index % colors.length],
          capacity: building.building_capacity ?? 100
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
  }, []);

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
          <ErrorView error={error} onRetry={fetchData} />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Page Header */}
        <PageHeader timestamp={crowdData[0]?.timestamp} />

        {/* Heat Map Section */}
        <div className="mb-8">
          <SvgHeatmap />
        </div>

        {/* Building Occupancy Chart Component */}
        <BuildingOccupancyChart crowdData={crowdData} />

        {/* Smart Notifications Component */}
        <SmartNotifications />

        {/* Main Content Layout */}
        <div className="flex flex-col gap-8"></div>
      </div>
    </div>
  );
};

export default CrowdManagement;