import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

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
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch building data');
      }
      
      // Transform API data to match our interface
      const apiData: CrowdData[] = result.data.map((building: any, index: number) => {
        const colors = ['#ff6b6b', '#4ecdc4', '#ff9f43', '#6c5ce7', '#a29bfe', '#74b9ff', '#fd79a8', '#fdcb6e', '#6c5ce7', '#55a3ff'];
        
        return {
          buildingId: building.building_id,
          buildingName: getBuildingName(building.building_id, building.building_name),
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
          <ErrorView error={error} onRetry={fetchData} />
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
        </div>

        {/* Live Timestamp */}
        <div className="text-sm text-gray-500 mb-6 bg-white px-4 py-3 rounded-lg border-l-4 border-emerald-500">
          <strong>Live Data Time:</strong> {crowdData[0]?.timestamp || "--:--"}
        </div>

        {/* Heat Map Section */}
        <div className="mb-8">
          <SvgHeatmap />
        </div>

        {/* Building Occupancy Chart */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Building Occupancy Overview</h2>
            <p className="text-sm text-gray-600 mt-1">Current crowd count and predictions across all buildings</p>
          </div>
          <div className="p-6">
            {/* Legend */}
            <div className="flex items-center gap-6 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Current Count</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Predicted Count (Next Hour)</span>
              </div>
            </div>
            
            {/* Scrollable chart container */}
            <div className="overflow-x-auto">
              <div style={{ width: Math.max(800, crowdData.length * 120), height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={crowdData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 80,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="buildingName" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      fontSize={11}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      label={{ value: 'People Count', angle: -90, position: 'insideLeft' }}
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'currentCount') return [value, 'Current Count'];
                        if (name === 'predictedCount') return [value, 'Predicted Count (Next Hour)'];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Building: ${label}`}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    {/* Current Count Line */}
                    <Line 
                      type="monotone" 
                      dataKey="currentCount" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#3b82f6', strokeWidth: 2, fill: '#3b82f6' }}
                      name="currentCount"
                    />
                    {/* Predicted Count Line */}
                    <Line 
                      type="monotone" 
                      dataKey="predictedCount" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                      activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 2, fill: '#10b981' }}
                      name="predictedCount"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Scroll indicator */}
            {crowdData.length > 6 && (
              <div className="text-xs text-gray-500 mt-2 text-center">
                ← Scroll horizontally to view all buildings →
              </div>
            )}
            
            {/* Summary Statistics */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Total Current Count</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {crowdData.reduce((sum, building) => sum + building.currentCount, 0)}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📊</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Total Predicted Count</p>
                    <p className="text-2xl font-bold text-green-900">
                      {crowdData.reduce((sum, building) => sum + building.predictedCount, 0)}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🔮</span>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 rounded-lg ${
                crowdData.reduce((sum, building) => sum + building.predictedCount, 0) > 
                crowdData.reduce((sum, building) => sum + building.currentCount, 0) 
                  ? 'bg-red-50' : 'bg-yellow-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Expected Change</p>
                    <p className={`text-2xl font-bold ${
                      crowdData.reduce((sum, building) => sum + building.predictedCount, 0) > 
                      crowdData.reduce((sum, building) => sum + building.currentCount, 0) 
                        ? 'text-red-900' : 'text-yellow-900'
                    }`}>
                      {(() => {
                        const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                        const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                        const change = predicted - current;
                        return change > 0 ? `+${change}` : change.toString();
                      })()}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    crowdData.reduce((sum, building) => sum + building.predictedCount, 0) > 
                    crowdData.reduce((sum, building) => sum + building.currentCount, 0) 
                      ? 'bg-red-500' : 'bg-yellow-500'
                  }`}>
                    <span className="text-white text-sm font-bold">
                      {crowdData.reduce((sum, building) => sum + building.predictedCount, 0) > 
                       crowdData.reduce((sum, building) => sum + building.currentCount, 0) ? '↗️' : '↘️'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NOTE: Overall Crowd Trend chart has been completely removed */}

        {/* Main Content Layout */}
        <div className="flex flex-col gap-8"></div>
      </div>
    </div>
  );
};

export default CrowdManagement;