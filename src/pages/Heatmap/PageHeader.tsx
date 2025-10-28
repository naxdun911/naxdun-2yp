import React from 'react';
import { Users, Activity, Clock, RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  timestamp?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ timestamp = "--:--" }) => {
  return (
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
              <span className="text-emerald-700 font-semibold">{timestamp}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-emerald-600">
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Auto-updating</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
