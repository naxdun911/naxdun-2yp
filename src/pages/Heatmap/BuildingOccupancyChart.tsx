import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart } from 'recharts';
import { TrendingUp, Users, Activity, Clock, AlertCircle } from 'lucide-react';

interface CrowdData {
  buildingId: string;
  buildingName: string;
  currentCount: number;
  predictedCount: number;
  timestamp: string;
  color: string;
  capacity: number;
  predictionHorizonMinutes?: number;
}

interface BuildingOccupancyChartProps {
  crowdData: CrowdData[];
}

const DEFAULT_PREDICTION_HORIZON_MINUTES = 15;

const BuildingOccupancyChart: React.FC<BuildingOccupancyChartProps> = ({ crowdData }) => {
  const predictionHorizonMinutes = (() => {
    const candidate = crowdData.find(building => building.predictionHorizonMinutes !== undefined && building.predictionHorizonMinutes !== null);
    if (!candidate) return DEFAULT_PREDICTION_HORIZON_MINUTES;
    const minutes = Number(candidate.predictionHorizonMinutes);
    return Number.isFinite(minutes) ? minutes : DEFAULT_PREDICTION_HORIZON_MINUTES;
  })();

  // Calculate totals and statistics
  const totalCurrent = crowdData.reduce((sum, building) => sum + building.currentCount, 0);
  const totalPredicted = crowdData.reduce((sum, building) => sum + building.predictedCount, 0);
  const totalChange = totalPredicted - totalCurrent;
  const changePercentage = totalCurrent > 0 ? ((totalChange / totalCurrent) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
      {/* Header Section */}
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
        {/* Legend */}
        <div className="flex items-center justify-center gap-8 mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
            <span className="font-medium text-gray-700">Current Count</span>
            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Live</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
            <span className="font-medium text-gray-700">Predicted Count</span>
            <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Next {predictionHorizonMinutes} Minutes</div>
          </div>
        </div>
        
        {/* Chart Container */}
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
                    angle={0}
                    textAnchor="middle"
                    height={90}
                    interval={0}
                    fontSize={12}
                    tick={(props) => {
                      const { x, y, payload } = props;
                      const index = payload.index;
                      // Alternate between two rows to prevent overlap
                      const yOffset = index % 2 === 0 ? 10 : 30;
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text
                            x={0}
                            y={yOffset}
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize={12}
                            fontWeight={500}
                          >
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
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
                      if (name === 'predictedCount') return [value, `Predicted Count (Next ${predictionHorizonMinutes} Minutes)`];
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
                  {/* Current Count Line */}
                  <Line 
                    type="monotone" 
                    dataKey="currentCount" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    dot={{ fill: '#3b82f6', strokeWidth: 3, r: 7, filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))' }}
                    activeDot={{ r: 10, stroke: '#3b82f6', strokeWidth: 3, fill: '#ffffff', filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4))' }}
                    name="currentCount"
                  />
                  {/* Predicted Count Line */}
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
        
              
        {/* Summary Statistics */}
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
                <p className="text-2xl font-bold text-blue-900">{totalCurrent}</p>
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
                <p className="text-2xl font-bold text-emerald-900">{totalPredicted}</p>
                <p className="text-sm text-emerald-700 font-medium">Total Predicted Count (Next {predictionHorizonMinutes} min)</p>
              </div>
            </div>

            {/* Change Indicator */}
            <div className={`bg-gradient-to-br rounded-xl p-4 border ${
              totalChange >= 0 
                ? 'from-orange-50 to-orange-100/50 border-orange-200/50' 
                : 'from-green-50 to-green-100/50 border-green-200/50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <Activity className={`w-6 h-6 ${totalChange >= 0 ? 'text-orange-600' : 'text-green-600'}`} />
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  totalChange >= 0 
                    ? 'text-orange-700 bg-orange-200/50' 
                    : 'text-green-700 bg-green-200/50'
                }`}>
                  {totalChange >= 0 ? 'Increase' : 'Decrease'}
                </span>
              </div>
              <div className="space-y-1">
                <p className={`text-2xl font-bold ${totalChange >= 0 ? 'text-orange-900' : 'text-green-900'}`}>
                  {totalChange > 0 ? `+${totalChange}` : totalChange}
                </p>
                <p className={`text-sm font-medium ${totalChange >= 0 ? 'text-orange-700' : 'text-green-700'}`}>
                  Expected Change
                </p>
              </div>
            </div>
          </div>

          {/* Insight Banner */}
          <div className={`mt-6 p-4 rounded-xl border ${
            totalChange >= 0 
              ? 'bg-amber-50 border-amber-200 text-amber-800' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                {totalChange >= 0 
                  ? `Crowd levels are expected to increase by ${Math.abs(totalChange)} people (${changePercentage.toFixed(1)}%) in the next ${predictionHorizonMinutes} minutes.`
                  : `Crowd levels are expected to decrease by ${Math.abs(totalChange)} people (${Math.abs(changePercentage).toFixed(1)}%) in the next ${predictionHorizonMinutes} minutes.`
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingOccupancyChart;
