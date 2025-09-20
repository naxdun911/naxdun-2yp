import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, TrendingUp, Activity, Clock, RefreshCw, AlertCircle, ChevronRight } from 'lucide-react';
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
    <div className="pt-24 pb-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-6">
        {/* Enhanced Page Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Crowd Management</h1>
                  <p className="text-blue-100 mt-1">Real-time occupancy monitoring and predictions</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 rounded-xl p-3">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">Live Monitoring</div>
                  <div className="text-blue-100 text-sm">Auto-refresh: 30s</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Live Status Bar */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-800 font-medium">Live Data Time:</span>
                  <span className="text-emerald-700 font-semibold">{crowdData[0]?.timestamp || "--:--"}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-emerald-600">
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Auto-updating</span>
              </div>
            </div>
          </div>
        </div>

        {/* Heat Map Section */}
        <div className="mb-8">
          <SvgHeatmap />
        </div>

        {/* Enhanced Building Occupancy Chart */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Building Occupancy Overview</h2>
                  <p className="text-gray-600 mt-1">Current crowd count and intelligent predictions across all buildings</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
                  <div className="text-sm text-gray-500">Total Buildings</div>
                  <div className="text-xl font-bold text-gray-800">{crowdData.length}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Enhanced Legend */}
            <div className="flex items-center justify-center gap-8 mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
                <span className="font-medium text-gray-700">Current Count</span>
                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Live</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
                <span className="font-medium text-gray-700">Predicted Count</span>
                <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Next Hour</div>
              </div>
            </div>
            
            {/* Enhanced Chart Container */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100">
              <div className="overflow-x-auto">
                <div style={{ width: Math.max(900, crowdData.length * 140), height: 450 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={crowdData}
                      margin={{
                        top: 30,
                        right: 40,
                        left: 30,
                        bottom: 90,
                      }}
                    >
                      <defs>
                        <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                      <XAxis 
                        dataKey="buildingName" 
                        angle={-45}
                        textAnchor="end"
                        height={90}
                        interval={0}
                        fontSize={12}
                        tick={{ fill: '#64748b', fontWeight: '500' }}
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      />
                      <YAxis 
                        label={{ value: 'People Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#64748b', fontWeight: '600' } }}
                        tick={{ fill: '#64748b', fontWeight: '500' }}
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                        tickLine={{ stroke: '#cbd5e1' }}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'currentCount') return [value, 'Current Count'];
                          if (name === 'predictedCount') return [value, 'Predicted Count (Next Hour)'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Building: ${label}`}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          padding: '12px',
                          fontSize: '14px'
                        }}
                        labelStyle={{ color: '#1f2937', fontWeight: '600', marginBottom: '8px' }}
                      />
                      {/* Enhanced Current Count Line */}
                      <Line 
                        type="monotone" 
                        dataKey="currentCount" 
                        stroke="#3b82f6" 
                        strokeWidth={4}
                        dot={{ fill: '#3b82f6', strokeWidth: 3, r: 7, filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' }}
                        activeDot={{ r: 10, stroke: '#3b82f6', strokeWidth: 3, fill: '#ffffff', filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4))' }}
                        name="currentCount"
                      />
                      {/* Enhanced Predicted Count Line */}
                      <Line 
                        type="monotone" 
                        dataKey="predictedCount" 
                        stroke="#10b981" 
                        strokeWidth={4}
                        strokeDasharray="8 4"
                        dot={{ fill: '#10b981', strokeWidth: 3, r: 7, filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))' }}
                        activeDot={{ r: 10, stroke: '#10b981', strokeWidth: 3, fill: '#ffffff', filter: 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.4))' }}
                        name="predictedCount"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            {/* Scroll indicator */}
            {crowdData.length > 6 && (
              <div className="text-xs text-gray-500 mt-2 text-center">
                ← Scroll horizontally to view all buildings →
              </div>
            )}
            
            {/* Enhanced Summary Statistics */}
            <div className="mt-6 bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-blue-600" />
                  Summary Statistics
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  Updated just now
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Current */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50">
                  <div className="flex items-center justify-between mb-3">
                    <Users className="w-6 h-6 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 bg-blue-200/50 px-2 py-1 rounded-full">
                      Current
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-blue-900">
                      {crowdData.reduce((sum, building) => sum + building.currentCount, 0)}
                    </p>
                    <p className="text-sm text-blue-700 font-medium">Total Current Count</p>
                  </div>
                </div>

                {/* Total Predicted */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200/50">
                  <div className="flex items-center justify-between mb-3">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-200/50 px-2 py-1 rounded-full">
                      Forecast
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-emerald-900">
                      {crowdData.reduce((sum, building) => sum + building.predictedCount, 0)}
                    </p>
                    <p className="text-sm text-emerald-700 font-medium">Total Predicted Count</p>
                  </div>
                </div>

                {/* Change Indicator */}
                <div className={`bg-gradient-to-br rounded-xl p-4 border ${
                  (() => {
                    const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                    const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                    const change = predicted - current;
                    return change >= 0 
                      ? 'from-orange-50 to-orange-100/50 border-orange-200/50' 
                      : 'from-green-50 to-green-100/50 border-green-200/50';
                  })()
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <Activity className={`w-6 h-6 ${
                      (() => {
                        const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                        const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                        const change = predicted - current;
                        return change >= 0 ? 'text-orange-600' : 'text-green-600';
                      })()
                    }`} />
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      (() => {
                        const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                        const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                        const change = predicted - current;
                        return change >= 0 
                          ? 'text-orange-700 bg-orange-200/50' 
                          : 'text-green-700 bg-green-200/50';
                      })()
                    }`}>
                      {(() => {
                        const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                        const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                        const change = predicted - current;
                        return change >= 0 ? 'Increase' : 'Decrease';
                      })()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className={`text-2xl font-bold ${
                      (() => {
                        const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                        const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                        const change = predicted - current;
                        return change >= 0 ? 'text-orange-900' : 'text-green-900';
                      })()
                    }`}>
                      {(() => {
                        const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                        const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                        const change = predicted - current;
                        return change > 0 ? `+${change}` : change.toString();
                      })()}
                    </p>
                    <p className={`text-sm font-medium ${
                      (() => {
                        const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                        const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                        const change = predicted - current;
                        return change >= 0 ? 'text-orange-700' : 'text-green-700';
                      })()
                    }`}>
                      Expected Change
                    </p>
                  </div>
                </div>
              </div>

              {/* Insight Banner */}
              <div className={`mt-6 p-4 rounded-xl border ${
                (() => {
                  const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                  const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                  const change = predicted - current;
                  return change >= 0 
                    ? 'bg-amber-50 border-amber-200 text-amber-800' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800';
                })()
              }`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">
                    {(() => {
                      const current = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
                      const predicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
                      const change = predicted - current;
                      const percentage = current > 0 ? ((change / current) * 100) : 0;
                      
                      if (change >= 0) {
                        return `Crowd levels are expected to increase by ${Math.abs(change)} people (${percentage.toFixed(1)}%) in the next hour.`;
                      } else {
                        return `Crowd levels are expected to decrease by ${Math.abs(change)} people (${Math.abs(percentage).toFixed(1)}%) in the next hour.`;
                      }
                    })()}
                  </p>
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