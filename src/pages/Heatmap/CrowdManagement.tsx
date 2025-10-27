import React, { useState, useEffect, useRef, useCallback } from "react";
import { Users, Activity, Clock, RefreshCw, MessageCircle, Bell, ExternalLink } from 'lucide-react';
import SvgHeatmap from "./SvgHeatmap.jsx";
import BuildingOccupancyChart from "./BuildingOccupancyChart.tsx";
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
                  <div className="text-blue-100 text-sm">Auto-refresh: 10s</div>
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

        {/* Building Occupancy Chart Component */}
        <BuildingOccupancyChart crowdData={crowdData} />

        {/* Telegram Bot Integration Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Smart Notifications</h2>
                  <p className="text-blue-100 mt-1">Get instant alerts about less crowded buildings</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-xl p-3">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">Telegram Bot</div>
                  <div className="text-blue-100 text-sm">Real-time updates</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Get Started Section - Left Side */}
              <div className="flex flex-col justify-center">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                  <div className="text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-8 h-8 text-blue-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Get Started Now</h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Join hundreds of users who are already finding the best spots on campus!
                      </p>
                    </div>

                    {/* Main CTA Button */}
                    <a
                      href="https://t.me/PeraVerse_Crowd_Management_bot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-3 w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Start Telegram Bot</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {/* Quick Start Steps */}
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-left space-y-2">
                        <div className="text-sm font-semibold text-gray-700 mb-3">Quick Start:</div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>
                          <span>Click the button above</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold">2</span>
                          <span>Send <code className="bg-gray-100 px-1 rounded">/start</code> to the bot</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-600">
                          <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
                          <span>Get instant notifications!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description and Features - Right Side */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    PeraVerse Crowd Management Bot
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Stay informed about building occupancy levels with our Telegram bot. 
                    Get notified every 10 seconds where the occupancy is less than 40% of capacity.
                    Also you can check the status of all buildings anytime by sending the <code className="bg-gray-100 px-1 rounded">/status</code> command.
                    Perfect for you to avoid crowded places.
                  </p>
                </div>

                {/* Command Reference */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Available Commands:</div>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <code className="bg-white px-2 py-1 rounded border">/start</code>
                        <span className="text-gray-600">Begin receiving notifications</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-white px-2 py-1 rounded border">/status</code>
                        <span className="text-gray-600">Check all buildings status</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-white px-2 py-1 rounded border">/stop</code>
                        <span className="text-gray-600">Unsubscribe from notifications</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <code className="bg-white px-2 py-1 rounded border">/help</code>
                        <span className="text-gray-600">Get help and information</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Info Banner */}
            <div className="mt-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-emerald-800 font-medium">Bot Status:</span>
                  <span className="text-emerald-700 font-semibold">Active & Monitoring</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Updates every 10 seconds</span>
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