import { useState, useEffect } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
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
  showTitle?: boolean;
  showTimeRangeSelector?: boolean;
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
  showTitle = true,
  showTimeRangeSelector = false
}) => {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(initialTimeRange);

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
        
        // Format data for chart
        const formattedData = history.reverse().map((item: HistoryItem) => {
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
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-center" style={{ height }}>
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex flex-col items-center justify-center text-red-600" style={{ height }}>
          <AlertTriangle className="w-6 h-6 mb-2" />
          <p className="text-xs text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      {showTitle && (
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
              {buildingName ? `${buildingName} - ` : ''}Occupancy History
            </h4>
            {showTimeRangeSelector && (
              <div className="flex items-center gap-1">
                {[6, 12, 24, 48].map(hours => (
                  <button
                    key={hours}
                    onClick={() => setTimeRange(hours)}
                    className={`px-2 py-0.5 rounded text-xs ${
                      timeRange === hours 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Chart */}
      <div className="p-3">
        {historyData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={historyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
                  strokeWidth={2}
                  dot={{ fill: getStatusColor(), strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Count"
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Stats Summary */}
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-gray-600">Peak</div>
                <div className="font-bold text-gray-900">
                  {Math.max(...historyData.map(d => d.current_count))}
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-gray-600">Average</div>
                <div className="font-bold text-gray-900">
                  {Math.round(historyData.reduce((sum, d) => sum + d.current_count, 0) / historyData.length)}
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-gray-600">Data Points</div>
                <div className="font-bold text-gray-900">{historyData.length}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center text-gray-500 text-xs" style={{ height }}>
            No history data available
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingHistoryChart;
