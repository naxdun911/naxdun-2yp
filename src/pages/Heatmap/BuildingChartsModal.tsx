import { useState, useEffect } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { X, TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const HEATMAP_API_URL = import.meta.env.VITE_HEATMAP_API_URL || "http://localhost:3897";

interface BuildingData {
  buildingId: string;
  buildingName: string;
  capacity: number;
  currentCount: number;
  currentColor: string;
  lastUpdated: string;
  predictedCount: number;
  predictionConfidence: string;
  predictionMethod: string;
  history: HistoryItem[];
  prediction: PredictionData | null;
}

interface PredictionData {
  prediction: number;
  confidence: string;
  method: string;
  forecasts: number[];
  metrics: any;
  parameters?: any;
}

interface HistoryItem {
  timestamp: string;
  current_count: number;
  occupancy_rate: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: any[];
}

interface OccupancyGaugeProps {
  current: number;
  predicted?: number;
  capacity: number;
  className?: string;
}

interface BuildingChartsModalProps {
  buildingId: string;
  buildingName: string;
  onClose: () => void;
}

// Custom tooltip for line chart
const HistoryTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
        <div className="font-medium">{new Date(data.rawTimestamp).toLocaleString()}</div>
        <div className="text-blue-600">Count: {data.current_count}</div>
        <div className="text-gray-600">Occupancy: {data.occupancy_rate}%</div>
      </div>
    );
  }
  return null;
};

// Prediction vs Actual comparison component
const PredictionComparison = ({ current, predicted, capacity, confidence, className = "" }: {
  current: number;
  predicted: number;
  capacity: number;
  confidence: string;
  className?: string;
}) => {
  const data = [
    {
      name: 'Current',
      value: current,
      percentage: capacity > 0 ? Math.round((current / capacity) * 100) : 0,
      fill: '#3b82f6'
    },
    {
      name: 'Predicted',
      value: predicted,
      percentage: capacity > 0 ? Math.round((predicted / capacity) * 100) : 0,
      fill: '#10b981'
    }
  ];

  const getConfidenceColor = () => {
    switch (confidence) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <div className="font-medium">{data.name}</div>
          <div className="text-blue-600">Count: {data.value}</div>
          <div className="text-gray-600">Occupancy: {data.percentage}%</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <TrendingUp className="w-5 h-5 mr-2" />
        Current vs Predicted
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{current}</div>
          <div className="text-sm text-gray-600">Current Count</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{predicted}</div>
          <div className="text-sm text-gray-600">Predicted Count</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="flex items-center">
          <div 
            className="w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: getConfidenceColor() }}
          />
          <span>Confidence: <span className="font-medium capitalize">{confidence}</span></span>
        </div>
        <div className="text-gray-600">
          Difference: {predicted - current > 0 ? '+' : ''}{predicted - current}
        </div>
      </div>
    </div>
  );
};
const OccupancyGauge = ({ current, predicted, capacity, className = "" }: OccupancyGaugeProps) => {
  const currentPercentage = capacity > 0 ? Math.round((current / capacity) * 100) : 0;
  const predictedPercentage = predicted && capacity > 0 ? Math.round((predicted / capacity) * 100) : 0;
  
  const getColor = (percentage: number) => {
    if (percentage < 25) return '#22c55e'; // green
    if (percentage < 50) return '#eab308'; // yellow
    if (percentage < 75) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const data = [
    { name: 'Current Occupied', value: current, fill: getColor(currentPercentage) },
    { name: 'Available', value: Math.max(0, capacity - current), fill: '#e5e7eb' }
  ];

  // Add predicted data if available
  if (predicted !== undefined && predicted !== current) {
    data.push({
      name: 'Predicted Occupied', 
      value: predicted, 
      fill: getColor(predictedPercentage)
    });
  }

  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 ${className}`}>
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <Users className="w-5 h-5 mr-2" />
        Occupancy Overview
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={data.slice(0, 2)} // Only show current and available for pie chart
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                startAngle={90}
                endAngle={450}
                dataKey="value"
              >
                {data.slice(0, 2).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Stats */}
        <div className="space-y-3">
          {/* Current Stats */}
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: getColor(currentPercentage) }}>
              {currentPercentage}%
            </div>
            <div className="text-sm text-gray-600">
              Current: {current} / {capacity}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {currentPercentage < 25 ? 'Low' : currentPercentage < 50 ? 'Moderate' : currentPercentage < 75 ? 'Busy' : 'High'} Density
            </div>
          </div>
          
          {/* Predicted Stats */}
          {predicted !== undefined && (
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold" style={{ color: getColor(predictedPercentage) }}>
                {predictedPercentage}%
              </div>
              <div className="text-sm text-blue-600">
                Predicted: {predicted} / {capacity}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {predicted > current ? (
                  <span className="text-red-600">↗ +{predicted - current} people</span>
                ) : predicted < current ? (
                  <span className="text-green-600">↘ -{current - predicted} people</span>
                ) : (
                  <span className="text-gray-600">→ No change expected</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BuildingChartsModal = ({ buildingId, buildingName, onClose }: BuildingChartsModalProps) => {
  const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(24); // hours

  useEffect(() => {
    if (buildingId) {
      fetchBuildingData();
    }
  }, [buildingId, timeRange]);

  const fetchBuildingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${HEATMAP_API_URL}/heatmap/building/${buildingId}/history?hours=${timeRange}`
      );
      
      if (response.data.success) {
        setBuildingData(response.data.data);
      } else {
        setError('Failed to fetch building data');
      }
    } catch (err: any) {
      console.error('Error fetching building data:', err);
      setError(err.response?.data?.error || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!buildingData) return '#6b7280';
    const percentage = buildingData.capacity > 0 ? (buildingData.currentCount / buildingData.capacity) * 100 : 0;
    if (percentage < 25) return '#22c55e';
    if (percentage < 50) return '#eab308';
    if (percentage < 75) return '#f97316';
    return '#ef4444';
  };

  const getTimeRangeData = () => {
    if (!buildingData?.history) return [];
    
    // Format data for charts and reverse to show chronological order
    return buildingData.history.reverse().map((item: HistoryItem) => {
  const dateObj = new Date(item.timestamp);
  let formatted;
  if (timeRange <= 24) {
    formatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else {
    formatted = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return {
    ...item,
    timestamp: formatted,      // for X-axis
    rawTimestamp: item.timestamp // for tooltip
  };
});

  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Error</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-red-600 text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = getTimeRangeData();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header - increased top margin for EngEx logo separation */}
        <div className="pt-15 p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{buildingData?.buildingName || buildingName}</h2>
              <p className="text-gray-600">Building ID: {buildingId}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Time range selector */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm font-medium">Time Range:</span>
            {[1, 6, 12, 24, 48].map(hours => (
              <button
                key={hours}
                onClick={() => setTimeRange(hours)}
                className={`px-3 py-1 rounded text-sm ${
                  timeRange === hours 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>
        </div>

  {/* Content - increased padding for chart container separation */}
  <div className="pt-10 pb-8 px-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium">Current Count</span>
              </div>
              <div className="text-2xl font-bold mt-1">{buildingData?.currentCount || 0}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium">Predicted Count</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">
                {buildingData?.predictedCount || 0}
              </div>
              <div className="text-xs text-gray-500 mt-1 capitalize">
                {buildingData?.predictionConfidence || 'low'} confidence
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium">Capacity</span>
              </div>
              <div className="text-2xl font-bold mt-1">{buildingData?.capacity || 0}</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-sm font-medium">Last Updated</span>
              </div>
              <div className="text-sm mt-1">
                {buildingData?.lastUpdated ? new Date(buildingData.lastUpdated).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prediction Comparison */}
            <PredictionComparison 
              current={buildingData?.currentCount || 0}
              predicted={buildingData?.predictedCount || 0}
              capacity={buildingData?.capacity || 0}
              confidence={buildingData?.predictionConfidence || 'low'}
            />

            {/* Occupancy Gauge */}
            <OccupancyGauge 
              current={buildingData?.currentCount || 0}
              capacity={buildingData?.capacity || 0}
            />
          </div>

          {/* Historical Trend - Full Width */}
          <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Occupancy Trend ({timeRange}h)
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis />
                  <Tooltip content={<HistoryTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="current_count" 
                    stroke={getStatusColor()}
                    strokeWidth={2}
                    dot={{ fill: getStatusColor(), strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Actual Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                No historical data available for the selected time range
              </div>
            )}
          </div>

          {/* Additional Analysis */}
          {chartData.length > 0 && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Historical Statistics */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Historical Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Peak Count:</span>
                    <span className="ml-2">{Math.max(...chartData.map(d => d.current_count))}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Average Count:</span>
                    <span className="ml-2">
                      {Math.round(chartData.reduce((sum, d) => sum + d.current_count, 0) / chartData.length)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Data Points:</span>
                    <span className="ml-2">{chartData.length}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Time Range:</span>
                    <span className="ml-2">{timeRange}h</span>
                  </div>
                </div>
              </div>

              
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuildingChartsModal;