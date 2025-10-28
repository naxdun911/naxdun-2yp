import { useState, useEffect } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, RefreshCw, Activity } from 'lucide-react';
import axios from 'axios';

const HEATMAP_API_URL = import.meta.env.VITE_HEATMAP_API_URL || "http://localhost:3897";

interface HistoryItem {
  timestamp: string;
  current_count: number;
  occupancy_rate: string;
}

interface BuildingHistoryChartProps {
  buildingId: string;
  buildingName?: string;
  timeRange?: number; // hours
  height?: number;
  onClose?: () => void;
}

// Custom tooltip for line chart
const HistoryTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
        <div className="font-medium text-xs">{new Date(data.rawTimestamp).toLocaleString()}</div>
        <div className="text-blue-600 text-sm font-semibold">Count: {data.current_count}</div>
        <div className="text-gray-600 text-xs">Occupancy: {data.occupancy_rate}%</div>
      </div>
    );
  }
  return null;
};

const BuildingHistoryChart: React.FC<BuildingHistoryChartProps> = ({ 
  buildingId,
  buildingName,
  timeRange: initialTimeRange = 24,
  height = 200,
  onClose
}) => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeRange = initialTimeRange;

  useEffect(() => {
    if (buildingId) {
      fetchBuildingHistory();
    }
  }, [buildingId, timeRange]);

  const fetchBuildingHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${HEATMAP_API_URL}/heatmap/building/${buildingId}/history?hours=${timeRange}`
      );
      
      if (response.data.success) {
        const history = response.data.data.history || [];
        
        // Reduce data points by sampling to max 50 points for cleaner chart
        const maxPoints = 50;
        const sampledHistory = history.length > maxPoints
          ? history.filter((_: any, index: number) => index % Math.ceil(history.length / maxPoints) === 0)
          : history;
        
        // Format data for chart
        const formattedData = sampledHistory.reverse().map((item: HistoryItem) => {
          const dateObj = new Date(item.timestamp);
          let formatted;
          if (timeRange <= 24) {
            formatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          } else {
            formatted = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          }
          return {
            timestamp: formatted,
            current_count: item.current_count,
            occupancy_rate: item.occupancy_rate,
            rawTimestamp: item.timestamp
          };
        });
        
        setHistoryData(formattedData);
      } else {
        setError('Failed to fetch history data');
      }
    } catch (err: any) {
      console.error('Error fetching building history:', err);
      setError(err.response?.data?.error || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (historyData.length === 0) return '#6b7280';
    const latestOccupancy = parseFloat(historyData[historyData.length - 1]?.occupancy_rate || '0');
    if (latestOccupancy < 25) return '#22c55e';
    if (latestOccupancy < 50) return '#eab308';
    if (latestOccupancy < 75) return '#f97316';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {buildingName || buildingId} - Historical Trends
                  </h2>
                  <p className="text-gray-600 mt-1">Last 24 hours occupancy pattern</p>
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-center" style={{ height }}>
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {buildingName || buildingId} - Historical Trends
                  </h2>
                  <p className="text-gray-600 mt-1">Last 24 hours occupancy pattern</p>
                </div>
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex flex-col items-center justify-center text-red-600" style={{ height }}>
                <AlertTriangle className="w-6 h-6 mb-2" />
                <p className="text-xs text-center">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {buildingName || buildingId} - Historical Trends
                </h2>
                <p className="text-gray-600 mt-1">Last 24 hours occupancy pattern</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          <div className="bg-white rounded-lg border border-gray-200">
            {/* Chart */}
            <div className="p-3">
              {historyData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={height}>
                    <LineChart data={historyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis 
                        dataKey="timestamp" 
                        fontSize={10}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        interval="preserveStartEnd"
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis 
                        fontSize={10}
                        tick={{ fill: '#6b7280' }}
                      />
                      <Tooltip content={<HistoryTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="current_count" 
                        stroke={getStatusColor()}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                        name="Count"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="flex items-center justify-center text-gray-500 text-xs" style={{ height }}>
                  No history data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingHistoryChart;
