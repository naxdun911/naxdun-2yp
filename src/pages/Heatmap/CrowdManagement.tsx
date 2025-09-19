import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, AlertTriangle, Bell, BellOff } from "lucide-react";
import SvgHeatmap from "./SvgHeatmap.jsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
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

interface CapacityAlert {
  id: string;
  buildingId: string;  // Changed from number to string
  buildingName: string;
  currentCount: number;
  capacity: number;
  alertLevel: 'warning' | 'critical' | 'full';
  percentage: number;
  timestamp: string;
}

interface AlertSettings {
  enabled: boolean;
  warningThreshold: number; // 80%
  criticalThreshold: number; // 90%
  fullThreshold: number; // 100%
  showNotifications: boolean;
}

const CrowdManagement: React.FC = () => {
  const [crowdData, setCrowdData] = useState<CrowdData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Removed viewMode and searchTerm state
  
  // Capacity Alert States
  const [alerts, setAlerts] = useState<CapacityAlert[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    enabled: true,
    warningThreshold: 80,
    criticalThreshold: 90,
    fullThreshold: 100,
    showNotifications: true
  });
  
  // Removed interval and poll options (Horizon, Auto-refresh)

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission on component mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Check for capacity alerts - memoized to prevent unnecessary re-renders
  const checkCapacityAlerts = useCallback((data: CrowdData[]): CapacityAlert[] => {
    if (!alertSettings.enabled) return [];
    
    const newAlerts: CapacityAlert[] = [];
    
    data.forEach(building => {
      const capacity = building.capacity; // Use capacity directly from building data
      const percentage = Math.round((building.currentCount / capacity) * 100);
      
      let alertLevel: 'warning' | 'critical' | 'full' | null = null;
      
      if (percentage >= alertSettings.fullThreshold) {
        alertLevel = 'full';
      } else if (percentage >= alertSettings.criticalThreshold) {
        alertLevel = 'critical';
      } else if (percentage >= alertSettings.warningThreshold) {
        alertLevel = 'warning';
      }
      
      if (alertLevel) {
        newAlerts.push({
          id: `${building.buildingId}-${Date.now()}`,
          buildingId: building.buildingId,
          buildingName: building.buildingName,
          currentCount: building.currentCount,
          capacity,
          alertLevel,
          percentage,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    });
    
    return newAlerts;
  }, [alertSettings.enabled, alertSettings.warningThreshold, alertSettings.criticalThreshold, alertSettings.fullThreshold]);

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
      
      // Check for capacity alerts
      const newAlerts = checkCapacityAlerts(apiData);
      setAlerts(newAlerts);
      
      // Show notifications for new alerts
      if (alertSettings.showNotifications && "Notification" in window && Notification.permission === "granted") {
        newAlerts.forEach(alert => {
          const alertMessages = {
            warning: `⚠️ ${alert.buildingName} is at ${alert.percentage}% capacity`,
            critical: `🚨 ${alert.buildingName} is at ${alert.percentage}% capacity - Near Full!`,
            full: `🔴 ${alert.buildingName} is at FULL capacity (${alert.percentage}%)`
          };
          
          new Notification("Capacity Alert", {
            body: alertMessages[alert.alertLevel],
            icon: "/logo.png"
          });
        });
      }
      
    } catch (err: any) {
      console.error('Error fetching crowd data:', err);
      setError(err.message || 'Failed to fetch crowd data');
      
      // Don't clear data on error, keep showing last successful data
      // setCrowdData([]);
    } finally {
      setLoading(false);
    }
  }, [checkCapacityAlerts, alertSettings.showNotifications]);

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

  // Always show all buildings in the main chart
  const filteredData: CrowdData[] = crowdData;

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
      <style>{`
        .chart-scroll-container::-webkit-scrollbar {
          height: 14px;
        }
        .chart-scroll-container::-webkit-scrollbar-track {
          background: linear-gradient(90deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .chart-scroll-container::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 8px;
          border: 2px solid #f8fafc;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .chart-scroll-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #2563eb 0%, #1e40af 100%);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        .chart-scroll-container::-webkit-scrollbar-corner {
          background: #f8fafc;
        }
      `}</style>
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

        {/* Controls Section - Only Alerts remain */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8 relative z-20">
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-2 flex-shrink-0">
              <label className="text-sm font-medium text-gray-700">Alerts:</label>
              <button
                onClick={() => setAlertSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`flex items-center gap-2 px-3 py-3 border rounded-lg font-medium text-sm transition-all duration-150 min-w-[120px] focus:outline-none ${
                  alertSettings.enabled 
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {alertSettings.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                {alertSettings.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Capacity Alerts Display */}
        {alerts.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-8 border-l-4 border-orange-500">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-800">Capacity Alerts</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.alertLevel === 'full' 
                      ? 'bg-red-50 border-red-500' 
                      : alert.alertLevel === 'critical'
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-800">{alert.buildingName}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      alert.alertLevel === 'full' 
                        ? 'bg-red-100 text-red-800' 
                        : alert.alertLevel === 'critical'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {alert.percentage}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {alert.currentCount} / {alert.capacity} capacity
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {alert.timestamp}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heat Map Section */}
        <div className="mb-8">
          {/* <HeatMap /> */}
          <SvgHeatmap />
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col gap-8">
          {/* Overall Crowd Trend */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Chart Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-1">Overall Crowd Trend</h2>
                      <p className="text-sm text-gray-600">Real-time occupancy data across all buildings</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      Live Data
                    </div>
                  </div>
                </div>

                {/* Fixed Legend */}
                <div className="flex justify-center items-center gap-6 py-4 px-8 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-blue-500 rounded"></div>
                    <span className="text-sm font-medium text-gray-700">Current Count</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-green-500 rounded border-t-2 border-dashed border-green-500"></div>
                    <span className="text-sm font-medium text-gray-700">Predicted Count</span>
                  </div>
                </div>
                
                {/* Chart Container */}
                <div className="p-8">
                  <div className="flex justify-center">
                    <div 
                      className="border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-white chart-scroll-container shadow-inner"
                      style={{ 
                        maxWidth: 'calc(100vw - 200px)', // Account for page margins and padding
                        width: '100%',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#CBD5E0 #F7FAFC'
                      }}
                    >
                      <div 
                        style={{ 
                          width: Math.max(1200, filteredData.length * 140), // Increased spacing for better readability
                          height: 400, // Increased height for better visibility
                          padding: '20px'
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={filteredData} margin={{ top: 30, right: 40, left: 30, bottom: 10 }}>
                            <defs>
                              <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" opacity={0.7} />
                            <XAxis 
                              dataKey="buildingName"
                              tick={({ x, y, payload }) => {
                                // Split long building names into multiple lines for horizontal display
                                const text = payload.value || '';
                                const words = text.split(' ');
                                const lines = [];
                                let currentLine = '';
                                
                                words.forEach((word: string) => {
                                  if (currentLine.length + word.length + 1 <= 15) { // Max 15 chars per line
                                    currentLine += (currentLine ? ' ' : '') + word;
                                  } else {
                                    if (currentLine) lines.push(currentLine);
                                    currentLine = word;
                                  }
                                });
                                if (currentLine) lines.push(currentLine);
                                
                                return (
                                  <g>
                                    {lines.map((line, index) => (
                                      <text 
                                        key={index}
                                        x={x} 
                                        y={y + (index * 12)} 
                                        dy={16} 
                                        textAnchor="middle" 
                                        fill="#374151"
                                        fontSize={9}
                                        fontWeight="normal"
                                      >
                                        {line}
                                      </text>
                                    ))}
                                  </g>
                                );
                              }}
                              height={100}
                              interval={0}
                              stroke="#6b7280"
                            />
                            <YAxis 
                              tick={{ fontSize: 11, fill: '#374151' }}
                              stroke="#6b7280"
                              label={{ value: 'Occupancy Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151' } }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                                fontSize: '13px'
                              }}
                              formatter={(value, name) => [
                                <span style={{ color: name === 'Current Count' ? '#8884d8' : '#82ca9d' }}>
                                  {value}
                                </span>,
                                name
                              ]}
                              labelFormatter={(label) => (
                                <span style={{ color: '#374151' }}>
                                  {label}
                                </span>
                              )}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="currentCount" 
                              name="Current Count" 
                              stroke="#8884d8"
                              strokeWidth={3}
                              dot={<circle r={6} fill="#8884d8" strokeWidth={2} stroke="#ffffff" />}
                              activeDot={<circle r={8} fill="#8884d8" strokeWidth={3} stroke="#ffffff" />}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="predictedCount" 
                              name="Predicted Count" 
                              stroke="#82ca9d" 
                              strokeWidth={3}
                              strokeDasharray="5 5"
                              dot={<circle r={6} fill="#82ca9d" strokeWidth={2} stroke="#ffffff" />}
                              activeDot={<circle r={8} fill="#82ca9d" strokeWidth={3} stroke="#ffffff" />}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Chart Description */}
                  <div className="bg-blue-25 px-8 py-4 border-t border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        This chart shows the current occupancy count for each building (blue line) and the predicted occupancy for the next hour (green dotted line). 
                        The prediction helps you anticipate crowd levels, so you can plan visits to less crowded buildings and avoid congestion.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
        </div>
      </div>
    </div>
  );
};

export default CrowdManagement;